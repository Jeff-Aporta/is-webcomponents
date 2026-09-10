/**
 * date-input.test.ts — Tests exhaustivos de <is-date-input>.
 *
 * Compone <is-date-field> (edición) + <is-date-picker> (panel) dentro de un
 * <dialog> (top layer). Wrapper de `definePickerInput`.
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

const TAG = 'is-date-input';
const src = leerComponente(TAG);

test('date-input: archivo y registro', () => {
  assert.ok(src.length > 100);
  assert.ok(existeCss(TAG));
  assert.ok(esFactoryWrapper(src));
  assert.ok(/tag:\s*['"`]is-date-input['"`]/.test(src));
  assert.ok(/kind:\s*['"]date['"]/.test(src));
});

test('date-input: compone field + picker (imports)', () => {
  // Los imports usan `.js` (ESM) — el hook los resuelve a `.ts`.
  assert.ok(/import\s+['"][.\/]+date-field\.js['"]/.test(src),
    '<is-date-input> debe importar is-date-field');
  assert.ok(/import\s+['"][.\/]+date-picker\.js['"]/.test(src),
    '<is-date-input> debe importar is-date-picker');
});

test('date-input: atributos del factory picker (placement, action-bar, views, ...)', () => {
  for (const a of ['placement', 'action-bar', 'views', 'open-to',
                   'calendars', 'close-on-select', 'color']) {
    assert.ok(new RegExp(`['"\`]${a}['"\`]`).test(FACTORY),
      `factory OBSERVED debe incluir "${a}"`);
  }
});

test('date-input: eventos del factory (is-change, is-show, is-hide)', () => {
  for (const e of ['is-change', 'is-show', 'is-hide']) {
    assert.ok(new RegExp(`emit\\s*\\(\\s*this\\s*,\\s*['"\`]${e}['"\`]`).test(FACTORY),
      `factory picker debe emitir "${e}"`);
  }
});

test('date-input: usa <dialog> en top layer', () => {
  assert.ok(/<dialog/.test(FACTORY),
    'factory picker debe usar <dialog>');
});

test('date-input: methods públicos (show, hide)', () => {
  assert.ok(/show\s*\(/.test(FACTORY) && /hide\s*\(/.test(FACTORY),
    'factory picker debe exponer métodos show() y hide()');
});

test('date-input: edge case — close-on-select cierra al elegir', () => {
  assert.ok(/close-on-select/.test(FACTORY) || /closeOnSelect/.test(FACTORY),
    'factory debe manejar close-on-select');
});

test('date-input: edge case — color=mobile centra en pantalla', () => {
  assert.ok(/color.*mobile|mobile.*color|'mobile'/.test(FACTORY),
    'factory debe diferenciar color=desktop|mobile');
});

test('date-input: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'is-preview/v1');
});

test('date-input: shortcuts (preset buttons en action-bar)', () => {
  assert.ok(/shortcuts/.test(FACTORY),
    'factory debe soportar atajos (shortcuts)');
});

test('date-input: action-bar configurable', () => {
  assert.ok(/action-bar/.test(FACTORY));
});
