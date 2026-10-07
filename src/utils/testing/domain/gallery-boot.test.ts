/**
 * gallery-boot.test.ts
 *
 * Boot vía iswc-doc-demo (boot ESM vía loader + host module + CE):
 *  - sin <link> de kit; palettes/shell vía loader aliases
 *  - index.html: loader module → iswc-doc-demo-host + iswc-gallery-app + <iswc-doc-demo>
 *  - pageModules classic vs module en loader; boot alias type module
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');
const indexHtml = read('index.html');
const loaderTs = read('src/cdn/loader.ts');
const docDemoTs = read('src/components/layout/doc-demo.ts');
const bootTs = read('src/components/layout/doc-demo-boot.ts');
const hostTs = read('src/components/layout/doc-demo-host.ts');
const cdnPanel = read('scripts/cdn-panel.js');

test('galería: CSS del kit vía loader aliases (sin <link> is-base/palettes)', () => {
  assert.doesNotMatch(indexHtml, /<link\s+rel="stylesheet"\s+href="dist\/cdn\/is-base/);
  assert.doesNotMatch(indexHtml, /<link\s+rel="stylesheet"\s+href="dist\/cdn\/palettes/);
  assert.match(loaderTs, /iswc-palettes-default/);
  assert.match(loaderTs, /iswc-doc-shell/);
  assert.match(loaderTs, /iswc-doc-presentation/);
  assert.doesNotMatch(loaderTs, /loadCSSPalettesDefault\s*\(/);
  assert.match(docDemoTs, /iswc-palettes-default/);
  assert.match(docDemoTs, /iswc-doc-shell/);
});

test('index.html: loader module + iswc-doc-demo (boot vía aliases; sin index.js/mjs/css)', () => {
  assert.doesNotMatch(indexHtml, /doc-demo-boot\.min\.js/);
  assert.match(indexHtml, /ISWebComponentsLoader|from ['"].*loader\.min\.js['"]/);
  assert.match(indexHtml, /loadPageModules\s*\(\s*\[[\s\S]*iswc-doc-demo-host/);
  assert.match(indexHtml, /loadPageModules\s*\(\s*\[[\s\S]*iswc-gallery-app/);
  assert.doesNotMatch(indexHtml, /<script[^>]+src=["'][^"']*doc-demo-host\.min\.js/);
  assert.doesNotMatch(indexHtml, /<script[^>]+src=["'][^"']*gallery-app\.min\.js/);
  assert.match(indexHtml, /<iswc-doc-demo[\s\S]*\blocal\b/);
  assert.match(indexHtml, /<iswc-doc-demo[\s\S]*\bdev\b/);
  assert.match(indexHtml, /sheets-cache=["']iswc-gallery-sheets["']/);
  assert.doesNotMatch(indexHtml, /src=["']\.\/index\.js["']/);
  assert.doesNotMatch(indexHtml, /src=["']\.\/index\.mjs["']/);
  assert.doesNotMatch(indexHtml, /href=["']\.\/index\.css["']/);
  assert.ok(!existsSync(join(root, 'index.js')), 'index.js debe eliminarse');
  assert.ok(!existsSync(join(root, 'index.mjs')), 'index.mjs debe eliminarse');
  assert.ok(!existsSync(join(root, 'index.css')), 'index.css debe eliminarse');
});

test('boot ESM + host module fuentes', () => {
  assert.match(bootTs, /data-theme|iswc-theme|localStorage/);
  assert.match(bootTs, /export\s+(async\s+)?function\s+applyDocDemoBoot|export\s*\{/);
  assert.match(hostTs, /configure\s*\(/);
  assert.match(hostTs, /local:\s*true/);
  assert.match(hostTs, /loadPageModules\s*\(\s*\[\s*['"]iswc-doc-demo-boot['"]\s*\]\s*\)/);
  assert.match(hostTs, /load\s*\(\s*['"]iswc-doc-demo['"]\s*\)/);
  assert.match(docDemoTs, /defineElement\s*\(\s*['"]iswc-doc-demo['"]/);
  assert.match(docDemoTs, /id=["']shellNav["']/);
  assert.match(docDemoTs, /id=["']previewHost["']/);
  assert.match(read('src/components/layout/doc-demo.css'), /display:\s*contents/);
});

test('loader: pageModules classic vs module', () => {
  assert.match(loaderTs, /type:\s*['"]classic['"]/);
  assert.match(loaderTs, /type:\s*['"]module['"]/);
  assert.match(loaderTs, /iswc-doc-demo-boot[\s\S]*type:\s*['"]module['"]/);
  assert.match(loaderTs, /iswc-doc-demo-host/);
  assert.match(loaderTs, /iswc-gallery-app[\s\S]*gallery-app\.min\.js/);
  assert.match(loaderTs, /loadClassicOnce|type === 'classic'/);
  assert.match(loaderTs, /dev-reload[\s\S]*classic/);
});

test('index.html no embebe lógica de reload-pin', () => {
  assert.doesNotMatch(indexHtml, /iswc-auto-rereload|reload-pin/);
  assert.ok(existsSync(join(root, 'scripts', 'dev-reload.js')));
  assert.match(loaderTs, /dev-reload/);
});

test('sin preview-boot.js externo; theme sync en doc-demo-boot', () => {
  assert.doesNotMatch(indexHtml, /preview-boot\.js/);
  assert.match(bootTs, /iswc-theme|data-theme/);
});

test('meta sin ContaPyme/InSoft, sin license, sin offers', () => {
  assert.doesNotMatch(indexHtml, /ContaPyme\s*\/\s*InSoft/);
  assert.doesNotMatch(indexHtml, /"offers"\s*:/);
  assert.doesNotMatch(indexHtml, /"license"\s*:/);
  assert.doesNotMatch(indexHtml, /"author"\s*:\s*\{\s*"@type"\s*:\s*"Person"/);
  assert.match(indexHtml, /open source/i);
});

test('no reimportar preview-component ni icon-loader desde src/', () => {
  assert.doesNotMatch(indexHtml, /src\/components\/layout\/preview-component\.js/);
  assert.doesNotMatch(indexHtml, /src\/components\/media\/icon\.js/);
  assert.doesNotMatch(indexHtml, /src\/components\/_shared\/icon-loader\.js/);
});

test('SPA de galeria vía loader alias iswc-gallery-app', () => {
  assert.match(indexHtml, /iswc-gallery-app/);
  assert.match(loaderTs, /iswc-gallery-app[\s\S]*dist\/gallery-app\.min\.js/);
  assert.ok(existsSync(join(root, 'src', 'gallery', 'app.ts')));
});

test('fuente gallery app usa setHostPreview + whenDefined', () => {
  const body = read('src/gallery/app.ts');
  assert.match(body, /function\s+setHostPreview\s*\(/);
  assert.match(body, /customElements\.whenDefined\(\s*['"]iswc-preview-component['"]\s*\)/);
});

test('gallery-app espera shell iswc-doc-demo antes de tocar #shellNav', () => {
  const body = read('src/gallery/app.ts');
  assert.match(body, /waitForGalleryShell/);
  assert.match(body, /await\s+waitForGalleryShell\s*\(/);
  assert.match(body, /whenDefined\(\s*['"]iswc-doc-demo['"]\s*\)/);
  assert.match(body, /iswc-gallery-shell-ready/);
  const waitIdx = body.indexOf('await waitForGalleryShell');
  const navIdx = body.indexOf("el<HTMLElement>('shellNav')");
  assert.ok(waitIdx >= 0 && navIdx > waitIdx, 'waitForGalleryShell antes de el(shellNav)');
});

test('cdn-panel importa cdn-snippet desde dist/cdn', () => {
  assert.match(cdnPanel, /dist\/cdn\/feedback\/cdn-snippet\.min\.js/);
});

test('manifest declara iswc-doc-demo', () => {
  const man = read('src/manifest.ts');
  assert.match(man, /tag:\s*['"]iswc-doc-demo['"]/);
});

test('iswc-doc-demo transversal: defaults sin gallery/dev-reload; API whenReady', () => {
  assert.match(docDemoTs, /whenReady\s*\(/);
  assert.match(docDemoTs, /iswc-doc-demo-ready/);
  assert.match(docDemoTs, /storage-key-nav['"]\s*\)\s*\|\|\s*['"]iswc-doc-nav['"]/);
  assert.doesNotMatch(docDemoTs, /DEFAULT_PAGE_MODULES\s*=\s*\[[^\]]*dev-reload/s);
  assert.match(docDemoTs, /hasAttribute\(\s*['"]dev['"]\s*\)/);
  assert.match(bootTs, /theme-storage-key|palette-storage-key/);
  assert.match(hostTs, /CDN|cdn\.jsdelivr|cualquier app|reutilizable/i);
});
