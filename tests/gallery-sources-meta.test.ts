/**
 * gallery-sources-meta.test.ts
 *
 * Caza regresiones del chrome de galería (ago/2026):
 *  - barra = `.file-meta*` (sin hints / `.vs-page-bar` montado)
 *  - modal fuentes full-page + `#vsPath` como `<a>` con URL absoluta
 *  - tag canónico `is-code` (no `is-code-editor`)
 *  - pesos vía `resolveCdnMinPaths` + `is-format-bytes`
 *
 * Extensión: *.test.mjs (no .ts). La carpeta tests/ se commitea;
 * solo se ignoran *.tmp / coverage / .cache.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const stripComments = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

test('manifest usa is-code (no is-code-editor)', () => {
  const src = read('src/manifest.js');
  assert.match(src, /tag:\s*['"]is-code['"]/);
  assert.doesNotMatch(src, /is-code-editor/);
  assert.ok(existsSync(join(root, 'src/previews/code/is-code.json')));
  assert.ok(existsSync(join(root, 'src/previews/behaviors/is-code.ts')));
  assert.ok(!existsSync(join(root, 'src/previews/code/is-code-editor.json')));
});

test('component-sources: localSourceUrl es absoluta (.href)', async () => {
  const mod = await import(pathToFileURL(join(root, 'scripts/component-sources.js')).href);
  const url = mod.localSourceUrl('src/components/actions/button.ts');
  // En Node es file://…; en browser Live Server es http(s)://host/…
  assert.match(url, /^[a-z][a-z0-9+.-]*:\/\//i, `esperado URL absoluta, got: ${url}`);
  assert.match(url, /\/src\/components\/actions\/button\.ts$/);
  assert.ok(typeof mod.resolveCdnMinPaths === 'function');
  assert.ok(typeof mod.fetchSourceFile === 'function');
});

test('view-sources: path absoluto, full-page, sin vs-page-bar con hints', () => {
  const src = read('scripts/view-sources.js');
  const code = stripComments(src);

  assert.match(src, /function absoluteSourceUrl/);
  assert.match(src, /localSourceUrl/);
  assert.match(src, /<a class="vs-path" id="vsPath"/);
  assert.doesNotMatch(src, /<p class="vs-path" id="vsPath"/);

  assert.match(src, /setAttribute\(\s*['"]width['"]\s*,\s*['"]100vw['"]\s*\)/);
  assert.match(src, /setAttribute\(\s*['"]spacing['"]\s*,\s*['"]0['"]\s*\)/);
  assert.match(src, /is-view-sources/);
  assert.match(src, /is-after-show/);
  assert.match(src, /function refreshEditor/);
  assert.match(src, /whenDefined\(['"]is-code['"]\)/);

  // mountPageButton solo limpia legacy; no recrea hints en UI.
  assert.match(src, /querySelectorAll(?:<[^>]+>)?\(['"]\.vs-page-bar['"]\)/);
  assert.doesNotMatch(code, /sin minificar|auditoría\s*\/\s*GH Pages|Pesos CDN y fuentes: cargando/);
  assert.doesNotMatch(code, /className\s*=\s*['"]vs-page-bar['"]/);
  assert.doesNotMatch(code, /['"]vs-page-hint['"]/);
});

test('view-sources: chrome de galería incluye is-tab-group', () => {
  const src = read('src/cdn/collect-is-tags.ts');
  assert.match(src, /GALLERY_CHROME_TAGS/);
  assert.match(src, /is-tab-group/);
});

test('highlight-code: paintOne asigna value siempre (no fiarse del getter)', () => {
  const src = read('src/components/_shared/highlight-code.ts');
  assert.match(src, /el\.value = text/);
  assert.doesNotMatch(src, /if \(el\.value !== text\) el\.value = text/);
});

test('demo-file-meta: una sola barra de página (no h2 / no demos / sin is-code en paths)', () => {
  const src = read('scripts/demo-file-meta.js');
  assert.match(src, /file-meta-page/);
  assert.match(src, /vs-page-bar/);
  assert.match(src, /is-format-bytes/);
  assert.match(src, /resolveCdnMinPaths/);
  assert.match(src, /openViewSources/);
  assert.match(src, /preserveMainScroll/);
  assert.match(src, /createElement\(['"]code['"]\)/);
  assert.doesNotMatch(src, /createElement\(['"]is-code['"]\)/);
  assert.doesNotMatch(src, /sin minificar|auditoría\s*\/\s*GH Pages/);
  assert.doesNotMatch(src, /function mountUnderSectionTitles|function mountInDemo/);
  assert.doesNotMatch(src, /is-demo-connected/);
});

test('is-code preserva scroll del is-main (evita F5 al final)', () => {
  const src = read('src/components/code/code.ts');
  // Motor nativo: ningún path llama scrollIntoView (el que movía el is-main al
  // final en F5) y el scroll de edición queda local (textarea .ic-input con
  // translate del <pre>), nunca sobre el ancestro is-main/.main.
  assert.match(src, /#onEditScroll/);
  assert.match(src, /translate\(\$?\{?-ta\.scrollLeft/);
  assert.doesNotMatch(src, /\.scrollIntoView\(/);
});

test('is-main: restore window amplio + scroll-behavior auto en CSS', () => {
  // RESTORE_WINDOW vive en _shared/scroll-memory.ts (refactor desde main.ts).
  const memory = read('src/components/_shared/scroll-memory.ts');
  assert.match(memory, /RESTORE_WINDOW\s*=\s*4_?500/);
  const css = read('src/styles/presentation.css');
  assert.match(css, /is-main\.main\s*\{[\s\S]*?scroll-behavior:\s*auto/);
});

test('presentation.css: full-page view-sources + vs-page-bar oculto', () => {
  const css = read('src/styles/presentation.css');
  assert.match(css, /is-dialog\.is-view-sources/);
  assert.match(css, /::part\(dialog\)/);
  assert.match(css, /align-self:\s*stretch/);
  assert.match(css, /justify-self:\s*stretch/);
  assert.match(css, /\.vs-page-bar[\s\S]{0,120}display:\s*none/);
  assert.doesNotMatch(css, /--width:\s*min\(\s*96vw/);
  assert.doesNotMatch(css, /\.vs-panel\s*\{[\s\S]{0,80}height:\s*min\(\s*70vh/);
  // `.file-meta-page` debe scrollear con el contenido (no pegajosa).
  assert.doesNotMatch(css, /\.file-meta-page\s*\{[^}]*position:\s*sticky/);
});

test('index + shell cargan view-sources y demo-file-meta', () => {
  for (const rel of ['index.html', 'src/previews/_shell.html']) {
    const html = read(rel);
    assert.match(html, /view-sources\.js/, rel);
    assert.match(html, /demo-file-meta\.js/, rel);
    assert.match(html, /presentation\.css/, rel);
  }
});

test('code/LLM.md documenta contrato y errores de fuentes/meta', () => {
  const md = read('src/components/code/LLM.md');
  assert.match(md, /## Qué hacer/);
  assert.match(md, /## Qué no hacer/);
  assert.match(md, /## Errores conocidos y prevención/);
  assert.match(md, /is-code-editor/);
  assert.match(md, /vs-page-bar/);
  assert.match(md, /#vsPath|vsPath/);
  assert.match(md, /file-meta/);
  assert.match(md, /gallery-sources-meta/);
  assert.match(md, /is-latex/);
  assert.match(md, /is-latex-doc/);
});
