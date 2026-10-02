/**
 * combobox.test.ts — Tests exhaustivos de <iswc-combobox>.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  leerComponente, leerPreview, existeCss,
  atributosObservados, eventosEmitidos,
  slotsDeclarados, partsDeclaradas,
  esFormAssociated, extiendeElementBase, usaShadowDom,
} from './_helpers.js';

const TAG = 'iswc-combobox';
const src = leerComponente(TAG);

test('combobox: archivo y registro', () => {
  assert.ok(src.length > 500);
  assert.ok(existeCss(TAG));
  assert.ok(/defineElement\s*\(\s*['"`]iswc-combobox['"`]/.test(src));
});

test('combobox: atributos observados', () => {
  const obs = atributosObservados(src);
  for (const a of ['label', 'hint', 'name', 'value', 'placeholder',
                   'disabled', 'required', 'open', 'clearable']) {
    assert.ok(obs.includes(a), `<iswc-combobox> debe observar "${a}"`);
  }
});

test('combobox: eventos (iswc-change, iswc-input, iswc-show, iswc-hide)', () => {
  const evs = eventosEmitidos(src);
  for (const e of ['iswc-change', 'iswc-input', 'iswc-show', 'iswc-hide']) {
    assert.ok(evs.includes(e), `<iswc-combobox> debe emitir "${e}"`);
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
    assert.ok(parts.includes(p), `<iswc-combobox> part="${p}"`);
  }
});

test('combobox: filtra options (acepta <iswc-option> y <option>)', () => {
  assert.ok(/<iswc-option/.test(src) || /'iswc-option'/.test(src));
  assert.ok(/<option\b/.test(src));
});

test('combobox: form-associated + ElementBase', () => {
  assert.ok(esFormAssociated(src));
  assert.ok(extiendeElementBase(src));
});

test('combobox: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev, '<iswc-combobox> debe tener preview JSON');
  assert.equal(prev!['$schema'], 'iswc-preview/v1');
});
