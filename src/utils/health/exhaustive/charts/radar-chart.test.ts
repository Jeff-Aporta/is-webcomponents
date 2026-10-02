/**
 * radar-chart.test.ts — verificación exhaustiva de <iswc-radar-chart>.
 *
 * Wrapper de <iswc-chart> con tipo fijo "radar". Dibuja rejilla radial
 * + polígono por dataset (marks-radial.ts).
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

const MOD = 'src/components/charts/radar-chart.ts';
const WRAPPER = 'src/components/charts/chart.ts';

test('iswc-radar-chart: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('iswc-radar-chart: wrapper registra tag iswc-radar-chart y tipo radar', () => {
  const src = read(MOD);
  assert.match(src, /window\.__isDefineTypedChart\s*\?\s*\.?\s*\(\s*['"`]iswc-radar-chart['"`]/);
  assert.match(src, /['"`]radar['"`]/);
});

test('iswc-radar-chart: motor monta shadow DOM con svg', () => {
  const src = read(WRAPPER);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('iswc-radar-chart: observados del motor', () => {
  const obs = extraerObservados(read(WRAPPER));
  assert.ok(obs.includes('type'));
  assert.ok(obs.includes('label'));
  assert.ok(obs.includes('legend-position'));
});

test('iswc-radar-chart: lee JSON embebido', () => {
  assert.ok(leeJsonScript(read(WRAPPER)));
});

test('iswc-radar-chart: usa ResizeObserver', () => {
  assert.ok(usaResizeObserver(read(WRAPPER)));
});

test('iswc-radar-chart: registrado', () => {
  const src = read(WRAPPER);
  assert.ok(estaRegistrado(src, 'iswc-chart') || estaRegistrado(read(MOD), 'iswc-radar-chart'));
});

test('iswc-radar-chart: edge case guards', () => {
  assert.ok(tieneEdgeCaseGuards(read(WRAPPER)));
});
