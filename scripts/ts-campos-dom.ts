/**
 * ts-campos-dom.ts — Los campos privados que apuntan al shadow propio no son nulos.
 *
 * EL PROBLEMA. Cada componente hace lo mismo en su constructor:
 *
 *     this.#labelEl = shadow.getElementById('label');
 *     …
 *     this.#labelEl.hidden = !hint;            // 40 usos más abajo
 *
 * `getElementById` devuelve `HTMLElement | null`, así que en modo estricto el
 * campo queda nulable y *cada uno* de esos usos posteriores es un error. En
 * `forms/` solos eran 660 errores, y son 660 síntomas de una única causa.
 *
 * POR QUÉ NO SE ARREGLAN AGUAS ABAJO. La tentación es sembrar `?.` o `!` en los
 * usos, pero eso es mentir 660 veces sobre lo mismo y deja el código peor de lo
 * que estaba. El hecho real es otro: **el elemento siempre existe**, porque no
 * viene del documento del usuario sino de la plantilla que el propio componente
 * acaba de instanciar en su shadow root. Si faltara, el componente estaría roto
 * de raíz y `?.` solo escondería el fallo hasta que apareciese lejos del origen.
 *
 * Así que la afirmación se hace **una vez, en el origen**: el campo se declara
 * no nulo y la búsqueda lleva el `!`. Un solo punto donde la suposición es
 * visible y revisable, en vez de repartida por todo el fichero.
 *
 * CUÁNDO NO TOCA NADA. Si el campo se asigna en más de un sitio, o si alguna de
 * esas asignaciones puede ser nula de verdad (`= null`, un `querySelector` sobre
 * el documento, un argumento), la suposición ya no se sostiene y el fichero se
 * deja como está para mirarlo a mano.
 *
 *   node scripts/ts-campos-dom.ts src/components/forms
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

/** Búsquedas en el shadow propio: nulas en la firma, nunca en la práctica. */
const BUSQUEDAS = new Set(['querySelector', 'getElementById', 'getElementsByTagName']);

/**
 * Receptores que son el shadow del propio componente, no el documento.
 *
 * A esta lista se suman en caliente los campos que el propio paso ya ha dado
 * por no nulos: `this.#labelEl.querySelector('slot')` es tan seguro como el
 * `shadow.getElementById('label')` que lo pobló, así que la garantía se
 * propaga en cascada hasta que deja de haber campos nuevos.
 */
