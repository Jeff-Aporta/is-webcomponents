// tests/layout-geometry-scroll.test.ts
// Contrato de geometría + memoria de scroll en BreakpointHost (block/flex/grid).

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });


const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const block = readFileSync(join(ROOT, 'src/components/isp/block-layout.ts'), 'utf8');
const flex = readFileSync(join(ROOT, 'src/components/isp/flex-layout.ts'), 'utf8');
const grid = readFileSync(join(ROOT, 'src/components/isp/grid-layout.ts'), 'utf8');
const shared = readFileSync(join(ROOT, 'src/core/scroll-memory.ts'), 'utf8');
const main = readFileSync(join(ROOT, 'src/components/layout/main.ts'), 'utf8');

test('scroll-memory compartido entre iswc-main y layouts', () => {
  assert.match(shared, /export class ScrollMemory/);
  assert.match(shared, /restorePolicy/);
  // Ambos importan EL MISMO módulo compartido (hoy src/core/scroll-memory.ts):
  // se resuelve el especificador relativo de cada uno contra su carpeta.
  const sharedPath = join(ROOT, 'src/core/scroll-memory.ts');
  for (const [nombre, src, rel] of [['main', main, 'src/components/layout'], ['block', block, 'src/components/isp']]) {
    const spec = src.match(/from '([^']*scroll-memory\.js)'/)?.[1];
    assert.ok(spec, `${nombre} debe importar scroll-memory`);
    assert.equal(join(ROOT, rel, spec.replace(/\.js$/, '.ts')), sharedPath, `${nombre} debe usar el scroll-memory compartido`);
  }
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
  const css = readFileSync(join(ROOT, '.tmp-scss/src/components/isp/flex-layout.css'), 'utf8');
  assert.match(css, /:host\(\[cscroll\]\)/);
});

test('iswc-main sigue siendo delgado (delega a ScrollMemory)', () => {
  assert.ok(main.length < 2_500, 'main.ts no debe reintroducir la lógica completa');
  assert.match(main, /bindScrollMemoryApi/);
});

export default lista();
