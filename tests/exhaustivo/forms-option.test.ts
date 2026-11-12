// @contexto INDICE.md · tests/exhaustivo/README.md
/**
 * option.test.ts — Tests exhaustivos de <iswc-option>.
 *
 * Sub-componente para iswc-select / iswc-combobox. Vive dentro del listbox.
 */

import assert from 'node:assert/strict';
import {
  leerComponente, leerPreview, existeCss,
  atributosObservados, eventosEmitidos,
  slotsDeclarados, partsDeclaradas,
  extiendeElementBase, usaShadowDom,
} from '../_shared/exhaustivo-forms.js';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });


const TAG = 'iswc-option';
const src = leerComponente(TAG);

test('iswc-option:  archivo y registro', () => {
  assert.ok(src.length > 200);
  assert.ok(existeCss(TAG));
  assert.ok(/(?:defineElement\s*\(\s*|static\s+(?:override\s+)?tag\s*=\s*|createObserverElement\(\s*'\w+',\s*)['"`]iswc-option['"`]/.test(src));
  assert.ok(extiendeElementBase(src));
  assert.ok(usaShadowDom(src));
});

test('iswc-option:  atributos observados', () => {
  const obs = atributosObservados(src);
  for (const a of ['value', 'disabled', 'selected', 'group']) {
    assert.ok(obs.includes(a));
  }
});

test('iswc-option:  shadow DOM (role=option)', () => {
  // El rol va en el HOST (lo que el consumidor coloca dentro de su listbox), no en
  // un div del shadow: en el arbol aplanado, el listbox debe tener las opciones
  // como hijos directos.
  assert.ok(/role\s*=\s*["']option["']|setAttribute\(\s*['"]role['"]\s*,\s*['"]option['"]/.test(src),
    '<iswc-option> debe declarar role=option (a11y listbox)');
});

test('iswc-option:  shadow DOM parts', () => {
  const parts = partsDeclaradas(src);
  for (const p of ['base', 'start', 'label', 'description']) {
    assert.ok(parts.includes(p));
  }
});

test('iswc-option:  slots (default, start, description)', () => {
  const slots = slotsDeclarados(src);
  for (const s of ['default', 'start', 'description']) {
    assert.ok(slots.includes(s),
      `<iswc-option> debe declarar slot "${s}"`);
  }
});

test('iswc-option:  NO emite eventos (es un presentational component)', () => {
  const evs = eventosEmitidos(src);
  // <iswc-option> no emite is-*; la selección la maneja el padre (iswc-select/combobox).
  assert.equal(evs.length, 0,
    '<iswc-option> no debe emitir eventos (delegado al host)');
});

test('iswc-option:  preview JSON', () => {
  const prev = leerPreview(TAG);
  // <iswc-option> puede o no tener preview; aceptamos ambos casos.
  if (prev) assert.equal(prev!['$schema'], 'iswc-preview/v1');
});

export default lista();
