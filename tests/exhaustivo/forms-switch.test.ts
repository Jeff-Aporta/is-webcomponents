// @contexto INDICE.md · tests/exhaustivo/README.md
/**
 * switch.test.ts — Tests exhaustivos de <iswc-switch>.
 */

import assert from 'node:assert/strict';
import { leerComponente, leerPreview, existeCss, atributosObservados, eventosEmitidos, partsDeclaradas, customStates, esFormAssociated } from '../_shared/exhaustivo-forms.js';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });


const TAG = 'iswc-switch';
const src = leerComponente(TAG);

test('iswc-switch:  archivo y registro', () => {
  assert.ok(src.length > 500);
  assert.ok(existeCss(TAG));
  assert.ok(/(?:defineElement\s*\(\s*|static\s+(?:override\s+)?tag\s*=\s*|createObserverElement\(\s*'\w+',\s*)['"`]iswc-switch['"`]/.test(src));
});

test('iswc-switch:  atributos observados', () => {
  const obs = atributosObservados(src);
  for (const a of ['name', 'value', 'checked', 'disabled', 'readonly',
                   'required', 'error', 'hint', 'color', 'label-placement',
                   'icon', 'checked-icon', 'on-label', 'off-label']) {
    assert.ok(obs.includes(a), `<iswc-switch> debe observar "${a}"`);
  }
});

test('iswc-switch:  eventos (iswc-change)', () => {
  const evs = eventosEmitidos(src);
  assert.ok(evs.includes('iswc-change'));
});

test('iswc-switch:  shadow DOM parts', () => {
  const parts = partsDeclaradas(src);
  for (const p of ['form-control', 'base', 'control', 'track-label',
                   'thumb', 'mark', 'label', 'hint']) {
    assert.ok(parts.includes(p), `<iswc-switch> part="${p}"`);
  }
});

test('iswc-switch:  track labels (on-label, off-label)', () => {
  assert.ok(/on-label/.test(src) && /off-label/.test(src),
    '<iswc-switch> debe soportar on-label y off-label');
});

test('iswc-switch:  color enum (brand|neutral|success|warning|danger)', () => {
  for (const c of ['brand', 'neutral', 'success', 'warning', 'danger']) {
    assert.ok(new RegExp(`['"\`]${c}['"\`]`).test(src),
      `<iswc-switch> color enum debe incluir "${c}"`);
  }
});

test('iswc-switch:  form-associated', () => {
  assert.ok(esFormAssociated(src));
});

test('iswc-switch:  custom states (checked, disabled, error)', () => {
  const states = customStates(src);
  for (const s of ['checked', 'disabled', 'error']) {
    assert.ok(states.includes(s));
  }
});

test('iswc-switch:  preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'iswc-preview/v1');
});

export default lista();
