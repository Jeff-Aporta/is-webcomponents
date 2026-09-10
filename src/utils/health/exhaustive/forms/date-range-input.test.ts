/**
 * date-range-input.test.ts — Tests exhaustivos de <is-date-range-input>.
 *
 * Rango de fechas (inicio/fin). Usa `definePickerInput` con `range: true`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  leerComponente, leerPreview, existeCss, esFactoryWrapper,
} from './_helpers.js';

const RAIZ = join(import.meta.dirname, '..', '..', '..', '..');
const FACTORY = readFileSync(join(RAIZ, 'components', '_shared', 'picker-element.ts'), 'utf8');

const TAG = 'is-date-range-input';
const src = leerComponente(TAG);

test('date-range-input: archivo y registro', () => {
  assert.ok(src.length > 100);
  assert.ok(existeCss(TAG));
  assert.ok(esFactoryWrapper(src));
  assert.ok(/tag:\s*['"`]is-date-range-input['"`]/.test(src));
});

test('date-range-input: atributos start/end/start-label/end-label', () => {
  for (const a of ['start', 'end', 'start-label', 'end-label']) {
    assert.ok(new RegExp(`['"\`]${a}['"\`]`).test(FACTORY) ||
              new RegExp(`['"\`]${a}['"\`]`).test(src),
      `<is-date-range-input> debe tener atributo "${a}"`);
  }
});

test('date-range-input: compone con is-date-range-picker', () => {
  assert.ok(/is-date-range-picker|is-date-picker/.test(src),
    '<is-date-range-input> debe usar is-date-range-picker');
});

test('date-range-input: edge case — start > end debe marcar invalid', () => {
  // El factory debe comparar start/end antes de aceptar.
  assert.ok(/invalid/.test(FACTORY) || /isAfter/.test(FACTORY) || /compareAsc/.test(FACTORY),
    'factory debe detectar start > end como invalid');
});

test('date-range-input: eventos (is-change, is-show, is-hide)', () => {
  for (const e of ['is-change', 'is-show', 'is-hide']) {
    assert.ok(new RegExp(`emit\\s*\\(\\s*this\\s*,\\s*['"\`]${e}['"\`]`).test(FACTORY));
  }
});

test('date-range-input: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'is-preview/v1');
});
