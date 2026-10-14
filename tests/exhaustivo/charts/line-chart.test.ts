/**
 * line-chart.test.ts — verificación exhaustiva de <iswc-line-chart>.
 *
 * Wrapper de <iswc-chart> con tipo fijo "line". Mismo patrón que bar-chart
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

test('iswc-line-chart: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('iswc-line-chart: wrapper registra tag iswc-line-chart y tipo line', () => {
  const src = read(MOD);
  assert.match(src, /window\.__isDefineTypedChart\s*\?\s*\.?\s*\(\s*['"`]iswc-line-chart['"`]/);
  assert.match(src, /['"`]line['"`]/);
});

test('iswc-line-chart: motor monta shadow DOM', () => {
  assert.ok(tieneShadow(read(WRAPPER)));
});

test('iswc-line-chart: observados heredados contienen type/label/x-label/y-label', () => {
  const obs = extraerObservados(read(WRAPPER));
  for (const k of ['type', 'label', 'x-label', 'y-label']) {
    assert.ok(obs.includes(k), `chart.ts debe declarar ${k}`);
  }
});

test('iswc-line-chart: lee JSON embebido', () => {
  assert.ok(leeJsonScript(read(WRAPPER)));
});

test('iswc-line-chart: usa ResizeObserver para responsive', () => {
  assert.ok(usaResizeObserver(read(WRAPPER)));
});

test('iswc-line-chart: registrado como custom element', () => {
  const src = read(WRAPPER);
  assert.ok(estaRegistrado(src, 'iswc-chart') || estaRegistrado(read(MOD), 'iswc-line-chart'));
});

test('iswc-line-chart: tiene guards contra null en data', () => {
  assert.ok(tieneEdgeCaseGuards(read(WRAPPER)));
});
