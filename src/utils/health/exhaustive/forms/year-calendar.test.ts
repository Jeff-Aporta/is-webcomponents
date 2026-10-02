/**
 * year-calendar.test.ts — Tests exhaustivos de <iswc-year-calendar>.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  leerComponente, leerPreview, existeCss,
  atributosObservados, eventosEmitidos,
  partsDeclaradas, extiendeElementBase,
} from './_helpers.js';

const TAG = 'iswc-year-calendar';
const src = leerComponente(TAG);

test('year-calendar: archivo y registro', () => {
  assert.ok(src.length > 300);
  assert.ok(existeCss(TAG));
  assert.ok(/defineElement\s*\(\s*['"`]iswc-year-calendar['"`]/.test(src));
  assert.ok(extiendeElementBase(src));
});

test('year-calendar: atributos observados', () => {
  const obs = atributosObservados(src);
  for (const a of ['value', 'min', 'max', 'columns', 'disabled', 'readonly']) {
    assert.ok(obs.includes(a));
  }
});

test('year-calendar: eventos (iswc-change)', () => {
  const evs = eventosEmitidos(src);
  assert.ok(evs.includes('iswc-change'));
});

test('year-calendar: base con role=radiogroup', () => {
  assert.ok(/role\s*=\s*["']radiogroup["']/.test(src));
});

test('year-calendar: scrollToSelection() en connect', () => {
  assert.ok(/scrollToSelection/.test(src),
    '<iswc-year-calendar> debe hacer scroll a la selección');
});

test('year-calendar: shadow DOM part=base', () => {
  const parts = partsDeclaradas(src);
  assert.ok(parts.includes('base'));
});

test('year-calendar: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'iswc-preview/v1');
});
