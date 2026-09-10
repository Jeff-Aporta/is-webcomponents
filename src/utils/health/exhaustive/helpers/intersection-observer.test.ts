/**
 * intersection-observer.test.ts — Tier A (12 aserciones) para `<is-intersection-observer>`.
 *
 * Wrapper legacy que delega en createObserverElement('intersection').
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..', '..');
const TAG = 'is-intersection-observer';
const TS  = join(ROOT, 'src', 'components', 'helpers', 'intersection-observer.ts');
const CSS = join(ROOT, 'src', 'components', 'helpers', 'intersection-observer.css');
const JSON_PATH = join(ROOT, 'src', 'components', 'helpers', 'intersection-observer.json');

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

test('4. delega en createObserverElement("intersection") del factory observer.ts', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(
    /createObserverElement\s*\(\s*['"]intersection['"]\s*\)/.test(src),
    'debe invocar createObserverElement("intersection")',
  );
});

test('5. importa createObserverElement desde ./observer.js', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/from\s*['"][./]+observer(?:\.js)?['"]/.test(src), 'debe importar desde ./observer.js');
});

test('6. está registrado con defineElement', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/defineElement\s*\(\s*['"]is-intersection-observer['"]/.test(src));
});

test('7. hereda OBSERVED del observer genérico', () => {
  const src = readFileSync(TS, 'utf8');
  // Como es wrapper, no debe redefinir OBSERVED — lo toma del factory.
  assert.ok(!/OBSERVED\s*=\s*\[/.test(src), 'no debe redefinir OBSERVED');
});

test('8. el JSDoc documenta los atributos intersection (intersect-class, once, root, threshold)', () => {
  const src = readFileSync(TS, 'utf8');
  for (const a of ['intersect-class', 'once', 'root', 'threshold']) {
    assert.ok(src.includes(a), `JSDoc debe documentar "${a}"`);
  }
});

test('9. el JSDoc documenta el evento is-intersect', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/is-intersect/.test(src));
});

test('10. el componente existe en el manifest (catalog.ts)', () => {
  const cat = readFileSync(join(ROOT, 'src', 'previews', 'catalog.ts'), 'utf8');
  assert.ok(cat.includes(`"is-intersection-observer"`), 'debe estar registrado en catalog.ts');
});

test('11. CSS tiene regla para display:contents o similar (es transparente)', () => {
  const css = readFileSync(CSS, 'utf8');
  assert.ok(/display\s*:\s*contents/.test(css), 'el host debe ser display:contents (no tiene UI propia)');
});

test('12. el JSON declara atributos en el panel reference', () => {
  const json = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  const tieneRef = (json.sections || []).some((s: any) =>
    /reference|referencia|api|atributos|attr/i.test((s.title || '') + ' ' + (s.id || ''))
  );
  assert.ok(tieneRef, 'debe tener una sección con tabla de atributos');
});
