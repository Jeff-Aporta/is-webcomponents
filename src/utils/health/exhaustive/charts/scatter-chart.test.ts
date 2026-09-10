/**
 * scatter-chart.test.ts — verificación exhaustiva de <is-scatter-chart>.
 *
 * Wrapper de <is-chart> con tipo "scatter". Puntos XY en plano cartesiano.
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

test('is-scatter-chart: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('is-scatter-chart: wrapper registra tag is-scatter-chart y tipo scatter', () => {
  const src = read(MOD);
  assert.match(src, /window\.__isDefineTypedChart\s*\?\s*\.?\s*\(\s*['"`]is-scatter-chart['"`]/);
  assert.match(src, /['"`]scatter['"`]/);
});

test('is-scatter-chart: motor monta shadow DOM con svg', () => {
  const src = read(WRAPPER);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('is-scatter-chart: observados del motor incluyen type/label', () => {
  const obs = extraerObservados(read(WRAPPER));
  assert.ok(obs.includes('type'));
  assert.ok(obs.includes('label'));
});

test('is-scatter-chart: lee JSON embebido', () => {
  assert.ok(leeJsonScript(read(WRAPPER)));
});

test('is-scatter-chart: usa ResizeObserver', () => {
  assert.ok(usaResizeObserver(read(WRAPPER)));
});

test('is-scatter-chart: registrado', () => {
  const src = read(WRAPPER);
  assert.ok(estaRegistrado(src, 'is-chart') || estaRegistrado(read(MOD), 'is-scatter-chart'));
});

test('is-scatter-chart: edge case guards', () => {
  assert.ok(tieneEdgeCaseGuards(read(WRAPPER)));
});
