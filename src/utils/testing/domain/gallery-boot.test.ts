/**
 * gallery-boot.test.ts
 *
 * Boot de la galería local vía loader (`configure({ local: true })`):
 *  - sin <link> de kit (is-base / palettes los inyecta el loader)
 *  - shell = L.load(...).then/.catch (sin try/catch)
 *  - loadPageModules / loadPageStyles fuera del path crítico (fire-and-forget)
 *  - theme/CSS críticos en index.js / index.css; boot en index.mjs
 *  - SPA desde dist/gallery-app.min.js (head + defer)
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');
const indexHtml = read('index.html');
const indexMjs = read('index.mjs');
const indexJs = read('index.js');
const indexCss = read('index.css');
const cdnPanel = read('scripts/cdn-panel.js');
const loaderTs = read('src/cdn/loader.ts');

test('galería: CSS del kit vía loader (sin <link> is-base/palettes/preview)', () => {
  assert.doesNotMatch(indexHtml, /<link\s+rel="stylesheet"\s+href="dist\/cdn\/is-base/);
  assert.doesNotMatch(indexHtml, /<link\s+rel="stylesheet"\s+href="dist\/cdn\/palettes/);
  assert.doesNotMatch(indexHtml, /<link\s+rel="stylesheet"\s+href="dist\/cdn\/preview\/preview-component/);
  assert.doesNotMatch(indexHtml, /href="src\/styles\/is-base\.css"/);
  assert.match(indexMjs, /loadPageStyles\s*\(/);
  assert.match(indexMjs, /iswc-palettes-default/);
  assert.match(indexMjs, /shell\.css/);
  assert.match(indexMjs, /presentation\.css/);
  assert.doesNotMatch(indexMjs, /loadCSSPalettesDefault/);
  assert.match(loaderTs, /iswc-palettes-default/);
  assert.doesNotMatch(loaderTs, /loadCSSPalettesDefault\s*\(/);
});

test('galería: configure({ local: true }) — sin mirrors ni pin', () => {
  assert.match(indexMjs, /configure\s*\(\s*\{\s*local\s*:\s*true\s*\}\s*\)/);
  assert.doesNotMatch(indexMjs, /mirrors\s*:\s*\[\s*['"]jsdelivr['"]/);
  assert.doesNotMatch(indexMjs, /preferSelf\s*:\s*true/);
  assert.match(loaderTs, /local\?:\s*boolean/);
  assert.match(loaderTs, /mirrorsExplicit/);
  assert.match(loaderTs, /resolveHostInput/);
});

test('shell = L.load(...).then/.catch; preview-component desde catálogo (sin registerApp)', () => {
  assert.match(indexMjs, /L\.load\s*\(/);
  assert.match(indexMjs, /iswc-split-panel[\s\S]*iswc-button/);
  assert.match(indexMjs, /iswc-preview-component/);
  assert.doesNotMatch(indexMjs, /registerApp\s*\(/);
  assert.doesNotMatch(indexMjs, /import\s*\(\s*['"]\.\/dist\/cdn\/preview\/preview-component/);
  assert.match(indexMjs, /\.then\s*\(/);
  assert.match(indexMjs, /\.catch\s*\(/);
  assert.doesNotMatch(indexMjs, /\btry\s*\{/);
  assert.match(indexMjs, /dataset\.kitShell\s*=\s*['"]1['"]/);

  const beforeThen = indexMjs.split(/\.then\s*\(/)[0] ?? '';
  assert.doesNotMatch(beforeThen, /L\.load\s*\(\s*['"]all['"]\s*\)/);
  assert.doesNotMatch(beforeThen, /loadPageModules\s*\(/);
});

test('loadPageModules vive fuera del path crítico (fire-and-forget)', () => {
  assert.doesNotMatch(indexMjs, /L\.load\s*\(\s*['"]all['"]\s*\)/);
  assert.match(indexMjs, /loadPageModules\s*\(/);
  assert.match(indexMjs, /dev-reload/);
  const afterShell = indexMjs.split(/dataset\.kitShell\s*=\s*['"]1['"]/)[1] ?? '';
  assert.ok(afterShell.length > 20, 'boot truncado tras kitShell');
  assert.doesNotMatch(afterShell, /await\s+L\.loadPageModules\s*\(/);
});

test('index.html enlaza index.js / index.css / index.mjs (sin lógica embebida)', () => {
  assert.match(indexHtml, /src=["']\.\/index\.js["']/);
  assert.match(indexHtml, /href=["']\.\/index\.css["']/);
  assert.match(indexHtml, /src=["']\.\/index\.mjs["']/);
  assert.doesNotMatch(indexHtml, /<script\s+type="module">/);
  assert.doesNotMatch(indexHtml, /atob\(|loadPageStyles|ISWebComponentsLoader/);
  assert.match(indexJs, /iswc-theme|data-theme|localStorage/);
  assert.match(indexCss, /data-theme=["']dark["']/);
  assert.match(indexCss, /:not\(:defined\)/);
});

test('index.html no embebe lógica de reload-pin (va en scripts/dev-reload.js)', () => {
  assert.doesNotMatch(indexHtml, /iswc-auto-rereload|reload-pin/);
  assert.ok(existsSync(join(root, 'scripts', 'dev-reload.js')), 'falta scripts/dev-reload.js');
  assert.match(loaderTs, /dev-reload/);
});

test('sin preview-boot.js externo; theme sync en index.js', () => {
  assert.doesNotMatch(indexHtml, /preview-boot\.js/);
  assert.match(indexJs, /iswc-theme|data-theme/);
});

test('meta sin ContaPyme/InSoft redundantes ni offers de venta', () => {
  assert.doesNotMatch(indexHtml, /ContaPyme\s*\/\s*InSoft/);
  assert.doesNotMatch(indexHtml, /"offers"\s*:/);
  assert.doesNotMatch(indexHtml, /"author"\s*:\s*\{\s*"@type"\s*:\s*"Person"/);
  assert.match(indexHtml, /open source/i);
});

test('no reimportar preview-component ni icon-loader desde src/', () => {
  assert.doesNotMatch(indexHtml, /src\/components\/layout\/preview-component\.js/);
  assert.doesNotMatch(indexHtml, /src\/components\/media\/icon\.js/);
  assert.doesNotMatch(indexHtml, /src\/components\/_shared\/icon-loader\.js/);
});

test('SPA de galeria se consume desde dist/gallery-app.min.js (head + defer)', () => {
  assert.match(indexHtml, /src=["']\.\/dist\/gallery-app\.min\.js(?:\?h=[0-9a-z]{6})?["'][^>]*\bdefer\b/);
  assert.doesNotMatch(indexHtml, /from\s+['"]\.\/src\/previews\/registry\.ts['"]/);
  assert.ok(existsSync(join(root, 'src', 'gallery', 'app.ts')), 'fuente: src/gallery/app.ts');
});

test('fuente gallery app usa setHostPreview + whenDefined', () => {
  const body = read('src/gallery/app.ts');
  assert.match(body, /function\s+setHostPreview\s*\(/);
  assert.match(body, /hasOwnProperty\.call\(\s*previewHost\s*,\s*['"]preview['"]\s*\)/);
  assert.match(body, /delete\s+previewHost\.preview/);
  assert.match(body, /customElements\.whenDefined\(\s*['"]iswc-preview-component['"]\s*\)/);
});

test('cdn-panel importa cdn-snippet desde dist/cdn (no src/)', () => {
  assert.match(cdnPanel, /dist\/cdn\/feedback\/cdn-snippet\.min\.js/);
  assert.doesNotMatch(
    cdnPanel,
    /from\s+['"]\.\.\/src\/components\/feedback\/cdn-snippet\.js['"]/,
  );
});

test('head arranca con loader.min.js desde core/ (no all.min suelto)', () => {
  assert.match(indexMjs, /dist\/cdn\/(?:core\/)?loader\.min\.js/);
  assert.doesNotMatch(indexHtml, /<script\s+type="module"\s+src="dist\/cdn\/all\.min\.js"/);
});
