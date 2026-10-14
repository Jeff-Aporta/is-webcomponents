/**
 * spreadsheet.test.ts — verificación exhaustiva de <iswc-spreadsheet>.
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

test('iswc-spreadsheet: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('iswc-spreadsheet: shadow DOM', () => {
  assert.ok(tieneShadow(read(MOD)));
});

test('iswc-spreadsheet: registrado', () => {
  const src = read(MOD);
  assert.match(src, /defineElement\s*\(\s*['"`]iswc-spreadsheet['"`]/);
});

test('iswc-spreadsheet: adopta CSS', () => {
  assert.ok(adoptaCss(read(MOD)));
});

test('iswc-spreadsheet: edge cases', () => {
  assert.ok(tieneEdgeCaseGuards(read(MOD)));
});

test('iswc-spreadsheet: usa input nativo (HTMLInputElement) para edición', () => {
  // spreadsheet.ts usa document.createElement('input') directamente.
  const src = read(MOD);
  assert.match(src, /createElement\s*\(\s*['"]input['"]\s*\)/);
});

test('iswc-spreadsheet: tiene tabla (o similar) en shadow DOM', () => {
  const src = read(MOD);
  assert.match(src, /<table\b|<tbody\b|<th\b|<td\b/, 'spreadsheet debe usar <table>');
});
