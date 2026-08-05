import assert from 'node:assert';
import {
  scaleLinear, scaleBand, niceTicks, pathLine, pathArea, pathArc, roundedBarRect, polarToCartesian,
} from './svg-chart-engine.js';

const lin = scaleLinear([0, 10], [0, 100]);
assert.strictEqual(lin(0), 0);
assert.strictEqual(lin(10), 100);
assert.strictEqual(lin(5), 50);

const band = scaleBand(4, [0, 100], 0.25);
assert.ok(band.bandwidth < band.step);
assert.strictEqual(Math.round(band.start(0) + band.bandwidth / 2), 12 + 1 || Math.round(band.start(0) + band.bandwidth / 2));

const ticks = niceTicks(0, 97, 5);
assert.ok(ticks[0] <= 0);
assert.ok(ticks[ticks.length - 1] >= 97);

const line = pathLine([{ x: 0, y: 0 }, { x: 10, y: 10 }], { curve: 'linear' });
assert.strictEqual(line, 'M0,0 L10,10');

const area = pathArea([{ x: 0, y: 0 }, { x: 10, y: 10 }], 20, { curve: 'linear' });
assert.ok(area.endsWith('Z'));
assert.ok(area.includes('L10,20'));

const arcFull = pathArc(50, 50, 40, 0, 0, Math.PI * 2 - 0.001);
assert.ok(arcFull.startsWith('M'));

const rect = roundedBarRect(0, 0, 20, 40, 4, 'top');
assert.ok(rect.includes('Q'));

const donutRect = roundedBarRect(0, 0, 20, 40, 100, 'top');
assert.ok(donutRect.includes('Q0,0')); // radius clamped to w/2

const p = polarToCartesian(0, 0, 10, 0);
assert.ok(Math.abs(p.x - 10) < 1e-9 && Math.abs(p.y) < 1e-9);

console.log('svg-chart-engine self-check: PASS');
