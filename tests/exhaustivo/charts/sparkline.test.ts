/**
 * sparkline.test.ts — verificación exhaustiva de <iswc-sparkline>.
 *
 * Mini-gráfico SVG inline (sin axes). Atributo values="1,2,3,4" o
 * propiedad `data = [...]`. Variantes: type=line|bar, variant=gradient|solid.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  exists,
  read,
  extraerObservados,
  tieneShadow,
  estaRegistrado,
  usaResizeObserver,
  tieneEdgeCaseGuards,
  adoptaCss,
  cleanupCompleto,
} from '../_helpers.ts';

const MOD = 'src/components/charts/sparkline.ts';

test('iswc-sparkline: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('iswc-sparkline: render — shadow con svg', () => {
  const src = read(MOD);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('iswc-sparkline: observados (values, data, type, label, variant, curve, trend)', () => {
  const obs = extraerObservados(read(MOD));
  for (const k of ['values', 'data', 'type', 'label', 'variant', 'curve', 'trend']) {
    assert.ok(obs.includes(k), `sparkline declara ${k}`);
  }
});

test('iswc-sparkline: edge cases — Array.isArray + Number.isFinite en setter data', () => {
  const src = read(MOD);
  assert.match(src, /Array\.isArray\s*\(/);
  assert.match(src, /Number\.isFinite/);
});

test('iswc-sparkline: usa ResizeObserver para re-render', () => {
  assert.ok(usaResizeObserver(read(MOD)));
});

test('iswc-sparkline: cleanup — desconecta ResizeObserver en disconnectedCallback', () => {
  const c = cleanupCompleto(read(MOD));
  assert.ok(c.ro, 'ResizeObserver debe desconectarse');
});

test('iswc-sparkline: adopta CSS', () => {
  assert.ok(adoptaCss(read(MOD)));
});

test('iswc-sparkline: registrado como custom element', () => {
  const src = read(MOD);
  assert.match(src, /defineElement\s*\(\s*['"`]iswc-sparkline['"`]/);
});
