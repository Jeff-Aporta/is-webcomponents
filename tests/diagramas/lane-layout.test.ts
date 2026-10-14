// Self-check plano (node:assert) para lane-layout.js. Sin framework.
import assert from 'node:assert';
import {
  parseDate,
  addDuration,
  timeScale,
  niceTimeTicks,
  packLanes,
  layoutLanes,
} from './lane-layout.js';

function isMultipleOf8(v: number) {
  return v % 8 === 0;
}

// 1) parseDate('YYYY-MM-DD') es medianoche LOCAL (guarda contra el bug de zona horaria).
{
  const ms = parseDate('2026-01-05');
  assert.ok(Number.isFinite(ms));
  const d = new Date(ms);
  assert.strictEqual(d.getHours(), 0);
  assert.strictEqual(d.getMinutes(), 0);
  assert.strictEqual(d.getFullYear(), 2026);
  assert.strictEqual(d.getMonth(), 0);
  assert.strictEqual(d.getDate(), 5);
}
// Con hora explícita.
{
  const ms = parseDate('2026-01-05T14:30');
  const d = new Date(ms);
  assert.strictEqual(d.getHours(), 14);
  assert.strictEqual(d.getMinutes(), 30);
}
// Basura -> NaN.
{
  assert.ok(Number.isNaN(parseDate('no-es-una-fecha')));
  assert.ok(Number.isNaN(parseDate('')));
}

// 2) addDuration: 3d, 2w, 6h, 1M (mes rueda el calendario).
{
  const base = parseDate('2026-01-05');
  assert.strictEqual(addDuration(base, '3d'), base + 3 * 86400000);
  assert.strictEqual(addDuration(base, '2w'), base + 14 * 86400000);
  assert.strictEqual(addDuration(base, '6h'), base + 6 * 3600000);

  const monthEnd = parseDate('2026-01-31');
  const rolled = addDuration(monthEnd, '1M');
  const d = new Date(rolled);
  // enero(0) + 1 mes -> el mes avanzó (a febrero o marzo si JS desborda el día 31).
  assert.ok(d.getMonth() === 1 || d.getMonth() === 2, `mes no avanzó: ${d.getMonth()}`);
}

// 3) timeScale mapea los extremos del dominio a los del rango; invert redondea en <1ms.
{
  const d0 = parseDate('2026-01-01');
  const d1 = parseDate('2026-02-01');
  const scale = timeScale([d0, d1], [0, 620]);
  assert.strictEqual(scale(d0), 0);
  assert.strictEqual(scale(d1), 620);
  const mid = d0 + (d1 - d0) / 3;
  const px = scale(mid);
  assert.ok(Math.abs(scale.invert(px) - mid) < 1);
}

// 4) packLanes: tres intervalos solapados -> 3 carriles; tres secuenciales -> 1 carril.
{
  const overlapping = [
    { id: 'a', start: 0, end: 300 },
    { id: 'b', start: 100, end: 400 },
    { id: 'c', start: 200, end: 500 },
  ];
  const packedOverlap = packLanes(overlapping);
  const lanesUsed = new Set(packedOverlap.map((it) => it.lane));
  assert.strictEqual(lanesUsed.size, 3);

  const sequential = [
    { id: 'x', start: 0, end: 100 },
    { id: 'y', start: 100, end: 200 },
    { id: 'z', start: 200, end: 300 },
  ];
  const packedSeq = packLanes(sequential);
  const lanesUsedSeq = new Set(packedSeq.map((it) => it.lane));
  assert.strictEqual(lanesUsedSeq.size, 1);
}

// 5) niceTimeTicks: 3-12 marcas para un rango de 30 días y para uno de 2 años, con label no vacío.
{
  const d0 = parseDate('2026-01-01');
  const d30 = d0 + 30 * 86400000;
  const ticks30 = niceTimeTicks(d0, d30);
  assert.ok(ticks30.length >= 3 && ticks30.length <= 12, `30d ticks fuera de rango: ${ticks30.length}`);
  assert.ok(ticks30.every((t) => t.label.length > 0));

  const d2y = d0 + 2 * 365 * 86400000;
  const ticksYears = niceTimeTicks(d0, d2y);
  assert.ok(ticksYears.length >= 3 && ticksYears.length <= 12, `2y ticks fuera de rango: ${ticksYears.length}`);
  assert.ok(ticksYears.every((t) => t.label.length > 0));
}

// 6) layoutLanes: sin solape vertical entre filas y todas las coords múltiplos de 8.
{
  const d0 = parseDate('2026-01-01');
  const items = [
    { id: 't1', start: d0, end: d0 + 3 * 86400000 },
    { id: 't2', start: d0 + 1 * 86400000, end: d0 + 5 * 86400000 },
    { id: 't3', start: d0 + 4 * 86400000, end: d0 + 8 * 86400000 },
    { id: 't4', start: d0 + 10 * 86400000, end: d0 + 12 * 86400000 },
  ];
  const layout = layoutLanes(items, { width: 640 });

  for (const it of layout.items) {
    assert.ok(isMultipleOf8(it.x), `x de ${it.id} no es múltiplo de 8: ${it.x}`);
    assert.ok(isMultipleOf8(it.y), `y de ${it.id} no es múltiplo de 8: ${it.y}`);
  }
  for (const ln of layout.lanes) {
    assert.ok(isMultipleOf8(ln.y), `y de carril ${ln.key} no es múltiplo de 8: ${ln.y}`);
  }

  // Sin solape: para cada par de ítems en carriles distintos, sus rangos [y, y+h) no se cruzan.
  const byLane = new Map();
  for (const it of layout.items) {
    if (!byLane.has(it.lane)) byLane.set(it.lane, it);
  }
  const rows = [...byLane.values()].sort((a, b) => a.y - b.y);
  for (let i = 1; i < rows.length; i++) {
    assert.ok(rows[i].y >= rows[i - 1].y + rows[i - 1].h, 'filas de carril se solapan verticalmente');
  }

  // laneKey agrupado: mismo grupo -> mismo carril.
  const grouped = layoutLanes(
    [
      { id: 'g1', start: d0, end: d0 + 86400000, grp: 'a' },
      { id: 'g2', start: d0 + 86400000, end: d0 + 2 * 86400000, grp: 'a' },
      { id: 'g3', start: d0, end: d0 + 86400000, grp: 'b' },
    ],
    { width: 320, laneKey: 'grp' },
  );
  const laneOfG1 = grouped.items.find((it) => it.id === 'g1').lane;
  const laneOfG2 = grouped.items.find((it) => it.id === 'g2').lane;
  const laneOfG3 = grouped.items.find((it) => it.id === 'g3').lane;
  assert.strictEqual(laneOfG1, laneOfG2);
  assert.notStrictEqual(laneOfG1, laneOfG3);
}

console.log('lane-layout self-check: PASS');
