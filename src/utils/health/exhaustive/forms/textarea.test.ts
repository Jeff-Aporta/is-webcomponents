/**
 * textarea.test.ts — Tests exhaustivos de <is-textarea>.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  leerComponente, leerPreview, leerDoc, existeCss,
  atributosObservados, eventosEmitidos,
  slotsDeclarados, partsDeclaradas, tokensCss,
  esFormAssociated, extiendeElementBase, usaShadowDom,
} from './_helpers.js';

const TAG = 'is-textarea';
const src = leerComponente(TAG);

test('textarea: archivo y registro', () => {
  assert.ok(src.length > 1000);
  assert.ok(existeCss(TAG));
  assert.ok(/defineElement\s*\(\s*['"`]is-textarea['"`]/.test(src));
});

test('textarea: atributos observados', () => {
  const obs = atributosObservados(src);
  for (const a of ['name', 'value', 'placeholder', 'label', 'hint',
                   'disabled', 'required', 'readonly', 'rows', 'maxlength',
                   'resize', 'autosize', 'error', 'show-count']) {
    assert.ok(obs.includes(a), `<is-textarea> debe observar "${a}"`);
  }
});

test('textarea: eventos (is-input, is-change)', () => {
  const evs = eventosEmitidos(src);
  assert.ok(evs.includes('is-input'));
  assert.ok(evs.includes('is-change'));
});

test('textarea: slots (label, hint)', () => {
  const slots = slotsDeclarados(src);
  assert.ok(slots.includes('label'));
  assert.ok(slots.includes('hint'));
});

test('textarea: shadow DOM parts', () => {
  const parts = partsDeclaradas(src);
  for (const p of ['form-control', 'label', 'base', 'textarea',
                   'hint', 'error-text', 'count']) {
    assert.ok(parts.includes(p), `<is-textarea> part="${p}"`);
  }
});

test('textarea: resize enum (none|vertical|both|auto)', () => {
  for (const r of ['none', 'vertical', 'both', 'auto']) {
    assert.ok(new RegExp(`['"\`]${r}['"\`]`).test(src),
      `resize enum debe incluir "${r}"`);
  }
});

test('textarea: form-associated + autosize', () => {
  assert.ok(esFormAssociated(src));
  assert.ok(extiendeElementBase(src));
  // autosize → ResizeObserver
  assert.ok(/ResizeObserver/.test(src),
    '<is-textarea autosize> debe usar ResizeObserver para autofit');
});

test('textarea: cleanup del ResizeObserver en disconnect', () => {
  assert.ok(/#ro\?\.disconnect\(\)/.test(src),
    '<is-textarea> debe desconectar ResizeObserver en disconnect (no leak)');
});

test('textarea: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'is-preview/v1');
  assert.equal(prev!.tag, TAG);
});

test('textarea: edge case — rows default 3', () => {
  assert.ok(/rows\s*=\s*['"]3['"]/.test(src) || /rows:\s*3\b/.test(src),
    '<is-textarea> rows default debe ser 3');
});
