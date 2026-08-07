/**
 * ux-gallery-invariants.test.mjs
 *
 * Caza regresiones de la auditoría UX (6-ago-2026):
 *  - behaviors/is-toast debe crear #toaster si el JSON no lo trae
 *  - ISComponentPreview.on tolera target null
 *  - url-nav solo escribe ?s= (no params sueltos)
 *  - cdn-sizes expande all/category; format-bytes tiene autofit
 *  - captions CDN usan is-format-bytes autofit
 *
 * Extensión: *.test.mjs (no .ts). tests/ se commitea.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('is-toast behavior crea #toaster si falta (no create-on-null)', () => {
  const src = read('src/previews/behaviors/is-toast.js');
  assert.match(src, /getElementById\(['"]toaster['"]\)/);
  assert.match(src, /createElement\(['"]is-toast['"]\)/);
  assert.match(src, /id\s*=\s*['"]toaster['"]|setAttribute\(['"]id['"],\s*['"]toaster['"]\)/);
  // No debe asumir toaster no-null sin crear/fallback
  assert.doesNotMatch(
    src.replace(/\/\*[\s\S]*?\*\//g, ''),
    /const toaster = document\.getElementById\(['"]toaster['"]\);\s*\n\s*toaster\.(create|promise)/,
  );
});

test('ISComponentPreview.on no crashea con target null', () => {
  const src = read('src/previews/_kit/ISComponentPreview.js');
  assert.match(src, /on\(target/);
  assert.match(src, /!target|target\s*==\s*null|typeof target\.addEventListener/);
});

test('url-nav escribe solo dentro de ?s= (STATE_PARAM s)', () => {
  const src = read('src/components/_shared/url-nav.js');
  assert.match(src, /STATE_PARAM\s*=\s*['"]s['"]/);
  assert.match(src, /b64urlEncode|b64urlDecode/);
  assert.match(src, /patchUrlState|writeUrlState/);
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(stripped, /searchParams\.set\(\s*k\s*,/);
  assert.doesNotMatch(stripped, /searchParams\.set\(\s*key\s*,/);
});

test('cdn-sizes + format-bytes autofit + captions CDN', () => {
  assert.ok(existsSync(join(root, 'src/components/_shared/cdn-sizes.js')));
  const sizes = read('src/components/_shared/cdn-sizes.js');
  assert.match(sizes, /all\.min\.js/);
  assert.match(sizes, /category\./);
  assert.match(sizes, /sizes\.json/);

  const fb = read('src/components/helpers/format-bytes.js');
  assert.match(fb, /autofit/);
  assert.match(fb, /n\s*\/\s*1024\s*>=\s*1|scaleAutofit/);

  const snip = read('src/components/feedback/cdn-snippet.js');
  assert.match(snip, /is-format-bytes/);
  assert.match(snip, /autofit/);
  assert.match(snip, /totalCdnSize|#paintSizes/);
});

test('galería mergea keys de ?s= al cambiar component', () => {
  const html = read('index.html');
  assert.match(html, /readStateParam\(\)\s*\|\|\s*\{\}/);
  assert.match(html, /\.\.\.prev,\s*component:/);
});

test('ux-audit harness existe y no se confunde con .test.ts', () => {
  assert.ok(existsSync(join(root, 'scripts/ux-audit.mjs')));
  const src = read('scripts/ux-audit.mjs');
  assert.match(src, /pageerror|console/);
  assert.match(src, /screenshot/);
});
