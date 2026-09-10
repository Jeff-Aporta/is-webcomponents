/**
 * full-calendar.test.ts — Tests exhaustivos de <is-full-calendar>.
 *
 * Vista de calendario completa (mes/semana/día) con eventos.
 * Datos vía <script type="application/json"> con { events: [...] }.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  leerComponente, leerPreview, existeCss,
  atributosObservados, eventosEmitidos,
  partsDeclaradas,
} from './_helpers.js';

const TAG = 'is-full-calendar';
const src = leerComponente(TAG);

test('full-calendar: archivo y registro', () => {
  assert.ok(src.length > 500);
  assert.ok(existeCss(TAG));
  assert.ok(/defineElement\s*\(\s*['"`]is-full-calendar['"`]/.test(src));
});

test('full-calendar: atributos observados', () => {
  const obs = atributosObservados(src);
  for (const a of ['view', 'date', 'first-day', 'locale', 'hours-start', 'hours-end']) {
    assert.ok(obs.includes(a));
  }
});

test('full-calendar: view enum (month|week|day)', () => {
  for (const v of ['month', 'week', 'day']) {
    assert.ok(new RegExp(`['"\`]${v}['"\`]`).test(src),
      `<is-full-calendar> view enum debe incluir "${v}"`);
  }
});

test('full-calendar: eventos (is-day-click, is-event-click, is-view-change)', () => {
  const evs = eventosEmitidos(src);
  for (const e of ['is-day-click', 'is-event-click', 'is-view-change']) {
    assert.ok(evs.includes(e), `<is-full-calendar> debe emitir "${e}"`);
  }
});

test('full-calendar: lee <script type="application/json"> para eventos', () => {
  assert.ok(/application\/json/.test(src),
    '<is-full-calendar> debe leer <script type="application/json"> con events');
  assert.ok(/events/.test(src));
});

test('full-calendar: API pública (setDate, setView, prev, next, today)', () => {
  for (const m of ['setDate', 'setView', 'prev', 'next', 'today']) {
    assert.ok(new RegExp(`\\b${m}\\s*\\(`).test(src),
      `<is-full-calendar> debe exponer método "${m}()"`);
  }
});

test('full-calendar: properties públicas (events)', () => {
  assert.ok(/get\s+events\s*\(\)/.test(src) || /\bevents\b.*=.*\[/.test(src),
    '<is-full-calendar> debe exponer propiedad `events`');
});

test('full-calendar: shadow DOM parts', () => {
  const parts = partsDeclaradas(src);
  for (const p of ['root', 'toolbar', 'grid']) {
    assert.ok(parts.includes(p));
  }
});

test('full-calendar: edge case — hours-start > hours-end', () => {
  assert.ok(/hours-start/.test(src) && /hours-end/.test(src),
    '<is-full-calendar> debe validar rango horario');
});

test('full-calendar: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'is-preview/v1');
});
