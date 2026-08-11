/**
 * is-button-playground.test.mjs — el playground debe tener behavior cableado.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('catalog registra behavior de is-button', () => {
  const cat = read('src/previews/catalog.js');
  assert.match(cat, /"is-button"[\s\S]*?behaviors\/is-button\.js/);
  assert.ok(existsSync(join(root, 'src/previews/behaviors/is-button.js')));
});

test('playground usa color/variant (no appearance legacy) y pgOut', () => {
  const json = JSON.parse(read('src/previews/actions/is-button.json'));
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
  const src = read('src/previews/behaviors/is-button.js');
  assert.match(src, /setAttribute\(\s*['"]color['"]/);
  assert.match(src, /setAttribute\(\s*['"]variant['"]/);
  assert.match(src, /toggleAttribute\(\s*['"]pill['"]/);
  assert.match(src, /wirePlayground/);
  assert.match(src, /setAttribute\(\s*['"]slot['"]/);
  assert.match(src, /makeIcon\([^,]+,\s*['"]start['"]\)/);
});
