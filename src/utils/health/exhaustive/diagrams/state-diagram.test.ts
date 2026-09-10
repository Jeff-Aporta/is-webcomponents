/**
 * state-diagram.test.ts — verificación exhaustiva de <is-state-diagram>.
 *
 * Diagrama de estados UML en SVG. Config por JSON.
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
  tieneEdgeCaseGuards,
  adoptaCss,
  estaRegistrado,
} from '../_helpers.ts';

const MOD = 'src/components/diagrams/state-diagram.ts';

test('is-state-diagram: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('is-state-diagram: shadow DOM con svg', () => {
  const src = read(MOD);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('is-state-diagram: observados (color)', () => {
  const obs = extraerObservados(read(MOD));
  assert.ok(obs.includes('color'));
});

test('is-state-diagram: eventos', () => {
  const evts = extraerEventos(read(MOD));
  assert.ok(evts.length >= 1, `state-diagram eventos: ${evts.join(',')}`);
});

test('is-state-diagram: shadow DOM parts', () => {
  const parts = extraerParts(read(MOD));
  assert.ok(parts.length >= 1, `state-diagram parts: ${parts.join(',')}`);
});

test('is-state-diagram: JSON payload', () => {
  const src = read(MOD);
  assert.ok(leeJsonScript(src));
  assert.ok(parseaJson(src));
});

test('is-state-diagram: usa MutationObserver', () => {
  assert.ok(usaMutationObserver(read(MOD)));
});

test('is-state-diagram: edge cases', () => {
  assert.ok(tieneEdgeCaseGuards(read(MOD)));
});

test('is-state-diagram: adopta CSS', () => {
  assert.ok(adoptaCss(read(MOD)));
});

test('is-state-diagram: registrado', () => {
  const src = read(MOD);
  assert.match(src, /defineElement\s*\(\s*['"`]is-state-diagram['"`]/);
});
