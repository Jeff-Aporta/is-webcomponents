// @contexto INDICE.md · scripts/README.md
// components.ts — auditoría mecánica de los componentes del kit.
//
// Recorre src/components/<categoria>/ (incluidas las subcarpetas utils/,
// schemas/, data/…) y audita los MÓDULOS DE COMPONENTE: los .ts que
// registran un custom element, que declaran un tag, que traen una clase de
// custom element o que llevan la ficha del componente al lado (.json de la
// demo, .md, .scss). Se dejan fuera los módulos puramente declarativos
// (schemas/, *.schemas.ts) y los scripts de una preview (*.preview.ts), que
// no son componentes.
//
// Chequea por archivo:
//  - define con guard idempotente
//  - hoja propia del shadow cuando existe .scss hermano / hoja que falta
//  - listeners en document/window agregados sin remover en disconnectedCallback
//  - setInterval/setTimeout persistentes sin clear
//  - observedAttributes declarado pero sin attributeChangedCallback (o viceversa)
//  - IntersectionObserver/MutationObserver/ResizeObserver sin disconnect
//
// El kit pasó de .js a .ts y los patrones se ajustaron al molde:
//  - los componentes son .ts: se recogen los .ts y el nombre sale de
//    basename(f, '.ts').
//  - la hoja propia ya no llega por adoptCss ni por un .css hermano: llega por
//    `import css from 'iswc:css'` y el hermano en disco es el .scss. El build
//    avisa por consola cuando esa hoja no existe.
//  - el registro es `define(Clase)` (core/iswc-element.ts), que ya es
//    idempotente porque la guarda `customElements.get` vive en el núcleo:
//    sólo se marca el `customElements.define` directo sin guarda en el archivo.
//    Las fábricas de componentes (defineTypedChart, definePickerInput…) se
//    reconocen por su import: por nombre se confundían con Object.defineProperty.
//  - `extends HTMLElement` hay que anclarlo a `class X extends HTMLElement`:
//    en TypeScript `extends` también sale en genéricos e interfaces.
//  - los molds (DiagramElementBase, ModalBase) no se registran: no tienen tag
//    propio, sus subclases sí.
//  - los comentarios se limpian antes de mirar: el JSDoc del kit trae
//    ejemplos de código (`import css from 'iswc:css'`, `static tag = …`) que
//    si se leen como código dan falsos positivos.
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';

