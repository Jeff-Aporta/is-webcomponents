/**
 * radio-group.test.ts — Tests exhaustivos de <iswc-radio-group>.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  leerComponente, leerPreview, existeCss,
  atributosObservados, eventosEmitidos,
  slotsDeclarados, partsDeclaradas,
  esFormAssociated, usaShadowDom,
} from './_helpers.js';

const TAG = 'iswc-radio-group';
const src = leerComponente(TAG);

test('radio-group: archivo y registro', () => {
  assert.ok(src.length > 300);
  assert.ok(existeCss(TAG));
  assert.ok(/defineElement\s*\(\s*['"`]iswc-radio-group['"`]/.test(src));
});

test('radio-group: atributos observados', () => {
  const obs = atributosObservados(src);
  for (const a of ['name', 'value', 'label', 'hint', 'orientation', 'row',
                   'color', 'label-placement', 'error', 'error-text']) {
    assert.ok(obs.includes(a), `<iswc-radio-group> debe observar "${a}"`);
  }
});

test('radio-group: eventos (iswc-change)', () => {
  const evs = eventosEmitidos(src);
  assert.ok(evs.includes('iswc-change'), '<iswc-radio-group> debe emitir iswc-change');
});

test('radio-group: keyboard navigation (ArrowUp/Down/Left/Right)', () => {
  for (const k of ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft']) {
    assert.ok(new RegExp(`['"\`]${k}['"\`]`).test(src),
      `<iswc-radio-group> debe manejar "${k}"`);
  }
});

test('radio-group: orientation enum (vertical|horizontal)', () => {
  for (const o of ['vertical', 'horizontal']) {
    assert.ok(new RegExp(`['"\`]${o}['"\`]`).test(src),
      `<iswc-radio-group> orientation enum debe incluir "${o}"`);
  }
});

test('radio-group: base con role=radiogroup', () => {
  assert.ok(/role\s*=\s*["']radiogroup["']/.test(src),
    '<iswc-radio-group> base debe tener role=radiogroup');
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
  assert.equal(prev!['$schema'], 'iswc-preview/v1');
});
