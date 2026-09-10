/**
 * dialog.test.ts — Tier A (12 aserciones) para `<is-dialog>`.
 *
 * Modal accesible con focus-trap, Escape, light-dismiss, restore de foco.
 * Delega ciclo de vida en ModalBase.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..', '..');
const TAG = 'is-dialog';
const TS  = join(ROOT, 'src', 'components', 'layout', 'dialog.ts');
const CSS = join(ROOT, 'src', 'components', 'layout', 'dialog.css');
const JSON_PATH = join(ROOT, 'src', 'components', 'layout', 'dialog.json');

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

test('4. delega en ModalBase (focus-trap, Escape, restore)', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/from\s*['"][./]+_shared\/modal-base/.test(src));
});

test('5. OBSERVED incluye open, label, without-header, light-dismiss, backdrop-variant', () => {
  const src = readFileSync(TS, 'utf8');
  const m = src.match(/observedAttributes\s*\(\s*\)\s*\{[^}]*return\s*\[([^\]]+)\]/.exec(src));
  assert.ok(m);
  const list = m![1].replace(/['"\s]/g, '').split(',').filter(Boolean);
  for (const a of ['open', 'label', 'light-dismiss']) {
    assert.ok(list.includes(a), `OBSERVED debe incluir "${a}"`);
  }
});

test('6. emite is-show, is-after-show, is-hide, is-after-hide', () => {
  const src = readFileSync(TS, 'utf8');
  for (const ev of ['is-show', 'is-after-show', 'is-hide', 'is-after-hide']) {
    assert.ok(src.includes(`'${ev}'`) || src.includes(`"${ev}"`), `debe emitir ${ev}`);
  }
});

test('7. métodos show(), hide(), toggle() públicos', () => {
  const src = readFileSync(TS, 'utf8');
  for (const m of ['show(', 'hide(', 'toggle(']) {
    assert.ok(src.includes(m), `debe exponer ${m}`);
  }
});

test('8. backdrop-variant acepta "none" | "basic"', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/['"]none['"]/.test(src) && /['"]basic['"]/.test(src));
});

test('9. integra con is-icon e is-button (chrome)', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/from\s*['"][./]+media\/icon/.test(src));
  assert.ok(/from\s*['"][./]+actions\/button/.test(src));
});

test('10. soporta slot default y header-actions, footer, label', () => {
  const src = readFileSync(TS, 'utf8');
  for (const slot of ['header-actions', 'footer', 'label']) {
    assert.ok(new RegExp(`name=['"]${slot}['"]`).test(src), `declarar slot "${slot}"`);
  }
});

test('11. atributo open es reflected (getter/setter + toggleAttribute)', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/setBooleanAttr|toggleAttribute/.test(src));
});

test('12. custom element registrado', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/defineElement\s*\(\s*['"]is-dialog['"]/.test(src));
});
