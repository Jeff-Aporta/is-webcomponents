// gantt.test.mjs — smoke + edge cases para gantt-spec.
import assert from 'node:assert/strict';
import { ganttSpecFromPayload, computeGanttLayout, resolveGanttSpec } from '../../../../src/components/diagrams/gantt-spec.ts';

const tests = [];

tests.push({
  name: 'smoke: 3 tareas → 3 filas, dependencias como flechas',
  run: () => {
    const payload = {
      tasks: [
        { id: 'a', label: 'A', start: '2026-01-01', end: '2026-01-05' },
        { id: 'b', label: 'B', start: '2026-01-06', end: '2026-01-10', after: ['a'] },
        { id: 'c', label: 'C', start: '2026-01-11', end: '2026-01-15', after: ['b'] },
      ],
    };
    const spec = ganttSpecFromPayload(payload);
    assert.ok(spec);
    const layout = computeGanttLayout(spec);
    assert.equal(layout.rows.length, 3);
    assert.equal(layout.arrows.length, 2, '2 dependencias → 2 flechas');
    assert.ok(layout.width > 0);
    assert.ok(layout.height > 0);
  },
});

tests.push({
  name: 'edge: payload sin tareas → null',
  run: () => {
    assert.equal(ganttSpecFromPayload({ tasks: [] }), null);
    assert.equal(ganttSpecFromPayload({}), null);
  },
});

tests.push({
  name: 'edge: duración sin end explícito',
  run: () => {
    const spec = ganttSpecFromPayload({
      tasks: [{ id: 'x', label: 'X', start: '2026-02-01', duration: '3d' }],
    });
    assert.ok(spec);
    const layout = computeGanttLayout(spec);
    assert.equal(layout.rows.length, 1);
    assert.ok(layout.rows[0].w > 0);
  },
});

tests.push({
  name: 'edge: milestone se renderiza con size y cx/cy',
  run: () => {
    const spec = ganttSpecFromPayload({
      tasks: [{ id: 'm', label: 'M', start: '2026-03-15', milestone: true }],
    });
    const layout = computeGanttLayout(spec);
    assert.equal(layout.rows[0].milestone, true);
    assert.equal(layout.rows[0].size, 18);
    assert.ok(typeof layout.rows[0].cx === 'number');
    assert.ok(typeof layout.rows[0].cy === 'number');
  },
});

tests.push({
  name: 'determinismo: misma spec + mismo opts.now → mismo layout',
  run: () => {
    const payload = {
      tasks: [{ id: 'a', label: 'A', start: '2026-01-01', end: '2026-01-10' }],
    };
    const spec = ganttSpecFromPayload(payload);
    const l1 = computeGanttLayout(spec, { now: Date.parse('2026-01-05') });
    const l2 = computeGanttLayout(spec, { now: Date.parse('2026-01-05') });
    assert.equal(l1.width, l2.width);
    assert.equal(l1.rows[0].x, l2.rows[0].x);
    assert.equal(l1.todayX, l2.todayX);
  },
});

tests.push({
  name: 'edge: dependencias a ids inexistentes se descartan',
  run: () => {
    const spec = ganttSpecFromPayload({
      tasks: [
        { id: 'a', label: 'A', start: '2026-01-01', end: '2026-01-05' },
        { id: 'b', label: 'B', start: '2026-01-06', end: '2026-01-10', after: ['a', 'ghost'] },
      ],
    });
    const layout = computeGanttLayout(spec);
    assert.equal(layout.arrows.length, 1, 'solo queda la arista hacia a');
  },
});

tests.push({
  name: 'alias: resolveGanttSpec === ganttSpecFromPayload',
  run: () => {
    const p = { tasks: [{ id: 'a', label: 'A', start: '2026-01-01' }] };
    const a = resolveGanttSpec(p);
    const b = ganttSpecFromPayload(p);
    assert.equal(a?.tasks[0].id, b?.tasks[0].id);
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
console.log(JSON.stringify({ name: 'gantt.test.mjs', ok: failures === 0, total: tests.length, failures }, null, 2));
if (failures) process.exit(1);