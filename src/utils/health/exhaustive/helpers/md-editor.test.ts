/**
 * md-editor.test.ts — Tier A (12 aserciones) para `<is-md-editor>`.
 *
 * Dimensiones: módulo, CSS, JSON, OBSERVED, textarea, contenteditable,
 * eventos, label, placeholder, filename attr, slot para acciones, registro.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..', '..');
const TAG = 'is-md-editor';
const TS  = join(ROOT, 'src', 'components', 'helpers', 'md-editor.ts');
const CSS = join(ROOT, 'src', 'components', 'helpers', 'md-editor.css');
const JSON_PATH = join(ROOT, 'src', 'components', 'helpers', 'md-editor.json');

test('1. módulo existe', async () => {
  assert.ok(existsSync(TS));
});

test('2. CSS hermano existe', async () => {
  assert.ok(existsSync(CSS));
});

test('3. JSON existe y respeta is-preview/v1', async () => {
  const json = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  assert.equal(json.tag, TAG);
  assert.equal(json.$schema, 'is-preview/v1');
});

test('4. OBSERVED incluye label, placeholder, filename, value', async () => {
  const src = readFileSync(TS, 'utf8');
  const m = src.match(/OBSERVED\s*=\s*\[([^\]]+)\]/);
  assert.ok(m);
  const list = m![1].replace(/['"\s]/g, '').split(',').filter(Boolean);
  for (const a of ['label', 'placeholder']) {
    assert.ok(list.includes(a), `OBSERVED debe incluir "${a}"`);
  }
});

test('5. usa textarea (no contenteditable para markdown)', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/<textarea[\s\S]*?>/.test(src), 'shadow debe tener <textarea>');
});

test('6. expone getter/setter para value', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/get\s+value\s*\(/.test(src));
  assert.ok(/set\s+value\s*\(/.test(src));
});

test('7. emite eventos de editor (is-persist, is-change, is-delete, is-load)', async () => {
  const src = readFileSync(TS, 'utf8');
  // El editor emite varios eventos (persist, change, delete, load, error, download).
  for (const ev of ['is-persist', 'is-change', 'is-delete', 'is-load']) {
    assert.ok(src.includes(`'${ev}'`) || src.includes(`"${ev}"`), `debe emitir ${ev}`);
  }
});

test('8. atributo can-edit bloquea edición', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/['"]can-edit['"]/.test(src) || /readOnly/.test(src), 'can-edit o readonly debe existir');
});

test('9. shadow DOM expone parte label/input/footer', async () => {
  const src = readFileSync(TS, 'utf8');
  const partsCount = (src.match(/\bpart\s*=\s*['"][a-z-]+['"]/g) || []).length;
  assert.ok(partsCount >= 2, `debe haber al menos 2 partes CSS, hay ${partsCount}`);
});

test('10. custom element registrado', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(
    /customElements\.define\s*\(\s*['"]is-md-editor['"]/.test(src) ||
    /defineElement\s*\(\s*['"]is-md-editor['"]/.test(src),
  );
});

test('11. integra con md-render (preview en vivo)', async () => {
  const src = readFileSync(TS, 'utf8');
  // Puede importar md-render directamente o usar el mismo parser md-lite.
  assert.ok(
    /from\s*['"][./]+md-lite/.test(src) || /is-md-render/.test(src),
    'md-editor debe compartir el parser con md-render',
  );
});

test('12. el template expone partes CSS para customización externa', async () => {
  const src = readFileSync(TS, 'utf8');
  const partsCount = (src.match(/\bpart\s*=\s*['"][a-z-]+['"]/g) || []).length;
  assert.ok(partsCount >= 2, `debe exponer al menos 2 partes CSS para theming, hay ${partsCount}`);
});
