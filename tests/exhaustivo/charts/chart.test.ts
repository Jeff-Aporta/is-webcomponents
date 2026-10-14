/**
 * chart.test.ts — verificación exhaustiva de <iswc-chart> (genérico).
 *
 * Motor de charts en SVG sin dependencias. Resuelve el tipo en runtime
 * vía window.__isDefineTypedChart. Acepta <script type="application/json">
 * hijo con { type, data: { labels, datasets }, options }.
 *
 * 10 dimensiones completas.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  exists,
  read,
  extraerObservados,
  extraerEventos,
  extraerSlots,
  extraerParts,
  tieneShadow,
  leeJsonScript,
  parseaJson,
  estaRegistrado,
  usaResizeObserver,
  usaMutationObserver,
  tieneEdgeCaseGuards,
  tieneAccesibilidad,
  adoptaCss,
  cleanupCompleto,
} from '../_helpers.ts';

const MOD = 'src/components/charts/chart.ts';

test('iswc-chart: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('iswc-chart: render — attachShadow open + svg en shadow DOM', () => {
  const src = read(MOD);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
  assert.match(src, /attachShadow\s*\(\s*\{\s*mode\s*:\s*['"]open['"]\s*\}/);
});

test('iswc-chart: atributos observados (mínimo 10)', () => {
  const obs = extraerObservados(read(MOD));
  for (const k of ['type', 'label', 'legend-position', 'index-axis', 'min', 'max',
    'stacked', 'without-animation', 'without-legend', 'x-label', 'y-label']) {
    assert.ok(obs.includes(k), `iswc-chart debe declarar ${k}`);
  }
  assert.ok(obs.length >= 10, `iswc-chart declara ${obs.length} attrs`);
});

test('iswc-chart: eventos emitidos (iswc-render)', () => {
  const evts = extraerEventos(read(MOD));
  assert.ok(evts.includes('iswc-render'), `eventos: ${evts.join(',')}`);
});

test('iswc-chart: tiene un slot oculto para <script type="application/json">', () => {
  // chart.ts lee su data de un <script type="application/json"> hijo
  // mediante un slot oculto. Verificamos que el slot existe.
  const src = read(MOD);
  assert.match(src, /<slot\b/);
});

test('iswc-chart: shadow DOM parts', () => {
  const parts = extraerParts(read(MOD));
  assert.ok(parts.length >= 1, `iswc-chart declara ${parts.length} parts`);
});

test('iswc-chart: JSON payload — lee <script type="application/json">', () => {
  const src = read(MOD);
  assert.ok(leeJsonScript(src));
  assert.ok(parseaJson(src), 'iswc-chart usa JSON.parse()');
});

test('iswc-chart: accesibilidad — usa role o aria-*', () => {
  assert.ok(tieneAccesibilidad(read(MOD)), 'iswc-chart tiene role o aria-*');
});

test('iswc-chart: edge cases — null/undefined/empty arrays', () => {
  assert.ok(tieneEdgeCaseGuards(read(MOD)));
});

test('iswc-chart: integración — registrado vía defineElement', () => {
  const src = read(MOD);
  assert.match(src, /defineElement\s*\(\s*['"`]iswc-chart['"`]/);
  assert.ok(estaRegistrado(src, 'iswc-chart'));
});

test('iswc-chart: performance — usa ResizeObserver y MutationObserver', () => {
  const src = read(MOD);
  assert.ok(usaResizeObserver(src));
  assert.ok(usaMutationObserver(src));
});

test('iswc-chart: cleanup — disconnectedCallback desconecta observers', () => {
  const c = cleanupCompleto(read(MOD));
  // chart.ts usa ambos observers; debe desconectar.
  assert.ok(c.obs || !usaMutationObserver(read(MOD)), 'MutationObserver desconectado o no usado');
  assert.ok(c.ro || !usaResizeObserver(read(MOD)), 'ResizeObserver desconectado o no usado');
});

test('iswc-chart: adopta CSS', () => {
  assert.ok(adoptaCss(read(MOD)));
});
