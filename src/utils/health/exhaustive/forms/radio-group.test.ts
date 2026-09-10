/**
 * radio-group.test.ts — Tests exhaustivos de <is-radio-group>.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  leerComponente, leerPreview, existeCss,
  atributosObservados, eventosEmitidos,
  slotsDeclarados, partsDeclaradas,
  esFormAssociated, usaShadowDom,
} from './_helpers.js';

const TAG = 'is-radio-group';
const src = leerComponente(TAG);

test('radio-group: archivo y registro', () => {
  assert.ok(src.length > 300);
  assert.ok(existeCss(TAG));
  assert.ok(/defineElement\s*\(\s*['"`]is-radio-group['"`]/.test(src));
});

test('radio-group: atributos observados', () => {
  const obs = atributosObservados(src);
  for (const a of ['name', 'value', 'label', 'hint', 'orientation', 'row',
                   'color', 'label-placement', 'error', 'error-text']) {
    assert.ok(obs.includes(a), `<is-radio-group> debe observar "${a}"`);
  }
});

test('radio-group: eventos (is-change)', () => {
  const evs = eventosEmitidos(src);
  assert.ok(evs.includes('is-change'), '<is-radio-group> debe emitir is-change');
});

test('radio-group: keyboard navigation (ArrowUp/Down/Left/Right)', () => {
  for (const k of ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft']) {
    assert.ok(new RegExp(`['"\`]${k}['"\`]`).test(src),
      `<is-radio-group> debe manejar "${k}"`);
  }
});

test('radio-group: orientation enum (vertical|horizontal)', () => {
  for (const o of ['vertical', 'horizontal']) {
    assert.ok(new RegExp(`['"\`]${o}['"\`]`).test(src),
      `<is-radio-group> orientation enum debe incluir "${o}"`);
  }
});

test('radio-group: base con role=radiogroup', () => {
  assert.ok(/role\s*=\s*["']radiogroup["']/.test(src),
    '<is-radio-group> base debe tener role=radiogroup');
});

test('radio-group: shadow DOM parts', () => {
  const parts = partsDeclaradas(src);
  for (const p of ['form-control', 'label', 'base', 'hint', 'error-text']) {
    assert.ok(parts.includes(p));
  }
});

test('radio-group: form-associated', () => {
  assert.ok(esFormAssociated(src));
});

test('radio-group: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'is-preview/v1');
});
