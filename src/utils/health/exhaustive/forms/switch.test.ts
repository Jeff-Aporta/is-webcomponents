/**
 * switch.test.ts — Tests exhaustivos de <is-switch>.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  leerComponente, leerPreview, existeCss,
  atributosObservados, eventosEmitidos,
  slotsDeclarados, partsDeclaradas, customStates,
  esFormAssociated,
} from './_helpers.js';

const TAG = 'is-switch';
const src = leerComponente(TAG);

test('switch: archivo y registro', () => {
  assert.ok(src.length > 500);
  assert.ok(existeCss(TAG));
  assert.ok(/defineElement\s*\(\s*['"`]is-switch['"`]/.test(src));
});

test('switch: atributos observados', () => {
  const obs = atributosObservados(src);
  for (const a of ['name', 'value', 'checked', 'disabled', 'readonly',
                   'required', 'error', 'hint', 'color', 'label-placement',
                   'icon', 'checked-icon', 'on-label', 'off-label']) {
    assert.ok(obs.includes(a), `<is-switch> debe observar "${a}"`);
  }
});

test('switch: eventos (is-change)', () => {
  const evs = eventosEmitidos(src);
  assert.ok(evs.includes('is-change'));
});

test('switch: shadow DOM parts', () => {
  const parts = partsDeclaradas(src);
  for (const p of ['form-control', 'base', 'control', 'track-label',
                   'thumb', 'mark', 'label', 'hint']) {
    assert.ok(parts.includes(p), `<is-switch> part="${p}"`);
  }
});

test('switch: track labels (on-label, off-label)', () => {
  assert.ok(/on-label/.test(src) && /off-label/.test(src),
    '<is-switch> debe soportar on-label y off-label');
});

test('switch: color enum (brand|neutral|success|warning|danger)', () => {
  for (const c of ['brand', 'neutral', 'success', 'warning', 'danger']) {
    assert.ok(new RegExp(`['"\`]${c}['"\`]`).test(src),
      `<is-switch> color enum debe incluir "${c}"`);
  }
});

test('switch: form-associated', () => {
  assert.ok(esFormAssociated(src));
});

test('switch: custom states (checked, disabled, error)', () => {
  const states = customStates(src);
  for (const s of ['checked', 'disabled', 'error']) {
    assert.ok(states.includes(s));
  }
});

test('switch: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'is-preview/v1');
});
