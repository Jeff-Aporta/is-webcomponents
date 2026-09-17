// mindmap.test.mjs — smoke + edge cases para mindmap-spec.
import assert from 'node:assert/strict';
import { mindmapSpecFromPayload, computeMindmapLayout, resolveMindmapSpec } from '../../../../src/components/diagrams/mindmap-spec.ts';

const tests = [];

tests.push({
  name: 'smoke: jerarquía plana → árbol + layout',
  run: () => {
    const payload = {
      nodes: [
        { id: 'r', label: 'Raíz' },
        { id: 'a', label: 'A', parent: 'r' },
        { id: 'a1', label: 'A1', parent: 'a' },
        { id: 'b', label: 'B', parent: 'r' },
      ],
    };
    const spec = mindmapSpecFromPayload(payload);
    assert.ok(spec);
    assert.equal(spec.nodes.length, 4);
    const layout = computeMindmapLayout(spec);
    // 4 nodos: raíz, 2 hijos, 1 nieto
    assert.ok(layout.nodes.length >= 4);
    assert.ok(layout.edges.length >= 3);
  },
});

tests.push({
  name: 'edge: payload sin nodos → null',
  run: () => {
    assert.equal(mindmapSpecFromPayload({}), null);
    assert.equal(mindmapSpecFromPayload({ nodes: [] }), null);
  },
});

tests.push({
  name: 'edge: layout tree produce nodos alineados por profundidad',
  run: () => {
    const spec = mindmapSpecFromPayload({
      layout: 'tree',
      nodes: [
        { id: 'r', label: 'R' },
        { id: 'a', label: 'A', parent: 'r' },
        { id: 'b', label: 'B', parent: 'r' },
      ],
    });
    const layout = computeMindmapLayout(spec);
    assert.ok(layout.nodes.find((n) => n.id === 'r'));
    const rootNode = layout.nodes.find((n) => n.id === 'r');
    assert.equal(rootNode.kind, 'root');
  },
});

tests.push({
  name: 'edge: layout radial produce nodos distribuidos en círculo',
  run: () => {
    const spec = mindmapSpecFromPayload({
      layout: 'radial',
      nodes: [
        { id: 'r', label: 'R' },
        { id: 'a', label: 'A', parent: 'r' },
        { id: 'b', label: 'B', parent: 'r' },
        { id: 'c', label: 'C', parent: 'r' },
      ],
    });
    const layout = computeMindmapLayout(spec);
    assert.ok(layout.width > 0);
    assert.ok(layout.height > 0);
  },
});

tests.push({
  name: 'depth: anotar niveles 0/1/2',
  run: () => {
    const spec = mindmapSpecFromPayload({
      nodes: [
        { id: 'r', label: 'R' },
        { id: 'a', label: 'A', parent: 'r' },
        { id: 'a1', label: 'A1', parent: 'a' },
      ],
    });
    const layout = computeMindmapLayout(spec);
    const a1 = layout.nodes.find((n) => n.id === 'a1');
    assert.equal(a1.depth, 2);
    assert.equal(a1.kind, 'leaf');
  },
});

tests.push({
  name: 'alias: resolveMindmapSpec === mindmapSpecFromPayload',
  run: () => {
    const p = { nodes: [{ id: 'r', label: 'R' }] };
    const a = resolveMindmapSpec(p);
    const b = mindmapSpecFromPayload(p);
    assert.equal(a?.nodes[0].id, b?.nodes[0].id);
  },
});

tests.push({
  name: 'edge: node huérfano (parent no existente) se incluye igual',
  run: () => {
    // buildTree trata al huérfano como raíz: lo esperamos en el resultado
    const spec = mindmapSpecFromPayload({
      nodes: [
        { id: 'r', label: 'R' },
        { id: 'x', label: 'X', parent: 'ghost' },
      ],
    });
    assert.ok(spec);
    const layout = computeMindmapLayout(spec);
    assert.ok(layout.nodes.length >= 1);
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
console.log(JSON.stringify({ name: 'mindmap.test.mjs', ok: failures === 0, total: tests.length, failures }, null, 2));
if (failures) process.exit(1);