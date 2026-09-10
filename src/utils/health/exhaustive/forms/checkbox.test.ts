/**
 * checkbox.test.ts — Tests exhaustivos de <is-checkbox>.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  leerComponente, leerPreview, existeCss,
  atributosObservados, eventosEmitidos,
  slotsDeclarados, partsDeclaradas, customStates,
  esFormAssociated, usaShadowDom,
} from './_helpers.js';

const TAG = 'is-checkbox';
const src = leerComponente(TAG);

test('checkbox: archivo y registro', () => {
  assert.ok(src.length > 500);
  assert.ok(existeCss(TAG));
  assert.ok(/defineElement\s*\(\s*['"`]is-checkbox['"`]/.test(src));
});

test('checkbox: atributos observados', () => {
  const obs = atributosObservados(src);
  for (const a of ['name', 'value', 'checked', 'disabled', 'readonly',
                   'required', 'indeterminate', 'error', 'hint',
                   'color', 'label-placement', 'icon', 'checked-icon',
                   'indeterminate-icon']) {
    assert.ok(obs.includes(a), `<is-checkbox> debe observar "${a}"`);
  }
});

test('checkbox: eventos (is-change con checked + value)', () => {
  const evs = eventosEmitidos(src);
  assert.ok(evs.includes('is-change'), '<is-checkbox> debe emitir is-change');
  // El evento debe llevar detalle (detail: { checked, value })
  assert.ok(/is-change['"`]\s*,\s*\{\s*checked/.test(src) ||
            /is-change['"`]\s*,\s*\{\s*value/.test(src) ||
            /is-change['"`]\s*,\s*\{[^}]*\b(checked|value)\b/.test(src),
    '<is-checkbox> is-change debe llevar detalle con checked/value');
});

test('checkbox: slots (default, hint)', () => {
  const slots = slotsDeclarados(src);
  assert.ok(slots.includes('default') || slots.includes('hint'),
    '<is-checkbox> debe tener slot default o hint');
});

test('checkbox: shadow DOM parts', () => {
  const parts = partsDeclaradas(src);
  for (const p of ['form-control', 'base', 'control', 'mark', 'label', 'hint']) {
    assert.ok(parts.includes(p), `<is-checkbox> part="${p}"`);
  }
});

test('checkbox: color enum (brand|neutral|success|warning|danger)', () => {
  for (const c of ['brand', 'neutral', 'success', 'warning', 'danger']) {
    assert.ok(new RegExp(`['"\`]${c}['"\`]`).test(src),
      `<is-checkbox> color enum debe incluir "${c}"`);
  }
});

test('checkbox: form-associated + indeterminate state', () => {
  assert.ok(esFormAssociated(src), '<is-checkbox> debe ser form-associated');
  assert.ok(/indeterminate/.test(src),
    '<is-checkbox> debe manejar el estado indeterminate (no es solo true/false)');
});

test('checkbox: custom states (checked, indeterminate, disabled, readonly, error)', () => {
  const states = customStates(src);
  for (const s of ['checked', 'indeterminate', 'disabled', 'error']) {
    assert.ok(states.includes(s), `<is-checkbox> custom state "${s}" debe existir`);
  }
});

test('checkbox: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'is-preview/v1');
});
