// venn.test.mjs — smoke + snapshot + edge cases para venn-spec.
import assert from 'node:assert/strict';
import { resolveVennSpec, computeVennLayout, vennSpecToJson } from '../../../../src/components/diagrams/venn-spec.ts';

const tests = [];
const results = [];

tests.push({
  name: 'smoke: resolveVennSpec normaliza dos conjuntos y regiones',
  run: () => {
    const payload = {
      title: 'Test',
      sets: [
        { id: 'a', label: 'Conjunto A' },
        { id: 'b', label: 'Conjunto B' },
      ],
      regions: [
        { sets: ['a'], label: 'Solo A' },
        { sets: ['b'], label: 'Solo B' },
        { sets: ['a', 'b'], label: 'Ambos' },
      ],
    };
    const spec = resolveVennSpec(payload);
    assert.ok(spec, 'spec no debe ser null');
    assert.equal(spec.sets.length, 2);
    assert.equal(spec.regions.length, 3);
    assert.equal(spec.sets[0].label, 'Conjunto A');
    assert.equal(spec.sets[1].label, 'Conjunto B');
  },
});

tests.push({
  name: 'edge: 1 conjunto → null (no es Venn)',
  run: () => {
    const spec = resolveVennSpec({ sets: [{ id: 'x', label: 'Solo X' }] });
    assert.equal(spec, null);
  },
});

tests.push({
  name: 'edge: 4 conjuntos → spec con 3 (recorta a tres)',
  run: () => {
    const payload = {
      sets: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' },
        { id: 'd', label: 'D' },
      ],
    };
    const spec = resolveVennSpec(payload);
    assert.ok(spec);
    assert.equal(spec.sets.length, 3, 'debe cortar a 3 conjuntos');
  },
});

tests.push({
  name: 'edge: regiones con ids desconocidos se descartan',
  run: () => {
    const payload = {
      sets: [{ id: 'a' }, { id: 'b' }],
      regions: [
        { sets: ['a', 'ghost'], label: 'fantasma' },
        { sets: ['a'], label: 'Solo A' },
      ],
    };
    const spec = resolveVennSpec(payload);
    assert.ok(spec);
    assert.equal(spec.regions.length, 1, 'solo queda la región con sets conocidos');
  },
});

tests.push({
  name: 'layout: computeVennLayout produce 2 círculos y 3 regiones',
  run: () => {
    const spec = resolveVennSpec({
      sets: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      regions: [
        { sets: ['a'], label: 'Solo A' },
        { sets: ['b'], label: 'Solo B' },
        { sets: ['a', 'b'], label: 'Ambos' },
      ],
    });
    const layout = computeVennLayout(spec);
    assert.ok(layout.width > 0);
    assert.ok(layout.height > 0);
    assert.equal(layout.circles.length, 2);
    assert.equal(layout.regions.length, 3);
    // Cada círculo tiene radio fijo R = 82
    assert.equal(layout.circles[0].r, 82);
  },
});

tests.push({
  name: 'layout: tres conjuntos usa layout triangular',
  run: () => {
    const spec = resolveVennSpec({
      sets: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
    });
    const layout = computeVennLayout(spec);
    assert.equal(layout.circles.length, 3);
    // Tres círculos: los 3 centros NO son colineales (forman triángulo)
    const cy = layout.circles.map((c) => c.cy);
    assert.ok(new Set(cy).size > 1, 'centros NO deben estar todos a la misma Y');
  },
});

tests.push({
  name: 'snapshot: round-trip JSON preserva sets y regiones',
  run: () => {
    const payload = {
      title: 'T',
      sets: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      regions: [
        { sets: ['a', 'b'], label: 'AB', value: 5 },
      ],
    };
    const spec = resolveVennSpec(payload);
    const json = vennSpecToJson(spec);
    const back = resolveVennSpec(json);
    assert.ok(back);
    assert.equal(back.sets.length, spec.sets.length);
    assert.equal(back.regions.length, spec.regions.length);
    assert.equal(back.regions[0].value, 5);
  },
});

let failures = 0;
for (const t of tests) {
  try {
    await t.run();
    console.log(`  ✓ ${t.name}`);
    results.push({ name: t.name, ok: true });
  } catch (err) {
    console.error(`  ✗ ${t.name}\n     ${String(err?.message ?? err)}`);
    failures++;
    results.push({ name: t.name, ok: false, error: String(err?.message ?? err) });
  }
}

const ok = failures === 0;
console.log(JSON.stringify({ name: 'venn.test.mjs', ok, total: tests.length, failures, results }, null, 2));
if (!ok) process.exit(1);