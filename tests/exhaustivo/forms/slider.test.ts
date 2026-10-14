/**
 * slider.test.ts — Tests exhaustivos de <iswc-slider>.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  leerComponente, leerPreview, existeCss,
  atributosObservados, eventosEmitidos,
  slotsDeclarados,
  esFormAssociated,
} from './_helpers.js';
// `partsDeclaradas` solo captura `part="x"` estáticos; el slider además
// define `mark` / `mark-label` dinámicamente vía `setAttribute('part', …)`,
// así que usamos el helper del root `_helpers.ts` que cubre ambos casos.
import { extraerParts } from '../_helpers.js';

const TAG = 'iswc-slider';
const src = leerComponente(TAG);

test('slider: archivo y registro', () => {
  assert.ok(src.length > 500);
  assert.ok(existeCss(TAG));
  assert.ok(/defineElement\s*\(\s*['"`]iswc-slider['"`]/.test(src));
});

test('slider: atributos observados', () => {
  const obs = atributosObservados(src);
  for (const a of ['name', 'value', 'min', 'max', 'step', 'shift-step',
                   'marks', 'orientation', 'track', 'value-label',
                   'with-tooltip', 'min-distance', 'disable-swap', 'range',
                   'format', 'disabled', 'readonly', 'required', 'label',
                   'hint']) {
    assert.ok(obs.includes(a), `<iswc-slider> debe observar "${a}"`);
  }
});

test('slider: eventos (iswc-input drag/tecla, iswc-change al confirmar)', () => {
  const evs = eventosEmitidos(src);
  for (const e of ['iswc-input', 'iswc-change']) {
    assert.ok(evs.includes(e));
  }
});

test('slider: orientation enum (horizontal|vertical)', () => {
  for (const o of ['horizontal', 'vertical']) {
    assert.ok(new RegExp(`['"\`]${o}['"\`]`).test(src));
  }
});

test('slider: track enum (normal|none|inverted)', () => {
  for (const t of ['normal', 'none', 'inverted']) {
    assert.ok(new RegExp(`['"\`]${t}['"\`]`).test(src),
      `<iswc-slider> track enum debe incluir "${t}"`);
  }
});

test('slider: value-label enum (off|auto|on)', () => {
  for (const v of ['off', 'auto', 'on']) {
    assert.ok(new RegExp(`['"\`]${v}['"\`]`).test(src),
      `<iswc-slider> value-label enum debe incluir "${v}"`);
  }
});

test('slider: rango con 2 thumbs (value="20,37")', () => {
  assert.ok(/range/.test(src), '<iswc-slider> debe soportar rango (2 thumbs)');
  assert.ok(/disable-swap/.test(src), '<iswc-slider> debe soportar disable-swap');
});

test('slider: edge case — valor fuera de rango (clampTo)', () => {
  // Importado de misc-utils.
  assert.ok(/clampTo/.test(src),
    '<iswc-slider> debe usar clampTo() para limitar al rango [min, max]');
});

test('slider: edge case — step="null" restringe a los marks', () => {
  assert.ok(/tidyToStep|step/.test(src));
  assert.ok(/'null'/.test(src) || /"null"/.test(src),
    '<iswc-slider> debe aceptar step="null" (restringe a marks)');
});

test('slider: thumb con role=slider + aria-valuenow', () => {
  assert.ok(/role\s*=\s*["']slider["']/.test(src),
    '<iswc-slider> thumb debe tener role=slider (a11y)');
  assert.ok(/aria-valuenow/.test(src));
});

test('slider: shadow DOM parts', () => {
  const parts = extraerParts(src);
  for (const p of ['form-control', 'label', 'base', 'rail', 'track',
                   'mark', 'mark-label', 'thumb', 'value-label', 'hint']) {
    assert.ok(parts.includes(p));
  }
});

test('slider: form-associated', () => {
  assert.ok(esFormAssociated(src));
});

test('slider: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'iswc-preview/v1');
});
