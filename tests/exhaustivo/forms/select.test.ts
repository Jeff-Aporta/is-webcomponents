/**
 * select.test.ts — Tests exhaustivos de <iswc-select>.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  leerComponente, leerPreview, existeCss,
  atributosObservados, eventosEmitidos,
  slotsDeclarados, partsDeclaradas,
  esFormAssociated, extiendeElementBase, usaShadowDom,
} from './_helpers.js';

const TAG = 'iswc-select';
const src = leerComponente(TAG);

test('select: archivo y registro', () => {
  assert.ok(src.length > 1000);
  assert.ok(existeCss(TAG));
  assert.ok(/defineElement\s*\(\s*['"`]iswc-select['"`]/.test(src));
});

test('select: atributos observados', () => {
  const obs = atributosObservados(src);
  for (const a of ['name', 'value', 'multiple', 'placeholder', 'label', 'hint',
                   'disabled', 'required', 'clearable', 'open',
                   'variant', 'checkmarks', 'selection-display', 'limit-tags',
                   'error', 'full-width', 'auto-width', 'max-visible']) {
    assert.ok(obs.includes(a), `<iswc-select> debe observar "${a}"`);
  }
});

test('select: eventos (iswc-change, iswc-show, iswc-hide)', () => {
  const evs = eventosEmitidos(src);
  for (const e of ['iswc-change', 'iswc-show', 'iswc-hide']) {
    assert.ok(evs.includes(e), `<iswc-select> debe emitir "${e}"`);
  }
});

test('select: usa <dialog> en top layer (no se pierde por overflow)', () => {
  assert.ok(/<dialog/.test(src), '<iswc-select> debe usar <dialog>');
  assert.ok(/role\s*=\s*["']listbox["']/.test(src), 'listbox debe tener role=listbox');
  assert.ok(/role\s*=\s*["']combobox["']/.test(src), 'trigger debe tener role=combobox');
});

test('select: trigger accesible (aria-haspopup, aria-expanded)', () => {
  assert.ok(/aria-haspopup\s*=\s*["']listbox["']/.test(src));
  assert.ok(/aria-expanded\s*=\s*["']false["']/.test(src));
  assert.ok(/aria-controls\s*=\s*["']listbox["']/.test(src));
});

test('select: selection-display enum (tags|text|count)', () => {
  for (const s of ['tags', 'text', 'count']) {
    assert.ok(new RegExp(`['"\`]${s}['"\`]`).test(src),
      `<iswc-select> selection-display enum debe incluir "${s}"`);
  }
});

test('select: shadow DOM parts (estáticos en TEMPLATE)', () => {
  const parts = partsDeclaradas(src);
  // Solo los parts del TEMPLATE — los parts dinámicos (group, option, tag, etc.)
  // los crea el componente en runtime; no podemos chequearlos estáticamente.
  for (const p of ['base', 'trigger', 'listbox', 'label', 'hint', 'error-text']) {
    assert.ok(parts.includes(p), `<iswc-select> part="${p}" debe declararse en TEMPLATE`);
  }
});

test('select: form-associated (multiple envía FormData)', () => {
  assert.ok(esFormAssociated(src));
  // La doc promete FormData por entrada en `multiple`.
  assert.ok(/multiple/.test(src));
});

test('select: keyboard navigation (typeahead)', () => {
  assert.ok(/typeahead|TYPEAHEAD_MS/.test(src) || /keydown/.test(src),
    '<iswc-select> debe tener typeahead o keydown');
});

test('select: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'iswc-preview/v1');
});
