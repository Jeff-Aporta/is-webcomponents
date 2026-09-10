/**
 * badge.test.ts — Tier A (10 aserciones) para `<is-badge>`.
 *
 * Etiqueta compacta semántica con color/variant/pill/attention.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..', '..');
const TAG = 'is-badge';
const TS  = join(ROOT, 'src', 'components', 'feedback', 'badge.ts');
const CSS = join(ROOT, 'src', 'components', 'feedback', 'badge.css');
const JSON_PATH = join(ROOT, 'src', 'components', 'feedback', 'badge.json');

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

test('4. OBSERVED incluye color, variant, pill, attention', () => {
  const src = readFileSync(TS, 'utf8');
  const m = src.match(/observedAttributes\s*\(\s*\)\s*\{[^}]*return\s*\[([^\]]+)\]/.exec(src));
  assert.ok(m);
  const list = m![1].replace(/['"\s]/g, '').split(',').filter(Boolean);
  for (const a of ['color', 'variant', 'pill', 'attention']) {
    assert.ok(list.includes(a), `OBSERVED debe incluir "${a}"`);
  }
});

test('5. color acepta brand | neutral | success | warning | danger', () => {
  const src = readFileSync(TS, 'utf8');
  for (const c of ['brand', 'neutral', 'success', 'warning', 'danger']) {
    assert.ok(src.includes(`'${c}'`) || src.includes(`"${c}"`), `color acepta "${c}"`);
  }
});

test('6. variant acepta accent | filled | outlined | filled-outlined', () => {
  const src = readFileSync(TS, 'utf8');
  for (const v of ['accent', 'filled', 'outlined', 'filled-outlined']) {
    assert.ok(src.includes(`'${v}'`) || src.includes(`"${v}"`), `variant acepta "${v}"`);
  }
});

test('7. attention acepta none | pulse | bounce', () => {
  const src = readFileSync(TS, 'utf8');
  for (const a of ['pulse', 'bounce']) {
    assert.ok(src.includes(`'${a}'`) || src.includes(`"${a}"`), `attention tiene "${a}"`);
  }
});

test('8. expone CSS parts: badge, start, label, end', () => {
  const src = readFileSync(TS, 'utf8');
  for (const p of ['badge', 'start', 'label', 'end']) {
    assert.ok(new RegExp(`part=['"]${p}['"]`).test(src), `part="${p}"`);
  }
});

test('9. slots default + start + end', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/<slot>/.test(src), 'slot default');
  assert.ok(/name=['"]start['"]/.test(src));
  assert.ok(/name=['"]end['"]/.test(src));
});

test('10. custom element registrado', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/defineElement\s*\(\s*['"]is-badge['"]/.test(src));
});
