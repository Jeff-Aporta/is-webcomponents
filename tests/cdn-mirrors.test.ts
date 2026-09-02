/**
 * cdn-mirrors.test.ts — espejos viven en cdn-ref; el panel CDN es loader copy-paste.
 *
 *   node --test tests/cdn-mirrors.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

test('cdn-ref declara jsDelivr + GitHub Pages', async () => {
  const src = await readFile(join(raiz, 'src/components/_shared/cdn-ref.ts'), 'utf8');
  assert.match(src, /export const MIRRORS/);
  assert.match(src, /id:\s*['"]jsdelivr['"]/);
  assert.match(src, /id:\s*['"]pages['"]/);
  assert.match(src, /jeff-aporta\.github\.io\/is-webcomponents/);
  assert.match(src, /fallbackBases/);
});

test('cdn-snippet: loader copy-paste; alcance tag|category|all vía L.load (sin mirrors ni all.min)', async () => {
  const src = await readFile(join(raiz, 'src/components/feedback/cdn-snippet.ts'), 'utf8');
  // Espejos y all.min siguen fuera del panel: todo pasa por core/loader.min.js.
  assert.doesNotMatch(src, /data-tab=["']mirrors["']/);
  assert.doesNotMatch(src, /all\.min\.js/);
  // El alcance (tag|category|all) son radios del fieldset .cdn__scope; su
  // argumento lo expande el LOADER (L.load('is-button') / 'actions' / 'all'),
  // nunca bundles sueltos category.*.min.js / all.min.js.
  assert.match(src, /name="cdn-scope"/);
  assert.match(src, /value="tag"/);
  assert.match(src, /value="category"/);
  assert.match(src, /value="all"/);
  assert.match(src, /SCOPES\s*=\s*\[/);
  assert.match(src, /#persistScopeToUrl|#restoreScopeFromUrl/);
  assert.match(src, /'url-key'/);
  assert.match(src, /#buildLoaderSnippet/);
  assert.match(src, /loader\.min\.js/);
  assert.match(src, /type="module" src=/);
  assert.match(src, /ISWebComponentsLoader/);
  assert.match(src, /loadCSSBase/);
  assert.match(src, /loadCSSPalettesDefault/);
  assert.match(src, /await L\.load\(/);
  assert.match(src, /data-copy=["']loader["']/);
});

test('listSources expone ambos espejos', async () => {
  const src = await readFile(join(raiz, 'scripts/cdn-sources.js'), 'utf8');
  assert.match(src, /MIRRORS/);
  assert.match(src, /listSources/);
});
