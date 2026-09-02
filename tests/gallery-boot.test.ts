/**
 * gallery-boot.test.ts
 *
 * Caza la regresión FOUC / demos vacíos / boot 6–10s (LLM.md error #43):
 *  - CSS de la galería debe ser <link> estático (no await loadCSS* en path crítico)
 *  - await del head = solo shell tags + preview desde dist/cdn
 *  - load('all') y loadPageModules fuera del await crítico
 *  - setHostPreview + whenDefined (own property tapa el setter)
 *  - cdn-panel NO importa cdn-snippet desde src/ (md-editor cuelga)
 *  - no reimportar preview-component desde src/
 *
 * Extensión: *.test.mjs. tests/ se commitea (solo *.tmp / coverage / .cache ignorados).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const indexHtml = read('index.html');
const cdnPanel = read('scripts/cdn-panel.js');

/** Primer <script type="module"> del <head> (boot del loader). */
function headBootModule(html) {
  const head = html.match(/<head[\s\S]*?<\/head>/i)?.[0] ?? '';
  const m = head.match(/<script\s+type="module">([\s\S]*?)<\/script>/i);
  assert.ok(m, 'falta <script type="module"> en <head>');
  return m[1];
}

/** Módulo de la galería en <body> (nav + showPreview). */
function bodyGalleryModule(html) {
  const body = html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? html;
  const scripts = [...body.matchAll(/<script\s+type="module">([\s\S]*?)<\/script>/gi)].map(
    (x) => x[1],
  );
  const hit = scripts.find((s) => /showPreview|setHostPreview|loadPreview/.test(s));
  assert.ok(hit, 'falta módulo body con showPreview/setHostPreview');
  return hit;
}

test('CSS de galería es <link> estático (anti-FOUC)', () => {
  assert.match(indexHtml, /<link\s+rel="stylesheet"\s+href="src\/styles\/is-base\.css"/);
  assert.match(indexHtml, /<link\s+rel="stylesheet"\s+href="src\/styles\/palettes\.css"/);
  assert.match(indexHtml, /<link\s+rel="stylesheet"\s+href="src\/styles\/shell\.css"/);
  assert.match(indexHtml, /<link\s+rel="stylesheet"\s+href="src\/styles\/presentation\.css"/);
  assert.match(
    indexHtml,
    /<link\s+rel="stylesheet"\s+href="src\/components\/layout\/preview-component\.css"/,
  );
});

test('head no hace await loadCSS* / loadPageStyles en el boot', () => {
  const boot = headBootModule(indexHtml);
  assert.doesNotMatch(boot, /await\s+L\.loadCSSBase\s*\(/);
  assert.doesNotMatch(boot, /await\s+L\.loadCSSPalettesDefault\s*\(/);
  assert.doesNotMatch(boot, /await\s+L\.loadPageStyles\s*\(/);
});

test('await crítico del head = shell tags + preview dist (no all, no pageModules)', () => {
  const boot = headBootModule(indexHtml);
  // Debe esperar shell puntual
  assert.match(boot, /await\s+Promise\.all\s*\(/);
  assert.match(boot, /L\.load\s*\([\s\S]*is-split-panel[\s\S]*is-button/);
  assert.match(
    boot,
    /import\s*\(\s*['"]\.\/dist\/cdn\/layout\/preview-component\.min\.js['"]\s*\)/,
  );
  assert.match(boot, /dataset\.kitShell\s*=\s*['"]1['"]/);

  // Extraer solo el bloque try { await Promise.all([...]) } del shell
  const tryBlock = boot.match(/try\s*\{([\s\S]*?)dataset\.kitShell/);
  assert.ok(tryBlock, 'falta try + dataset.kitShell tras el shell');
  const critical = tryBlock[1];
  assert.doesNotMatch(
    critical,
    /L\.load\s*\(\s*['"]all['"]\s*\)/,
    'load(all) no puede ir en el await crítico del shell',
  );
  assert.doesNotMatch(
    critical,
    /loadPageModules\s*\(/,
    'loadPageModules no puede ir en el await crítico del shell',
  );
});

test('load(all) y loadPageModules viven fuera del path crítico (fire-and-forget)', () => {
  const boot = headBootModule(indexHtml);
  assert.doesNotMatch(boot, /L\.load\s*\(\s*['"]all['"]\s*\)/);
  assert.match(boot, /loadPageModules\s*\(/);
  const afterShell = boot.split(/dataset\.kitShell\s*=\s*['"]1['"]/)[1] ?? '';
  assert.ok(afterShell.length > 20, 'boot truncado tras kitShell');
  assert.doesNotMatch(afterShell, /await\s+L\.loadPageModules\s*\(/);
});

test('no reimportar preview-component ni icon-loader desde src/', () => {
  assert.doesNotMatch(indexHtml, /src\/components\/layout\/preview-component\.js/);
  assert.doesNotMatch(indexHtml, /src\/components\/media\/icon\.js/);
  assert.doesNotMatch(indexHtml, /src\/components\/_shared\/icon-loader\.js/);
});

test('body usa setHostPreview + whenDefined (anti own-property)', () => {
  const body = bodyGalleryModule(indexHtml);
  assert.match(body, /function\s+setHostPreview\s*\(/);
  assert.match(body, /hasOwnProperty\.call\(\s*previewHost\s*,\s*['"]preview['"]\s*\)/);
  assert.match(body, /delete\s+previewHost\.preview/);
  assert.match(body, /customElements\.whenDefined\(\s*['"]is-preview-component['"]\s*\)/);
  assert.match(body, /ensurePreviewDeps|setHostPreview\s*\(/);
});

test('cdn-panel importa cdn-snippet desde dist/cdn (no src/)', () => {
  assert.match(cdnPanel, /dist\/cdn\/feedback\/cdn-snippet\.min\.js/);
  assert.doesNotMatch(
    cdnPanel,
    /from\s+['"]\.\.\/src\/components\/feedback\/cdn-snippet\.js['"]/,
  );
  assert.doesNotMatch(cdnPanel, /src\/components\/feedback\/cdn-snippet\.js/);
});

test('head arranca con loader.min.js desde core/ (no all.min suelto)', () => {
  assert.match(indexHtml, /dist\/cdn\/(?:core\/)?loader\.min\.js/);
  assert.doesNotMatch(indexHtml, /<script\s+type="module"\s+src="dist\/cdn\/all\.min\.js"/);
});
