// tests/layout-geometry-scroll.test.mjs
// Contrato de geometría + memoria de scroll en BreakpointHost (block/flex/grid).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const block = readFileSync(join(ROOT, 'src/components/isp/block-layout.js'), 'utf8');
const flex = readFileSync(join(ROOT, 'src/components/isp/flex-layout.js'), 'utf8');
const grid = readFileSync(join(ROOT, 'src/components/isp/grid-layout.js'), 'utf8');
const shared = readFileSync(join(ROOT, 'src/components/_shared/scroll-memory.js'), 'utf8');
const main = readFileSync(join(ROOT, 'src/components/layout/main.js'), 'utf8');

test('scroll-memory compartido entre is-main y layouts', () => {
  assert.match(shared, /export class ScrollMemory/);
  assert.match(shared, /restorePolicy/);
  assert.match(main, /from '\.\.\/_shared\/scroll-memory\.js'/);
  assert.match(block, /from '\.\.\/_shared\/scroll-memory\.js'/);
  assert.match(block, /restorePolicy:\s*'always'/);
  assert.match(main, /restorePolicy:\s*'reload'/);
});

test('layouts observan attrs de memoria de scroll', () => {
  for (const [name, src] of [['block', block], ['flex', flex], ['grid', grid]]) {
    assert.match(src, /SCROLL_MEMORY_ATTRS|scrollMemoryAttrs/, `${name} debe observar memoria`);
    assert.match(src, /remember-scroll|SCROLL_MEMORY/, `${name} cablea remember-scroll`);
  }
});

test('BreakpointHost expone getWidth getHeight rect', () => {
  assert.match(block, /getWidth\s*\(/);
  assert.match(block, /getHeight\s*\(/);
  assert.match(block, /rect\s*\(/);
  assert.match(block, /getRect\s*\(/);
  assert.match(block, /--clienth/);
  assert.match(block, /measureSize\s*\(/);
});

test('flex admite cscroll como block/grid', () => {
  assert.match(flex, /cscroll/);
  const css = readFileSync(join(ROOT, 'src/components/isp/flex-layout.css'), 'utf8');
  assert.match(css, /:host\(\[cscroll\]\)/);
});

test('is-main sigue siendo delgado (delega a ScrollMemory)', () => {
  assert.ok(main.length < 2_500, 'main.js no debe reintroducir la lógica completa');
  assert.match(main, /bindScrollMemoryApi/);
});
