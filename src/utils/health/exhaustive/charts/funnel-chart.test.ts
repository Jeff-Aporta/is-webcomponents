/**
 * funnel-chart.test.ts — verificación exhaustiva de <is-funnel-chart>.
 *
 * Wrapper de <is-chart> con tipo "funnel". Embudo de conversión
 * (etapas con valores decrecientes).
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

const MOD = 'src/components/charts/funnel-chart.ts';
const WRAPPER = 'src/components/charts/chart.ts';

test('is-funnel-chart: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('is-funnel-chart: wrapper registra tag is-funnel-chart y tipo funnel', () => {
  const src = read(MOD);
  assert.match(src, /window\.__isDefineTypedChart\s*\?\s*\.?\s*\(\s*['"`]is-funnel-chart['"`]/);
  assert.match(src, /['"`]funnel['"`]/);
});

test('is-funnel-chart: motor monta shadow DOM con svg', () => {
  const src = read(WRAPPER);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('is-funnel-chart: observados del motor', () => {
  const obs = extraerObservados(read(WRAPPER));
  assert.ok(obs.includes('type'));
  assert.ok(obs.includes('label'));
});

test('is-funnel-chart: lee JSON embebido', () => {
  assert.ok(leeJsonScript(read(WRAPPER)));
});

test('is-funnel-chart: usa ResizeObserver', () => {
  assert.ok(usaResizeObserver(read(WRAPPER)));
});

test('is-funnel-chart: registrado', () => {
  const src = read(WRAPPER);
  assert.ok(estaRegistrado(src, 'is-chart') || estaRegistrado(read(MOD), 'is-funnel-chart'));
});

test('is-funnel-chart: edge case guards', () => {
  assert.ok(tieneEdgeCaseGuards(read(WRAPPER)));
});
