/**
 * waterfall-chart.test.ts — verificación exhaustiva de <iswc-waterfall-chart>.
 *
 * Wrapper de <iswc-chart> con tipo "waterfall". Barras con conectores que
 * muestran flujo acumulado (ingresos - gastos = utilidad).
 */
import assert from 'node:assert/strict';
import {
  exists,
  read,
  extraerObservados,
  leeJsonScript,
  tieneShadow,
  estaRegistrado,
  usaResizeObserver,
  tieneEdgeCaseGuards,
} from '../../_shared/exhaustivo.ts';
import { coleccionPruebas } from '../../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });


const MOD = 'src/components/charts/waterfall-chart.ts';
const WRAPPER = 'src/components/charts/chart.ts';

test('iswc-waterfall-chart: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('iswc-waterfall-chart: wrapper registra tag iswc-waterfall-chart y tipo waterfall', () => {
  const src = read(MOD);
  assert.match(src, /window\.__isDefineTypedChart\s*\?\s*\.?\s*\(\s*['"`]iswc-waterfall-chart['"`]/);
  assert.match(src, /['"`]waterfall['"`]/);
});

test('iswc-waterfall-chart: motor monta shadow DOM con svg', () => {
  const src = read(WRAPPER);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('iswc-waterfall-chart: observados del motor', () => {
  const obs = extraerObservados(read(WRAPPER));
  assert.ok(obs.includes('type'));
  assert.ok(obs.includes('label'));
});

test('iswc-waterfall-chart: lee JSON embebido', () => {
  assert.ok(leeJsonScript(read(WRAPPER)));
});

test('iswc-waterfall-chart: usa ResizeObserver', () => {
  assert.ok(usaResizeObserver(read(WRAPPER)));
});

test('iswc-waterfall-chart: registrado', () => {
  const src = read(WRAPPER);
  assert.ok(estaRegistrado(src, 'iswc-chart') || estaRegistrado(read(MOD), 'iswc-waterfall-chart'));
});

test('iswc-waterfall-chart: edge case guards', () => {
  assert.ok(tieneEdgeCaseGuards(read(WRAPPER)));
});

export default lista();
