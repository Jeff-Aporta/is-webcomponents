/**
 * heading.test.ts — Tier A (10 aserciones) para `<is-heading>`.
 *
 * Tipografía jerárquica con level (1-6), color semántico, mix y mix-with.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..', '..');
const TAG = 'is-heading';
const TS  = join(ROOT, 'src', 'components', 'isp', 'heading.ts');
const CSS = join(ROOT, 'src', 'components', 'isp', 'heading.css');
const JSON_PATH = join(ROOT, 'src', 'components', 'isp', 'heading.json');

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

test('4. OBSERVED incluye level, color, mix, mix-with, size', async () => {
  const { extraerObservados } = await import('../_helpers.js');
  const list = extraerObservados(TS);
  for (const a of ['level', 'color', 'mix', 'mix-with', 'size']) {
    assert.ok(list.includes(a), `OBSERVED debe incluir "${a}"`);
  }
});

test('5. level cubre 1-6', async () => {
  const src = readFileSync(TS, 'utf8');
  for (const lvl of ['1', '2', '3', '4', '5', '6']) {
    assert.ok(src.includes(`'${lvl}'`) || src.includes(`"${lvl}"`), `level cubre "${lvl}"`);
  }
});

test('6. color cubre brand | neutral | info | success | warning | danger | current', async () => {
  const src = readFileSync(TS, 'utf8');
  for (const c of ['brand', 'neutral', 'info', 'success', 'warning', 'danger', 'current']) {
    assert.ok(src.includes(`'${c}'`) || src.includes(`"${c}"`), `color="${c}"`);
  }
});

test('7. usa isp-color helpers (classifyColor, normalizeMix, syncIspColor)', async () => {
  const src = readFileSync(TS, 'utf8');
  for (const h of ['classifyColor', 'normalizeMix', 'syncIspColor']) {
    assert.ok(src.includes(h), `helper ${h} debe estar`);
  }
});

test('8. extiende ElementBase (cambios de atributo se procesan)', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/extends\s+ElementBase/.test(src));
});

test('9. custom element registrado', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/defineElement\s*\(\s*['"]is-heading['"]/.test(src));
});

test('10. preview.ts existe', async () => {
  const preview = join(ROOT, 'src', 'components', 'isp', 'heading.preview.ts');
  assert.ok(existsSync(preview));
});
