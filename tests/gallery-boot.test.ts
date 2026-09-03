/**
 * gallery-boot.test.ts
 *
 * Caza la regresion FOUC / demos vacios / boot lento:
 *  - CSS del kit desde dist/cdn (consumo transpilado)
 *  - await del head = solo shell tags + preview desde dist/cdn
 *  - SPA de galeria: dist/gallery-app.min.js (no src/*.ts en runtime)
 *  - loadPageModules fuera del await critico
 *  - cdn-panel NO importa cdn-snippet desde src/
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
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

test('CSS del kit es dist/cdn (consumo); shell local', () => {
  assert.match(indexHtml, /<link\s+rel="stylesheet"\s+href="dist\/cdn\/is-base\.min\.css"/);
  assert.match(indexHtml, /<link\s+rel="stylesheet"\s+href="dist\/cdn\/palettes\.min\.css"/);
  assert.match(indexHtml, /<link\s+rel="stylesheet"\s+href="src\/styles\/shell\.css"/);
  assert.match(indexHtml, /<link\s+rel="stylesheet"\s+href="src\/styles\/presentation\.css"/);
  assert.match(
    indexHtml,
    /<link\s+rel="stylesheet"\s+href="dist\/cdn\/preview\/preview-component\.min\.css"/,
  );
  assert.doesNotMatch(indexHtml, /href="src\/styles\/is-base\.css"/);
});

test('head no hace await loadCSS* / loadPageStyles en el boot', () => {
  const boot = headBootModule(indexHtml);
  assert.doesNotMatch(boot, /await\s+L\.loadCSSBase\s*\(/);
  assert.doesNotMatch(boot, /await\s+L\.loadCSSPalettesDefault\s*\(/);
  assert.doesNotMatch(boot, /await\s+L\.loadPageStyles\s*\(/);
});

test('await critico del head = shell tags + preview dist (no all, no pageModules)', () => {
  const boot = headBootModule(indexHtml);
  assert.match(boot, /await\s+Promise\.all\s*\(/);
  assert.match(boot, /L\.load\s*\([\s\S]*is-split-panel[\s\S]*is-button/);
  assert.match(
    boot,
    /import\s*\(\s*['"]\.\/dist\/cdn\/preview\/preview-component\.min\.js['"]\s*\)/,
  );
  assert.match(boot, /dataset\.kitShell\s*=\s*['"]1['"]/);

  const tryBlock = boot.match(/try\s*\{([\s\S]*?)dataset\.kitShell/);
  assert.ok(tryBlock, 'falta try + dataset.kitShell tras el shell');
  const critical = tryBlock[1];
  assert.doesNotMatch(critical, /L\.load\s*\(\s*['"]all['"]\s*\)/);
  assert.doesNotMatch(critical, /loadPageModules\s*\(/);
});

test('loadPageModules vive fuera del path critico (fire-and-forget)', () => {
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

test('SPA de galeria se consume desde dist/gallery-app.min.js (no src/*.ts)', () => {
  assert.match(indexHtml, /src=["']\.\/dist\/gallery-app\.min\.js["']/);
  assert.doesNotMatch(indexHtml, /from\s+['"]\.\/src\/previews\/registry\.ts['"]/);
  assert.doesNotMatch(indexHtml, /from\s+['"]\.\/src\/cdn\/collect-is-tags\.ts['"]/);
  assert.ok(
    existsSync(join(root, 'src', 'gallery', 'app.ts')),
    'fuente: src/gallery/app.ts',
  );
  // Tras build debe existir el artefacto; si falta, el test avisa (correr npm run build).
  if (!existsSync(join(root, 'dist', 'gallery-app.min.js'))) {
    console.warn('gallery-boot: falta dist/gallery-app.min.js — corre npm run build');
  }
});

test('fuente gallery app usa setHostPreview + whenDefined', () => {
  const body = read('src/gallery/app.ts');
  assert.match(body, /function\s+setHostPreview\s*\(/);
  assert.match(body, /hasOwnProperty\.call\(\s*previewHost\s*,\s*['"]preview['"]\s*\)/);
  assert.match(body, /delete\s+previewHost\.preview/);
  assert.match(body, /customElements\.whenDefined\(\s*['"]is-preview-component['"]\s*\)/);
});

test('cdn-panel importa cdn-snippet desde dist/cdn (no src/)', () => {
  assert.match(cdnPanel, /dist\/cdn\/feedback\/cdn-snippet\.min\.js/);
  assert.doesNotMatch(
    cdnPanel,
    /from\s+['"]\.\.\/src\/components\/feedback\/cdn-snippet\.js['"]/,
  );
});

test('head arranca con loader.min.js desde core/ (no all.min suelto)', () => {
  assert.match(indexHtml, /dist\/cdn\/(?:core\/)?loader\.min\.js/);
  assert.doesNotMatch(indexHtml, /<script\s+type="module"\s+src="dist\/cdn\/all\.min\.js"/);
});
