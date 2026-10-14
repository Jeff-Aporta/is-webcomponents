/**
 * resize-observer.test.ts — Tier A (12 aserciones) para `<iswc-resize-observer>`.
 *
 * Wrapper legacy que delega en createObserverElement('resize').
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });


const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const TAG = 'iswc-resize-observer';
const TS  = join(ROOT, 'src', 'components', 'helpers', 'resize-observer.ts');
const CSS = join(ROOT, '.tmp-scss', 'src', 'components', 'helpers', 'resize-observer.css');
const JSON_PATH = join(ROOT, 'src', 'components', 'helpers', 'resize-observer.json');

test('resize-observer: 1. módulo existe', () => {
  assert.ok(existsSync(TS));
});

test('resize-observer: 2. CSS hermano existe', () => {
  assert.ok(existsSync(CSS));
});

test('resize-observer: 3. JSON existe y respeta iswc-preview/v1', () => {
  const json = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  assert.equal(json.tag, TAG);
  assert.equal(json.$schema, 'iswc-preview/v1');
});

test('4. delega en createObserverElement("resize")', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/createObserverElement\s*\(\s*['"]resize['"]\s*\)/.test(src));
});

test('resize-observer: 5. importa desde ./observer.js', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/from\s*['"][./]+observer(?:\.js)?['"]/.test(src));
});

test('resize-observer: 6. está registrado con defineElement', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/defineElement\s*\(\s*['"]iswc-resize-observer['"]/.test(src));
});

test('resize-observer: 7. hereda OBSERVED del factory (no redefinir)', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(!/OBSERVED\s*=\s*\[/.test(src));
});

test('8. JSDoc documenta que `type` es opcional (default "resize")', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/type/.test(src));
});

test('9. JSDoc documenta evento iswc-resize', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/iswc-resize/.test(src));
});

test('resize-observer: 10. registrado en catalog.ts', () => {
  const cat = readFileSync(join(ROOT, 'src', 'previews', 'catalog.ts'), 'utf8');
  assert.ok(cat.includes(`"iswc-resize-observer"`));
});

test('resize-observer: 11. CSS host con display:contents', () => {
  const css = readFileSync(CSS, 'utf8');
  assert.ok(/display\s*:\s*contents/.test(css));
});

test('12. preview.ts existe (el componente tiene demo)', () => {
  const preview = join(ROOT, 'src', 'components', 'helpers', 'utils', 'resize-observer.preview.ts');
  assert.ok(existsSync(preview), 'resize-observer.preview.ts debe existir');
});

export default lista();
