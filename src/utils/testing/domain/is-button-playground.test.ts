/**
 * is-button-playground.test.ts — el playground debe tener behavior cableado.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('catalog registra behavior de is-button', () => {
  const cat = read('src/previews/catalog.ts');
  assert.match(cat, /"is-button"[\s\S]*?\.\.\/components\/actions\/button\.preview\.js/);
  assert.ok(existsSync(join(root, 'src/components/actions/button.preview.ts')));
});

test('playground usa color/variant (no appearance legacy) y pgOut', () => {
  const json = JSON.parse(read('src/components/actions/button.json'));
  assert.equal(json.hasBehavior, true);
  const section = json.sections.find((s) => s.id === 'playground');
  assert.ok(section);
  const html = section.blocks.map((b) => b.html || '').join('\n');
  assert.match(html, /id="pgColor"/);
  assert.match(html, /id="pgVariant"/);
  assert.match(html, /id="pgOut"/);
  assert.match(html, /id="pgBtn"/);
  assert.doesNotMatch(html, /id="pgAppearance"/);
  assert.doesNotMatch(html, /<label for="pgVariant">variant<\/label>\s*<select id="pgVariant">\s*<option>brand/);
});

test('behavior aplica color/variant/pill al #pgBtn', () => {
  const src = read('src/components/actions/button.preview.ts');
  assert.match(src, /setAttribute\(\s*['"]color['"]/);
  assert.match(src, /setAttribute\(\s*['"]variant['"]/);
  assert.match(src, /toggleAttribute\(\s*['"]pill['"]/);
  assert.match(src, /wirePlayground/);
  assert.match(src, /setAttribute\(\s*['"]slot['"]/);
  assert.match(src, /makeIcon\([^,]+,\s*['"]start['"]\)/);
});
