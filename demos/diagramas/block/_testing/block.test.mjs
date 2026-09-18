// block.test.mjs — smoke + edge cases para block-spec.
import assert from 'node:assert/strict';
import { blockSpecFromPayload, computeBlockLayout, computeBlockGrid, resolveBlockSpec } from '../../../../src/components/diagrams/block-spec.ts';

const tests = [];

tests.push({
  name: 'smoke: 6 bloques → 6 placements en rejilla',
  run: () => {
    const spec = blockSpecFromPayload({
      columns: 3,
      blocks: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' },
        { id: 'd', label: 'D' },
        { id: 'e', label: 'E' },
        { id: 'f', label: 'F' },
      ],
    });
    assert.ok(spec);
    assert.equal(spec.columns, 3);
    const layout = computeBlockLayout(spec);
    assert.equal(layout.blocks.length, 6);
  },
});

tests.push({
  name: 'computeBlockGrid: wrap de fila cuando span no cabe',
  run: () => {
    const placed = computeBlockGrid([
      { id: 'a', span: 1 },
      { id: 'b', span: 2 },
      { id: 'c', span: 1 }, // debería saltar a row 1 col 0 (cols=3)
    ], 3);
    assert.equal(placed.length, 3);
    assert.equal(placed[0].row, 0); // a
    assert.equal(placed[1].row, 0); // b ocupa 2 cols en row 0
    assert.equal(placed[2].row, 1); // c salta
  },
});

tests.push({
  name: 'edge: span mayor que columns se acota',
  run: () => {
    const placed = computeBlockGrid([{ id: 'x', span: 5 }], 3);
    assert.equal(placed[0].span, 3);
  },
});

tests.push({
  name: 'edge: payload sin bloques → null',
  run: () => {
    assert.equal(blockSpecFromPayload({}), null);
    assert.equal(blockSpecFromPayload({ blocks: [] }), null);
  },
});

tests.push({
  name: 'edge: aristas con ids desconocidos se descartan',
  run: () => {
    const spec = blockSpecFromPayload({
      blocks: [{ id: 'a' }, { id: 'b' }],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'ghost', to: 'b' },
        { from: 'a', to: 'phantom' },
      ],
    });
    const layout = computeBlockLayout(spec);
    assert.equal(layout.edges.length, 1, 'solo queda la arista a→b');
  },
});

tests.push({
  name: 'layout: shape round produce path con radios grandes',
  run: () => {
    const spec = blockSpecFromPayload({
      blocks: [{ id: 'x', label: 'Round', shape: 'round' }],
    });
    const layout = computeBlockLayout(spec);
    assert.equal(layout.blocks[0].shape, 'round');
  },
});

tests.push({
  name: 'alias: resolveBlockSpec === blockSpecFromPayload',
  run: () => {
    const p = { blocks: [{ id: 'a', label: 'A' }] };
    const a = resolveBlockSpec(p);
    const b = blockSpecFromPayload(p);
    assert.equal(a?.blocks[0].id, b?.blocks[0].id);
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
console.log(JSON.stringify({ name: 'block.test.mjs', ok: failures === 0, total: tests.length, failures }, null, 2));
if (failures) process.exit(1);