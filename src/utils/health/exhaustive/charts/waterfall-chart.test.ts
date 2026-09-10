/**
 * waterfall-chart.test.ts — verificación exhaustiva de <is-waterfall-chart>.
 *
 * Wrapper de <is-chart> con tipo "waterfall". Barras con conectores que
 * muestran flujo acumulado (ingresos - gastos = utilidad).
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

const MOD = 'src/components/charts/waterfall-chart.ts';
const WRAPPER = 'src/components/charts/chart.ts';

test('is-waterfall-chart: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('is-waterfall-chart: wrapper registra tag is-waterfall-chart y tipo waterfall', () => {
  const src = read(MOD);
  assert.match(src, /window\.__isDefineTypedChart\s*\?\s*\.?\s*\(\s*['"`]is-waterfall-chart['"`]/);
  assert.match(src, /['"`]waterfall['"`]/);
});

test('is-waterfall-chart: motor monta shadow DOM con svg', () => {
  const src = read(WRAPPER);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('is-waterfall-chart: observados del motor', () => {
  const obs = extraerObservados(read(WRAPPER));
  assert.ok(obs.includes('type'));
  assert.ok(obs.includes('label'));
});

test('is-waterfall-chart: lee JSON embebido', () => {
  assert.ok(leeJsonScript(read(WRAPPER)));
});

test('is-waterfall-chart: usa ResizeObserver', () => {
  assert.ok(usaResizeObserver(read(WRAPPER)));
});

test('is-waterfall-chart: registrado', () => {
  const src = read(WRAPPER);
  assert.ok(estaRegistrado(src, 'is-chart') || estaRegistrado(read(MOD), 'is-waterfall-chart'));
});

test('is-waterfall-chart: edge case guards', () => {
  assert.ok(tieneEdgeCaseGuards(read(WRAPPER)));
});
