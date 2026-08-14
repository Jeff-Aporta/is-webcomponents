/**
 * Inferencia de lang + softFormat para snippets de demos.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inferLanguage, resolveLanguage } from '../src/components/_shared/code-langs.js';
import { softFormat, softFormatMode } from '../src/components/_shared/code-text.js';
import { formatCode } from '../src/components/_shared/code-format.js';

test('HTML de demos se infiere como html (no javascript)', () => {
  const snippet = '<is-button color="success">Aprobado</is-button>\n'
    + '<is-button color="danger" variant="outlined">Eliminar</is-button>';
  assert.equal(inferLanguage(snippet), 'html');
});

test('curl se infiere como shell', () => {
  assert.equal(
    inferLanguage('curl -X PUT \'https://api.example/api/x\' \\\n  -H \'Authorization: Bearer TOKEN\''),
    'shell',
  );
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

test('alias curl resuelve al lenguaje shell', () => {
  assert.equal(resolveLanguage('curl')?.id, 'shell');
  assert.equal(resolveLanguage('bash')?.id, 'shell');
});

test('formatCode no reescribe un cURL', () => {
  const curl = 'curl -X PUT \'https://x/api\' \\\n  -d \'{"a":1}\'';
  assert.equal(formatCode(curl, 'curl'), curl);
  assert.equal(formatCode(curl, 'shell'), curl);
});
