/**
 * mutation-observer.test.ts — Tier A (12 aserciones) para `<is-mutation-observer>`.
 *
 * Wrapper legacy que delega en createObserverElement('mutation').
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..', '..');
const TAG = 'is-mutation-observer';
const TS  = join(ROOT, 'src', 'components', 'helpers', 'mutation-observer.ts');
const CSS = join(ROOT, 'src', 'components', 'helpers', 'mutation-observer.css');
const JSON_PATH = join(ROOT, 'src', 'components', 'helpers', 'mutation-observer.json');

test('1. módulo existe', () => {
  assert.ok(existsSync(TS));
});

test('2. CSS hermano existe', () => {
  assert.ok(existsSync(CSS));
});

test('3. JSON existe y respeta is-preview/v1', () => {
  const json = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  assert.equal(json.tag, TAG);
  assert.equal(json.$schema, 'is-preview/v1');
});

test('4. delega en createObserverElement("mutation")', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/createObserverElement\s*\(\s*['"]mutation['"]\s*\)/.test(src));
});

test('5. importa desde ./observer.js', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/from\s*['"][./]+observer(?:\.js)?['"]/.test(src));
});

test('6. está registrado con defineElement', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/defineElement\s*\(\s*['"]is-mutation-observer['"]/.test(src));
});

test('7. hereda OBSERVED del factory (no redefinir)', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(!/OBSERVED\s*=\s*\[/.test(src));
});

test('8. JSDoc documenta atributos de mutation (attr, child-list, character-data)', () => {
  const src = readFileSync(TS, 'utf8');
  for (const a of ['attr', 'child-list', 'character-data']) {
    assert.ok(src.includes(a));
  }
});

test('9. JSDoc documenta evento is-mutate', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/is-mutate/.test(src));
});

test('10. registrado en catalog.ts', () => {
  const cat = readFileSync(join(ROOT, 'src', 'previews', 'catalog.ts'), 'utf8');
  assert.ok(cat.includes(`"is-mutation-observer"`));
});

test('11. CSS host con display:contents', () => {
  const css = readFileSync(CSS, 'utf8');
  assert.ok(/display\s*:\s*contents/.test(css));
});

test('12. JSON tiene sección de reference o atributos documentados', () => {
  const json = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  const todasLasCeldas = JSON.stringify(json).toLowerCase();
  assert.ok(
    todasLasCeldas.includes('attr') || todasLasCeldas.includes('child-list'),
    'JSON debe documentar los attrs mutation',
  );
});
