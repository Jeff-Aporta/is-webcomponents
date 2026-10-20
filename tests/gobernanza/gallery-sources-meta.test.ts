/**
 * gallery-sources-meta.test.ts
 *
 * Caza regresiones del chrome de galería (ago/2026):
 *  - barra = `.file-meta*` (sin hints / `.vs-page-bar` montado)
 *  - modal fuentes full-page + `#vsPath` como `<a>` con URL absoluta
 *  - tag canónico `iswc-code` (no `iswc-code-editor`)
 *  - pesos vía `resolveCdnMinPaths` + `iswc-format-bytes`
 *
 * Extensión: *.test.mjs (no .ts). La carpeta tests/ se commitea;
 * solo se ignoran *.tmp / coverage / .cache.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });


const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const stripComments = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

test('manifest usa iswc-code (no iswc-code-editor)', () => {
  const src = read('src/manifest.ts');
  assert.match(src, /tag:\s*['"]iswc-code['"]/);
  assert.doesNotMatch(src, /iswc-code-editor/);
  assert.ok(existsSync(join(root, 'src/components/code/code.json')));
  assert.ok(existsSync(join(root, 'src/components/code/utils/code.preview.ts')));
  assert.ok(!existsSync(join(root, 'src/components/code/code-editor.json')));
});

test('component-sources: localSourceUrl es absoluta (.href)', async () => {
  const mod = await import(pathToFileURL(join(root, 'src/utils/source-paths.ts')).href);
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
  assert.match(src, /iswc-view-sources/);
  assert.match(src, /iswc-after-show/);
  assert.match(src, /function refreshEditor/);
  assert.match(src, /whenDefined\(['"]iswc-code['"]\)/);

  // mountPageButton solo limpia legacy; no recrea hints en UI.
  assert.match(src, /querySelectorAll(?:<[^>]+>)?\(['"]\.vs-page-bar['"]\)/);
  assert.doesNotMatch(code, /sin minificar|auditoría\s*\/\s*GH Pages|Pesos CDN y fuentes: cargando/);
  assert.doesNotMatch(code, /className\s*=\s*['"]vs-page-bar['"]/);
  assert.doesNotMatch(code, /['"]vs-page-hint['"]/);
});

test('view-sources: chrome de galería incluye iswc-tab-group', () => {
  const src = read('src/cdn/collect-iswc-tags.ts');
  assert.match(src, /GALLERY_CHROME_TAGS/);
  assert.match(src, /iswc-tab-group/);
});

test('highlight-code: paintOne asigna value siempre (no fiarse del getter)', () => {
  const src = read('src/core/highlight-code.ts');
  // La variable del editor pasó de `el` a `ed`; el contrato es el mismo.
  assert.match(src, /\b(?:el|ed)\.value = text;/);
  assert.doesNotMatch(src, /if \((?:el|ed)\.value !== text\) (?:el|ed)\.value = text/);
});

test('demo-file-meta: ya no monta barra; solo limpia restos', () => {
  const src = read('scripts/demo-file-meta.js');
  assert.match(src, /quitarBarrasMeta|file-meta/);
  assert.match(src, /iswc-preview-ready/);
  assert.match(src, /buildFileMeta/);
  assert.match(src, /return null/);
  assert.doesNotMatch(src, /iswc-format-bytes/);
  assert.doesNotMatch(src, /resolveCdnMinPaths/);
  assert.doesNotMatch(src, /openViewSources/);
  assert.doesNotMatch(src, /function mountUnderSectionTitles|function mountInDemo/);
  assert.doesNotMatch(src, /iswc-demo-connected/);
});

test('iswc-code preserva scroll del iswc-main (evita F5 al final)', () => {
  const src = read('src/components/code/code.ts');
  // Motor nativo: ningún path llama scrollIntoView (el que movía el iswc-main al
  // final en F5) y el scroll de edición queda local (textarea .ic-input con
  // translate del <pre>), nunca sobre el ancestro iswc-main/.main.
  assert.match(src, /#onEditScroll/);
  assert.match(src, /translate\(\$?\{?-ta\.scrollLeft/);
  assert.doesNotMatch(src, /\.scrollIntoView\(/);
});

test('iswc-main: restore window amplio + scroll-behavior auto en CSS', () => {
  // RESTORE_WINDOW vive en _shared/scroll-memory.ts (refactor desde main.ts).
  const memory = read('src/core/scroll-memory.ts');
  assert.match(memory, /RESTORE_WINDOW\s*=\s*4_?500/);
  const css = read('src/styles/presentation.scss');
  assert.match(css, /iswc-main\.main\s*\{[\s\S]*?scroll-behavior:\s*auto/);
});

test('presentation.scss: full-page view-sources + file-meta oculto', () => {
  const css = read('src/styles/presentation.scss');
  assert.match(css, /iswc-dialog\.iswc-view-sources/);
  assert.match(css, /::part\(dialog\)/);
  assert.match(css, /align-self:\s*stretch/);
  assert.match(css, /justify-self:\s*stretch/);
  assert.match(css, /\.vs-page-bar[\s\S]{0,200}display:\s*none/);
  assert.match(css, /\.file-meta[\s\S]{0,120}display:\s*none/);
  assert.doesNotMatch(css, /--width:\s*min\(\s*96vw/);
  assert.doesNotMatch(css, /\.vs-panel\s*\{[\s\S]{0,80}height:\s*min\(\s*70vh/);
});

test('index + shell cargan view-sources y demo-file-meta', () => {
  // El shell de previews los enlaza a mano.
  const shell = read('src/previews/_shell.html');
  assert.match(shell, /view-sources\.js/, '_shell.html');
  assert.match(shell, /demo-file-meta\.js/, '_shell.html');
  assert.match(shell, /presentation\.css/, '_shell.html');
  // index.html ya no los enlaza: monta <iswc-doc-demo>, que los pide al loader
  // por defecto (DEFAULT_PAGE_MODULES / DEFAULT_PAGE_STYLES). Se exige que el
  // index no pise esos defaults y que el loader resuelva cada id a su bundle.
  const index = read('index.html');
  assert.match(index, /<iswc-doc-demo[\s>]/, 'index.html monta iswc-doc-demo');
  assert.doesNotMatch(index, /<iswc-doc-demo[^>]*\spage-(modules|styles)=/, 'index.html no pisa los módulos por defecto');
  const docDemo = read('src/components/layout/doc-demo.ts');
  const mods = docDemo.match(/const DEFAULT_PAGE_MODULES = \[([\s\S]*?)\]/)?.[1] ?? '';
  const styles = docDemo.match(/const DEFAULT_PAGE_STYLES = \[([\s\S]*?)\]/)?.[1] ?? '';
  assert.match(mods, /'view-sources'/);
  assert.match(mods, /'demo-file-meta'/);
  assert.match(styles, /'iswc-doc-presentation'/);
  const loaderSrc = read('src/cdn/loader.ts');
  assert.match(loaderSrc, /\['view-sources',\s*\{\s*href:\s*'dist\/scripts\/view-sources\.min\.js'/);
  assert.match(loaderSrc, /\['demo-file-meta',\s*\{\s*href:\s*'dist\/scripts\/demo-file-meta\.min\.js'/);
  assert.match(loaderSrc, /\['iswc-doc-presentation',\s*'[^']*doc-presentation\.min\.css'\]/);
});

test('specs/lessons.md + code.md documentan contrato y errores de fuentes/meta', () => {
  // Antes: src/components/code/LLM.md documentaba el contrato del componente
  // code y errores conocidos. Consolidación 2026-09-07: el contenido vive
  // repartido entre:
  //   - specs/lessons.md (catálogo de errores consolidado)
  //   - src/components/code/code.md (spec per-componente)
  // El guardián verifica que ambas piezas cubran el contrato: visor de
  // fuentes, file-meta, gallery-sources-meta (guardián citado).
  const lessons = read('specs/lessons.md');
  const codeMd = read('src/components/code/code.md');
  const ambos = lessons + '\n' + codeMd;
  assert.match(ambos, /visor de fuentes|openViewSources|file-meta/i);
  assert.match(ambos, /gallery-sources-meta/);
});

export default lista();
