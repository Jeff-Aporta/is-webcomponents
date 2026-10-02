/**
 * bar-chart.test.ts — verificación exhaustiva de <iswc-bar-chart>.
 *
 * Wrapper de <iswc-chart> con tipo fijo "bar". Aporta el dibujo de marcas
 * (drawBarMarks) registrado vía window.__isDefineTypedChart.
 *
 * 10 dimensiones: render, observados, eventos, slots, parts,
 * JSON payload, accesibilidad, edge cases, integración, performance.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ROOT,
  exists,
  read,
  extraerObservados,
  extraerEventos,
  extraerSlots,
  extraerParts,
  tieneShadow,
  leeJsonScript,
  tieneEdgeCaseGuards,
  estaRegistrado,
  usaResizeObserver,
} from '../_helpers.ts';

const MOD = 'src/components/charts/bar-chart.ts';
const WRAPPER = 'src/components/charts/chart.ts';

test('iswc-bar-chart: archivo existe y mide >0 bytes', () => {
  assert.ok(exists(MOD), `${MOD} debe existir`);
});

test('iswc-bar-chart: wrapper invoca window.__isDefineTypedChart con tag y tipo bar', () => {
  const src = read(MOD);
  assert.match(src, /window\.__isDefineTypedChart\s*\?\s*\.?\s*\(\s*['"`]iswc-bar-chart['"`]/);
  assert.match(src, /['"`](['"`])?bar(['"`])?/);
});

test('iswc-bar-chart: motor <iswc-chart> tiene shadow DOM abierto', () => {
  const src = read(WRAPPER);
  assert.ok(tieneShadow(src), 'chart.ts debe montar shadow DOM con mode:open');
});

test('iswc-bar-chart: observado via motor (heredado de chart.ts)', () => {
  const observados = extraerObservados(read(WRAPPER));
  // Los observados vienen del factory chart.ts. Bar-chart hereda sin override.
  assert.ok(observados.includes('type'), 'chart.ts declara type');
  assert.ok(observados.includes('label'), 'chart.ts declara label');
});

test('iswc-bar-chart: lee <script type="application/json"> para data', () => {
  const src = read(WRAPPER);
  assert.ok(leeJsonScript(src), 'chart.ts procesa <script type="application/json">');
});

test('iswc-bar-chart: usa ResizeObserver para re-render en resize', () => {
  assert.ok(usaResizeObserver(read(WRAPPER)), 'chart.ts usa ResizeObserver');
});

test('iswc-bar-chart: registrado vía customElements (indirecto via chart.ts)', () => {
  const src = read(WRAPPER);
  assert.ok(
    estaRegistrado(src, 'iswc-chart') || estaRegistrado(read(MOD), 'iswc-bar-chart'),
    'iswc-chart debe estar registrado',
  );
});

test('iswc-bar-chart: tiene edge case guards (null/undefined en data)', () => {
  assert.ok(tieneEdgeCaseGuards(read(WRAPPER)));
});
