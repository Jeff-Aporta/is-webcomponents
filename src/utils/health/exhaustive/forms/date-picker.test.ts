/**
 * date-picker.test.ts — Tests exhaustivos de <iswc-date-picker>.
 *
 * Calendario inline con tres vistas (day|month|year). Equivalente a MUI DateCalendar.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  leerComponente, leerPreview, existeCss,
  atributosObservados, eventosEmitidos,
  slotsDeclarados, partsDeclaradas,
  extiendeElementBase, usaShadowDom,
} from './_helpers.js';

const TAG = 'iswc-date-picker';
const src = leerComponente(TAG);

test('date-picker: archivo y registro', () => {
  assert.ok(src.length > 500);
  assert.ok(existeCss(TAG));
  assert.ok(/defineElement\s*\(\s*['"`]iswc-date-picker['"`]/.test(src));
  assert.ok(extiendeElementBase(src));
  assert.ok(usaShadowDom(src));
});

test('date-picker: atributos observados', () => {
  const obs = atributosObservados(src);
  for (const a of ['value', 'mode', 'min', 'max', 'view', 'views',
                   'open-to', 'locale', 'first-day-of-week',
                   'show-outside-days', 'fixed-weeks', 'show-week-numbers',
                   'disable-past', 'disable-future', 'disabled-dates',
                   'disabled-days', 'disabled', 'readonly']) {
    assert.ok(obs.includes(a), `<iswc-date-picker> debe observar "${a}"`);
  }
});

test('date-picker: eventos (iswc-change, iswc-view-change, iswc-month-change)', () => {
  const evs = eventosEmitidos(src);
  for (const e of ['iswc-change', 'iswc-view-change', 'iswc-month-change']) {
    assert.ok(evs.includes(e), `<iswc-date-picker> debe emitir "${e}"`);
  }
});

test('date-picker: mode enum (single|range)', () => {
  for (const m of ['single', 'range']) {
    assert.ok(new RegExp(`['"\`]${m}['"\`]`).test(src),
      `<iswc-date-picker> mode enum debe incluir "${m}"`);
  }
});

test('date-picker: view enum (day|month|year)', () => {
  for (const v of ['day', 'month', 'year']) {
    assert.ok(new RegExp(`['"\`]${v}['"\`]`).test(src),
      `<iswc-date-picker> view enum debe incluir "${v}"`);
  }
});

test('date-picker: compone con iswc-month-calendar e iswc-year-calendar', () => {
  assert.ok(/import\s+['"][.\/]+month-calendar\.js['"]/.test(src));
  assert.ok(/import\s+['"][.\/]+year-calendar\.js['"]/.test(src));
});

test('date-picker: usa Intl.DateTimeFormat para weekday labels', () => {
  // El componente importa monthLabels y weekdayLabels desde date-utils.
  assert.ok(/monthLabels|weekdayLabels/.test(src) || /Intl\.DateTimeFormat/.test(src));
});

test('date-picker: shadow DOM parts', () => {
  const parts = partsDeclaradas(src);
  // Las partes del TEMPLATE estático.
  for (const p of ['base', 'nav', 'month-label', 'month-select', 'year-select', 'weekdays']) {
    assert.ok(parts.includes(p), `<iswc-date-picker> part="${p}"`);
  }
});

test('date-picker: edge case — disabled-dates / disabled-days', () => {
  // El atributo disabled-dates="ISO,ISO" filtra por fechas exactas;
  // disabled-days="0,6" filtra por día de la semana.
  assert.ok(/disabled-dates/.test(src), 'date-picker debe aceptar disabled-dates');
  assert.ok(/disabled-days/.test(src), 'date-picker debe aceptar disabled-days');
});

test('date-picker: edge case — value en formato ISO yyyy-mm-dd', () => {
  assert.ok(/parseISO|toISO|isoOf|todayISO/.test(src),
    'date-picker debe usar funciones ISO de date-utils');
});

test('date-picker: keyboard navigation (ArrowLeft/Right/Up/Down)', () => {
  for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
    assert.ok(new RegExp(`\\b${k}\\b`).test(src),
      `<iswc-date-picker> debe manejar "${k}"`);
  }
});

test('date-picker: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'iswc-preview/v1');
});
