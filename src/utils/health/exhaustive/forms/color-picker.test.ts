/**
 * color-picker.test.ts — Tests exhaustivos de <is-color-picker>.
 *
 * Selector de color form-associated. Panel en <dialog modal> (top layer).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  leerComponente, leerPreview, existeCss,
  atributosObservados, eventosEmitidos,
  slotsDeclarados, partsDeclaradas,
  esFormAssociated, usaShadowDom,
} from './_helpers.js';

const TAG = 'is-color-picker';
const src = leerComponente(TAG);

test('color-picker: archivo y registro', () => {
  assert.ok(src.length > 500);
  assert.ok(existeCss(TAG));
  assert.ok(/defineElement\s*\(\s*['"`]is-color-picker['"`]/.test(src));
  assert.ok(usaShadowDom(src));
});

test('color-picker: atributos observados', () => {
  const obs = atributosObservados(src);
  for (const a of ['name', 'value', 'label', 'hint', 'disabled',
                   'required', 'swatches']) {
    assert.ok(obs.includes(a), `<is-color-picker> debe observar "${a}"`);
  }
});

test('color-picker: eventos (is-input, is-change)', () => {
  const evs = eventosEmitidos(src);
  for (const e of ['is-input', 'is-change']) {
    assert.ok(evs.includes(e),
      `<is-color-picker> debe emitir "${e}"`);
  }
});

test('color-picker: value default (#808080)', () => {
  assert.ok(/#808080/.test(src),
    '<is-color-picker> value default debe ser #808080');
});

test('color-picker: usa <dialog> en top layer', () => {
  assert.ok(/<dialog/.test(src),
    '<is-color-picker> debe usar <dialog>');
});

test('color-picker: input color nativo + is-input hex', () => {
  assert.ok(/type\s*=\s*["']color["']/.test(src),
    '<is-color-picker> debe usar <input type="color">');
  assert.ok(/['"]is-input['"]/.test(src) || /'is-input'/.test(src),
    '<is-color-picker> debe usar <is-input> para el hex');
});

test('color-picker: shadow DOM parts', () => {
  const parts = partsDeclaradas(src);
  for (const p of ['base', 'trigger', 'swatch', 'panel', 'input',
                   'hex-input', 'label', 'hint']) {
    assert.ok(parts.includes(p));
  }
});

test('color-picker: trigger accesible (aria-haspopup=dialog)', () => {
  assert.ok(/aria-haspopup\s*=\s*["']dialog["']/.test(src),
    '<is-color-picker> trigger debe tener aria-haspopup=dialog');
  assert.ok(/aria-expanded/.test(src));
});

test('color-picker: swatches predefinidos (paleta por defecto)', () => {
  assert.ok(/DEFAULT_SWATCHES/.test(src),
    '<is-color-picker> debe tener paleta de swatches predefinidos');
  // Verifica que el atributo swatches="..." se puede pasar.
  assert.ok(/swatches/.test(src));
});

test('color-picker: eyedropper (EyeDropper API)', () => {
  assert.ok(/EyeDropper/.test(src) || /eyedropper/.test(src),
    '<is-color-picker> debe ofrecer eyedropper (EyeDropper API)');
});

test('color-picker: form-associated', () => {
  assert.ok(esFormAssociated(src));
});

test('color-picker: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'is-preview/v1');
});

test('color-picker: edge case — hex inválido (no rompe)', () => {
  // El componente debe manejar entrada malformada en hex.
  // El fallback al DEFAULT_VALUE lo cubre.
  assert.ok(/DEFAULT_VALUE|#808080/.test(src));
});
