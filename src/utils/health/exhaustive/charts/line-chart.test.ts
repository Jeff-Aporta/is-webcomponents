/**
 * line-chart.test.ts — verificación exhaustiva de <is-line-chart>.
 *
 * Wrapper de <is-chart> con tipo fijo "line". Mismo patrón que bar-chart
 * pero invoca drawLineMarks (marks-cartesian) con tipo 'line'.
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

const MOD = 'src/components/charts/line-chart.ts';
const WRAPPER = 'src/components/charts/chart.ts';

test('is-line-chart: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('is-line-chart: wrapper registra tag is-line-chart y tipo line', () => {
  const src = read(MOD);
  assert.match(src, /window\.__isDefineTypedChart\s*\?\s*\.?\s*\(\s*['"`]is-line-chart['"`]/);
  assert.match(src, /['"`]line['"`]/);
});

test('is-line-chart: motor monta shadow DOM', () => {
  assert.ok(tieneShadow(read(WRAPPER)));
});

test('is-line-chart: observados heredados contienen type/label/x-label/y-label', () => {
  const obs = extraerObservados(read(WRAPPER));
  for (const k of ['type', 'label', 'x-label', 'y-label']) {
    assert.ok(obs.includes(k), `chart.ts debe declarar ${k}`);
  }
});

test('is-line-chart: lee JSON embebido', () => {
  assert.ok(leeJsonScript(read(WRAPPER)));
});

test('is-line-chart: usa ResizeObserver para responsive', () => {
  assert.ok(usaResizeObserver(read(WRAPPER)));
});

test('is-line-chart: registrado como custom element', () => {
  const src = read(WRAPPER);
  assert.ok(estaRegistrado(src, 'is-chart') || estaRegistrado(read(MOD), 'is-line-chart'));
});

test('is-line-chart: tiene guards contra null en data', () => {
  assert.ok(tieneEdgeCaseGuards(read(WRAPPER)));
});
