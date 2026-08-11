/**
 * Inferencia de lang + softFormat para snippets de demos.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inferLanguage } from '../src/components/_shared/code-langs.js';
import { softFormat, softFormatMode } from '../src/components/_shared/code-text.js';

test('HTML de demos se infiere como html (no javascript)', () => {
  const snippet = '<is-button color="success">Aprobado</is-button>\n'
    + '<is-button color="danger" variant="outlined">Eliminar</is-button>';
  assert.equal(inferLanguage(snippet), 'html');
});

test('JS se sigue infiriendo como javascript', () => {
  assert.equal(inferLanguage('const x = 1;\nexport function f() {}'), 'javascript');
});

test('CSS se infiere como css', () => {
  assert.equal(inferLanguage(':root { --x: 1; }\n.foo { color: red; }'), 'css');
});

test('softFormat separa tags HTML en líneas', () => {
  const raw = '<is-button color="success">Aprobado</is-button> <is-button color="danger">X</is-button>';
  const out = softFormat(raw, softFormatMode('html'));
  assert.match(out, /\n/);
  assert.match(out, /is-button/);
});
