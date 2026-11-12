// @contexto INDICE.md · tests/exhaustivo/README.md
/**
 * rating.test.ts — Tests exhaustivos de <iswc-rating>.
 */

import assert from 'node:assert/strict';
import { leerComponente, leerPreview, existeCss, atributosObservados, eventosEmitidos, partsDeclaradas, esFormAssociated } from '../_shared/exhaustivo-forms.js';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });


const TAG = 'iswc-rating';
const src = leerComponente(TAG);

test('iswc-rating:  archivo y registro', () => {
  assert.ok(src.length > 500);
  assert.ok(existeCss(TAG));
  assert.ok(/(?:defineElement\s*\(\s*|static\s+(?:override\s+)?tag\s*=\s*|createObserverElement\(\s*'\w+',\s*)['"`]iswc-rating['"`]/.test(src));
});

test('iswc-rating:  atributos observados', () => {
  const obs = atributosObservados(src);
  for (const a of ['name', 'value', 'max', 'precision', 'allow-half',
                   'icon', 'empty-icon', 'highlight-selected-only', 'color',
                   'label-format', 'show-label', 'clearable', 'disabled',
                   'readonly', 'required', 'label']) {
    assert.ok(obs.includes(a), `<iswc-rating> debe observar "${a}"`);
  }
});

test('iswc-rating:  eventos (iswc-change, iswc-hover)', () => {
  const evs = eventosEmitidos(src);
  for (const e of ['iswc-change', 'iswc-hover']) {
    assert.ok(evs.includes(e), `<iswc-rating> debe emitir "${e}"`);
  }
});

test('iswc-rating:  precision enum (1|0.5|0.25|0.1)', () => {
  // La doc promete 1 (default) | 0.5 | 0.25 | 0.1; verificamos que los valores aparecen.
  assert.ok(/precision/.test(src), '<iswc-rating> debe declarar el atributo precision');
  assert.ok(/0\.5/.test(src), 'precision debe aceptar 0.5');
  assert.ok(/0\.25/.test(src), 'precision debe aceptar 0.25');
  assert.ok(/0\.1/.test(src), 'precision debe aceptar 0.1');
});

test('iswc-rating:  color enum (brand|neutral|success|warning|danger)', () => {
  for (const c of ['brand', 'neutral', 'success', 'warning', 'danger']) {
    assert.ok(new RegExp(`['"\`]${c}['"\`]`).test(src));
  }
});

test('iswc-rating:  base con role=slider + aria-valuemin', () => {
  assert.ok(/role\s*=\s*["']slider["']/.test(src));
  assert.ok(/aria-valuemin/.test(src));
});

test('iswc-rating:  shadow DOM parts', () => {
  const parts = partsDeclaradas(src);
  for (const p of ['form-control', 'label', 'base', 'star',
                   'icon-empty', 'icon-filled', 'hover-label']) {
    assert.ok(parts.includes(p));
  }
});

test('iswc-rating:  form-associated', () => {
  assert.ok(esFormAssociated(src));
});

test('iswc-rating:  preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'iswc-preview/v1');
});

export default lista();
