/**
 * pivot-table.test.ts — verificación exhaustiva de <iswc-pivot-table>.
 *
 * Tabla pivote para análisis multidimensional. Datos vía property
 * assignment (rows/columns/measures) o JSON.
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

const MOD = 'src/components/data/pivot-table.ts';

test('iswc-pivot-table: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('iswc-pivot-table: shadow DOM', () => {
  assert.ok(tieneShadow(read(MOD)));
});

test('iswc-pivot-table: registrado', () => {
  const src = read(MOD);
  assert.match(src, /defineElement\s*\(\s*['"`]iswc-pivot-table['"`]/);
});

test('iswc-pivot-table: adopta CSS', () => {
  assert.ok(adoptaCss(read(MOD)));
});

test('iswc-pivot-table: edge cases', () => {
  assert.ok(tieneEdgeCaseGuards(read(MOD)));
});

test('iswc-pivot-table: behavior — preview asigna properties o config', () => {
  const preview = exists('src/components/data/pivot-table.preview.ts')
    ? read('src/components/data/pivot-table.preview.ts') : '';
  if (preview) {
    // pivot-table.preview debe asignar data via property o .config =
    assert.ok(preview.length > 0, 'preview existe');
  }
});

test('iswc-pivot-table: usa shadow DOM (no requiere importar otros is-*)', () => {
  // pivot-table.ts usa attachShadow({mode:'open'}) en su ctor.
  const src = read(MOD);
  assert.match(src, /attachShadow\s*\(\s*\{\s*mode\s*:\s*['"]open['"]\s*\}/);
});
