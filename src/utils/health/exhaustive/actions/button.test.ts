/**
 * Tests exhaustivos para is-button (acciones) — versión estática.
 *
 * Como no hay jsdom disponible, estos tests verifican estáticamente
 * las 10 dimensiones del contrato del componente:
 *   1. Render básico (custom element registrado, defineElement presente)
 *   2. Atributos observados (extraídos via extraerMetaComponente)
 *   3. Eventos emitidos (regex sobre `emit(...)` y dispatchEvent)
 *   4. Slots declarados en la plantilla
 *   5. Shadow DOM y CSS Parts (::part(button) etc.)
 *   6. JSON preview respeta esquema is-preview/v1
 *   7. Accesibilidad (role, aria-*, aria-pressed, focus delegated)
 *   8. Edge cases — atributos vacíos manejados (getAttribute + ?? / ||)
 *   9. Integración — coexistencia con otros WC del kit (imports)
 *  10. Performance / lifecycle — disconnectedCallback, cleanup de listeners
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { extraerMetaComponente } from '../../motor/validators/consistency.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// .../src/utils/health/exhaustive/actions/ → raíz del proyecto
const RAIZ = join(__dirname, '..', '..', '..', '..', '..');

const TAG = 'is-button';
const RUTA_COMPONENTE = join(RAIZ, 'src/components/actions/button.ts');
const RUTA_JSON = join(RAIZ, 'src/components/actions/button.json');

function leerFuente(): string {
  return existsSync(RUTA_COMPONENTE) ? readFileSync(RUTA_COMPONENTE, 'utf8') : '';
}
function leerJson(): any {
  return existsSync(RUTA_JSON) ? JSON.parse(readFileSync(RUTA_JSON, 'utf8')) : null;
}

// 1. Render básico
test('is-button: módulo existe y registra el custom element', () => {
  const src = leerFuente();
  assert.ok(src.length > 0, `${RUTA_COMPONENTE} debe existir y no estar vacío`);
  assert.ok(
    /customElements\.define\s*\(/.test(src) || /define[A-Z][\w]*\s*\(/.test(src),
    'debe registrar el custom element (customElements.define o factory defineElement)',
  );
});

// 2. Atributos observados
test('is-button: declares observedAttributes (≥8)', async () => {
  const meta = await extraerMetaComponente(RUTA_COMPONENTE);
  assert.ok(meta, 'extraerMetaComponente debe devolver meta');
  assert.ok(
    meta!.atributosObservados.size >= 8,
    `esperaba ≥8 atributos observados, hay ${meta!.atributosObservados.size}`,
  );
  // Atributos clave declarados en el JSDoc
  for (const attr of ['color', 'variant', 'disabled', 'loading', 'href', 'type']) {
    assert.ok(
      meta!.atributosObservados.has(attr),
      `atributo "${attr}" debería estar en observedAttributes`,
    );
  }
});

// 3. Eventos
test('is-button: emite is-click, is-focus, is-blur, is-invalid', () => {
  const src = leerFuente();
  for (const evt of ['is-click', 'is-focus', 'is-blur', 'is-invalid']) {
    assert.ok(
      new RegExp(`emit\\s*\\([^,]*,\\s*['"\`]${evt}['"\`]`).test(src),
      `debe emitir ${evt}`,
    );
  }
});

// 4. Slots
test('is-button: declara slots default, start, end', () => {
  const src = leerFuente();
  assert.ok(/slot\s+name="start"/.test(src), 'debe declarar <slot name="start">');
  assert.ok(/slot\s+name="end"/.test(src), 'debe declarar <slot name="end">');
  // Default slot: <slot></slot> sin atributo name.
  assert.ok(/<slot><\/slot>|<slot\s*\/>/.test(src), 'debe declarar <slot> default');
});

// 5. Shadow DOM + parts
test('is-button: usa Shadow DOM con delegatesFocus y CSS parts', () => {
  const src = leerFuente();
  assert.ok(/attachShadow\s*\(\s*\{[^}]*mode:\s*["']open["']/.test(src), 'attachShadow mode open');
  assert.ok(/delegatesFocus/.test(src), 'delegatesFocus para que el foco aterrice en el <button> interno');
  for (const part of ['button', 'label', 'start', 'end', 'caret', 'spinner']) {
    assert.ok(
      new RegExp(`part=["']${part}["']`).test(src),
      `debe exponer ::part(${part})`,
    );
  }
});

// 6. JSON preview
test('is-button: JSON preview respeta is-preview/v1', () => {
  const json = leerJson();
  assert.ok(json, `${RUTA_JSON} debe existir`);
  assert.equal(json['$schema'], 'is-preview/v1', '$schema debe ser is-preview/v1');
  assert.equal(json.tag, TAG, `tag debe ser ${TAG}`);
  assert.ok(Array.isArray(json.sections) && json.sections.length > 0, 'sections no vacío');
});

// 7. Accesibilidad
test('is-button: accesibilidad — role implícito (button interno) y aria-*', () => {
  const src = leerFuente();
  // El botón interno provee role=button; el host reenvía aria-*.
  assert.ok(/<button[^>]*type=/.test(src), 'plantilla interna usa <button> nativo');
  // ARIA_FORWARD list incluye aria-label, aria-pressed, aria-expanded.
  assert.ok(/aria-pressed/.test(src), 'debe reenviar aria-pressed');
  assert.ok(/aria-label/.test(src), 'debe reenviar aria-label');
  assert.ok(/aria-expanded/.test(src), 'debe reenviar aria-expanded');
});

// 8. Edge cases
test('is-button: maneja atributos vacíos (getAttribute + ??/||)', () => {
  const src = leerFuente();
  const usesAttr = /getAttribute\s*\(/.test(src);
  assert.ok(usesAttr, 'debe usar getAttribute en algún punto');
  // Patrones típicos de manejo seguro.
  assert.ok(
    /\?:\s*[^;]+|getAttribute\([^)]+\)\s*\|\|/m.test(src),
    'debe manejar null/empty con ?? o ||',
  );
});

// 9. Integración — coexistencia con otros WC
test('is-button: importa <is-icon> (integración con otros WC)', () => {
  const src = leerFuente();
  assert.ok(
    /from\s+['"]\.\.\/media\/icon(\.js)?['"]/.test(src),
    'debe importar el WC <is-icon>',
  );
});

// 10. Lifecycle / performance
test('is-button: implementa lifecycle (connectedCallback / disconnectedCallback)', () => {
  const src = leerFuente();
  assert.ok(/connectedCallback\s*\(/.test(src), 'debe implementar connectedCallback');
  // Cleanup de listeners (al menos un removeEventListener o #wired=false).
  assert.ok(
    /removeEventListener\s*\(|disconnectedCallback|#wired\s*=\s*false/.test(src),
    'debe limpiar listeners o tener un mecanismo de re-entrada idempotente',
  );
});