// Raíz del repo (scripts/sondas/ → ../..). Antes apuntaba a scripts/ y recorría la copia vieja scripts/src/.
const root = new URL('../..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const compRoot = join(root, 'src', 'components');

/** Bases del molde: aportan `attributeChangedCallback` y `observedAttributes` (static observed). */
const BASE_MOLDE =
  /extends\s+(IswcElement|IswcReactive|IswcFormControl|ElementBase|ModalBase|DiagramElementBase|PropsElement|BreakpointHost)\b/;
/** El mixin `withStyleAttrs(Base)` también aporta `attributeChangedCallback`. */
const BASE_MIXIN = /extends\s+withStyleAttrs\s*\(/;
/** Una clase de custom element: hay que anclar `extends` a la clase (en TS también hay genéricos). */
const CLASE_KIT = /class\s+[A-Za-z_$][\w$]*\s+extends\s+(HTMLElement|Element)\b/;

/** Registra un custom element: `define(Clase)` del molde o `customElements.define`. */
const REGISTRA = /(^|[^.\w])define\s*\(/;
const REGISTRA_DIRECTO = /customElements\.define\s*\(/;
/**
 * Fábrica de componentes del kit (defineTypedChart, definePickerInput…): se reconoce
 * por su import, no por el nombre, para no confundirla con `Object.defineProperty`
 * ni con helpers que se llaman igual.
 */
const IMPORTA_FABRICA = /import\s*\{[^}]*\bdefine[A-Z][A-Za-z0-9]*\b[^}]*\}/s;
const LLAMA_FABRICA = /(?<![.\w])define[A-Z][A-Za-z0-9]*\s*\(/;

/** Declara su propio tag: `static tag = 'iswc-…'` (propio o heredado de una variable). */
const DECLARA_TAG = /static\s+(?:override\s+)?tag\s*=/;

/** La hoja propia del shadow llega por el módulo virtual `iswc:css`. */
const IMPORTA_CSS = /from\s+'iswc:css'/;
/** Componente en light DOM (`shadowInit = null`): no hay shadow al que adoptarla. */
const LIGHT_DOM = /shadowInit\s*:\s*ShadowRootInit\s*\|\s*null\s*=\s*null/;

/** Módulos puramente declarativos: tipos y datos, sin vida propia. */
const ES_SCHEMA = (rel: string): boolean =>
  rel.includes('/schemas/') || rel.endsWith('.schemas.ts');
/** Scripts de una preview (página de demo): no son componentes. */
const ES_PREVIEW = (rel: string): boolean => rel.endsWith('.preview.ts');

/**
 * Quita los comentarios del fuente (de bloque y de línea) sin tocar las cadenas.
 * Los JSDoc del kit documentan el patrón con ejemplos de código: sin limpiarlos,
 * `import css from 'iswc:css'` o `static tag = …` dentro de un comentario se
 * leen como si el componente los usara.
 */
const sinComentarios = (src: string): string => {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && d === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      out += c;
      i++;
      while (i < src.length) {
        if (src[i] === '\\') { out += src[i] + (src[i + 1] ?? ''); i += 2; continue; }
        out += src[i];
        i++;
        if (src[i - 1] === c) break;
      }
      continue;
    }
    out += c;
    i++;
  }
  return out;
};

/** Recorre el árbol de categorías y recoge los .ts (antes .js: el kit es TypeScript). */
const walk = (d: string, out: string[] = []): string[] => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) { if (n !== '_shared') walk(p, out); }
    else if (/\.ts$/.test(n)) out.push(p);
  }
  return out;
};

/** La ficha del componente va al lado: .json de la demo, .md o .scss. */
const tieneFicha = (f: string): boolean =>
  ['.json', '.md', '.scss'].some((ext) => existsSync(f.replace(/\.ts$/, ext)));

/** ¿Registra el fichero algún custom element? */
const registraElemento = (src: string): boolean =>
  REGISTRA.test(src) || REGISTRA_DIRECTO.test(src) ||
  (IMPORTA_FABRICA.test(src) && LLAMA_FABRICA.test(src));

const report: { rel: string; name: string; issues: string[] }[] = [];
let auditados = 0;

