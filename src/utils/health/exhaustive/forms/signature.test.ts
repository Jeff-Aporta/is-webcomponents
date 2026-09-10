/**
 * signature.test.ts — Tests exhaustivos de <is-signature>.
 *
 * Pad de firma manuscrita (touch + mouse). Exporta a PNG/SVG.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  leerComponente, leerPreview, existeCss,
  atributosObservados, eventosEmitidos,
  partsDeclaradas, usaShadowDom,
} from './_helpers.js';

const TAG = 'is-signature';
const src = leerComponente(TAG);

test('signature: archivo y registro', () => {
  assert.ok(src.length > 300);
  assert.ok(existeCss(TAG));
  assert.ok(/defineElement\s*\(\s*['"`]is-signature['"`]/.test(src));
  assert.ok(usaShadowDom(src));
});

test('signature: atributos observados', () => {
  const obs = atributosObservados(src);
  for (const a of ['width', 'height', 'pen-color', 'line-width',
                   'background', 'hint']) {
    assert.ok(obs.includes(a), `<is-signature> debe observar "${a}"`);
  }
});

test('signature: eventos (is-stroke-end, is-change)', () => {
  const evs = eventosEmitidos(src);
  for (const e of ['is-stroke-end', 'is-change']) {
    assert.ok(evs.includes(e), `<is-signature> debe emitir "${e}"`);
  }
});

test('signature: API pública (toDataURL, toSVG, clear, isEmpty)', () => {
  for (const m of ['toDataURL', 'toSVG', 'clear']) {
    assert.ok(new RegExp(`\\b${m}\\s*\\(`).test(src),
      `<is-signature> debe exponer método "${m}()"`);
  }
  assert.ok(/\bisEmpty\b/.test(src),
    '<is-signature> debe exponer propiedad `isEmpty`');
});

test('signature: usa <canvas> en Shadow DOM', () => {
  assert.ok(/<canvas/.test(src));
});

test('signature: pointer events (touch + mouse)', () => {
  assert.ok(/pointerdown/.test(src),
    '<is-signature> debe usar pointer events (cubre touch + mouse)');
});

test('signature: shadow DOM parts', () => {
  const parts = partsDeclaradas(src);
  for (const p of ['root', 'canvas', 'hint']) {
    assert.ok(parts.includes(p));
  }
});

test('signature: hint default', () => {
  assert.ok(/DEFAULT_HINT/.test(src) || /Firma aquí/.test(src),
    '<is-signature> debe tener un hint por defecto');
});

test('signature: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'is-preview/v1');
});
