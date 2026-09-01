/**
 * Autofit de is-format-bytes.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('is-format-bytes declara autofit (unidad ≥ 1)', () => {
  const src = readFileSync(join(root, 'src/components/helpers/format-bytes.ts'), 'utf8');
  assert.match(src, /autofit/);
  assert.match(src, /scaleAutofit|n\s*\/\s*1024\s*>=\s*1/);
  assert.match(src, /OBSERVED.*autofit|autofit.*OBSERVED|'autofit'/s);
});

test('is-cdn-snippet no inventa pesos CDN en el panel', () => {
  const src = readFileSync(join(root, 'src/components/feedback/cdn-snippet.ts'), 'utf8');
  assert.doesNotMatch(src, /sizes\.json|totalCdnSize|cdn-sizes/);
  assert.doesNotMatch(src, /data-slot="size-loader"/);
});
