// tests/attr-enums.test.mjs
//
// DETECTOR DE INCONSISTENCIAS entre lo que un componente acepta y lo que las
// previews le pasan.
//
// El error que motiva este test: se escribió `<is-button variant="ghost">` en
// 4 sitios cuando `is-button` solo aceptaba `filled | outlined | plain`. No
// falla, no avisa, no se ve en consola: el atributo simplemente no casa con
// ninguna regla CSS y el botón se pinta con los valores por defecto. Un valor
// de enum inventado es invisible hasta que alguien mira el pixel.
//
// Fuente de verdad, por orden de preferencia:
//   1. `const VALID_<ATTR> = [...]` en el .js del componente.
//   2. La línea de JSDoc `*  <attr>   a | b | c   (default: x)`.
//
// Solo se vigilan atributos que son enums cerrados de verdad. `type`, `name`,
// `value`, etc. quedan fuera a propósito: aceptan texto libre y generarían
// ruido en vez de señal.
//
// Uso:  node tests/attr-enums.test.mjs

import { readFile, readdir } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

/** Atributos que son enums cerrados. Ampliar con cuidado. */
const ENUM_ATTRS = new Set([
  'variant', 'color', 'placement', 'orientation', 'shape',
  'activation', 'track', 'selection-display', 'label-placement',
]);

// ── 1. Recolectar componentes y sus enums ────────────────────────────────

async function walk(dir, filter, out = []) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); }
  catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist') continue;
      await walk(p, filter, out);
    } else if (filter.test(e.name)) out.push(p);
  }
  return out;
}

const componentFiles = await walk(join(root, 'src', 'components'), /\.js$/);

/** Vocabulario compartido, leído de su fuente real para que no se duplique aquí. */
const SHARED = {
  INTENT: [...(await readFile(join(root, 'src/components/_shared/intent.js'), 'utf8'))
    .match(/export const INTENT = Object\.freeze\(\[([\s\S]*?)\]\)/)[1]
    .matchAll(/'([^']+)'/g)].map((m) => m[1]),
  TONE: [...(await readFile(join(root, 'src/components/_shared/tone.js'), 'utf8'))
    .match(/export const TONE = Object\.freeze\(\[([\s\S]*?)\]\)/)[1]
    .matchAll(/'([^']+)'/g)].map((m) => m[1]),
};

/** tag -> { attr -> Set(valores), origen } */
const registry = new Map();

