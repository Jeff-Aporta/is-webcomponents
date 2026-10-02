/**
 * scatter-chart.test.ts — verificación exhaustiva de <iswc-scatter-chart>.
 *
 * Wrapper de <iswc-chart> con tipo "scatter". Puntos XY en plano cartesiano.
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

const MOD = 'src/components/charts/scatter-chart.ts';
const WRAPPER = 'src/components/charts/chart.ts';

test('iswc-scatter-chart: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('iswc-scatter-chart: wrapper registra tag iswc-scatter-chart y tipo scatter', () => {
  const src = read(MOD);
  assert.match(src, /window\.__isDefineTypedChart\s*\?\s*\.?\s*\(\s*['"`]iswc-scatter-chart['"`]/);
  assert.match(src, /['"`]scatter['"`]/);
});

test('iswc-scatter-chart: motor monta shadow DOM con svg', () => {
  const src = read(WRAPPER);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('iswc-scatter-chart: observados del motor incluyen type/label', () => {
  const obs = extraerObservados(read(WRAPPER));
  assert.ok(obs.includes('type'));
  assert.ok(obs.includes('label'));
});

test('iswc-scatter-chart: lee JSON embebido', () => {
  assert.ok(leeJsonScript(read(WRAPPER)));
});

test('iswc-scatter-chart: usa ResizeObserver', () => {
  assert.ok(usaResizeObserver(read(WRAPPER)));
});

test('iswc-scatter-chart: registrado', () => {
  const src = read(WRAPPER);
  assert.ok(estaRegistrado(src, 'iswc-chart') || estaRegistrado(read(MOD), 'iswc-scatter-chart'));
});

test('iswc-scatter-chart: edge case guards', () => {
  assert.ok(tieneEdgeCaseGuards(read(WRAPPER)));
});