const RECEPTOR_PROPIO = /^(?:shadow|root|sr|this\.shadowRoot|this\.#root|this\.#shadow)$/;

type Edicion = { pos: number; fin: number; texto: string };

/** El tipo que la búsqueda promete, ya sin `| null`. */
function tipoDe(call: ts.CallExpression, nombreMetodo: string): string {
  const arg = call.typeArguments?.[0];
  if (arg) return arg.getText();
  return nombreMetodo === 'getElementsByTagName' ? 'HTMLCollectionOf<Element>' : 'HTMLElement';
}

/**
 * `this.#x = <busqueda>` donde `<busqueda>` cuelga del shadow propio.
 * Devuelve el nombre del campo y el tipo prometido, o null.
 */
function asignacionDom(
  n: ts.Node,
  seguros: ReadonlySet<string>,
): { campo: string; tipo: string; call: ts.CallExpression } | null {
  if (!ts.isBinaryExpression(n) || n.operatorToken.kind !== ts.SyntaxKind.EqualsToken) return null;
  const izq = n.left;
  if (!ts.isPropertyAccessExpression(izq) || izq.expression.kind !== ts.SyntaxKind.ThisKeyword) return null;
  if (!ts.isPrivateIdentifier(izq.name)) return null;

  // Una pasada anterior pudo dejar ya el `!`; se mira debajo para poder
  // recalcular el tipo cuando el argumento genérico ha cambiado.
  const der = ts.isNonNullExpression(n.right) ? n.right.expression : n.right;
  if (!ts.isCallExpression(der) || !ts.isPropertyAccessExpression(der.expression)) return null;
  const metodo = der.expression.name.getText();
  if (!BUSQUEDAS.has(metodo)) return null;
  const receptor = der.expression.expression.getText().replace(/[!?]/g, '');
  if (!RECEPTOR_PROPIO.test(receptor) && !seguros.has(receptor.replace(/^this\./, ''))) return null;

  return { campo: izq.name.getText(), tipo: tipoDe(der, metodo), call: der };
}

function procesar(ruta: string, texto: string): string {
  const sf = ts.createSourceFile(ruta, texto, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);

  /** campo -> asignaciones DOM halladas */
  const domPorCampo = new Map<string, { tipo: string; call: ts.CallExpression }[]>();
  /** campos con cualquier otra asignación: la suposición no se sostiene */
  const contaminados = new Set<string>();
  /** declaraciones `#x` sin inicializador, por nombre */
  const decls = new Map<string, ts.PropertyDeclaration>();

  const visitar = (n: ts.Node, seguros: ReadonlySet<string>): void => {
    if (ts.isPropertyDeclaration(n) && ts.isPrivateIdentifier(n.name) && !n.initializer) {
      decls.set(n.name.getText(), n);
    }
    const dom = asignacionDom(n, seguros);
    if (dom) {
      const lista = domPorCampo.get(dom.campo) ?? [];
      lista.push({ tipo: dom.tipo, call: dom.call });
      domPorCampo.set(dom.campo, lista);
    } else if (
      ts.isBinaryExpression(n)
      && n.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && ts.isPropertyAccessExpression(n.left)
      && n.left.expression.kind === ts.SyntaxKind.ThisKeyword
      && ts.isPrivateIdentifier(n.left.name)
    ) {
      contaminados.add(n.left.name.getText());
    }
    ts.forEachChild(n, (h) => visitar(h, seguros));
  };
  // Cascada: cada pasada puede volver seguro un campo que habilita al
  // siguiente. Los hallazgos se recogen de cero en cada vuelta, porque
  // acumularlos duplicaría cada `!` tantas veces como pasadas hubo.
  let previos = -1;
  while (domPorCampo.size !== previos) {
    previos = domPorCampo.size;
    const seguros = new Set(domPorCampo.keys());
    domPorCampo.clear();
    contaminados.clear();
    decls.clear();
    visitar(sf, seguros);
  }

  const ediciones: Edicion[] = [];
  for (const [campo, usos] of domPorCampo) {
    if (contaminados.has(campo)) continue;
    // Varias búsquedas para el mismo campo con tipos distintos: no hay un tipo
    // único que afirmar.
    const tipos = new Set(usos.map((u) => u.tipo));
    if (tipos.size !== 1) continue;
    const tipo = [...tipos][0]!;

    for (const { call } of usos) {
      // `!` justo tras la llamada, que es donde la nulabilidad se introduce.
      // Si ya está puesto, no se duplica.
      if (texto.slice(call.end, call.end + 1) === '!') continue;
      ediciones.push({ pos: call.end, fin: call.end, texto: '!' });
    }

    const decl = decls.get(campo);
    if (!decl) continue;
    const declTexto = decl.getText();
    // Ya declarado con este tipo exacto: nada que hacer.
    if (new RegExp(`!\\s*:\\s*${tipo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*;?$`).test(declTexto)) continue;
    const modificadores = declTexto.slice(0, declTexto.indexOf('#'));
    // `decl.pos` arranca donde acabó el nodo anterior, así que arrastra el
    // salto de línea y la sangría; conservarlos deja la clase como estaba.
    const trivia = texto.slice(decl.pos, decl.getStart(sf));
    ediciones.push({ pos: decl.pos, fin: decl.end, texto: `${trivia}${modificadores}${campo}!: ${tipo};` });
  }

  if (!ediciones.length) return texto;
  ediciones.sort((a, b) => a.pos - b.pos);
  let out = '';
  let ultimo = 0;
  for (const e of ediciones) {
    if (e.pos < ultimo) continue;
    out += texto.slice(ultimo, e.pos) + e.texto;
    ultimo = e.fin;
  }
  return out + texto.slice(ultimo);
}

function ficheros(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...ficheros(p));
    else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

const objetivo = process.argv[2];
if (!objetivo) {
  console.error('uso: node scripts/ts-campos-dom.ts <fichero-o-carpeta>');
  process.exit(2);
}
const lista = statSync(objetivo).isDirectory() ? ficheros(objetivo) : [objetivo];

let tocados = 0;
for (const p of lista) {
  const antes = readFileSync(p, 'utf8');
  const despues = procesar(p, antes);
  if (despues === antes) continue;
  const sf = ts.createSourceFile(p, despues, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  if ((sf as unknown as { parseDiagnostics: unknown[] }).parseDiagnostics?.length) {
    console.error(`  ! ${p}: la reescritura rompería la sintaxis, se deja intacto`);
    continue;
  }
  writeFileSync(p, despues, 'utf8');
  tocados++;
}
console.log(`campos DOM no nulos: ${tocados} de ${lista.length} ficheros`);
