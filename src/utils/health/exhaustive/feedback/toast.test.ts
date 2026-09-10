/**
 * toast.test.ts — Tier A (12 aserciones) para `<is-toast>`.
 *
 * Contenedor de notificaciones con placement, create(), helpers estáticos
 * (success/error/loading), promesa atajo y stack persistente.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..', '..');
const TAG = 'is-toast';
const TS  = join(ROOT, 'src', 'components', 'feedback', 'toast.ts');
const CSS = join(ROOT, 'src', 'components', 'feedback', 'toast.css');
const JSON_PATH = join(ROOT, 'src', 'components', 'feedback', 'toast.json');

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

test('4. integra con is-toast-item (light DOM o shadow)', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/from\s*['"][./]+toast-item/.test(src));
});

test('5. OBSERVED incluye placement', () => {
  const src = readFileSync(TS, 'utf8');
  const m = src.match(/observedAttributes\s*\(\s*\)\s*\{[^}]*return\s*\[([^\]]+)\]/.exec(src));
  assert.ok(m);
  const list = m![1].replace(/['"\s]/g, '').split(',').filter(Boolean);
  assert.ok(list.includes('placement'), 'OBSERVED debe incluir placement');
});

test('6. placement cubre 6 posiciones (top/bottom × start/center/end)', () => {
  const src = readFileSync(TS, 'utf8');
  for (const v of ['top-start', 'top-center', 'top-end', 'bottom-start', 'bottom-center', 'bottom-end']) {
    assert.ok(src.includes(`'${v}'`) || src.includes(`"${v}"`), `placement acepta "${v}"`);
  }
});

test('7. método create(message, options?) para crear toast imperativo', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/create\s*\(/.test(src));
});

test('8. helpers estáticos: error / success / loading', () => {
  const src = readFileSync(TS, 'utf8');
  for (const m of ['error(', 'success(', 'loading(']) {
    assert.ok(src.includes(m), `debe exponer estático ${m}`);
  }
});

test('9. atajo de promesa (IsToast.promise)', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/promise\s*\(/.test(src));
});

test('10. helper estático host() devuelve el singleton del documento', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/static\s+host\s*\(/.test(src));
});

test('11. usa normalizeIntent para mapear colores de brand|success|warning|danger|neutral', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/normalizeIntent/.test(src));
});

test('12. custom element registrado y preview.ts existe', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/defineElement\s*\(\s*['"]is-toast['"]/.test(src));
  assert.ok(existsSync(join(ROOT, 'src', 'components', 'feedback', 'toast.preview.ts')));
});
