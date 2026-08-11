// audit-components.mjs — auditoría mecánica de los componentes.
// Chequea por archivo:
//  - define con guard idempotente
//  - adoptCss presente cuando existe .css hermano (shadow) / css huérfano
//  - listeners en document/window agregados sin remover en disconnectedCallback
//  - setInterval/setTimeout persistentes sin clear
//  - observedAttributes declarado pero sin attributeChangedCallback (o viceversa)
//  - IntersectionObserver/MutationObserver/ResizeObserver sin disconnect
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const compRoot = join(root, 'src', 'components');

const walk = (d, out = []) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) { if (n !== '_shared') walk(p, out); }
    else if (/\.js$/.test(n) && n !== 'index.js') out.push(p);
  }
  return out;
};

const report = [];
for (const f of walk(compRoot)) {
  const src = readFileSync(f, 'utf-8');
  const rel = f.slice(root.length).replaceAll('\\', '/');
  const name = basename(f, '.js');
  const issues = [];

  // Registro: define directo, define(tag var) o factory (defineChart,
  // definePickerInput, ...). Los módulos helper sin clases HTMLElement no
  // necesitan registrar nada.
  const defines = [...src.matchAll(/customElements\.define\(\s*['"`]([a-z0-9-]+)['"`]/g)].map((m) => m[1]);
  const definesAny = /customElements\.define\(/.test(src) || /\bdefine[A-Z][A-Za-z]*\(/.test(src);
  const declaresElement = /extends\s+HTMLElement/.test(src);
  if (declaresElement && !definesAny) issues.push('no-define: declara HTMLElement pero no lo registra');
  for (const tag of defines) {
    const guard = new RegExp(`customElements\\.get\\(\\s*['"\`]${tag}['"\`]`);
    if (!guard.test(src)) issues.push(`define-sin-guard: ${tag}`);
  }

  const hasCss = existsSync(f.replace(/\.js$/, '.css'));
  const usesShadow = /attachShadow/.test(src);
  // `adoptCss(` = lo llama. Un módulo que EXPORTA su propio `adoptCss`
  // (helpers/ui.js) no está adoptando nada y no necesita un .css hermano;
  // buscar el identificador a secas lo marcaba como falso positivo.
  const usesAdopt = /(?<!export const )\badoptCss\(/.test(src) && !/export const adoptCss\s*=/.test(src);
  if (hasCss && usesShadow && !usesAdopt) issues.push('css-huerfano: existe .css pero no se adopta en el shadow');
  if (!hasCss && usesAdopt) issues.push('adoptCss-sin-css: adoptCss apunta a un .css inexistente (404 en runtime)');

  const docAdds = [...src.matchAll(/(document|window)\.addEventListener\(\s*['"`]([a-z-]+)['"`]/g)];
  const docRemoves = new Set([...src.matchAll(/(document|window)\.removeEventListener\(\s*['"`]([a-z-]+)['"`]/g)].map((m) => m[1] + ':' + m[2]));
  for (const m of docAdds) {
    if (!docRemoves.has(m[1] + ':' + m[2])) issues.push(`listener-fuga: ${m[1]}.${m[2]} sin removeEventListener`);
  }

  if (/setInterval\(/.test(src) && !/clearInterval\(/.test(src)) issues.push('interval-fuga: setInterval sin clearInterval');

  for (const obs of ['MutationObserver', 'ResizeObserver', 'IntersectionObserver']) {
    if (new RegExp(`new ${obs}`).test(src) && !/\.disconnect\(\)/.test(src)) {
      issues.push(`observer-fuga: ${obs} sin disconnect()`);
    }
  }

  // ElementBase ya trae attributeChangedCallback, y lo mismo sus derivadas
  // (ModalBase para dialog/drawer, DiagramElementBase para los diagramas):
  // ahí el componente implementa `onAttributeChanged`, no el callback nativo.
  // `withStyleAttrs(HTMLElement)` también aporta attributeChangedCallback.
  const extendsBase = /extends\s+(ElementBase|ModalBase|DiagramElementBase|withStyleAttrs\()/.test(src);
  if (!extendsBase) {
    const hasObserved = /static get observedAttributes/.test(src) || /static observedAttributes/.test(src);
    const hasACC = /attributeChangedCallback/.test(src);
    if (hasObserved && !hasACC) issues.push('observed-sin-callback: observedAttributes sin attributeChangedCallback');
    if (hasACC && !hasObserved) issues.push('callback-sin-observed: attributeChangedCallback nunca se invocará');
  }

  if (issues.length) report.push({ rel, name, issues });
}

for (const r of report) {
  console.log(`\n${r.rel}`);
  for (const i of r.issues) console.log(`  - ${i}`);
}
console.log(`\n${report.length} componentes con hallazgos de ${walk(compRoot).length}`);
