/**
 * time-input.test.ts — Tests exhaustivos de <iswc-time-input>.
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

const TAG = 'iswc-time-input';
const src = leerComponente(TAG);

test('time-input: archivo y registro', () => {
  assert.ok(src.length > 100);
  assert.ok(existeCss(TAG));
  assert.ok(esFactoryWrapper(src));
  assert.ok(/tag:\s*['"`]iswc-time-input['"`]/.test(src));
  assert.ok(/kind:\s*['"]time['"]/.test(src));
});

test('time-input: compone time-field + time-clock (o digital-clock)', () => {
  const m = src.match(/panels:\s*\(\s*\{[^}]*\}\s*\)\s*=>\s*\{[\s\S]*?\}/);
  assert.ok(m, '<iswc-time-input> debe declarar panels()');
  // El panel es `iswc-time-clock` (analógico) o `iswc-digital-clock` (digital).
  assert.ok(/'iswc-time-clock'/.test(src) || /'iswc-digital-clock'/.test(src),
    '<iswc-time-input> debe crear iswc-time-clock o iswc-digital-clock en panels()');
  assert.ok(/'iswc-time-field'/.test(src),
    '<iswc-time-input> debe declarar fieldTag: "iswc-time-field"');
});

test('time-input: atributos del factory (ampm, hour24, seconds)', () => {
  for (const a of ['ampm', 'hour24', 'seconds']) {
    assert.ok(new RegExp(`['"\`]${a}['"\`]`).test(FACTORY));
  }
});

test('time-input: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'iswc-preview/v1');
});
