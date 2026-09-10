/**
 * radar-chart.test.ts — verificación exhaustiva de <is-radar-chart>.
 *
 * Wrapper de <is-chart> con tipo fijo "radar". Dibuja rejilla radial
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

test('is-radar-chart: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('is-radar-chart: wrapper registra tag is-radar-chart y tipo radar', () => {
  const src = read(MOD);
  assert.match(src, /window\.__isDefineTypedChart\s*\?\s*\.?\s*\(\s*['"`]is-radar-chart['"`]/);
  assert.match(src, /['"`]radar['"`]/);
});

test('is-radar-chart: motor monta shadow DOM con svg', () => {
  const src = read(WRAPPER);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('is-radar-chart: observados del motor', () => {
  const obs = extraerObservados(read(WRAPPER));
  assert.ok(obs.includes('type'));
  assert.ok(obs.includes('label'));
  assert.ok(obs.includes('legend-position'));
});

test('is-radar-chart: lee JSON embebido', () => {
  assert.ok(leeJsonScript(read(WRAPPER)));
});

test('is-radar-chart: usa ResizeObserver', () => {
  assert.ok(usaResizeObserver(read(WRAPPER)));
});

test('is-radar-chart: registrado', () => {
  const src = read(WRAPPER);
  assert.ok(estaRegistrado(src, 'is-chart') || estaRegistrado(read(MOD), 'is-radar-chart'));
});

test('is-radar-chart: edge case guards', () => {
  assert.ok(tieneEdgeCaseGuards(read(WRAPPER)));
});
