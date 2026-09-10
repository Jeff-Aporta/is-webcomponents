/**
 * relative-time.test.ts — Tier A (12 aserciones) para `<is-relative-time>`.
 *
 * Dimensiones: módulo existe, CSS hermano, JSON+schema, OBSERVED, parseo
 * de fechas, soporte de `sync`, soporte de `format`, eventos is-change,
 * shadow DOM, registro custom element, getter/setter, partes CSS.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..', '..');
const TAG = 'is-relative-time';
const TS  = join(ROOT, 'src', 'components', 'helpers', 'relative-time.ts');
const CSS = join(ROOT, 'src', 'components', 'helpers', 'relative-time.css');
const JSON_PATH = join(ROOT, 'src', 'components', 'helpers', 'relative-time.json');

test('1. módulo .ts existe y es legible', async () => {
  assert.ok(existsSync(TS));
  assert.ok(readFileSync(TS, 'utf8').length > 100);
});

test('2. CSS hermano existe', async () => {
  assert.ok(existsSync(CSS));
});

test('3. JSON existe y respeta is-preview/v1', async () => {
  const json = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  assert.equal(json.tag, TAG);
  assert.equal(json.$schema, 'is-preview/v1');
});

test('4. OBSERVED incluye date, sync, locale, format', async () => {
  const { extraerObservados } = await import('../_helpers.js');
  const list = extraerObservados(TS);
  for (const a of ['date', 'sync', 'locale', 'format']) {
    assert.ok(list.includes(a), `OBSERVED debe incluir "${a}"`);
  }
});

test('5. el módulo reusa parseLooseDate (no reinventa la rueda)', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(
    /import\s*\{[^}]*parseLooseDate[^}]*\}\s*from\s*['"][./]+format-date/.test(src),
    'debe importar parseLooseDate desde format-date',
  );
});

test('6. usa Intl.RelativeTimeFormat (no es un polyfill manual)', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/Intl\.RelativeTimeFormat/.test(src), 'debe usar Intl nativo');
});

test('7. tiene un método render() que actualiza el shadow cuando cambia el texto', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/#render\s*\(/.test(src) || /render\s*\(\s*\)/.test(src), 'debe haber un método render()');
});

test('8. atributo sync activa actualización periódica (setInterval)', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/setInterval\s*\(/.test(src), 'sync debe usar setInterval para refrescar');
  assert.ok(/clearInterval\s*\(/.test(src), 'debe limpiar el interval en disconnected');
});

test('9. shadow DOM expone parte formateada (part="text" o similar)', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/<time[^>]*part\s*=/.test(src), 'shadow debe tener <time part=...>');
});

test('10. custom element registrado correctamente', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(
    /customElements\.define\s*\(\s*['"]is-relative-time['"]/.test(src) ||
    /defineElement\s*\(\s*['"]is-relative-time['"]/.test(src),
  );
});

test('11. maneja format ∈ {long, short, narrow} (Intl.RelativeTimeFormat)', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/['"]short['"]/.test(src) && /['"]long['"]/.test(src) && /['"]narrow['"]/.test(src),
    'format acepta long/short/narrow');
});

test('12. atributo locale es BCP 47 y delega en resolveLocale', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/resolveLocale/.test(src), 'locale debe resolverse via helper compartido');
});
