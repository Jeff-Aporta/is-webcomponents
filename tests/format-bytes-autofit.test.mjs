/**
 * Autofit de is-format-bytes + pesos en captions de is-cdn-snippet.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('is-format-bytes declara autofit (unidad ≥ 1)', () => {
  const src = readFileSync(join(root, 'src/components/helpers/format-bytes.js'), 'utf8');
  assert.match(src, /autofit/);
  assert.match(src, /scaleAutofit|n\s*\/\s*1024\s*>=\s*1/);
  assert.match(src, /OBSERVED.*autofit|autofit.*OBSERVED|'autofit'/s);
});

test('is-cdn-snippet pinta pesos con is-format-bytes autofit', () => {
  const src = readFileSync(join(root, 'src/components/feedback/cdn-snippet.js'), 'utf8');
  assert.match(src, /helpers\/format-bytes\.js/);
  assert.match(src, /totalCdnSize/);
  assert.match(src, /#paintSizes/);
  assert.match(src, /data-slot="size-common"/);
  assert.match(src, /data-slot="size-single"/);
  assert.match(src, /data-slot="size-category"/);
  assert.match(src, /data-slot="size-all"/);
  assert.match(src, /<is-format-bytes[^>]*autofit/);
});

test('cdn-sizes expande all.min.js y category.*.min.js', () => {
  const src = readFileSync(join(root, 'src/components/_shared/cdn-sizes.js'), 'utf8');
  assert.match(src, /all\.min\.js/);
  assert.match(src, /category\./);
  assert.match(src, /sizes\.json/);
});

test('cdn-snippet.css tipografía del peso en caption', () => {
  const css = readFileSync(join(root, 'src/components/feedback/cdn-snippet.css'), 'utf8');
  assert.match(css, /\.cdn__size/);
});
