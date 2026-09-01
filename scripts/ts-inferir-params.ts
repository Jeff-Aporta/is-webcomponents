/**
 * ts-inferir-params.ts — Deduce el tipo de un parámetro por cómo se usa.
 *
 * POR QUÉ. En modo estricto la mayor parte de los errores de la migración son
 * parámetros sin anotar (TS7006). Anotarlos a mano son miles de decisiones,
 * pero la mayoría no son decisiones: si el cuerpo hace `n < 0 ? 0 : n * 2`, el
 * parámetro es un número y no hay nada que elegir.
 *
 * POR QUÉ SOBRE EL AST Y NO SOBRE TEXTO. La primera versión buscaba
 * `(...)` seguido de `{` con una expresión regular, y eso también casa con
 * `if (parent) {` y con la llamada `scan(raw, (a, b) => …)`. Anotar ahí produce
 * código que ni siquiera parsea, y el daño aparece disperso en ficheros que el
 * script ya dio por buenos. El parser de TypeScript ya sabe qué es un parámetro
 * y qué no; usarlo elimina esa clase de fallo entera en vez de irla parcheando.
 *
 * PRECISIÓN ANTES QUE COBERTURA. Un tipo mal deducido es peor que ninguno: hace
 * pasar el typecheck mintiendo, que es justo lo que la migración quiere evitar.
 * Cada regla exige una señal fuerte —un método propio del tipo, no algo que
 * cualquier objeto pueda tener— y dos señales de tipos distintos descartan la
 * deducción y dejan el parámetro para decidirlo a mano.
 *
 *   node scripts/ts-inferir-params.ts src/components/_shared
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { claveParametro, leerDescartes, nombreDeFuncion } from './ts-parametros-comunes.js';

/**
 * Señales por tipo: patrones que solo aparecen cuando el parámetro ES de ese
 * tipo. `@@` es el marcador del nombre del parámetro.
 */
