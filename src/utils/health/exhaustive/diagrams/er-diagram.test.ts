/**
 * er-diagram.test.ts — verificación exhaustiva de <is-er-diagram>.
 *
 * Diagrama Entidad-Relación en SVG. Config por JSON.
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
const MOD = 'src/components/diagrams/er-diagram.ts';

test('is-er-diagram: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('is-er-diagram: shadow DOM con svg', () => {
  const src = leerConBase(MOD);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('is-er-diagram: observados (color)', () => {
  const obs = extraerObservados(leerConBase(MOD));
  assert.ok(obs.includes('color'));
});

test('is-er-diagram: eventos', () => {
  const evts = extraerEventos(leerConBase(MOD));
  assert.ok(evts.length >= 1, `er-diagram eventos: ${evts.join(',')}`);
});

test('is-er-diagram: shadow DOM parts', () => {
  const parts = extraerParts(leerConBase(MOD));
  assert.ok(parts.length >= 1, `er-diagram parts: ${parts.join(',')}`);
});

test('is-er-diagram: JSON payload', () => {
  const src = leerConBase(MOD);
  assert.ok(leeJsonScript(src));
  assert.ok(parseaJson(src));
});

test('is-er-diagram: usa MutationObserver', () => {
  assert.ok(usaMutationObserver(leerConBase(MOD)));
});

test('is-er-diagram: edge cases', () => {
  assert.ok(tieneEdgeCaseGuards(leerConBase(MOD)));
});

test('is-er-diagram: adopta CSS', () => {
  assert.ok(adoptaCss(leerConBase(MOD)));
});

test('is-er-diagram: registrado', () => {
  const src = leerConBase(MOD);
  assert.match(src, /defineElement\s*\(\s*['"`]is-er-diagram['"`]/);
});
