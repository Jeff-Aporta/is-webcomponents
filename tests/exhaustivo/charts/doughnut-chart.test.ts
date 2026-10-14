/**
 * doughnut-chart.test.ts — verificación exhaustiva de <iswc-doughnut-chart>.
 *
 * Wrapper de <iswc-chart> con tipo fijo "doughnut" (anillo con hueco central).
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

test('iswc-doughnut-chart: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('iswc-doughnut-chart: wrapper registra tag iswc-doughnut-chart y tipo doughnut', () => {
  const src = read(MOD);
  assert.match(src, /window\.__isDefineTypedChart\s*\?\s*\.?\s*\(\s*['"`]iswc-doughnut-chart['"`]/);
  assert.match(src, /['"`]doughnut['"`]/);
});

test('iswc-doughnut-chart: motor monta shadow DOM con svg', () => {
  const src = read(WRAPPER);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('iswc-doughnut-chart: observados del motor', () => {
  const obs = extraerObservados(read(WRAPPER));
  assert.ok(obs.includes('type'));
  assert.ok(obs.includes('label'));
  assert.ok(obs.includes('legend-position'));
});

test('iswc-doughnut-chart: lee JSON embebido', () => {
  assert.ok(leeJsonScript(read(WRAPPER)));
});

test('iswc-doughnut-chart: usa ResizeObserver', () => {
  assert.ok(usaResizeObserver(read(WRAPPER)));
});

test('iswc-doughnut-chart: registrado', () => {
  const src = read(WRAPPER);
  assert.ok(estaRegistrado(src, 'iswc-chart') || estaRegistrado(read(MOD), 'iswc-doughnut-chart'));
});

test('iswc-doughnut-chart: edge case guards', () => {
  assert.ok(tieneEdgeCaseGuards(read(WRAPPER)));
});
