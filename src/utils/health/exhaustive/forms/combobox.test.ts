/**
 * combobox.test.ts — Tests exhaustivos de <is-combobox>.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  leerComponente, leerPreview, existeCss,
  atributosObservados, eventosEmitidos,
  slotsDeclarados, partsDeclaradas,
  esFormAssociated, extiendeElementBase, usaShadowDom,
} from './_helpers.js';

const TAG = 'is-combobox';
const src = leerComponente(TAG);

test('combobox: archivo y registro', () => {
  assert.ok(src.length > 500);
  assert.ok(existeCss(TAG));
  assert.ok(/defineElement\s*\(\s*['"`]is-combobox['"`]/.test(src));
});

test('combobox: atributos observados', () => {
  const obs = atributosObservados(src);
  for (const a of ['label', 'hint', 'name', 'value', 'placeholder',
                   'disabled', 'required', 'open', 'clearable']) {
    assert.ok(obs.includes(a), `<is-combobox> debe observar "${a}"`);
  }
});

test('combobox: eventos (is-change, is-input, is-show, is-hide)', () => {
  const evs = eventosEmitidos(src);
  for (const e of ['is-change', 'is-input', 'is-show', 'is-hide']) {
    assert.ok(evs.includes(e), `<is-combobox> debe emitir "${e}"`);
  }
});

test('combobox: input con role=combobox + aria-autocomplete=list', () => {
  assert.ok(/role\s*=\s*["']combobox["']/.test(src));
  assert.ok(/aria-autocomplete\s*=\s*["']list["']/.test(src));
  assert.ok(/aria-expanded\s*=\s*["']false["']/.test(src));
});

test('combobox: listbox en <dialog> (top layer)', () => {
  assert.ok(/<dialog/.test(src));
  assert.ok(/role\s*=\s*["']listbox["']/.test(src));
});

test('combobox: shadow DOM parts', () => {
  const parts = partsDeclaradas(src);
  for (const p of ['form-control', 'label', 'base', 'input',
                   'clear', 'trigger', 'hint', 'listbox']) {
    assert.ok(parts.includes(p), `<is-combobox> part="${p}"`);
  }
});

test('combobox: filtra options (acepta <is-option> y <option>)', () => {
  assert.ok(/<is-option/.test(src) || /'is-option'/.test(src));
  assert.ok(/<option\b/.test(src));
});

test('combobox: form-associated + ElementBase', () => {
  assert.ok(esFormAssociated(src));
  assert.ok(extiendeElementBase(src));
});

test('combobox: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev, '<is-combobox> debe tener preview JSON');
  assert.equal(prev!['$schema'], 'is-preview/v1');
});
