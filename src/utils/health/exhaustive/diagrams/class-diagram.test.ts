/**
 * class-diagram.test.ts — verificación exhaustiva de <is-class-diagram>.
 *
 * Diagrama de clases UML en SVG. Config por JSON con nodes/edges.
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

const MOD = 'src/components/diagrams/class-diagram.ts';

test('is-class-diagram: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('is-class-diagram: shadow DOM con svg', () => {
  const src = read(MOD);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('is-class-diagram: observados (color)', () => {
  const obs = extraerObservados(read(MOD));
  assert.ok(obs.includes('color'));
});

test('is-class-diagram: eventos', () => {
  const evts = extraerEventos(read(MOD));
  assert.ok(evts.length >= 1, `class-diagram eventos: ${evts.join(',')}`);
});

test('is-class-diagram: shadow DOM parts', () => {
  const parts = extraerParts(read(MOD));
  assert.ok(parts.length >= 1, `class-diagram parts: ${parts.join(',')}`);
});

test('is-class-diagram: JSON payload', () => {
  const src = read(MOD);
  assert.ok(leeJsonScript(src));
  assert.ok(parseaJson(src));
});

test('is-class-diagram: usa MutationObserver', () => {
  assert.ok(usaMutationObserver(read(MOD)));
});

test('is-class-diagram: edge cases', () => {
  assert.ok(tieneEdgeCaseGuards(read(MOD)));
});

test('is-class-diagram: adopta CSS', () => {
  assert.ok(adoptaCss(read(MOD)));
});

test('is-class-diagram: registrado', () => {
  const src = read(MOD);
  assert.match(src, /defineElement\s*\(\s*['"`]is-class-diagram['"`]/);
});
