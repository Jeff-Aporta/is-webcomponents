/**
 * chart.test.ts — verificación exhaustiva de <is-chart> (genérico).
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

test('is-chart: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('is-chart: render — attachShadow open + svg en shadow DOM', () => {
  const src = read(MOD);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
  assert.match(src, /attachShadow\s*\(\s*\{\s*mode\s*:\s*['"]open['"]\s*\}/);
});

test('is-chart: atributos observados (mínimo 10)', () => {
  const obs = extraerObservados(read(MOD));
  for (const k of ['type', 'label', 'legend-position', 'index-axis', 'min', 'max',
    'stacked', 'without-animation', 'without-legend', 'x-label', 'y-label']) {
    assert.ok(obs.includes(k), `is-chart debe declarar ${k}`);
  }
  assert.ok(obs.length >= 10, `is-chart declara ${obs.length} attrs`);
});

test('is-chart: eventos emitidos (is-render)', () => {
  const evts = extraerEventos(read(MOD));
  assert.ok(evts.includes('is-render'), `eventos: ${evts.join(',')}`);
});

test('is-chart: tiene un slot oculto para <script type="application/json">', () => {
  // chart.ts lee su data de un <script type="application/json"> hijo
  // mediante un slot oculto. Verificamos que el slot existe.
  const src = read(MOD);
  assert.match(src, /<slot\b/);
});

test('is-chart: shadow DOM parts', () => {
  const parts = extraerParts(read(MOD));
  assert.ok(parts.length >= 1, `is-chart declara ${parts.length} parts`);
});

test('is-chart: JSON payload — lee <script type="application/json">', () => {
  const src = read(MOD);
  assert.ok(leeJsonScript(src));
  assert.ok(parseaJson(src), 'is-chart usa JSON.parse()');
});

test('is-chart: accesibilidad — usa role o aria-*', () => {
  assert.ok(tieneAccesibilidad(read(MOD)), 'is-chart tiene role o aria-*');
});

test('is-chart: edge cases — null/undefined/empty arrays', () => {
  assert.ok(tieneEdgeCaseGuards(read(MOD)));
});

test('is-chart: integración — registrado vía defineElement', () => {
  const src = read(MOD);
  assert.match(src, /defineElement\s*\(\s*['"`]is-chart['"`]/);
  assert.ok(estaRegistrado(src, 'is-chart'));
});

test('is-chart: performance — usa ResizeObserver y MutationObserver', () => {
  const src = read(MOD);
  assert.ok(usaResizeObserver(src));
  assert.ok(usaMutationObserver(src));
});

test('is-chart: cleanup — disconnectedCallback desconecta observers', () => {
  const c = cleanupCompleto(read(MOD));
  // chart.ts usa ambos observers; debe desconectar.
  assert.ok(c.obs || !usaMutationObserver(read(MOD)), 'MutationObserver desconectado o no usado');
  assert.ok(c.ro || !usaResizeObserver(read(MOD)), 'ResizeObserver desconectado o no usado');
});

test('is-chart: adopta CSS', () => {
  assert.ok(adoptaCss(read(MOD)));
});
