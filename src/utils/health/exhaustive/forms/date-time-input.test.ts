/**
 * date-time-input.test.ts — Tests exhaustivos de <is-date-time-input>.
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

const TAG = 'is-date-time-input';
const src = leerComponente(TAG);

test('date-time-input: archivo y registro', () => {
  assert.ok(src.length > 100);
  assert.ok(existeCss(TAG));
  assert.ok(esFactoryWrapper(src));
  assert.ok(/tag:\s*['"`]is-date-time-input['"`]/.test(src));
  assert.ok(/kind:\s*['"]datetime['"]/.test(src));
});

test('date-time-input: eventos is-change/is-show/is-hide', () => {
  for (const e of ['is-change', 'is-show', 'is-hide']) {
    assert.ok(new RegExp(`emit\\s*\\(\\s*this\\s*,\\s*['"\`]${e}['"\`]`).test(FACTORY));
  }
});

test('date-time-input: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'is-preview/v1');
});
