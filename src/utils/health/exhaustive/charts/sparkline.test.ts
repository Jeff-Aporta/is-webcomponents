/**
 * sparkline.test.ts — verificación exhaustiva de <is-sparkline>.
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

test('is-sparkline: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('is-sparkline: render — shadow con svg', () => {
  const src = read(MOD);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('is-sparkline: observados (values, data, type, label, variant, curve, trend)', () => {
  const obs = extraerObservados(read(MOD));
  for (const k of ['values', 'data', 'type', 'label', 'variant', 'curve', 'trend']) {
    assert.ok(obs.includes(k), `sparkline declara ${k}`);
  }
});

test('is-sparkline: edge cases — Array.isArray + Number.isFinite en setter data', () => {
  const src = read(MOD);
  assert.match(src, /Array\.isArray\s*\(/);
  assert.match(src, /Number\.isFinite/);
});

test('is-sparkline: usa ResizeObserver para re-render', () => {
  assert.ok(usaResizeObserver(read(MOD)));
});

test('is-sparkline: cleanup — desconecta ResizeObserver en disconnectedCallback', () => {
  const c = cleanupCompleto(read(MOD));
  assert.ok(c.ro, 'ResizeObserver debe desconectarse');
});

test('is-sparkline: adopta CSS', () => {
  assert.ok(adoptaCss(read(MOD)));
});

test('is-sparkline: registrado como custom element', () => {
  const src = read(MOD);
  assert.match(src, /defineElement\s*\(\s*['"`]is-sparkline['"`]/);
});
