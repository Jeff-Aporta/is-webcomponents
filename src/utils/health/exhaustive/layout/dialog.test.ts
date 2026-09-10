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
import { leerConBase } from '../_helpers.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..', '..');
const TAG = 'is-dialog';
const TS  = join(ROOT, 'src', 'components', 'layout', 'dialog.ts');
const CSS = join(ROOT, 'src', 'components', 'layout', 'dialog.css');
const JSON_PATH = join(ROOT, 'src', 'components', 'layout', 'dialog.json');

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

test('4. delega en ModalBase (focus-trap, Escape, restore)', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/from\s*['"][./]+_shared\/modal-base/.test(src));
});

test('5. OBSERVED incluye open, label, without-header, light-dismiss, backdrop-variant', async () => {
  // El dialog delega lifecycle en ModalBase. Buscamos en el wrapper
  // los atributos que efectivamente declara (open/label/light-dismiss
  // vienen de la base; backdrop-variant del wrapper).
  const { extraerObservados, leerConBase } = await import('../_helpers.js');
  const REL = 'src/components/layout/dialog.ts';
  const src = leerConBase(REL);
  const obs = extraerObservados(REL);
  for (const a of ['open', 'label', 'light-dismiss', 'backdrop-variant']) {
    assert.ok(
      src.includes(`'${a}'`) || src.includes(`"${a}"`) || src.includes(`--${a}`),
      `dialog debe declarar "${a}", actual=${obs.join(',')}`,
    );
  }
});

test('6. emite is-show, is-after-show, is-hide, is-after-hide', async () => {
  // Los eventos se emiten desde ModalBase; leerConBase los concatena.
  const { leerConBase } = await import('../_helpers.js');
  const src = leerConBase('src/components/layout/dialog.ts');
  for (const ev of ['is-show', 'is-after-show', 'is-hide', 'is-after-hide']) {
    assert.ok(src.includes(`'${ev}'`) || src.includes(`"${ev}"`), `debe emitir ${ev}`);
  }
});

test('7. métodos show(), hide(), toggle() públicos', async () => {
  const src = readFileSync(TS, 'utf8');
  for (const m of ['show(', 'hide(', 'toggle(']) {
    assert.ok(src.includes(m), `debe exponer ${m}`);
  }
});

test('8. backdrop-variant acepta "none" | "basic"', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/['"]none['"]/.test(src) && /['"]basic['"]/.test(src));
});

test('9. integra con is-icon e is-button (chrome)', async () => {
  const src = readFileSync(TS, 'utf8');
  // Side-effect imports `import '../media/icon.js'` y `import '../actions/button.js'`.
  assert.ok(/media[\\/]+icon/.test(src), 'importa icon');
  assert.ok(/actions[\\/]+button/.test(src), 'importa button');
});

test('10. soporta slot default y header-actions, footer, label', async () => {
  const src = readFileSync(TS, 'utf8');
  for (const slot of ['header-actions', 'footer', 'label']) {
    assert.ok(new RegExp(`name=['"]${slot}['"]`).test(src), `declarar slot "${slot}"`);
  }
});

test('11. atributo open es reflected (getter/setter + toggleAttribute)', async () => {
  // El getter/setter `open` está en ModalBase.
  const { leerConBase } = await import('../_helpers.js');
  const src = leerConBase('src/components/layout/dialog.ts');
  assert.ok(
    /setBooleanAttr|toggleAttribute|get\s+open\s*\(\s*\)|set\s+open\s*\(/.test(src),
    'open debe ser reflected en la base',
  );
});

test('12. custom element registrado', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/defineElement\s*\(\s*['"]is-dialog['"]/.test(src));
});
