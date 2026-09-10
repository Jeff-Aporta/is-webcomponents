/**
 * doughnut-chart.test.ts — verificación exhaustiva de <is-doughnut-chart>.
 *
 * Wrapper de <is-chart> con tipo fijo "doughnut" (anillo con hueco central).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  exists,
  read,
  extraerObservados,
  leeJsonScript,
  tieneShadow,
  estaRegistrado,
  usaResizeObserver,
  tieneEdgeCaseGuards,
} from '../_helpers.ts';

const MOD = 'src/components/charts/doughnut-chart.ts';
const WRAPPER = 'src/components/charts/chart.ts';

test('is-doughnut-chart: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('is-doughnut-chart: wrapper registra tag is-doughnut-chart y tipo doughnut', () => {
  const src = read(MOD);
  assert.match(src, /window\.__isDefineTypedChart\s*\?\s*\.?\s*\(\s*['"`]is-doughnut-chart['"`]/);
  assert.match(src, /['"`]doughnut['"`]/);
});

test('is-doughnut-chart: motor monta shadow DOM con svg', () => {
  const src = read(WRAPPER);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('is-doughnut-chart: observados del motor', () => {
  const obs = extraerObservados(read(WRAPPER));
  assert.ok(obs.includes('type'));
  assert.ok(obs.includes('label'));
  assert.ok(obs.includes('legend-position'));
});

test('is-doughnut-chart: lee JSON embebido', () => {
  assert.ok(leeJsonScript(read(WRAPPER)));
});

test('is-doughnut-chart: usa ResizeObserver', () => {
  assert.ok(usaResizeObserver(read(WRAPPER)));
});

test('is-doughnut-chart: registrado', () => {
  const src = read(WRAPPER);
  assert.ok(estaRegistrado(src, 'is-chart') || estaRegistrado(read(MOD), 'is-doughnut-chart'));
});

test('is-doughnut-chart: edge case guards', () => {
  assert.ok(tieneEdgeCaseGuards(read(WRAPPER)));
});
