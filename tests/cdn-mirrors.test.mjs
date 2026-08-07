/**
 * cdn-mirrors.test.mjs — el panel CDN expone espejos + boot con fallback.
 *
 *   npm test -- tests/cdn-mirrors.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

test('cdn-ref declara jsDelivr + GitHub Pages', async () => {
  const src = await readFile(join(raiz, 'src/components/_shared/cdn-ref.js'), 'utf8');
  assert.match(src, /export const MIRRORS/);
  assert.match(src, /id:\s*['"]jsdelivr['"]/);
  assert.match(src, /id:\s*['"]pages['"]/);
  assert.match(src, /jeff-aporta\.github\.io\/is-webcomponents/);
  assert.match(src, /fallbackBases/);
});

test('cdn-snippet tiene tabs Enlaces / Mirrors y boot con fallback', async () => {
  const src = await readFile(join(raiz, 'src/components/feedback/cdn-snippet.js'), 'utf8');
  assert.match(src, /data-tab=["']mirrors["']/);
  assert.match(src, /data-tab=["']enlaces["']/);
  assert.match(src, /data-copy=["']boot["']/);
  assert.match(src, /Boot con fallback/);
  assert.match(src, /for\s*\(\s*const base of MIRRORS\s*\)/);
  assert.match(src, /Object\.assign\(document\.createElement\('link'\)/);
});

test('listSources expone ambos espejos', async () => {
  const src = await readFile(join(raiz, 'scripts/cdn-sources.js'), 'utf8');
  assert.match(src, /MIRRORS/);
  assert.match(src, /listSources/);
});