for (const file of componentFiles) {
  const src = await readFile(file, 'utf8');

  // Un mismo .js puede registrar varios tags (is-tab-group + is-tab).
  const tags = [...src.matchAll(/(?:customElements\.define|defineElement)\(\s*['"]([\w-]+)['"]/g)].map((m) => m[1]);
  if (!tags.length) continue;

  const attrs = new Map();

  // 1. const VALID_<ATTR> = ['a', 'b']  — también VALID_TG_PLACEMENT, etc.
  //
  // El lado derecho puede ser un array literal, o derivarse del vocabulario
  // compartido de `_shared/intent.js` / `_shared/tone.js`:
  //
  //   const VALID_COLOR   = INTENT;
  //   const VALID_COLOR   = [...INTENT, 'info'];
  //   const VALID_VARIANT = TONE.filter((t) => t !== 'plain');
  //
  // Sin resolver esas tres formas, los 8 componentes que ya consumen el
  // vocabulario compartido se quedaban sin enum y este test dejaba de
  // vigilarlos en silencio.
  for (const m of src.matchAll(/const\s+VALID_(?:[A-Z]+_)?([A-Z]+)\s*=\s*([^;]+);/g)) {
    const attr = m[1].toLowerCase();
    if (!ENUM_ATTRS.has(attr)) continue;
    const rhs = m[2];
    const vals = new Set();
    if (/\bINTENT\b/.test(rhs)) for (const v of SHARED.INTENT) vals.add(v);
    if (/\bTONE\b/.test(rhs)) for (const v of SHARED.TONE) vals.add(v);
    for (const q of rhs.matchAll(/['"]([^'"]+)['"]/g)) {
      // `.filter((t) => t !== 'plain')` resta; un literal suelto suma.
      if (/!==\s*['"]$/.test(rhs.slice(0, q.index + 1))) vals.delete(q[1]);
      else vals.add(q[1]);
    }
    if (vals.size) attrs.set(attr, { values: vals, origen: 'VALID_*' });
  }

  // 2. JSDoc:  *  variant   filled | outlined | plain   (default: filled)
  for (const m of src.matchAll(/^\s*\*\s+([a-z][\w-]*)\s+([a-z][\w|\s-]*?)\s*(?:\(default[^)]*\))?\s*$/gm)) {
    const attr = m[1];
    if (!ENUM_ATTRS.has(attr) || attrs.has(attr)) continue;
    if (!m[2].includes('|')) continue;
    const vals = m[2].split('|').map((v) => v.trim()).filter((v) => /^[\w-]+$/.test(v));
    if (vals.length > 1) attrs.set(attr, { values: new Set(vals), origen: 'JSDoc' });
  }

  if (!attrs.size) continue;
  for (const tag of tags) {
    const prev = registry.get(tag) || new Map();
    for (const [k, v] of attrs) if (!prev.has(k)) prev.set(k, v);
    registry.set(tag, prev);
  }
}

assert.ok(registry.size >= 10, `se esperaban enums de al menos 10 componentes, hay ${registry.size}`);

// ── 2. Revisar las previews (JSON homogéneos + index) ────────────────────

const previewFiles = [
  ...(await walk(join(root, 'src', 'previews'), /\.json$/)),
  join(root, 'index.html'),
];

const offenders = [];

for (const file of previewFiles) {
  let src;
  try { src = await readFile(file, 'utf8'); } catch { continue; }

  for (const tagMatch of src.matchAll(/<(is-[\w-]+)((?:\s+[^<>]*?)?)\/?>/g)) {
    const tag = tagMatch[1];
    const enums = registry.get(tag);
    if (!enums) continue;
    const attrBlob = tagMatch[2] || '';

    for (const attrMatch of attrBlob.matchAll(/([\w-]+)\s*=\s*"([^"]*)"/g)) {
      const [, attr, value] = attrMatch;
      const spec = enums.get(attr);
      if (!spec) continue;
      // Valores dinámicos: se resuelven en runtime, no se pueden validar aquí.
      if (value.includes('${') || value.includes('{{') || value.trim() === '') continue;
      if (spec.values.has(value)) continue;
      const line = src.slice(0, tagMatch.index).split('\n').length;
      offenders.push(
        `${relative(root, file)}:${line}  <${tag} ${attr}="${value}"> ` +
          `— válidos (${spec.origen}): ${[...spec.values].join(' | ')}`,
      );
    }
  }
}

assert.equal(
  offenders.length,
  0,
  'Atributos de enum con valores que el componente no acepta.\n' +
    'Un valor inventado no lanza error: el elemento se pinta con el default y el fallo pasa inadvertido.\n  ' +
    offenders.slice(0, 25).join('\n  ') +
    (offenders.length > 25 ? `\n  ...y ${offenders.length - 25} más` : ''),
);

// Regresión concreta: `ghost` existe de verdad en is-button (CSS + JSDoc).
// Si alguien lo quita del CSS pero lo deja en el JSDoc, el test de arriba deja
// de proteger y las previews que lo usan se rompen en silencio.
const buttonCss = await readFile(join(root, 'src/components/actions/button.css'), 'utf8');
const buttonJs = await readFile(join(root, 'src/components/actions/button.js'), 'utf8');
if (/variant\s+[^\n]*\bghost\b/.test(buttonJs)) {
  assert.match(
    buttonCss,
    /\[variant="ghost"\]/,
    'button.js documenta la variante `ghost` pero button.css no la implementa',
  );
  assert.match(
    buttonCss,
    /--_text-hover/,
    '`ghost` necesita --_text-hover/--_border-hover: al pasar a filled en hover ' +
      'el texto y el borde tienen que cambiar, no solo el fondo',
  );
}

const tags = [...registry.keys()].length;
console.log(`OK attr-enums — ${tags} componentes con enums, ${previewFiles.length} previews revisadas`);
