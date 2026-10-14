/**
 * radio.test.ts — Tests exhaustivos de <iswc-radio>.
 *
 * NOTA: <iswc-radio> NO es form-associated. El valor lo publica <iswc-radio-group>.
 * El radio avisa al grupo con el evento `iswc-radio-select`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  leerComponente, leerPreview, existeCss,
  atributosObservados, eventosEmitidos,
  slotsDeclarados, partsDeclaradas,
  extiendeElementBase,
} from './_helpers.js';

const TAG = 'iswc-radio';
const src = leerComponente(TAG);

test('radio: archivo y registro', () => {
  assert.ok(src.length > 300);
  assert.ok(existeCss(TAG));
  assert.ok(/defineElement\s*\(\s*['"`]iswc-radio['"`]/.test(src));
});

test('radio: atributos observados', () => {
  const obs = atributosObservados(src);
  for (const a of ['value', 'checked', 'disabled', 'color', 'label-placement']) {
    assert.ok(obs.includes(a), `<iswc-radio> debe observar "${a}"`);
  }
});

test('radio: emite iswc-radio-select para el grupo', () => {
  const evs = eventosEmitidos(src);
  assert.ok(evs.includes('iswc-radio-select'),
    '<iswc-radio> debe emitir iswc-radio-select (consumido por iswc-radio-group)');
});

test('radio: shadow DOM parts', () => {
  const parts = partsDeclaradas(src);
  for (const p of ['base', 'control', 'dot', 'text', 'label', 'description']) {
    assert.ok(parts.includes(p), `<iswc-radio> part="${p}"`);
  }
});

test('radio: slots (default, description)', () => {
  const slots = slotsDeclarados(src);
  assert.ok(slots.includes('default') || slots.includes('description'),
    '<iswc-radio> debe tener slot default y/o description');
});

test('radio: NO es form-associated (delegado al grupo)', () => {
  // Por diseño: el radio no participa en <form>, solo el grupo.
  assert.ok(!/static\s+formAssociated\s*=\s*true/.test(src),
    '<iswc-radio> NO debe ser form-associated (delegado al grupo)');
});

test('radio: extiende ElementBase', () => {
  assert.ok(extiendeElementBase(src));
});

test('radio: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'iswc-preview/v1');
});
