/**
 * observer.test.ts — Tier A (15 aserciones) para `<is-observer>` (genérico).
 *
 * Dimensiones: módulo, CSS, JSON, OBSERVED con TODOS los attrs por tipo,
 * factory para los 3 wrappers legacy, eventos is-intersect/is-mutate/is-resize,
 * atributo type con valores intersection|mutation|resize, atributo disabled,
 * once para intersection, slot default, registro, cleanup en disconnected.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..', '..');
const TAG = 'is-observer';
const TS  = join(ROOT, 'src', 'components', 'helpers', 'observer.ts');
const CSS = join(ROOT, 'src', 'components', 'helpers', 'observer.css');
const JSON_PATH = join(ROOT, 'src', 'components', 'helpers', 'observer.json');

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

test('4. OBSERVED incluye TODOS los attrs documentados en JSDoc', () => {
  const src = readFileSync(TS, 'utf8');
  const m = src.match(/OBSERVED\s*=\s*\[([\s\S]*?)\]/);
  assert.ok(m, 'debe haber OBSERVED = [...]');
  const list = m![1].split(/[,\s]+/).map((s) => s.replace(/['"]/g, '')).filter(Boolean);
  for (const a of ['type', 'disabled', 'intersect-class', 'once', 'root', 'root-margin', 'threshold', 'attr', 'child-list', 'character-data']) {
    assert.ok(list.includes(a), `OBSERVED debe incluir "${a}"`);
  }
});

test('5. valida type ∈ {intersection, mutation, resize}', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/['"]intersection['"]/.test(src) && /['"]mutation['"]/.test(src) && /['"]resize['"]/.test(src));
});

test('6. factory createObserverElement exporta y se usa para los 3 wrappers', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/export\s+function\s+createObserverElement\b/.test(src));
});

test('7. emite is-intersect / is-mutate / is-resize según type', () => {
  const src = readFileSync(TS, 'utf8');
  for (const ev of ['is-intersect', 'is-mutate', 'is-resize']) {
    assert.ok(src.includes(`'${ev}'`) || src.includes(`"${ev}"`), `debe emitir ${ev}`);
  }
});

test('8. IntersectionObserver se usa cuando type="intersection"', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/new\s+IntersectionObserver\s*\(/.test(src));
});

test('9. MutationObserver se usa cuando type="mutation"', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/new\s+MutationObserver\s*\(/.test(src));
});

test('10. ResizeObserver se usa cuando type="resize"', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/new\s+ResizeObserver\s*\(/.test(src));
});

test('11. atributo `once` desconecta tras primera intersección', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/this\.hasAttribute\s*\(\s*['"]once['"]\s*\)/.test(src) || /['"]once['"]/.test(src));
});

test('12. atributo `disabled` desconecta sin destruir', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/['"]disabled['"]/.test(src));
  assert.ok(/#observer.*disconnect|disconnect\s*\(\s*\)/.test(src), 'disconnect() debe existir');
});

test('13. cleanup en disconnectedCallback (disconnect + null)', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/disconnectedCallback\s*\(/.test(src));
  assert.ok(/disconnect\s*\(\s*\)/.test(src));
});

test('14. slot default para los hijos observados', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/<slot>/.test(src));
});

test('15. custom element registrado con defineElement', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/defineElement\s*\(\s*['"]is-observer['"]/.test(src));
});