const SENALES: ReadonlyArray<readonly [string, readonly RegExp[]]> = [
  ['HTMLElement', [
    /@@\.(?:setAttribute|getAttribute|removeAttribute|hasAttribute|toggleAttribute)\(/,
    /@@\.(?:classList|dataset|style)\b/,
    /@@\.(?:addEventListener|removeEventListener)\(/,
    /@@\.(?:closest|querySelector|querySelectorAll)\(/,
  ]],
  // Familia Event. Un manejador que lee `.key` es también uno que llama a
  // `.preventDefault()`, así que aquí las señales se solapan por diseño y la
  // regla de "dos candidatos, abortar" los descartaría todos. Se resuelven por
  // especificidad: gana el subtipo más concreto que tenga señal propia.
  ['KeyboardEvent', [/@@\.(?:key|code|altKey|ctrlKey|metaKey|shiftKey|repeat)/]],
  ['MouseEvent', [/@@\.(?:clientX|clientY|pageX|pageY|button|buttons|offsetX|offsetY)/]],
  ['CustomEvent', [/@@\.detail/]],
  ['Event', [
    /@@\.(?:preventDefault|stopPropagation|stopImmediatePropagation|composedPath)\(/,
    /@@\.(?:currentTarget|defaultPrevented)/,
  ]],
  ['string', [
    /@@\.(?:replace|split|toLowerCase|toUpperCase|trim|startsWith|endsWith|padStart|padEnd|charCodeAt)\(/,
    /String\(@@\)/,
  ]],
  ['number', [
    /@@\s*[<>]=?\s*-?\d/,
    /-?\d\s*[<>]=?\s*@@/,
    /@@\s*[*/%+-]\s*\d/,
    /\d\s*[*/-]\s*@@/,
    /Math\.(?:round|floor|ceil|abs|min|max|sqrt|atan2|cos|sin)\([^)]*@@/,
  ]],
];

/** Tipo deducido, o `null` si la evidencia no es concluyente. */
function deducir(nombre: string, cuerpo: string): string | null {
  const esc = nombre.replace(/\$/g, '\\$');
  // El nombre tiene que aparecer *solo*, no como receptor de algo: en
  // `Math.round(p.x)` quien es número es `p.x`, no `p`. Sin excluir `.`, `[` y
  // `(` el paso anotaba el objeto entero con el tipo de uno de sus campos.
  const limite = String.raw`(?![\w$.[(])`;
  const candidatos: string[] = [];
  for (const [tipo, patrones] of SENALES) {
    const acierta = patrones.some((re) =>
      new RegExp(re.source.replaceAll('@@', esc + limite)).test(cuerpo));
    if (acierta) candidatos.push(tipo);
  }
  // Dentro de la familia Event el solape es esperado: quedarse con el subtipo
  // más concreto es correcto, no una ambigüedad.
  const eventos = candidatos.filter((t) => t.endsWith('Event'));
  if (eventos.length && eventos.length === candidatos.length) {
    return eventos.find((t) => t !== 'Event') ?? 'Event';
  }
  // Señales de dos tipos distintos: el parámetro es polimórfico o el patrón
  // acertó por casualidad. En ambos casos, decidirlo a mano.
  return candidatos.length === 1 ? candidatos[0]! : null;
}

/** Nodos que declaran parámetros. `get`/`set` quedan fuera a propósito. */
function esFuncion(n: ts.Node): n is ts.SignatureDeclaration & { body?: ts.Node } {
  return ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n)
    || ts.isArrowFunction(n) || ts.isMethodDeclaration(n) || ts.isConstructorDeclaration(n);
}

/** Inserciones `{ pos, texto }` para un fichero, en orden de aparición. */
const DESCARTES = leerDescartes();

function inserciones(ruta: string, texto: string): { pos: number; texto: string }[] {
  const sf = ts.createSourceFile(ruta, texto, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const out: { pos: number; texto: string }[] = [];

  const visitar = (n: ts.Node): void => {
    if (esFuncion(n) && n.body) {
      const cuerpo = texto.slice(n.body.pos, n.body.end);
      for (const p of n.parameters) {
        // Ya anotado, rest, o destructuring: nada que deducir o nada donde
        // colgar la anotación.
        if (p.type || p.dotDotDotToken || !ts.isIdentifier(p.name)) continue;
        const nombre = p.name.text;
        // Una pasada anterior ya comprobó que aquí la heurística falla.
        if (DESCARTES.has(claveParametro(ruta, nombreDeFuncion(p), nombre))) continue;
        const tipo = deducir(nombre, cuerpo);
        if (!tipo) continue;
        // Tras el nombre y antes de `?`/`=`, que es donde va la anotación.
        out.push({ pos: p.name.end, texto: `: ${tipo}` });
      }
    }
    ts.forEachChild(n, visitar);
  };
  visitar(sf);
  return out.sort((a, b) => a.pos - b.pos);
}

function anotar(ruta: string, texto: string): string {
  const puntos = inserciones(ruta, texto);
  if (!puntos.length) return texto;
  let out = '';
  let ultimo = 0;
  for (const { pos, texto: t } of puntos) {
    out += texto.slice(ultimo, pos) + t;
    ultimo = pos;
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
  console.error('uso: node scripts/ts-inferir-params.ts <fichero-o-carpeta>');
  process.exit(2);
}
const lista = statSync(objetivo).isDirectory() ? ficheros(objetivo) : [objetivo];

let tocados = 0;
for (const p of lista) {
  const antes = readFileSync(p, 'utf8');
  const despues = anotar(p, antes);
  if (despues === antes) continue;
  // Releer con el parser: si la anotación rompió la sintaxis, no se escribe.
  const sf = ts.createSourceFile(p, despues, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  if ((sf as unknown as { parseDiagnostics: unknown[] }).parseDiagnostics?.length) {
    console.error(`  ! ${p}: la anotación rompería la sintaxis, se deja intacto`);
    continue;
  }
  writeFileSync(p, despues, 'utf8');
  tocados++;
}
console.log(`inferencia por uso: ${tocados} de ${lista.length} ficheros anotados`);
