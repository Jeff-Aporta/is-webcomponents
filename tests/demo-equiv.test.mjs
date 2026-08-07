/**
 * demo-equiv.test.mjs — contrato HTML puro equivalente en demos.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

test('tipos declaran equivHtml / equivNote / equivFlow', async () => {
  const src = await readFile(join(raiz, 'src/previews/_kit/types.d.ts'), 'utf8');
  assert.match(src, /equivHtml\?:/);
  assert.match(src, /equivNote\?:/);
  assert.match(src, /equivFlow\?:/);
});

test('render pinta .demo-equiv bajo el demo', async () => {
  const src = await readFile(join(raiz, 'src/previews/_kit/render.js'), 'utf8');
  assert.match(src, /function renderDemoEquiv/);
  assert.match(src, /demo-equiv/);
  assert.match(src, /HTML puro equivalente/);
  assert.match(src, /demo-block/);
});

test('presentation.css estila la sección equivalente', async () => {
  const src = await readFile(join(raiz, 'src/styles/presentation.css'), 'utf8');
  assert.match(src, /\.demo-equiv\b/);
  assert.match(src, /\.demo-equiv__pre/);
});

test('piloto actions: button-group / button / fab tienen equivHtml en cada demo', async () => {
  for (const file of [
    'src/previews/actions/is-button-group.json',
    'src/previews/actions/is-button.json',
    'src/previews/actions/is-fab.json',
  ]) {
    const def = JSON.parse(await readFile(join(raiz, file), 'utf8'));
    const demos = def.sections.flatMap((s) => s.blocks.filter((b) => b.kind === 'demo'));
    assert.ok(demos.length > 0, `${file}: sin demos`);
    for (const [i, demo] of demos.entries()) {
      assert.ok(
        demo.equivHtml,
        `${file} demo#${i} (section) sin equivHtml — cada demo debe documentar el HTML puro`,
      );
    }
  }
  const bg = JSON.parse(
    await readFile(join(raiz, 'src/previews/actions/is-button-group.json'), 'utf8'),
  );
  const select = bg.sections.find((s) => s.id === 'select');
  const demo = select.blocks.find((b) => b.kind === 'demo');
  assert.match(demo.equivFlow || '', /is-flowchart/, 'select debe explicar ramas con flowchart');
});
