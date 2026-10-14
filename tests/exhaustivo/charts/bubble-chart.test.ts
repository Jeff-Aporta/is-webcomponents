/**
 * bubble-chart.test.ts — verificación exhaustiva de <iswc-bubble-chart>.
 *
 * Wrapper de <iswc-chart> con tipo "bubble". Cada punto XY tiene un tercer
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

test('iswc-bubble-chart: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('iswc-bubble-chart: wrapper registra tag iswc-bubble-chart y tipo bubble', () => {
  const src = read(MOD);
  assert.match(src, /window\.__isDefineTypedChart\s*\?\s*\.?\s*\(\s*['"`]iswc-bubble-chart['"`]/);
  assert.match(src, /['"`]bubble['"`]/);
});

test('iswc-bubble-chart: motor monta shadow DOM con svg', () => {
  const src = read(WRAPPER);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('iswc-bubble-chart: observados del motor', () => {
  const obs = extraerObservados(read(WRAPPER));
  assert.ok(obs.includes('type'));
  assert.ok(obs.includes('label'));
});

test('iswc-bubble-chart: lee JSON embebido', () => {
  assert.ok(leeJsonScript(read(WRAPPER)));
});

test('iswc-bubble-chart: usa ResizeObserver', () => {
  assert.ok(usaResizeObserver(read(WRAPPER)));
});

test('iswc-bubble-chart: registrado', () => {
  const src = read(WRAPPER);
  assert.ok(estaRegistrado(src, 'iswc-chart') || estaRegistrado(read(MOD), 'iswc-bubble-chart'));
});

test('iswc-bubble-chart: edge case guards', () => {
  assert.ok(tieneEdgeCaseGuards(read(WRAPPER)));
});
