/**
 * treemap.test.ts — verificación exhaustiva de <iswc-treemap>.
 *
 * Treemap anidado en SVG (algoritmo squarified). Acepta:
 *   <iswc-treemap>
 *     <script type="application/json">{ treemap: { nodes: [...] } }</script>
 *   </iswc-treemap>
 *
 * Atributos: color (inline | viewer), open-on-click.
 * Eventos: iswc-render, iswc-open-viewer.
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

test('iswc-treemap: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('iswc-treemap: render — shadow con svg', () => {
  const src = read(MOD);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
  // Treemap usa tm-svg como class identificador
  assert.match(src, /tm-svg/);
});

test('iswc-treemap: observados (color, open-on-click)', () => {
  const obs = extraerObservados(read(MOD));
  assert.ok(obs.includes('color'));
  assert.ok(obs.includes('open-on-click'));
});

test('iswc-treemap: eventos (iswc-render, iswc-open-viewer)', () => {
  const evts = extraerEventos(read(MOD));
  assert.ok(evts.includes('iswc-render'));
  assert.ok(evts.includes('iswc-open-viewer'));
});

test('iswc-treemap: CSS parts (base, canvas, tooltip)', () => {
  const parts = extraerParts(read(MOD));
  assert.ok(parts.includes('base'));
  assert.ok(parts.includes('canvas'));
  assert.ok(parts.includes('tooltip'));
});

test('iswc-treemap: JSON payload — lee <script type="application/json">', () => {
  const src = read(MOD);
  assert.ok(leeJsonScript(src));
  assert.ok(parseaJson(src));
});

test('iswc-treemap: usa MutationObserver para slot JSON reactivo', () => {
  assert.ok(usaMutationObserver(read(MOD)));
});

test('iswc-treemap: usa ResizeObserver para responsive', () => {
  assert.ok(usaResizeObserver(read(MOD)));
});

test('iswc-treemap: edge cases — null payload / empty nodes', () => {
  assert.ok(tieneEdgeCaseGuards(read(MOD)));
});

test('iswc-treemap: cleanup — desconecta observers + listeners', () => {
  const c = cleanupCompleto(read(MOD));
  assert.ok(c.obs);
  assert.ok(c.ro);
  assert.ok(c.listeners);
});

test('iswc-treemap: adopta CSS', () => {
  assert.ok(adoptaCss(read(MOD)));
});

test('iswc-treemap: registrado', () => {
  const src = read(MOD);
  assert.match(src, /defineElement\s*\(\s*['"`]iswc-treemap['"`]/);
  assert.ok(estaRegistrado(src, 'iswc-treemap'));
});
