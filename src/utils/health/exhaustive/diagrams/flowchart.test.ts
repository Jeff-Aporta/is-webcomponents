/**
 * flowchart.test.ts — verificación exhaustiva de <is-flowchart>.
 *
 * Diagrama de flujo en SVG (sin Mermaid). Configuración por JSON:
 *   { flowchart: { direction: "TB", nodes: [...], edges: [...] } }
 * Atributos: color, open-on-click, mode, persist, storage-key, animation.
 * Eventos: is-render, is-turtle-state, is-open-viewer, is-toggle-group.
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
  estaRegistrado,
  cleanupCompleto,
} from '../_helpers.ts';

const MOD = 'src/components/diagrams/flowchart.ts';

test('is-flowchart: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('is-flowchart: render — shadow DOM con svg', () => {
  const src = read(MOD);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('is-flowchart: observados (color, open-on-click, mode, persist, animation)', () => {
  const obs = extraerObservados(read(MOD));
  assert.ok(obs.includes('color'));
  assert.ok(obs.includes('open-on-click'));
  assert.ok(obs.includes('mode'));
  assert.ok(obs.includes('persist'));
  assert.ok(obs.includes('animation'));
});

test('is-flowchart: eventos (is-render, is-turtle-state, is-open-viewer, is-toggle-group)', () => {
  const evts = extraerEventos(read(MOD));
  assert.ok(evts.includes('is-render'));
  assert.ok(evts.includes('is-turtle-state'));
  assert.ok(evts.includes('is-open-viewer'));
  assert.ok(evts.includes('is-toggle-group'));
});

test('is-flowchart: shadow DOM parts', () => {
  const parts = extraerParts(read(MOD));
  assert.ok(parts.length >= 3, `flowchart declara ${parts.length} parts`);
});

test('is-flowchart: JSON payload — lee <script type="application/json">', () => {
  const src = read(MOD);
  assert.ok(leeJsonScript(src));
  assert.ok(parseaJson(src));
});

test('is-flowchart: usa MutationObserver para slot JSON', () => {
  assert.ok(usaMutationObserver(read(MOD)));
});

test('is-flowchart: usa ResizeObserver para responsive', () => {
  assert.ok(usaResizeObserver(read(MOD)));
});

test('is-flowchart: edge cases — guards', () => {
  assert.ok(tieneEdgeCaseGuards(read(MOD)));
});

test('is-flowchart: cleanup — desconecta observers y listeners', () => {
  const c = cleanupCompleto(read(MOD));
  assert.ok(c.obs);
  assert.ok(c.ro);
  assert.ok(c.listeners);
});

test('is-flowchart: adopta CSS', () => {
  assert.ok(adoptaCss(read(MOD)));
});

test('is-flowchart: registrado vía defineElement o registerDiagramKind', () => {
  const src = read(MOD);
  assert.match(src, /defineElement\s*\(\s*['"`]is-flowchart['"`]/);
  assert.ok(estaRegistrado(src, 'is-flowchart'));
});
