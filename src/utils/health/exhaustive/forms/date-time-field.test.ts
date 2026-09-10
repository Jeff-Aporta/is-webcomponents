/**
 * date-time-field.test.ts — Tests exhaustivos de <is-date-time-field>.
 *
 * Wrapper de `defineDateField` con `kind: "datetime"`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  leerComponente, leerPreview, existeCss, esFactoryWrapper,
} from './_helpers.js';

const RAIZ = join(import.meta.dirname, '..', '..', '..', '..');
const FACTORY = readFileSync(join(RAIZ, 'components', '_shared', 'date-field-element.ts'), 'utf8');

const TAG = 'is-date-time-field';
const src = leerComponente(TAG);

test('date-time-field: archivo y registro', () => {
  assert.ok(src.length > 100);
  assert.ok(existeCss(TAG));
  assert.ok(esFactoryWrapper(src));
  assert.ok(/tag:\s*['"`]is-date-time-field['"`]/.test(src));
  assert.ok(/kind:\s*['"]datetime['"]/.test(src),
    '<is-date-time-field> debe usar kind: "datetime"');
});

test('date-time-field: atributos del factory', () => {
  for (const a of ['label', 'value', 'min', 'max', 'required', 'disabled', 'seconds']) {
    assert.ok(new RegExp(`['"\`]${a}['"\`]`).test(FACTORY));
  }
});

test('date-time-field: split date/time del factory', () => {
  assert.ok(/splitDateTime/.test(FACTORY),
    'factory debe partir date+time');
});

test('date-time-field: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'is-preview/v1');
});
