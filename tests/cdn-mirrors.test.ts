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

test('cdn-snippet: loader src + script load; sin radios category/all', async () => {
  const src = await readFile(join(raiz, 'src/components/feedback/cdn-snippet.ts'), 'utf8');
  assert.doesNotMatch(src, /data-tab=["']mirrors["']/);
  assert.doesNotMatch(src, /name="cdn-scope"/);
  assert.doesNotMatch(src, /value="category"/);
  assert.doesNotMatch(src, /all\.min\.js/);
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
