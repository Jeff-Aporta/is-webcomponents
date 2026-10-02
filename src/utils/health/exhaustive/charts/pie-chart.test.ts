/**
 * pie-chart.test.ts — verificación exhaustiva de <iswc-pie-chart>.
 *
 * Wrapper de <iswc-chart> con tipo fijo "pie". Las marcas de tarta se
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

test('iswc-pie-chart: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('iswc-pie-chart: wrapper registra tag iswc-pie-chart y tipo pie', () => {
  const src = read(MOD);
  assert.match(src, /window\.__isDefineTypedChart\s*\?\s*\.?\s*\(\s*['"`]iswc-pie-chart['"`]/);
  assert.match(src, /['"`]pie['"`]/);
});

test('iswc-pie-chart: motor monta shadow DOM con svg', () => {
  const src = read(WRAPPER);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('iswc-pie-chart: observados del motor incluyen type/label/legend-position', () => {
  const obs = extraerObservados(read(WRAPPER));
  assert.ok(obs.includes('type'));
  assert.ok(obs.includes('label'));
  assert.ok(obs.includes('legend-position'));
});

test('iswc-pie-chart: lee JSON embebido para data.labels + datasets', () => {
  assert.ok(leeJsonScript(read(WRAPPER)));
});

test('iswc-pie-chart: usa ResizeObserver', () => {
  assert.ok(usaResizeObserver(read(WRAPPER)));
});

test('iswc-pie-chart: registrado', () => {
  const src = read(WRAPPER);
  assert.ok(estaRegistrado(src, 'iswc-chart') || estaRegistrado(read(MOD), 'iswc-pie-chart'));
});

test('iswc-pie-chart: edge case guards', () => {
  assert.ok(tieneEdgeCaseGuards(read(WRAPPER)));
});
