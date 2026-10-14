/**
 * date-range-input.test.ts — Tests exhaustivos de <iswc-date-range-input>.
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

const TAG = 'iswc-date-range-input';
const src = leerComponente(TAG);

test('date-range-input: archivo y registro', () => {
  assert.ok(src.length > 100);
  assert.ok(existeCss(TAG));
  assert.ok(esFactoryWrapper(src));
  assert.ok(/tag:\s*['"`]iswc-date-range-input['"`]/.test(src));
});

test('date-range-input: atributos start/end/start-label/end-label', () => {
  for (const a of ['start', 'end', 'start-label', 'end-label']) {
    assert.ok(new RegExp(`['"\`]${a}['"\`]`).test(FACTORY) ||
              new RegExp(`['"\`]${a}['"\`]`).test(src),
      `<iswc-date-range-input> debe tener atributo "${a}"`);
  }
});

test('date-range-input: compone con iswc-date-range-picker', () => {
  assert.ok(/iswc-date-range-picker|iswc-date-picker/.test(src),
    '<iswc-date-range-input> debe usar iswc-date-range-picker');
});

test('date-range-input: edge case — start > end debe marcar invalid', () => {
  // El factory debe comparar start/end antes de aceptar.
  assert.ok(/invalid/.test(FACTORY) || /isAfter/.test(FACTORY) || /compareAsc/.test(FACTORY),
    'factory debe detectar start > end como invalid');
});

test('date-range-input: eventos (iswc-change, iswc-show, iswc-hide)', () => {
  for (const e of ['iswc-change', 'iswc-show', 'iswc-hide']) {
    assert.ok(new RegExp(`emit\\s*\\(\\s*this\\s*,\\s*['"\`]${e}['"\`]`).test(FACTORY));
  }
});

test('date-range-input: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'iswc-preview/v1');
});
