// quadrant.test.mjs — smoke + edge cases para quadrant-spec.
import assert from 'node:assert/strict';
import { resolveQuadrantSpec, computeQuadrantLayout, quadrantSpecToJson } from '../../../../src/components/diagrams/quadrant-spec.ts';

const tests = [];

tests.push({
  name: 'smoke: 4 puntos en 4 cuadrantes',
  run: () => {
    const payload = {
      xAxis: { left: 'min', right: 'max' },
      yAxis: { bottom: 'min', top: 'max' },
      quadrants: { topRight: 'A', topLeft: 'B', bottomRight: 'C', bottomLeft: 'D' },
      points: [
        { label: 'TL', x: 0.2, y: 0.8 },
        { label: 'TR', x: 0.8, y: 0.8 },
        { label: 'BL', x: 0.2, y: 0.2 },
        { label: 'BR', x: 0.8, y: 0.2 },
      ],
    };
    const spec = resolveQuadrantSpec(payload);
    assert.ok(spec);
    const layout = computeQuadrantLayout(spec);
    assert.equal(layout.points.length, 4);
    assert.equal(layout.quadrants.length, 4);
  },
});

tests.push({
  name: 'edge: x/y fuera de [0,1] se recortan',
  run: () => {
    const spec = resolveQuadrantSpec({
      points: [
        { label: 'Out', x: 1.5, y: -0.3 },
      ],
    });
    const layout = computeQuadrantLayout(spec);
    // x=1, y=1 (tras clip) → top-right corner
    assert.ok(layout.points[0].cx >= 0 && layout.points[0].cx <= layout.plot.x + layout.plot.w);
    assert.ok(layout.points[0].cy >= 0 && layout.points[0].cy <= layout.plot.y + layout.plot.h);
  },
});

tests.push({
  name: 'edge: payload sin puntos → null',
  run: () => {
    assert.equal(resolveQuadrantSpec({}), null);
    assert.equal(resolveQuadrantSpec({ points: [] }), null);
  },
});

tests.push({
  name: 'edge: x/y inválido → fallback 0.5',
  run: () => {
    const spec = resolveQuadrantSpec({
      points: [{ label: 'NaN', x: 'foo', y: undefined }],
    });
    const layout = computeQuadrantLayout(spec);
    assert.equal(layout.points[0].cx, layout.plot.x + 0.5 * layout.plot.w);
  },
});

tests.push({
  name: 'cuadrantes: con nombres vacíos se filtran',
  run: () => {
    const spec = resolveQuadrantSpec({
      quadrants: { topRight: 'A', topLeft: '', bottomRight: '', bottomLeft: '' },
      points: [{ label: 'P', x: 0.5, y: 0.5 }],
    });
    const layout = computeQuadrantLayout(spec);
    assert.equal(layout.quadrants.length, 1);
  },
});

tests.push({
  name: 'round-trip: spec → JSON → spec preserva ids',
  run: () => {
    const payload = {
      title: 'T',
      points: [{ id: 'p1', label: 'P', x: 0.3, y: 0.7, group: 'g1' }],
    };
    const spec = resolveQuadrantSpec(payload);
    const json = quadrantSpecToJson(spec);
    const back = resolveQuadrantSpec(json);
    assert.equal(back.points[0].id, 'p1');
    assert.equal(back.points[0].group, 'g1');
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
console.log(JSON.stringify({ name: 'quadrant.test.mjs', ok: failures === 0, total: tests.length, failures }, null, 2));
if (failures) process.exit(1);