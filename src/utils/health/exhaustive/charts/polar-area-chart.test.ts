/**
 * polar-area-chart.test.ts — verificación exhaustiva de <is-polar-area-chart>.
 *
 * Wrapper de <is-chart> con tipo "polarArea". Sectores con ángulo fijo
 * y radio variable según valor.
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

const MOD = 'src/components/charts/polar-area-chart.ts';
const WRAPPER = 'src/components/charts/chart.ts';

test('is-polar-area-chart: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('is-polar-area-chart: wrapper registra tag is-polar-area-chart y tipo polarArea', () => {
  const src = read(MOD);
  assert.match(src, /window\.__isDefineTypedChart\s*\?\s*\.?\s*\(\s*['"`]is-polar-area-chart['"`]/);
  assert.match(src, /polarArea|polar_area/);
});

test('is-polar-area-chart: motor monta shadow DOM con svg', () => {
  const src = read(WRAPPER);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('is-polar-area-chart: observados del motor', () => {
  const obs = extraerObservados(read(WRAPPER));
  assert.ok(obs.includes('type'));
  assert.ok(obs.includes('label'));
});

test('is-polar-area-chart: lee JSON embebido', () => {
  assert.ok(leeJsonScript(read(WRAPPER)));
});

test('is-polar-area-chart: usa ResizeObserver', () => {
  assert.ok(usaResizeObserver(read(WRAPPER)));
});

test('is-polar-area-chart: registrado', () => {
  const src = read(WRAPPER);
  assert.ok(estaRegistrado(src, 'is-chart') || estaRegistrado(read(MOD), 'is-polar-area-chart'));
});

test('is-polar-area-chart: edge case guards', () => {
  assert.ok(tieneEdgeCaseGuards(read(WRAPPER)));
});
