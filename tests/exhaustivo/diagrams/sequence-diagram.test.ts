/**
 * sequence-diagram.test.ts — verificación exhaustiva de <iswc-sequence-diagram>.
 *
 * Diagrama de secuencia en SVG. Config por JSON:
 *   { sequence: { actors: [...], messages: [...] } }
 * Atributos: color (inline|viewer).
 * Eventos: iswc-turtle-state, iswc-open-viewer, iswc-toggle-group.
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

test('iswc-sequence-diagram: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('iswc-sequence-diagram: shadow DOM con svg', () => {
  const src = leerConBase(MOD);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('iswc-sequence-diagram: observados (color)', () => {
  const obs = extraerObservados(leerConBase(MOD));
  assert.ok(obs.includes('color'));
});

test('iswc-sequence-diagram: eventos (iswc-turtle-state, iswc-open-viewer, iswc-toggle-group)', () => {
  const evts = extraerEventos(leerConBase(MOD));
  assert.ok(evts.includes('iswc-turtle-state'));
  assert.ok(evts.includes('iswc-open-viewer'));
  assert.ok(evts.includes('iswc-toggle-group'));
});

test('iswc-sequence-diagram: shadow DOM parts', () => {
  const parts = extraerParts(leerConBase(MOD));
  assert.ok(parts.length >= 2, `sequence-diagram declara ${parts.length} parts`);
});

test('iswc-sequence-diagram: JSON payload', () => {
  const src = leerConBase(MOD);
  assert.ok(leeJsonScript(src));
  assert.ok(parseaJson(src));
});

test('iswc-sequence-diagram: usa MutationObserver', () => {
  assert.ok(usaMutationObserver(leerConBase(MOD)));
});

test('iswc-sequence-diagram: edge cases', () => {
  assert.ok(tieneEdgeCaseGuards(leerConBase(MOD)));
});

test('iswc-sequence-diagram: adopta CSS', () => {
  assert.ok(adoptaCss(leerConBase(MOD)));
});

test('iswc-sequence-diagram: registrado', () => {
  const src = leerConBase(MOD);
  assert.match(src, /defineElement\s*\(\s*['"`]iswc-sequence-diagram['"`]/);
});
