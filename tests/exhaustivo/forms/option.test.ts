/**
 * option.test.ts — Tests exhaustivos de <iswc-option>.
 *
 * Sub-componente para iswc-select / iswc-combobox. Vive dentro del listbox.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  leerComponente, leerPreview, existeCss,
  atributosObservados, eventosEmitidos,
  slotsDeclarados, partsDeclaradas,
  extiendeElementBase, usaShadowDom,
} from './_helpers.js';

const TAG = 'iswc-option';
const src = leerComponente(TAG);

test('option: archivo y registro', () => {
  assert.ok(src.length > 200);
  assert.ok(existeCss(TAG));
  assert.ok(/defineElement\s*\(\s*['"`]iswc-option['"`]/.test(src));
  assert.ok(extiendeElementBase(src));
  assert.ok(usaShadowDom(src));
});

test('option: atributos observados', () => {
  const obs = atributosObservados(src);
  for (const a of ['value', 'disabled', 'selected', 'group']) {
    assert.ok(obs.includes(a));
  }
});

test('option: shadow DOM (role=option)', () => {
  assert.ok(/role\s*=\s*["']option["']/.test(src),
    '<iswc-option> base debe tener role=option (a11y listbox)');
});

test('option: shadow DOM parts', () => {
  const parts = partsDeclaradas(src);
  for (const p of ['base', 'start', 'label', 'description']) {
    assert.ok(parts.includes(p));
  }
});

test('option: slots (default, start, description)', () => {
  const slots = slotsDeclarados(src);
  for (const s of ['default', 'start', 'description']) {
    assert.ok(slots.includes(s),
      `<iswc-option> debe declarar slot "${s}"`);
  }
});

test('option: NO emite eventos (es un presentational component)', () => {
  const evs = eventosEmitidos(src);
  // <iswc-option> no emite is-*; la selección la maneja el padre (iswc-select/combobox).
  assert.equal(evs.length, 0,
    '<iswc-option> no debe emitir eventos (delegado al host)');
});

test('option: preview JSON', () => {
  const prev = leerPreview(TAG);
  // <iswc-option> puede o no tener preview; aceptamos ambos casos.
  if (prev) assert.equal(prev!['$schema'], 'iswc-preview/v1');
});
