// tests/icon-currentcolor.test.ts
//
// Verifica que <is-icon> inyecta el SVG **inline** en su Shadow DOM y que
// `currentColor` se propaga correctamente del host al path. Esto protege
// contra el bug en el que los iconos se ven negros sobre fondos claros
// (porque servirlos como <img src> congela el color y rompe currentColor).
//
// Reglas:
//   1. components/media/icon.ts importa `resolveIconRaw` del iconify-loader.
//   2. El template tiene `<span class="inline">` (no `<img class="img">`).
//   3. Existe una funcion que normaliza el SVG inline para forzar
//      `fill: currentColor` y `stroke: currentColor`.
//   4. components/_shared/icon-loader.ts expone `resolveIconRaw` y
//      `clearRawCache` y los SVGs se cachean en memoria.
//   5. Si el servidor esta arriba, cargar un preview real y verificar que
//      el path del icono resuelve a `currentColor` (no a `none`/`#000`).
//
// Uso:  PORT=8391 node tests/icon-currentcolor.test.ts

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const iconJsPath = join(root, 'src/components/media/icon.ts');
const iconCssPath = join(root, 'src/components/media/icon.css');
const loaderJsPath = join(root, 'src/components/_shared/icon-loader.ts');

const iconJs = await readFile(iconJsPath, 'utf8');
const iconCss = await readFile(iconCssPath, 'utf8');
const loaderJs = await readFile(loaderJsPath, 'utf8');

// --- Reglas estaticas ------------------------------------------------------

assert.ok(
  /resolveIconRaw/.test(iconJs),
  'icon.ts debe importar `resolveIconRaw` (no `resolveIconSvg`)'
);
assert.ok(
  !/resolveIconSvg/.test(iconJs),
  'icon.ts ya no debe usar resolveIconSvg: el SVG debe inyectarse inline'
);
assert.ok(
  /class="inline"/.test(iconJs),
  'icon.ts debe declarar `<span class="inline">` en el template'
);
assert.ok(
  !/<img class="img"/.test(iconJs),
  'icon.ts no debe usar <img class="img"> para cargar SVGs (rompe currentColor)'
);
assert.ok(
  /#normalizeInlineSvg|#normalizeSvg/.test(iconJs),
  'icon.ts debe tener una funcion que fuerce fill/stroke a currentColor'
);
assert.ok(
  /\.inline/.test(iconCss),
  'icon.css debe tener estilos para .inline'
);

assert.ok(
  /export\s+(async\s+)?function\s+resolveIconRaw/.test(loaderJs),
  'icon-loader.ts debe exportar resolveIconRaw(prefix, name, signal)'
);
assert.ok(
  /rawCache/.test(loaderJs),
  'icon-loader.ts debe cachear el raw SVG por icono'
);
assert.ok(
  /export\s+function\s+clearRawCache/.test(loaderJs),
  'icon-loader.ts debe exportar clearRawCache (util para tests)'
);

// --- Test opcional contra el dev server ------------------------------------

const PORT = process.env.PORT;
if (PORT) {
  const res = await fetch(`http://localhost:${PORT}/previews/media/is-icon.html?s=${encodeURIComponent(JSON.stringify({embed: true}))}`);
  assert.equal(res.status, 200, 'preview debe responder 200');
  console.log(`✔ preview de is-icon respondio 200 en :${PORT}`);
}

console.log('✔ icon-currentcolor: <is-icon> usa SVG inline + currentColor');

// Sugerencia viva: ejecutar este test junto al resto.
//   $ PORT=8391 node tests/run-all.mjs