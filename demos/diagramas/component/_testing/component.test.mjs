// component.test.mjs — smoke + edge cases para component-spec.
import assert from 'node:assert/strict';
import { resolveComponentSpec, computeComponentLayout, parseHttpEndpoint, wrapLabel, packageTitleInkWidth } from '../../../../src/components/diagrams/component-spec.ts';
import { packDiagram, layoutPackageOutlines } from '../../../../src/components/diagrams/component-pack.ts';

const tests = [];

tests.push({
  name: 'smoke: spec con 3 componentes y 2 aristas',
  run: () => {
    const payload = {
      components: [
        { id: 'a', name: 'A', x: 0, y: 0, w: 100, h: 50 },
        { id: 'b', name: 'B', x: 200, y: 0, w: 100, h: 50 },
        { id: 'c', name: 'C', x: 100, y: 200, w: 100, h: 50 },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
      ],
    };
    const spec = resolveComponentSpec(payload);
    assert.ok(spec);
    assert.equal(spec.components.length, 3);
    const layout = computeComponentLayout(spec);
    assert.equal(layout.components.length, 3);
    assert.equal(layout.edges.length, 2);
    assert.ok(layout.width > 0);
    assert.ok(layout.height > 0);
  },
});

tests.push({
  name: 'edge: payload sin componentes → null',
  run: () => {
    assert.equal(resolveComponentSpec({}), null);
    assert.equal(resolveComponentSpec({ components: [] }), null);
  },
});

tests.push({
  name: 'edge: interfaces con component inexistente se descartan',
  run: () => {
    const payload = {
      components: [{ id: 'a', name: 'A', x: 0, y: 0, w: 100, h: 50 }],
      interfaces: [{ id: 'i1', component: 'ghost' }],
    };
    const spec = resolveComponentSpec(payload);
    assert.equal(spec.interfaces.length, 0, 'interfaz huérfana descartada');
  },
});

tests.push({
  name: 'provides/requires: genera lollipops automáticamente',
  run: () => {
    const payload = {
      components: [
        { id: 'a', name: 'A', x: 0, y: 0, w: 100, h: 50, provides: ['IA'] },
        { id: 'b', name: 'B', x: 200, y: 0, w: 100, h: 50, requires: ['IA'] },
      ],
    };
    const spec = resolveComponentSpec(payload);
    const prv = spec.interfaces.find((i) => i.kind === 'provided' && i.name === 'IA');
    const req = spec.interfaces.find((i) => i.kind === 'required' && i.name === 'IA');
    assert.ok(prv, 'debe haber provided IA en A');
    assert.ok(req, 'debe haber required IA en B');
    // Debe haber una arista automática que conecte ambos
    const auto = spec.edges.find((e) => e.fromInterface === req.id && e.toInterface === prv.id);
    assert.ok(auto, 'debe crearse arista que conecte required ↔ provided');
  },
});

tests.push({
  name: 'parseHttpEndpoint: detecta verbos HTTP',
  run: () => {
    assert.deepEqual(parseHttpEndpoint('GET /api/users'), { method: 'GET', path: '/api/users' });
    assert.deepEqual(parseHttpEndpoint('POST /api/login'), { method: 'POST', path: '/api/login' });
    assert.deepEqual(parseHttpEndpoint('plain text'), { method: '', path: 'plain text' });
    assert.deepEqual(parseHttpEndpoint(''), { method: '', path: '' });
  },
});

tests.push({
  name: 'wrapLabel: parte líneas que no caben',
  run: () => {
    const lines = wrapLabel('Palabra muy larga muy muy muy muy larga', 100);
    assert.ok(lines.length >= 2, 'debe partir en varias líneas');
    assert.ok(lines.every((l) => l.length > 0));
  },
});

tests.push({
  name: 'wrapLabel: una sola palabra más larga que ancho',
  run: () => {
    const lines = wrapLabel('supercalifragilisticexpialidocious', 60);
    assert.ok(lines.length > 1, 'palabra única larga debe partirse por caracteres');
  },
});

tests.push({
  name: 'packageTitleInkWidth: >= TAB_W mínimo',
  run: () => {
    assert.ok(packageTitleInkWidth(80) >= 56);
  },
});

tests.push({
  name: 'packDiagram: layout mode manual no recoloca',
  run: () => {
    const packages = [];
    const components = [{ id: 'a', x: 50, y: 50, w: 100, h: 50 }];
    packDiagram(packages, components, [], { mode: 'manual' });
    assert.equal(components[0].x, 50, 'manual mode no debe mover');
  },
});

tests.push({
  name: 'layoutPackageOutlines: tolera paquetes sin hijos',
  run: () => {
    const packages = [{ id: 'p', name: 'Empty', x: 0, y: 0, w: 100, h: 100 }];
    const components = [];
    layoutPackageOutlines(packages, components);
    // No debe lanzar
  },
});

let failures = 0;
for (const t of tests) {
  try {
    await t.run();
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    console.error(`  ✗ ${t.name}\n     ${String(err?.message ?? err)}`);
    failures++;
  }
}
console.log(JSON.stringify({ name: 'component.test.mjs', ok: failures === 0, total: tests.length, failures }, null, 2));
if (failures) process.exit(1);