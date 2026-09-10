/**
 * bubble-chart.test.ts — verificación exhaustiva de <is-bubble-chart>.
 *
 * Wrapper de <is-chart> con tipo "bubble". Cada punto XY tiene un tercer
 * eje (radius) que codifica el valor z.
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

const MOD = 'src/components/charts/bubble-chart.ts';
const WRAPPER = 'src/components/charts/chart.ts';

test('is-bubble-chart: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('is-bubble-chart: wrapper registra tag is-bubble-chart y tipo bubble', () => {
  const src = read(MOD);
  assert.match(src, /window\.__isDefineTypedChart\s*\?\s*\.?\s*\(\s*['"`]is-bubble-chart['"`]/);
  assert.match(src, /['"`]bubble['"`]/);
});

test('is-bubble-chart: motor monta shadow DOM con svg', () => {
  const src = read(WRAPPER);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('is-bubble-chart: observados del motor', () => {
  const obs = extraerObservados(read(WRAPPER));
  assert.ok(obs.includes('type'));
  assert.ok(obs.includes('label'));
});

test('is-bubble-chart: lee JSON embebido', () => {
  assert.ok(leeJsonScript(read(WRAPPER)));
});

test('is-bubble-chart: usa ResizeObserver', () => {
  assert.ok(usaResizeObserver(read(WRAPPER)));
});

test('is-bubble-chart: registrado', () => {
  const src = read(WRAPPER);
  assert.ok(estaRegistrado(src, 'is-chart') || estaRegistrado(read(MOD), 'is-bubble-chart'));
});

test('is-bubble-chart: edge case guards', () => {
  assert.ok(tieneEdgeCaseGuards(read(WRAPPER)));
});
