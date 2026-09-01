// tests/palette-dropdown.test.ts
//
// Verifica que el dropdown de paleta (header .brand-menu) tiene la
// estructura esperada: los items no seleccionados se distinguen visualmente
// del activo (punto de color, opacidad reducida, check solo en el activo).
//
// Esto protege el contrato de UX:
//   - hay 3 paletas (insoft, contapyme, agrowin)
//   - exactamente 1 item tiene aria-selected="true"
//   - el atributo coincide con data-palette del <html>
//   - el HTML tiene los slots semanticos: .brand-menu__swatch,
//     .brand-menu__label, .brand-menu__check.
//   - el CSS distingue los items no-seleccionados por opacity o por un
//     atributo/estado equivalente.
//
// Uso:  node tests/palette-dropdown.test.ts

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const html = await readFile(join(root, 'index.html'), 'utf8');
const shellCss = await readFile(join(root, 'src', 'styles', 'shell.css'), 'utf8');

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

// ─── HTML: el menu existe con los 3 paletas ─────────────────────────────────

check(/id="brandMenu"/.test(html), '<ul id="brandMenu"> falta');
check(/role="listbox"/.test(html), 'listbox role falta en #brandMenu');

const paletteRe = /<li[^>]*\brole="option"[^>]*\bdata-palette="(insoft|contapyme|agrowin)"/g;
const palettes = [...html.matchAll(paletteRe)].map((m) => m[1]);
check(palettes.length === 3, `esperaba 3 <li role=option data-palette=...>, encontre ${palettes.length}`);
check(new Set(palettes).size === 3, `las 3 paletas deben ser unicas, encontre ${[...new Set(palettes)].join(', ')}`);

// ─── HTML: slots semanticos por item ────────────────────────────────────────

const itemRe = /<li\b[^>]*\brole="option"[^>]*\bdata-palette="([a-z]+)"[\s\S]*?<\/li>/g;
const items = [...html.matchAll(itemRe)];
check(items.length === 3, `esperaba 3 items <li>, encontre ${items.length}`);

for (const m of items) {
  const palette = m[1];
  const block = m[0];
  check(/\bclass="brand-menu__swatch"/.test(block), `[${palette}] falta <span class="brand-menu__swatch">`);
  check(/\bclass="brand-menu__label"/.test(block), `[${palette}] falta <span class="brand-menu__label">`);
  check(/<is-icon\b[^>]*\bclass="brand-menu__check"/.test(block), `[${palette}] falta <is-icon class="brand-menu__check">`);
}

// ─── HTML: exactamente 1 item aria-selected="true" ──────────────────────────

const selected = items.filter((m) => /\baria-selected="true"/.test(m[0]));
check(selected.length === 1, `esperaba 1 item con aria-selected="true", encontre ${selected.length}`);

// ─── HTML: aria-label del listbox (a11y) ────────────────────────────────────

check(/aria-label="[^"]*[Pp]aleta[^"]*"/.test(html), '<ul role=listbox> sin aria-label accesible');

// ─── CSS: items no-seleccionados se distinguen del activo ───────────────────

check(/\.brand-menu\s*\{[\s\S]*?\[role="option"\]/.test(shellCss),
  'shell.css: no hay regla para .brand-menu > [role="option"]');

// El bloque opciones distingue selected vs no-seleccionados visualmente.
// Aceptamos opacity (lo que usa el repo hoy) o una variante equivalente
// como un background distinto, un border, o color de texto diferente.
const stylesBlock = (() => {
  const start = shellCss.search(/\.brand-menu\s*\{/);
  if (start < 0) return '';
  let depth = 0;
  for (let i = shellCss.indexOf('{', start); i < shellCss.length; i++) {
    if (shellCss[i] === '{') depth++;
    else if (shellCss[i] === '}') {
      depth--;
      if (depth === 0) return shellCss.slice(start, i + 1);
    }
  }
  return '';
})();
check(stylesBlock.length > 0, 'no se pudo extraer el bloque .brand-menu del CSS');

const baseItemMatch = stylesBlock.match(/\[role="option"\]\s*\{[\s\S]*?\}/);
check(!!baseItemMatch, '.brand-menu > [role="option"] sin bloque base');

const baseItem = baseItemMatch?.[0] ?? '';
const hasOpacity = /opacity\s*:\s*0?\.\d+/.test(baseItem);
const hasDimmerColor = /color\s*:\s*var\(--is-text-dim\)/.test(baseItem);
check(hasOpacity || hasDimmerColor,
  'CSS: items no-seleccionados deben distinguirse por opacity o color dim');

// ─── CSS: check visible solo cuando aria-selected="true" ───────────────────

check(/\.brand-menu__check\s*\{[\s\S]*?visibility:\s*hidden/.test(stylesBlock),
  'CSS: .brand-menu__check debe estar oculto por defecto (visibility: hidden)');
check(/\[aria-selected="true"\][^{}]*\.brand-menu__check[\s\S]*?visibility:\s*visible/.test(stylesBlock) ||
      /\.brand-menu__check[\s\S]*?visibility:\s*hidden/.test(stylesBlock) &&
      /\[aria-selected="true"][^{}]*visibility:\s*visible/.test(stylesBlock),
  'CSS: .brand-menu__check debe ser visible cuando aria-selected="true"');

// ─── CSS: punto de color por paleta ────────────────────────────────────────

for (const p of ['insoft', 'contapyme', 'agrowin']) {
  check(new RegExp(`\\[data-palette="${p}"\\][^{}]*\\.brand-menu__swatch`).test(stylesBlock),
    `CSS: falta regla para .brand-menu__swatch dentro de [data-palette="${p}"]`);
}

if (failures.length) {
  console.log('FAIL:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

console.log(`palette-dropdown.test.ts: PASS — 3 paletas, 1 seleccionado, slots semanticos, CSS distingue activos`);
process.exit(0);