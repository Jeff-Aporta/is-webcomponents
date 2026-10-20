import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });


const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(dirname(here));
// WHAT: se afirma sobre el CSS que sale de presentation.scss (mismo compilador y
// loadPaths que scripts/build-scss.mjs), no sobre el fuente. En el .scss el
// @media del sidebar va ANIDADO dentro de `.sidebar { … }`; compilado queda
// `@media (max-width: 900px) { .sidebar { … } }`, que es lo que ve el navegador.
const scssPath = join(root, 'src', 'styles', 'presentation.scss');
// Se compila dentro de cada caso (perezoso, una vez): un fallo del compilador
// es un rojo del caso con su reintento, no un «no carga» del archivo entero.
let compilado = null;
const cssDe = async () => compilado ??= (await import('sass')).compile(scssPath, {
  style: 'expanded',
  loadPaths: [dirname(scssPath), join(root, 'src', 'styles')],
  silenceDeprecations: ['legacy-js-api', 'import', 'global-builtin', 'color-functions'],
}).css;

// Tomamos el bloque de la regla `.sidebar { ... }` contando {} balanceados.
function pickBlock(src, selector) {
  const idx = src.indexOf(`${selector} {`);
  if (idx < 0) return null;
  const start = src.indexOf('{', idx);
  let depth = 1;
  let j = start + 1;
  while (j < src.length && depth > 0) {
    const c = src[j];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    j++;
  }
  return src.slice(start, j);
}

test('sidebar: font-family Manrope y peso ligero', async () => {
  const block = pickBlock(await cssDe(), '.sidebar');
  assert.ok(block, '.sidebar { ... } existe en presentation.css');
  assert.ok(
    /font-family:\s*["']Manrope["']\s*,\s*var\(--iswc-sans\)/.test(block),
    '.sidebar debe declarar font-family Manrope + --iswc-sans',
  );
  assert.ok(
    /font-weight:\s*400\b/.test(block),
    '.sidebar debe usar font-weight 400 (más ligero que el main)',
  );
});

test('sidebar: acento de marca sutil en el borde', async () => {
  const block = pickBlock(await cssDe(), '.sidebar');
  assert.ok(block, '.sidebar { ... } existe');
  // Acento sutil: 1px teñido con --iswc-accent (no side-tab grueso).
  assert.ok(
    /border-left:\s*1px\s+solid\s+color-mix\(in srgb, var\(--iswc-accent\)/.test(block),
    '.sidebar debe tener border-left 1px teñido con var(--iswc-accent)',
  );
  // No debe quedar el border gris antiguo de 1px.
  assert.ok(
    !/border-left:\s*1px\s+solid\s+color-mix\(in srgb, var\(--iswc-border\)/.test(block),
    '.sidebar NO debe tener el border-left antiguo de 1px gris',
  );
});

test('sidebar responsive: en móvil el accent pasa a border-top', async () => {
  const mql = /\@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.sidebar\s*\{([\s\S]*?)\}/m.exec(await cssDe());
  assert.ok(mql, 'Hay media (max-width:900px) con bloque .sidebar');
  const block = mql[1];
  assert.ok(
    /border-left:\s*0\b/.test(block) || /border-left:\s*none\b/.test(block),
    'En móvil el border-left debe desactivarse (0 o none)',
  );
  assert.ok(
    /border-top:\s*1px\s+solid\s+color-mix\(in srgb, var\(--iswc-accent\)/.test(block),
    'En móvil el accent debe pasar a border-top 1px teñido con var(--iswc-accent)',
  );
});

export default lista();
