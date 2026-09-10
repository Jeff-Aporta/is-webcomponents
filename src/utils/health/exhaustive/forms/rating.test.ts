/**
 * rating.test.ts — Tests exhaustivos de <is-rating>.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  leerComponente, leerPreview, existeCss,
  atributosObservados, eventosEmitidos,
  slotsDeclarados, partsDeclaradas,
  esFormAssociated,
} from './_helpers.js';

const TAG = 'is-rating';
const src = leerComponente(TAG);

test('rating: archivo y registro', () => {
  assert.ok(src.length > 500);
  assert.ok(existeCss(TAG));
  assert.ok(/defineElement\s*\(\s*['"`]is-rating['"`]/.test(src));
});

test('rating: atributos observados', () => {
  const obs = atributosObservados(src);
  for (const a of ['name', 'value', 'max', 'precision', 'allow-half',
                   'icon', 'empty-icon', 'highlight-selected-only', 'color',
                   'label-format', 'show-label', 'clearable', 'disabled',
                   'readonly', 'required', 'label']) {
    assert.ok(obs.includes(a), `<is-rating> debe observar "${a}"`);
  }
});

test('rating: eventos (is-change, is-hover)', () => {
  const evs = eventosEmitidos(src);
  for (const e of ['is-change', 'is-hover']) {
    assert.ok(evs.includes(e), `<is-rating> debe emitir "${e}"`);
  }
});

test('rating: precision enum (1|0.5|0.25|0.1)', () => {
  // La doc promete 1 (default) | 0.5 | 0.25 | 0.1; verificamos que los valores aparecen.
  assert.ok(/precision/.test(src), '<is-rating> debe declarar el atributo precision');
  assert.ok(/0\.5/.test(src), 'precision debe aceptar 0.5');
  assert.ok(/0\.25/.test(src), 'precision debe aceptar 0.25');
  assert.ok(/0\.1/.test(src), 'precision debe aceptar 0.1');
});

test('rating: color enum (brand|neutral|success|warning|danger)', () => {
  for (const c of ['brand', 'neutral', 'success', 'warning', 'danger']) {
    assert.ok(new RegExp(`['"\`]${c}['"\`]`).test(src));
  }
});

test('rating: base con role=slider + aria-valuemin', () => {
  assert.ok(/role\s*=\s*["']slider["']/.test(src));
  assert.ok(/aria-valuemin/.test(src));
});

test('rating: shadow DOM parts', () => {
  const parts = partsDeclaradas(src);
  for (const p of ['form-control', 'label', 'base', 'star',
                   'icon-empty', 'icon-filled', 'hover-label']) {
    assert.ok(parts.includes(p));
  }
});

test('rating: form-associated', () => {
  assert.ok(esFormAssociated(src));
});

test('rating: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'is-preview/v1');
});
