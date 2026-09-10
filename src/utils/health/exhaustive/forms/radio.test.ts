/**
 * radio.test.ts — Tests exhaustivos de <is-radio>.
 *
 * NOTA: <is-radio> NO es form-associated. El valor lo publica <is-radio-group>.
 * El radio avisa al grupo con el evento `is-radio-select`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  leerComponente, leerPreview, existeCss,
  atributosObservados, eventosEmitidos,
  slotsDeclarados, partsDeclaradas,
  extiendeElementBase,
} from './_helpers.js';

const TAG = 'is-radio';
const src = leerComponente(TAG);

test('radio: archivo y registro', () => {
  assert.ok(src.length > 300);
  assert.ok(existeCss(TAG));
  assert.ok(/defineElement\s*\(\s*['"`]is-radio['"`]/.test(src));
});

test('radio: atributos observados', () => {
  const obs = atributosObservados(src);
  for (const a of ['value', 'checked', 'disabled', 'color', 'label-placement']) {
    assert.ok(obs.includes(a), `<is-radio> debe observar "${a}"`);
  }
});

test('radio: emite is-radio-select para el grupo', () => {
  const evs = eventosEmitidos(src);
  assert.ok(evs.includes('is-radio-select'),
    '<is-radio> debe emitir is-radio-select (consumido por is-radio-group)');
});

test('radio: shadow DOM parts', () => {
  const parts = partsDeclaradas(src);
  for (const p of ['base', 'control', 'dot', 'text', 'label', 'description']) {
    assert.ok(parts.includes(p), `<is-radio> part="${p}"`);
  }
});

test('radio: slots (default, description)', () => {
  const slots = slotsDeclarados(src);
  assert.ok(slots.includes('default') || slots.includes('description'),
    '<is-radio> debe tener slot default y/o description');
});

test('radio: NO es form-associated (delegado al grupo)', () => {
  // Por diseño: el radio no participa en <form>, solo el grupo.
  assert.ok(!/static\s+formAssociated\s*=\s*true/.test(src),
    '<is-radio> NO debe ser form-associated (delegado al grupo)');
});

test('radio: extiende ElementBase', () => {
  assert.ok(extiendeElementBase(src));
});

test('radio: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'is-preview/v1');
});
