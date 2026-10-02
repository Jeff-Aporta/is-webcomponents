/**
 * funnel-chart.test.ts — verificación exhaustiva de <iswc-funnel-chart>.
 *
 * Wrapper de <iswc-chart> con tipo "funnel". Embudo de conversión
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

test('iswc-funnel-chart: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('iswc-funnel-chart: wrapper registra tag iswc-funnel-chart y tipo funnel', () => {
  const src = read(MOD);
  assert.match(src, /window\.__isDefineTypedChart\s*\?\s*\.?\s*\(\s*['"`]iswc-funnel-chart['"`]/);
  assert.match(src, /['"`]funnel['"`]/);
});

test('iswc-funnel-chart: motor monta shadow DOM con svg', () => {
  const src = read(WRAPPER);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('iswc-funnel-chart: observados del motor', () => {
  const obs = extraerObservados(read(WRAPPER));
  assert.ok(obs.includes('type'));
  assert.ok(obs.includes('label'));
});

test('iswc-funnel-chart: lee JSON embebido', () => {
  assert.ok(leeJsonScript(read(WRAPPER)));
});

test('iswc-funnel-chart: usa ResizeObserver', () => {
  assert.ok(usaResizeObserver(read(WRAPPER)));
});

test('iswc-funnel-chart: registrado', () => {
  const src = read(WRAPPER);
  assert.ok(estaRegistrado(src, 'iswc-chart') || estaRegistrado(read(MOD), 'iswc-funnel-chart'));
});

test('iswc-funnel-chart: edge case guards', () => {
  assert.ok(tieneEdgeCaseGuards(read(WRAPPER)));
});
