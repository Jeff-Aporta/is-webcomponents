/**
 * time-field.test.ts — Tests exhaustivos de <is-time-field>.
 *
 * Wrapper de `defineDateField` con `kind: "time"`.
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

const TAG = 'is-time-field';
const src = leerComponente(TAG);

test('time-field: archivo y registro', () => {
  assert.ok(src.length > 100);
  assert.ok(existeCss(TAG));
  assert.ok(esFactoryWrapper(src));
  assert.ok(/tag:\s*['"`]is-time-field['"`]/.test(src));
  assert.ok(/kind:\s*['"]time['"]/.test(src),
    '<is-time-field> debe usar kind: "time"');
});

test('time-field: atributos del factory (ampm, hour24, seconds)', () => {
  for (const a of ['ampm', 'hour24', 'seconds']) {
    assert.ok(new RegExp(`['"\`]${a}['"\`]`).test(FACTORY),
      `factory OBSERVED debe incluir "${a}"`);
  }
});

test('time-field: eventos (is-change, is-input)', () => {
  for (const e of ['is-change', 'is-input']) {
    assert.ok(new RegExp(`[#]?emit\\s*\\(\\s*(this\\s*,\\s*)?['"\`]${e}['"\`]`).test(FACTORY),
      `factory debe emitir "${e}"`);
  }
});

test('time-field: usa 12h/24h según locale/am-pm', () => {
  assert.ok(/uses12Hour|hour24|ampm/.test(FACTORY),
    'factory debe distinguir 12h vs 24h');
});

test('time-field: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'is-preview/v1');
});
