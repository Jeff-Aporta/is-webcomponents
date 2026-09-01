import assert from 'node:assert';
import { waterfallBars } from './marks-waterfall.js';
import { funnelBands } from './marks-funnel.js';

// --- waterfallBars -----------------------------------------------------
const bars = waterfallBars([1200, 850, -420, -180, null], [0, 4]);

assert.strictEqual(bars.length, 5);
assert.deepStrictEqual([bars[0].start, bars[0].end], [0, 1200]);
assert.deepStrictEqual([bars[1].start, bars[1].end], [1200, 2050]);
assert.deepStrictEqual([bars[2].start, bars[2].end], [2050, 1630]);
assert.deepStrictEqual([bars[3].start, bars[3].end], [1630, 1450]);
assert.deepStrictEqual([bars[4].start, bars[4].end], [0, 1450]);
assert.deepStrictEqual(bars.map((b) => b.kind), ['total', 'up', 'down', 'down', 'total']);

// --- funnelBands ---------------------------------------------------------
const bands = funnelBands([4200, 1800, 640, 210]);

assert.strictEqual(bands[0].ratio, 1);
for (let i = 1; i < bands.length; i++) {
  assert.ok(bands[i].ratio <= bands[i - 1].ratio, `ratio debe ser no-creciente en el paso ${i}`);
}
assert.ok(Math.abs(bands[1].dropPct - 42.9) < 0.2, `dropPct paso 1 esperado ~42.9, obtuvo ${bands[1].dropPct}`);

console.log('marks-extra self-check: PASS');
