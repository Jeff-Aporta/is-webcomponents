/**
 * file-input.test.ts — Tests exhaustivos de <is-file-input>.
 *
 * Dropzone + input file nativo oculto. Lista de archivos con quitar.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  leerComponente, leerPreview, existeCss,
  atributosObservados, eventosEmitidos,
  slotsDeclarados, partsDeclaradas,
} from './_helpers.js';

const TAG = 'is-file-input';
const src = leerComponente(TAG);

test('file-input: archivo y registro', () => {
  assert.ok(src.length > 300);
  assert.ok(existeCss(TAG));
  assert.ok(/defineElement\s*\(\s*['"`]is-file-input['"`]/.test(src));
});

test('file-input: atributos observados', () => {
  const obs = atributosObservados(src);
  for (const a of ['label', 'hint', 'name', 'accept', 'capture',
                   'multiple', 'disabled', 'required']) {
    assert.ok(obs.includes(a));
  }
});

test('file-input: eventos (is-change, change nativo)', () => {
  const evs = eventosEmitidos(src);
  assert.ok(evs.includes('is-change'),
    '<is-file-input> debe emitir is-change');
  // También propaga el change nativo del input file.
  assert.ok(/new\s+Event\(\s*['"]change['"]/.test(src) ||
            /dispatchEvent\s*\(\s*new\s+Event/.test(src),
    '<is-file-input> debe re-emitir el change nativo');
});

test('file-input: slots (label, hint, dropzone)', () => {
  const slots = slotsDeclarados(src);
  for (const s of ['label', 'hint', 'dropzone']) {
    assert.ok(slots.includes(s), `<is-file-input> debe declarar slot "${s}"`);
  }
});

test('file-input: shadow DOM parts', () => {
  const parts = partsDeclaradas(src);
  for (const p of ['base', 'label', 'hint', 'dropzone',
                   'file-list', 'file', 'remove-button', 'input']) {
    assert.ok(parts.includes(p), `<is-file-input> part="${p}"`);
  }
});

test('file-input: dropzone accesible (role=button, tabindex)', () => {
  assert.ok(/role\s*=\s*["']button["']/.test(src),
    '<is-file-input> dropzone debe tener role=button');
  assert.ok(/tabindex\s*=\s*["']0["']/.test(src));
});

test('file-input: input file nativo con aria-hidden', () => {
  assert.ok(/type\s*=\s*["']file["']/.test(src));
  assert.ok(/aria-hidden/.test(src),
    '<is-file-input> input nativo debe tener aria-hidden=true');
});

test('file-input: propiedad files (File[])', () => {
  assert.ok(/get\s+files\s*\(/.test(src) ||
            /\bset\s+files\s*\(/.test(src) ||
            /#files/.test(src),
    '<is-file-input> debe exponer propiedad files (File[])');
});

test('file-input: drop event (drag & drop)', () => {
  assert.ok(/drop\b/.test(src),
    '<is-file-input> debe manejar el evento drop (drag & drop)');
});

test('file-input: custom state dragging', () => {
  // El componente debe exponer el estado :state(dragging) durante el drag.
  assert.ok(/dragging|dragover|dragenter/.test(src),
    '<is-file-input> debe marcar estado de dragging');
});

test('file-input: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'is-preview/v1');
});
