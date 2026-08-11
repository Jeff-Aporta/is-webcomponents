/**
 * demo-equiv.test.mjs — el bloque «HTML puro equivalente» ya no se pinta.
 * Los campos equiv* pueden seguir en el JSON (datos), pero render no los muestra.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

test('tipos aún declaran equivHtml / equivNote / equivFlow (opcionales)', async () => {
  const src = await readFile(join(raiz, 'src/previews/_kit/types.d.ts'), 'utf8');
  assert.match(src, /equivHtml\?:/);
  assert.match(src, /equivNote\?:/);
  assert.match(src, /equivFlow\?:/);
});

test('render NO pinta HTML puro equivalente ni .demo-equiv', async () => {
  const src = await readFile(join(raiz, 'src/previews/_kit/render.js'), 'utf8');
  assert.doesNotMatch(src, /HTML puro equivalente/);
  assert.doesNotMatch(src, /renderDemoEquiv/);
  assert.doesNotMatch(src, /demo-equiv/);
  assert.match(src, /demo-block/);
});

test('bloques code no marcan data-cm prematuro (deja paint/inferir lang)', async () => {
  const src = await readFile(join(raiz, 'src/previews/_kit/render.js'), 'utf8');
  const codeCase = src.slice(src.indexOf("case 'code':"), src.indexOf("case 'html':"));
  assert.doesNotMatch(codeCase, /dataset\.cm\s*=/);
  assert.match(codeCase, /is-code/);
});
