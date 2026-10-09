/**
 * cdn-mirrors.test.ts — espejos viven en cdn-ref; el panel CDN es loader copy-paste.
 *
 *   deno test -A --no-check tests/cdn-mirrors.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

test('cdn-ref declara jsDelivr + GitHub Pages', async () => {
  const src = await readFile(join(raiz, 'src/components/_shared/cdn-ref.ts'), 'utf8');
  assert.match(src, /export const MIRRORS/);
  assert.match(src, /id:\s*['"]jsdelivr['"]/);
  assert.match(src, /id:\s*['"]pages['"]/);
  assert.match(src, /jeff-aporta\.github\.io\/iswc-root/);
  assert.match(src, /fallbackBases/);
});

test('cdn-snippet: loader copy-paste; L.load del tag (sin radio de alcance, sin mirrors ni all.min)', async () => {
  const src = await readFile(join(raiz, 'src/components/feedback/cdn-snippet.ts'), 'utf8');
  assert.doesNotMatch(src, /data-tab=["']mirrors["']/);
  assert.doesNotMatch(src, /all\.min\.js/);
  assert.doesNotMatch(src, /name="cdn-scope"/);
  assert.doesNotMatch(src, /Alcance de la carga/);
  assert.doesNotMatch(src, /#persistScopeToUrl|#restoreScopeFromUrl/);
  assert.match(src, /#loadArg\(\)/);
  assert.match(src, /#buildLoaderSnippet/);
  assert.match(src, /loader\.min\.js/);
  assert.match(src, /type="module" src=/);
  assert.match(src, /ISWebComponentsLoader/);
  // W52: loadCSSBase se elimino; el loader auto-carga is-base.min.css.
  // Palettes: alias iswc-palettes-default vía loadPageStyles.
  assert.match(src, /iswc-palettes-default|loadPageStyles/);
  assert.doesNotMatch(src, /loadCSSPalettesDefault/);
  assert.match(src, /await L\.load\(/);
  assert.match(src, /data-copy=["']loader["']/);
});

test('listSources expone ambos espejos', async () => {
  const src = await readFile(join(raiz, 'src/utils/cdn-sources.ts'), 'utf8');
  assert.match(src, /MIRRORS/);
  assert.match(src, /listSources/);
});