for (const f of walk(compRoot)) {
  const rel = f.slice(root.length).replaceAll('\\', '/');
  const src = sinComentarios(readFileSync(f, 'utf-8'));
  const name = basename(f, '.ts');

  // Qué se audita: los módulos de componente. Los declarativos y los scripts de
  // preview se dejan fuera (no registran ningún tag y no llevan ficha).
  // Un módulo entra si registra un custom element, si declara un tag propio
  // (aunque no lo registre: eso es un hallazgo), si trae una clase de custom
  // element o si lleva la ficha del componente al lado.
  const registra = registraElemento(src);
  if (ES_SCHEMA(rel)) continue;
  if (ES_PREVIEW(rel) && !registra) continue;
  if (!registra && !DECLARA_TAG.test(src) && !CLASE_KIT.test(src) && !tieneFicha(f)) continue;
  auditados++;

  const issues: string[] = [];

  // Registro: define directo o factory (defineTypedChart, definePickerInput, ...).
  // Los módulos helper sin clases HTMLElement no necesitan registrar nada, y los
  // molds (DiagramElementBase, ModalBase) se registran en sus subclases.
  const defines = [...src.matchAll(/customElements\.define\(\s*['"`]([a-z0-9-]+)['"`]/g)].map((m) => m[1]);
  if (DECLARA_TAG.test(src) && !registra) {
    issues.push('no-define: declara un tag pero no lo registra');
  }
  for (const tag of defines) {
    // El tag va FUERA de la clase de caracteres: si no, el guion del tag
    // (`iswc-x`) se lee como un rango y la expresion deja de compilar.
    const guard = new RegExp(`customElements\\.get\\(\\s*['"\`]${tag}['"\`]`);
    if (!guard.test(src)) issues.push(`define-sin-guard: ${tag}`);
  }

  // CSS: la hoja propia llega por `import css from 'iswc:css'` y el hermano
  // en disco es el .scss. Un componente en light DOM no tiene shadow al que
  // adoptarla: su .scss lo aplica la página, no el shadow.
  const hasScss = existsSync(f.replace(/\.ts$/, '.scss'));
  const importaCss = IMPORTA_CSS.test(src);
  const usesShadow = !LIGHT_DOM.test(src) &&
    (BASE_MOLDE.test(src) || CLASE_KIT.test(src) || /attachShadow/.test(src));
  if (hasScss && usesShadow && !importaCss) {
    issues.push("css-huerfano: existe .scss pero el shadow no adopta la hoja (falta import css from 'iswc:css')");
  }
  if (!hasScss && importaCss) {
    issues.push("css-sin-hoja: import css from 'iswc:css' sin .scss hermano (la hoja sale vacía)");
  }

  // Listeners en document/window: los que se agregan con { once: true } se
  // desmontan solos y no son una fuga.
  const docAdds = [...src.matchAll(/(document|window)\.addEventListener\(\s*['"`]([a-z-]+)['"`]\s*,([^;]*)/g)];
  const docRemoves = new Set(
    [...src.matchAll(/(document|window)\.removeEventListener\(\s*['"`]([a-z-]+)['"`]/g)].map((m) => m[1] + ':' + m[2]),
  );
  for (const m of docAdds) {
    if (/once\s*:\s*true/.test(m[3])) continue;
    if (!docRemoves.has(m[1] + ':' + m[2])) {
      issues.push(`listener-fuga: ${m[1]}.${m[2]} sin removeEventListener`);
    }
  }

  if (/setInterval\(/.test(src) && !/clearInterval\(/.test(src)) {
    issues.push('interval-fuga: setInterval sin clearInterval');
  }

  for (const obs of ['MutationObserver', 'ResizeObserver', 'IntersectionObserver']) {
    if (new RegExp(`new ${obs}`).test(src) && !/\.disconnect\(\)/.test(src)) {
      issues.push(`observer-fuga: ${obs} sin disconnect()`);
    }
  }

  // El molde (IswcElement y derivadas) ya trae attributeChangedCallback, y lo
  // mismo sus derivadas (ModalBase para dialog/drawer, DiagramElementBase para
  // los diagramas): ahí el componente implementa `onAttributeChanged`, no el
  // callback nativo. `withStyleAttrs(...)` también aporta attributeChangedCallback.
  const extendsBase = BASE_MOLDE.test(src) || BASE_MIXIN.test(src);
  if (!extendsBase) {
    const hasObserved = /static\s+(?:override\s+)?observed\s*=/.test(src) ||
      /static get observedAttributes/.test(src) || /static observedAttributes/.test(src);
    const hasACC = /attributeChangedCallback/.test(src);
    if (hasObserved && !hasACC) {
      issues.push('observed-sin-callback: observedAttributes sin attributeChangedCallback');
    }
    if (hasACC && !hasObserved) {
      issues.push('callback-sin-observed: attributeChangedCallback nunca se invocará');
    }
  }

  if (issues.length) report.push({ rel, name, issues });
}

for (const r of report) {
  console.log(`\n${r.rel} (${r.name})`);
  for (const i of r.issues) console.log(`  - ${i}`);
}
console.log(`\n${report.length} componentes con hallazgos de ${auditados}`);
