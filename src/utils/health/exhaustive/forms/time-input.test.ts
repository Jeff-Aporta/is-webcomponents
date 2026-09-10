/**
 * time-input.test.ts — Tests exhaustivos de <is-time-input>.
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

const TAG = 'is-time-input';
const src = leerComponente(TAG);

test('time-input: archivo y registro', () => {
  assert.ok(src.length > 100);
  assert.ok(existeCss(TAG));
  assert.ok(esFactoryWrapper(src));
  assert.ok(/tag:\s*['"`]is-time-input['"`]/.test(src));
  assert.ok(/kind:\s*['"]time['"]/.test(src));
});

test('time-input: compone time-field + time-clock (o digital-clock)', () => {
  const m = src.match(/panels:\s*\(\s*\{[^}]*\}\s*\)\s*=>\s*\{[\s\S]*?\}/);
  assert.ok(m, '<is-time-input> debe declarar panels()');
  // El panel es `is-time-clock` (analógico) o `is-digital-clock` (digital).
  assert.ok(/'is-time-clock'/.test(src) || /'is-digital-clock'/.test(src),
    '<is-time-input> debe crear is-time-clock o is-digital-clock en panels()');
  assert.ok(/'is-time-field'/.test(src),
    '<is-time-input> debe declarar fieldTag: "is-time-field"');
});

test('time-input: atributos del factory (ampm, hour24, seconds)', () => {
  for (const a of ['ampm', 'hour24', 'seconds']) {
    assert.ok(new RegExp(`['"\`]${a}['"\`]`).test(FACTORY));
  }
});

test('time-input: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'is-preview/v1');
});
