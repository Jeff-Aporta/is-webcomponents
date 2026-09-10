/**
 * pie-chart.test.ts — verificación exhaustiva de <is-pie-chart>.
 *
 * Wrapper de <is-chart> con tipo fijo "pie". Las marcas de tarta se
 * dibujan en marks-radial.ts (drawPieMarks o equivalente).
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

const MOD = 'src/components/charts/pie-chart.ts';
const WRAPPER = 'src/components/charts/chart.ts';

test('is-pie-chart: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('is-pie-chart: wrapper registra tag is-pie-chart y tipo pie', () => {
  const src = read(MOD);
  assert.match(src, /window\.__isDefineTypedChart\s*\?\s*\.?\s*\(\s*['"`]is-pie-chart['"`]/);
  assert.match(src, /['"`]pie['"`]/);
});

test('is-pie-chart: motor monta shadow DOM con svg', () => {
  const src = read(WRAPPER);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('is-pie-chart: observados del motor incluyen type/label/legend-position', () => {
  const obs = extraerObservados(read(WRAPPER));
  assert.ok(obs.includes('type'));
  assert.ok(obs.includes('label'));
  assert.ok(obs.includes('legend-position'));
});

test('is-pie-chart: lee JSON embebido para data.labels + datasets', () => {
  assert.ok(leeJsonScript(read(WRAPPER)));
});

test('is-pie-chart: usa ResizeObserver', () => {
  assert.ok(usaResizeObserver(read(WRAPPER)));
});

test('is-pie-chart: registrado', () => {
  const src = read(WRAPPER);
  assert.ok(estaRegistrado(src, 'is-chart') || estaRegistrado(read(MOD), 'is-pie-chart'));
});

test('is-pie-chart: edge case guards', () => {
  assert.ok(tieneEdgeCaseGuards(read(WRAPPER)));
});
