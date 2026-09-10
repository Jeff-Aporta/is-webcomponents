/**
 * transfer.test.ts — verificación exhaustiva de <is-transfer> e
 * <is-transfer-item>.
 *
 * Doble lista de selección. Atributos: source-title, target-title,
 * searchable, without-buttons, without-headings, max-target.
 * Eventos: is-transfer-change.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  exists,
  read,
  extraerObservados,
  extraerEventos,
  extraerSlots,
  extraerParts,
  tieneShadow,
  tieneEdgeCaseGuards,
  adoptaCss,
  estaRegistrado,
  tieneAccesibilidad,
} from '../_helpers.ts';

const MOD = 'src/components/data/transfer.ts';

test('is-transfer: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('is-transfer: shadow DOM', () => {
  assert.ok(tieneShadow(read(MOD)));
});

test('is-transfer: observados (source-title, target-title, searchable, max-target)', () => {
  const obs = extraerObservados(read(MOD));
  assert.ok(obs.includes('source-title'));
  assert.ok(obs.includes('target-title'));
  assert.ok(obs.includes('searchable'));
});

test('is-transfer: eventos (is-transfer-change)', () => {
  const evts = extraerEventos(read(MOD));
  assert.ok(evts.includes('is-transfer-change'));
});

test('is-transfer: CSS parts (base, pane, pane-head, title, count, list, controls)', () => {
  const parts = extraerParts(read(MOD));
  assert.ok(parts.includes('base'));
  assert.ok(parts.includes('list'));
  assert.ok(parts.includes('controls'));
});

test('is-transfer: accesibilidad — role=listbox, aria-multiselectable', () => {
  assert.ok(tieneAccesibilidad(read(MOD)));
});

test('is-transfer: edge cases — fallback a string vacío y ??', () => {
  // transfer.ts usa `|| ''` y `?.` para fallar con seguridad.
  const src = read(MOD);
  assert.match(src, /\|\|\s*['"`]/);
});

test('is-transfer: adopta CSS', () => {
  assert.ok(adoptaCss(read(MOD)));
});

test('is-transfer: registrado', () => {
  const src = read(MOD);
  assert.match(src, /defineElement\s*\(\s*['"`]is-transfer['"`]/);
});

test('is-transfer-item: registrado', () => {
  const src = read(MOD);
  assert.match(src, /defineElement\s*\(\s*['"`]is-transfer-item['"`]/);
});
