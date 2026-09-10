/**
 * spreadsheet.test.ts — verificación exhaustiva de <is-spreadsheet>.
 *
 * Hoja de cálculo con celdas editables. Datos vía property assignment.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  exists,
  read,
  extraerObservados,
  tieneShadow,
  tieneEdgeCaseGuards,
  adoptaCss,
  estaRegistrado,
} from '../_helpers.ts';

const MOD = 'src/components/data/spreadsheet.ts';

test('is-spreadsheet: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('is-spreadsheet: shadow DOM', () => {
  assert.ok(tieneShadow(read(MOD)));
});

test('is-spreadsheet: registrado', () => {
  const src = read(MOD);
  assert.match(src, /defineElement\s*\(\s*['"`]is-spreadsheet['"`]/);
});

test('is-spreadsheet: adopta CSS', () => {
  assert.ok(adoptaCss(read(MOD)));
});

test('is-spreadsheet: edge cases', () => {
  assert.ok(tieneEdgeCaseGuards(read(MOD)));
});

test('is-spreadsheet: usa input nativo (HTMLInputElement) para edición', () => {
  // spreadsheet.ts usa document.createElement('input') directamente.
  const src = read(MOD);
  assert.match(src, /createElement\s*\(\s*['"]input['"]\s*\)/);
});

test('is-spreadsheet: tiene tabla (o similar) en shadow DOM', () => {
  const src = read(MOD);
  assert.match(src, /<table\b|<tbody\b|<th\b|<td\b/, 'spreadsheet debe usar <table>');
});
