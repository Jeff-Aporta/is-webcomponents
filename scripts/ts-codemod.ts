/**
 * ts-codemod.ts — Anotaciones mecánicas para la migración de `.js` a `.ts`.
 *
 * Cubre solo los patrones que se repiten idénticos en todo el kit y cuya
 * respuesta correcta no depende del componente. Medido sobre la primera oleada:
 * de 313 errores en 9 ficheros, 166 eran nulabilidad de `querySelector` y 83
 * parámetros de manejador sin tipo. Eso es lo que hace aquí.
 *
 * LO QUE NO HACE, A PROPÓSITO: elegir el tipo concreto de un elemento
 * consultado (`HTMLInputElement` vs `HTMLElement`), que es lo que resuelve los
 * TS2339. Eso exige leer el selector y el uso, y un `as HTMLElement` puesto a
 * ciegas silencia el error mintiendo. Esos se corrigen a mano.
 *
 *   node scripts/ts-codemod.ts src/components/actions
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** `querySelector` contra el template del módulo: el nodo existe siempre. */
const QUERY_NO_NULA = [
  // `this.#x = shadow.querySelector('…')` → `…')!`
  [/(\bshadow(?:Root)?\.querySelector\([^)]*\))(\s*;)/g, '$1!$2'],
  [/(\bthis\.shadowRoot\.querySelector\([^)]*\))(\s*;)/g, '$1!$2'],
  // `const x = root.querySelector('…');`
  [/(=\s*\w+\.querySelector\([^)]*\))(\s*;)/g, '$1!$2'],
];

/**
 * `querySelector` sin genérico devuelve `Element`, que no tiene `focus`,
 * `disabled` ni `style`. Todo lo que hay en los templates del kit es HTML, así
 * que `HTMLElement` es el tipo correcto, no un ensanchamiento: los casos que de
 * verdad necesitan un tipo más concreto (`HTMLInputElement`, `HTMLDialogElement`)
 * se anotan a mano y este patrón no los pisa porque ya llevan genérico.
 */
const QUERY_TIPADA = [
  [/\.querySelector\((?!<)/g, '.querySelector<HTMLElement>('],
  [/\.querySelectorAll\((?!<)/g, '.querySelectorAll<HTMLElement>('],
];

/**
 * `this.shadowRoot` es `ShadowRoot | null` para el estándar, pero en este kit
 * todo componente hace `attachShadow` en su constructor: cuando se lee, existe.
 * El `!` documenta esa invariante en vez de repartir guardas que nunca fallan.
 */
const SHADOW = [
  [/this\.shadowRoot(?!!)(?=\s*[.),;\]])/g, 'this.shadowRoot!'],
];

/** Parámetros de manejador: el nombre dice el tipo en todo el kit. */
const PARAMS = [
  [/\((e)\)\s*=>/g, '(e: Event) =>'],
  [/\((ev)\)\s*=>/g, '(ev: Event) =>'],
  [/#on(\w*)Key(\w*)\s*=\s*\(e: Event\)/g, '#on$1Key$2 = (e: KeyboardEvent)'],
  [/#on(\w*)(Pointer|Mouse|Click)(\w*)\s*=\s*\(e: Event\)/g, '#on$1$2$3 = (e: PointerEvent)'],
];

/** Callbacks del ciclo de vida: firma fija del estándar. */
const CICLO = [
  [/\battributeChangedCallback\((\w+)\)\s*\{/g, 'attributeChangedCallback($1: string): void {'],
  [/\battributeChangedCallback\((\w+),\s*(\w+),\s*(\w+)\)\s*\{/g,
   'attributeChangedCallback($1: string, $2: string | null, $3: string | null): void {'],
  [/\bconnectedCallback\(\)\s*\{/g, 'connectedCallback(): void {'],
  [/\bdisconnectedCallback\(\)\s*\{/g, 'disconnectedCallback(): void {'],
  [/\bstatic get observedAttributes\(\)\s*\{/g, 'static get observedAttributes(): string[] {'],
];

/**
 * Declara el tipo de los campos privados a partir de su asignación en el
 * constructor.
 *
 * `#dialog;` sin tipo es `any` implícito y TS lo rechaza en estricto. El tipo
 * correcto ya está escrito tres líneas más abajo, en
 * `this.#dialog = shadow.querySelector<HTMLDialogElement>('dialog')!`. Esto lo
 * lee de ahí en vez de obligar a repetirlo.
 *
 * Solo actúa cuando la asignación es una consulta con genérico explícito: es el
 * único caso donde el tipo es inequívoco. Los demás campos se anotan a mano.
 */
function tiparCamposPrivados(t) {
  const tipos = new Map();
  const RE_ASIG = /this\.(#\w+)\s*=\s*[\w.!]*\.querySelector(?:All)?<([^>]+)>\([^)]*\)(!?)/g;
  for (const m of t.matchAll(RE_ASIG)) {
    const todos = m[0].includes('querySelectorAll');
    tipos.set(m[1], todos ? `NodeListOf<${m[2]}>` : m[2] + (m[3] === '!' ? '' : ' | null'));
  }
  if (!tipos.size) return t;
  return t.replace(/^(\s*)(#\w+);\s*$/gm, (linea, sangria, campo) => {
    const tipo = tipos.get(campo);
    return tipo ? `${sangria}${campo}!: ${tipo};` : linea;
  });
}

/**
 * `getAttribute` devuelve `string | null`. Cuando el valor se compara contra
 * una lista de valores válidos, el `null` nunca está en la lista, así que el
 * `?? ''` no cambia el resultado y quita el error.
 */
const ATRIBUTO_NULO = [
  [/\.includes\((this\.getAttribute\([^)]*\))\)/g, ".includes($1 ?? '')"],
];

function ficheros(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...ficheros(p));
    else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

const objetivo = process.argv[2];
if (!objetivo) {
  console.error('uso: node scripts/ts-codemod.ts <carpeta o fichero>');
  process.exit(2);
}
const lista = statSync(objetivo).isDirectory() ? ficheros(objetivo) : [objetivo];

let tocados = 0;
for (const p of lista) {
  const antes = readFileSync(p, 'utf8');
  let t = antes;
  for (const [re, rep] of [...QUERY_TIPADA, ...QUERY_NO_NULA, ...SHADOW, ...PARAMS, ...CICLO, ...ATRIBUTO_NULO]) t = t.replace(re, rep);
  t = tiparCamposPrivados(t);
  // Doble `!` si el fichero ya venía migrado a medias.
  t = t.replace(/\)!!+/g, ')!');
  if (t !== antes) { writeFileSync(p, t, 'utf8'); tocados++; }
}
console.log(`codemod: ${tocados} de ${lista.length} ficheros modificados`);
