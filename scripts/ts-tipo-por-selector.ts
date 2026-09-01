/**
 * ts-tipo-por-selector.ts — El selector ya dice qué elemento devuelve la búsqueda.
 *
 * EL PROBLEMA. La primera pasada de la migración anotó todas las búsquedas con
 * el tipo genérico:
 *
 *     const input = shadow.querySelector<HTMLElement>('input.campo');
 *     input.value = '';                       // TS2339: 'value' no existe
 *
 * Eran 967 errores, y 258 de ellos solo por `.value`. El tipo genérico no era
 * una decisión: era lo único que un codemod ciego al selector podía poner.
 *
 * LA SEÑAL ESTABA AHÍ. `'input.campo'` nombra la etiqueta, y la etiqueta
 * determina la interfaz. Este paso lee el selector y sustituye `HTMLElement`
 * por lo que corresponde, que además es lo que el autor habría escrito a mano.
 *
 * CUÁNDO SE ABSTIENE. Si el selector no empieza por una etiqueta conocida
 * —`'.mark'`, `'#label'`, `'is-dropdown'`— no hay nada que deducir: una clase
 * puede estar en cualquier elemento y un componente propio necesita su propia
 * interfaz, que no se puede inventar desde aquí. Se deja `HTMLElement` y se
 * decide a mano.
 *
 *   node scripts/ts-tipo-por-selector.ts src/components
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

/** Etiqueta HTML -> interfaz. Solo las que aportan miembros propios. */
const POR_ETIQUETA: Record<string, string> = {
  a: 'HTMLAnchorElement',
  audio: 'HTMLAudioElement',
  button: 'HTMLButtonElement',
  canvas: 'HTMLCanvasElement',
  details: 'HTMLDetailsElement',
  dialog: 'HTMLDialogElement',
  form: 'HTMLFormElement',
  iframe: 'HTMLIFrameElement',
  img: 'HTMLImageElement',
  input: 'HTMLInputElement',
  label: 'HTMLLabelElement',
  li: 'HTMLLIElement',
  ol: 'HTMLOListElement',
  option: 'HTMLOptionElement',
  progress: 'HTMLProgressElement',
  select: 'HTMLSelectElement',
  slot: 'HTMLSlotElement',
  table: 'HTMLTableElement',
  tbody: 'HTMLTableSectionElement',
  td: 'HTMLTableCellElement',
  template: 'HTMLTemplateElement',
  textarea: 'HTMLTextAreaElement',
  th: 'HTMLTableCellElement',
  tr: 'HTMLTableRowElement',
  ul: 'HTMLUListElement',
  video: 'HTMLVideoElement',
};

/**
 * Interfaz que promete el selector, o null si no la determina.
 *
 * De un selector compuesto manda el último grupo, que es el que se
 * selecciona: en `'.panel > input'` lo devuelto es el `input`.
 */
function interfazDe(selector: string): string | null {
  // Varias alternativas (`'input, textarea'`) pueden devolver tipos distintos.
  if (selector.includes(',')) return null;
  const ultimo = selector.split(/[\s>+~]+/).filter(Boolean).pop();
  if (!ultimo) return null;
  const etiqueta = /^([a-z][a-z0-9]*)/.exec(ultimo)?.[1];
  if (!etiqueta) return null;
  return POR_ETIQUETA[etiqueta] ?? null;
}

function procesar(ruta: string, texto: string): string {
  const sf = ts.createSourceFile(ruta, texto, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const ediciones: { pos: number; fin: number; texto: string }[] = [];

  const visitar = (n: ts.Node): void => {
    if (
      ts.isCallExpression(n)
      && ts.isPropertyAccessExpression(n.expression)
      && /^querySelector(All)?$/.test(n.expression.name.getText())
      && n.typeArguments?.length === 1
      && n.typeArguments[0]!.getText() === 'HTMLElement'
      && n.arguments.length === 1
      && ts.isStringLiteralLike(n.arguments[0]!)
    ) {
      const iface = interfazDe((n.arguments[0] as ts.StringLiteralLike).text);
      if (iface) {
        const arg = n.typeArguments[0]!;
        ediciones.push({ pos: arg.getStart(sf), fin: arg.end, texto: iface });
      }
    }
    ts.forEachChild(n, visitar);
  };
  visitar(sf);

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
  console.error('uso: node scripts/ts-tipo-por-selector.ts <fichero-o-carpeta>');
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
console.log(`tipo por selector: ${tocados} de ${lista.length} ficheros`);
