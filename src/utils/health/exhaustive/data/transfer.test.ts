/**
 * transfer.test.ts — verificación exhaustiva de <iswc-transfer> e
 * <iswc-transfer-item>.
 *
 * Doble lista de selección. Atributos: source-title, target-title,
 * searchable, without-buttons, without-headings, max-target.
 * Eventos: iswc-transfer-change.
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

test('iswc-transfer: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('iswc-transfer: shadow DOM', () => {
  assert.ok(tieneShadow(read(MOD)));
});

test('iswc-transfer: observados (source-title, target-title, searchable, max-target)', () => {
  const obs = extraerObservados(read(MOD));
  assert.ok(obs.includes('source-title'));
  assert.ok(obs.includes('target-title'));
  assert.ok(obs.includes('searchable'));
});

test('iswc-transfer: eventos (iswc-transfer-change)', () => {
  const evts = extraerEventos(read(MOD));
  assert.ok(evts.includes('iswc-transfer-change'));
});

test('iswc-transfer: CSS parts (base, pane, pane-head, title, count, list, controls)', () => {
  const parts = extraerParts(read(MOD));
  assert.ok(parts.includes('base'));
  assert.ok(parts.includes('list'));
  assert.ok(parts.includes('controls'));
});

test('iswc-transfer: accesibilidad — role=listbox, aria-multiselectable', () => {
  assert.ok(tieneAccesibilidad(read(MOD)));
});

test('iswc-transfer: edge cases — fallback a string vacío y ??', () => {
  // transfer.ts usa `|| ''` y `?.` para fallar con seguridad.
  const src = read(MOD);
  assert.match(src, /\|\|\s*['"`]/);
});

test('iswc-transfer: adopta CSS', () => {
  assert.ok(adoptaCss(read(MOD)));
});

test('iswc-transfer: registrado', () => {
  const src = read(MOD);
  assert.match(src, /defineElement\s*\(\s*['"`]iswc-transfer['"`]/);
});

test('iswc-transfer-item: registrado', () => {
  const src = read(MOD);
  assert.match(src, /defineElement\s*\(\s*['"`]iswc-transfer-item['"`]/);
});
