/**
 * month-calendar.test.ts — Tests exhaustivos de <is-month-calendar>.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  leerComponente, leerPreview, existeCss,
  atributosObservados, eventosEmitidos,
  partsDeclaradas, extiendeElementBase,
} from './_helpers.js';

const TAG = 'is-month-calendar';
const src = leerComponente(TAG);

test('month-calendar: archivo y registro', () => {
  assert.ok(src.length > 300);
  assert.ok(existeCss(TAG));
  assert.ok(/defineElement\s*\(\s*['"`]is-month-calendar['"`]/.test(src));
  assert.ok(extiendeElementBase(src));
});

test('month-calendar: atributos observados', () => {
  const obs = atributosObservados(src);
  for (const a of ['value', 'year', 'min', 'max', 'locale', 'columns',
                   'month-width', 'disabled', 'readonly']) {
    assert.ok(obs.includes(a), `<is-month-calendar> debe observar "${a}"`);
  }
});

test('month-calendar: eventos (is-change)', () => {
  const evs = eventosEmitidos(src);
  assert.ok(evs.includes('is-change'),
    '<is-month-calendar> debe emitir is-change con { value, year, month }');
});

test('month-calendar: base con role=radiogroup', () => {
  assert.ok(/role\s*=\s*["']radiogroup["']/.test(src),
    '<is-month-calendar> base debe tener role=radiogroup (a11y)');
});

test('month-calendar: month-width enum (short|long)', () => {
  // El atributo acepta 'short' o 'long'; verificado en el getter de width.
  assert.ok(/month-width/.test(src),
    '<is-month-calendar> debe declarar month-width');
  assert.ok(/short/.test(src) && /long/.test(src),
    'month-width debe aceptar short|long');
});

test('month-calendar: usa monthLabels (Intl) de date-utils', () => {
  assert.ok(/monthLabels/.test(src),
    '<is-month-calendar> debe usar monthLabels (Intl)');
});

test('month-calendar: shadow DOM part=base', () => {
  const parts = partsDeclaradas(src);
  assert.ok(parts.includes('base'));
});

test('month-calendar: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'is-preview/v1');
});
