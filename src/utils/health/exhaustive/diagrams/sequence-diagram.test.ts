/**
 * sequence-diagram.test.ts — verificación exhaustiva de <is-sequence-diagram>.
 *
 * Diagrama de secuencia en SVG. Config por JSON:
 *   { sequence: { actors: [...], messages: [...] } }
 * Atributos: color (inline|viewer).
 * Eventos: is-turtle-state, is-open-viewer, is-toggle-group.
 */
import assert from 'node:assert/strict';
import test from 'node:test';


import {
  exists,
  leerConBase,
  tieneSvg,
  extraerObservados,
  extraerEventos,
  extraerParts,
  tieneShadow,
  leeJsonScript,
  parseaJson,
  usaMutationObserver,
  tieneEdgeCaseGuards,
  adoptaCss,
  estaRegistrado,
  cleanupCompleto,
  tieneJsDoc,
} from '../_helpers.js';
const MOD = 'src/components/diagrams/sequence-diagram.ts';

test('is-sequence-diagram: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('is-sequence-diagram: shadow DOM con svg', () => {
  const src = leerConBase(MOD);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('is-sequence-diagram: observados (color)', () => {
  const obs = extraerObservados(leerConBase(MOD));
  assert.ok(obs.includes('color'));
});

test('is-sequence-diagram: eventos (is-turtle-state, is-open-viewer, is-toggle-group)', () => {
  const evts = extraerEventos(leerConBase(MOD));
  assert.ok(evts.includes('is-turtle-state'));
  assert.ok(evts.includes('is-open-viewer'));
  assert.ok(evts.includes('is-toggle-group'));
});

test('is-sequence-diagram: shadow DOM parts', () => {
  const parts = extraerParts(leerConBase(MOD));
  assert.ok(parts.length >= 2, `sequence-diagram declara ${parts.length} parts`);
});

test('is-sequence-diagram: JSON payload', () => {
  const src = leerConBase(MOD);
  assert.ok(leeJsonScript(src));
  assert.ok(parseaJson(src));
});

test('is-sequence-diagram: usa MutationObserver', () => {
  assert.ok(usaMutationObserver(leerConBase(MOD)));
});

test('is-sequence-diagram: edge cases', () => {
  assert.ok(tieneEdgeCaseGuards(leerConBase(MOD)));
});

test('is-sequence-diagram: adopta CSS', () => {
  assert.ok(adoptaCss(leerConBase(MOD)));
});

test('is-sequence-diagram: registrado', () => {
  const src = leerConBase(MOD);
  assert.match(src, /defineElement\s*\(\s*['"`]is-sequence-diagram['"`]/);
});
