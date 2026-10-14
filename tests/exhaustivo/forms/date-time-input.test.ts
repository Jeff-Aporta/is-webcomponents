/**
 * date-time-input.test.ts — Tests exhaustivos de <iswc-date-time-input>.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  leerComponente, leerPreview, existeCss, esFactoryWrapper,
} from '../../_shared/exhaustivo-forms.js';
import { coleccionPruebas } from '../../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });


const RAIZ = join(import.meta.dirname, '..', '..');
const FACTORY = readFileSync(join(import.meta.dirname!, '..', '..', '..', 'src', 'components', 'forms', 'utils', 'picker-element.ts'), 'utf8');

const TAG = 'iswc-date-time-input';
const src = leerComponente(TAG);

test('date-time-input: archivo y registro', () => {
  assert.ok(src.length > 100);
  assert.ok(existeCss(TAG));
  assert.ok(esFactoryWrapper(src));
  assert.ok(/tag:\s*['"`]iswc-date-time-input['"`]/.test(src));
  assert.ok(/kind:\s*['"]datetime['"]/.test(src));
});

test('date-time-input: eventos iswc-change/iswc-show/iswc-hide', () => {
  for (const e of ['iswc-change', 'iswc-show', 'iswc-hide']) {
    assert.ok(new RegExp(`emit\\s*\\(\\s*this\\s*,\\s*['"\`]${e}['"\`]`).test(FACTORY));
  }
});

test('date-time-input: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'iswc-preview/v1');
});

export default lista();
