/**
 * treemap.test.ts — verificación exhaustiva de <is-treemap>.
 *
 * Treemap anidado en SVG (algoritmo squarified). Acepta:
 *   <is-treemap>
 *     <script type="application/json">{ treemap: { nodes: [...] } }</script>
 *   </is-treemap>
 *
 * Atributos: color (inline | viewer), open-on-click.
 * Eventos: is-render, is-open-viewer.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  exists,
  read,
  extraerObservados,
  extraerEventos,
  extraerParts,
  tieneShadow,
  leeJsonScript,
  parseaJson,
  usaMutationObserver,
  usaResizeObserver,
  tieneEdgeCaseGuards,
  adoptaCss,
  cleanupCompleto,
  estaRegistrado,
} from '../_helpers.ts';

const MOD = 'src/components/charts/treemap.ts';

test('is-treemap: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('is-treemap: render — shadow con svg', () => {
  const src = read(MOD);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
  // Treemap usa tm-svg como class identificador
  assert.match(src, /tm-svg/);
});

test('is-treemap: observados (color, open-on-click)', () => {
  const obs = extraerObservados(read(MOD));
  assert.ok(obs.includes('color'));
  assert.ok(obs.includes('open-on-click'));
});

test('is-treemap: eventos (is-render, is-open-viewer)', () => {
  const evts = extraerEventos(read(MOD));
  assert.ok(evts.includes('is-render'));
  assert.ok(evts.includes('is-open-viewer'));
});

test('is-treemap: CSS parts (base, canvas, tooltip)', () => {
  const parts = extraerParts(read(MOD));
  assert.ok(parts.includes('base'));
  assert.ok(parts.includes('canvas'));
  assert.ok(parts.includes('tooltip'));
});

test('is-treemap: JSON payload — lee <script type="application/json">', () => {
  const src = read(MOD);
  assert.ok(leeJsonScript(src));
  assert.ok(parseaJson(src));
});

test('is-treemap: usa MutationObserver para slot JSON reactivo', () => {
  assert.ok(usaMutationObserver(read(MOD)));
});

test('is-treemap: usa ResizeObserver para responsive', () => {
  assert.ok(usaResizeObserver(read(MOD)));
});

test('is-treemap: edge cases — null payload / empty nodes', () => {
  assert.ok(tieneEdgeCaseGuards(read(MOD)));
});

test('is-treemap: cleanup — desconecta observers + listeners', () => {
  const c = cleanupCompleto(read(MOD));
  assert.ok(c.obs);
  assert.ok(c.ro);
  assert.ok(c.listeners);
});

test('is-treemap: adopta CSS', () => {
  assert.ok(adoptaCss(read(MOD)));
});

test('is-treemap: registrado', () => {
  const src = read(MOD);
  assert.match(src, /defineElement\s*\(\s*['"`]is-treemap['"`]/);
  assert.ok(estaRegistrado(src, 'is-treemap'));
});
