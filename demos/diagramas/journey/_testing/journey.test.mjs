// journey.test.mjs — smoke + edge cases para journey-spec.
import assert from 'node:assert/strict';
import { resolveJourneySpec, computeJourneyLayout, journeySpecToJson } from '../../../../src/components/diagrams/journey-spec.ts';

const tests = [];

tests.push({
  name: 'smoke: 3 fases, 6 pasos → layout con banda por fase',
  run: () => {
    const payload = {
      phases: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
        { id: 'c', name: 'C' },
      ],
      steps: [
        { id: 's1', phase: 'a', label: 'A1', score: 4 },
        { id: 's2', phase: 'a', label: 'A2', score: 3 },
        { id: 's3', phase: 'b', label: 'B1', score: 5 },
        { id: 's4', phase: 'b', label: 'B2', score: 2 },
        { id: 's5', phase: 'c', label: 'C1', score: 4 },
        { id: 's6', phase: 'c', label: 'C2', score: 5 },
      ],
    };
    const spec = resolveJourneySpec(payload);
    assert.ok(spec);
    assert.equal(spec.phases.length, 3);
    assert.equal(spec.steps.length, 6);
    const layout = computeJourneyLayout(spec);
    assert.equal(layout.phases.length, 3, '1 banda por fase');
    assert.equal(layout.steps.length, 6);
    assert.ok(layout.line.length > 0, 'la curva debe tener al menos M+L');
  },
});

tests.push({
  name: 'edge: payload sin pasos → null',
  run: () => {
    assert.equal(resolveJourneySpec({}), null);
    assert.equal(resolveJourneySpec({ phases: [{ id: 'a' }] }), null);
  },
});

tests.push({
  name: 'edge: pasos sin fase se asignan a la primera declarada',
  run: () => {
    const spec = resolveJourneySpec({
      phases: [{ id: 'f0', name: 'Default' }],
      steps: [{ id: 's1', label: 'S1' }], // sin phase
    });
    assert.equal(spec.steps[0].phase, 'f0');
  },
});

tests.push({
  name: 'edge: score fuera de escala se clipea',
  run: () => {
    const spec = resolveJourneySpec({
      phases: [{ id: 'p' }],
      steps: [{ id: 's', phase: 'p', label: 'S', score: 99 }],
    });
    const layout = computeJourneyLayout(spec);
    assert.ok(layout.steps[0].score <= 5);
  },
});

tests.push({
  name: 'edge: paso sin score no entra en la curva',
  run: () => {
    const spec = resolveJourneySpec({
      phases: [{ id: 'p' }],
      steps: [
        { id: 'a', phase: 'p', label: 'A', score: 3 },
        { id: 'b', phase: 'p', label: 'B' },
        { id: 'c', phase: 'p', label: 'C', score: 5 },
      ],
    });
    const layout = computeJourneyLayout(spec);
    // 3 steps en la lista, pero solo 2 con score → 2 puntos en línea
    const linePoints = (layout.line.match(/[ML]/g) || []).length;
    assert.equal(linePoints, 2);
  },
});

tests.push({
  name: 'scale: custom min/max',
  run: () => {
    const spec = resolveJourneySpec({
      scale: { min: 0, max: 10 },
      steps: [{ id: 's', label: 'S', score: 7 }],
    });
    assert.equal(spec.scale.min, 0);
    assert.equal(spec.scale.max, 10);
  },
});

tests.push({
  name: 'round-trip: spec → JSON → spec preserva actores y desc',
  run: () => {
    const payload = {
      phases: [{ id: 'p', name: 'P' }],
      steps: [{ id: 's', phase: 'p', label: 'S', score: 4, actor: 'Bot', description: 'auto' }],
    };
    const spec = resolveJourneySpec(payload);
    const json = journeySpecToJson(spec);
    const back = resolveJourneySpec(json);
    assert.equal(back.steps[0].actor, 'Bot');
    assert.equal(back.steps[0].description, 'auto');
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
console.log(JSON.stringify({ name: 'journey.test.mjs', ok: failures === 0, total: tests.length, failures }, null, 2));
if (failures) process.exit(1);