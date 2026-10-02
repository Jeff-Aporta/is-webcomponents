/**
 * state-diagram.test.ts — verificación exhaustiva de <iswc-state-diagram>.
 *
 * Diagrama de estados UML en SVG. Config por JSON.
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
const MOD = 'src/components/diagrams/state-diagram.ts';

test('iswc-state-diagram: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('iswc-state-diagram: shadow DOM con svg', () => {
  const src = leerConBase(MOD);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('iswc-state-diagram: observados (color)', () => {
  const obs = extraerObservados(leerConBase(MOD));
  assert.ok(obs.includes('color'));
});

test('iswc-state-diagram: eventos', () => {
  const evts = extraerEventos(leerConBase(MOD));
  assert.ok(evts.length >= 1, `state-diagram eventos: ${evts.join(',')}`);
});

test('iswc-state-diagram: shadow DOM parts', () => {
  const parts = extraerParts(leerConBase(MOD));
  assert.ok(parts.length >= 1, `state-diagram parts: ${parts.join(',')}`);
});

test('iswc-state-diagram: JSON payload', () => {
  const src = leerConBase(MOD);
  assert.ok(leeJsonScript(src));
  assert.ok(parseaJson(src));
});

test('iswc-state-diagram: usa MutationObserver', () => {
  assert.ok(usaMutationObserver(leerConBase(MOD)));
});

test('iswc-state-diagram: edge cases', () => {
  assert.ok(tieneEdgeCaseGuards(leerConBase(MOD)));
});

test('iswc-state-diagram: adopta CSS', () => {
  assert.ok(adoptaCss(leerConBase(MOD)));
});

test('iswc-state-diagram: registrado', () => {
  const src = leerConBase(MOD);
  assert.match(src, /defineElement\s*\(\s*['"`]iswc-state-diagram['"`]/);
});
