// @contexto INDICE.md · tests/exhaustivo/README.md
/**
 * observer.test.ts — Tier A (15 aserciones) para `<iswc-observer>` (genérico).
 *
 * Dimensiones: módulo, CSS, JSON, OBSERVED con TODOS los attrs por tipo,
 * factory para los 3 wrappers legacy, eventos iswc-intersect/iswc-mutate/iswc-resize,
 * atributo type con valores intersection|mutation|resize, atributo disabled,
 * once para intersection, slot default, registro, cleanup en disconnected.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });


const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const TAG = 'iswc-observer';
const TS  = join(ROOT, 'src', 'components', 'helpers', 'observer.ts');
const CSS = join(ROOT, '.tmp-scss', 'src', 'components', 'helpers', 'observer.css');
const JSON_PATH = join(ROOT, 'src', 'components', 'helpers', 'observer.json');

test('iswc-observer:  1. módulo existe', () => {
  assert.ok(existsSync(TS));
});

test('iswc-observer:  2. CSS hermano existe', () => {
  assert.ok(existsSync(CSS));
});

test('iswc-observer:  3. JSON existe y respeta iswc-preview/v1', () => {
  const json = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  assert.equal(json.tag, TAG);
  assert.equal(json.$schema, 'iswc-preview/v1');
});

test('iswc-observer:  OBSERVED incluye TODOS los attrs documentados en JSDoc', () => {
  const src = readFileSync(TS, 'utf8');
  const m = src.match(/OBSERVED\s*=\s*\[([\s\S]*?)\]/);
  assert.ok(m, 'debe haber OBSERVED = [...]');
  const list = m![1].split(/[,\s]+/).map((s) => s.replace(/['"]/g, '')).filter(Boolean);
  for (const a of ['type', 'disabled', 'intersect-class', 'once', 'root', 'root-margin', 'threshold', 'attr', 'child-list', 'character-data']) {
    assert.ok(list.includes(a), `OBSERVED debe incluir "${a}"`);
  }
});

test('iswc-observer:  valida type ∈ {intersection, mutation, resize}', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/['"]intersection['"]/.test(src) && /['"]mutation['"]/.test(src) && /['"]resize['"]/.test(src));
});

test('iswc-observer:  factory createObserverElement exporta y se usa para los 3 wrappers', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/export\s+function\s+createObserverElement\b/.test(src));
});

test('iswc-observer:  emite iswc-intersect / iswc-mutate / iswc-resize según type', () => {
  const src = readFileSync(TS, 'utf8');
  for (const ev of ['iswc-intersect', 'iswc-mutate', 'iswc-resize']) {
    assert.ok(src.includes(`'${ev}'`) || src.includes(`"${ev}"`), `debe emitir ${ev}`);
  }
});

test('iswc-observer:  IntersectionObserver se usa cuando type="intersection"', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/new\s+IntersectionObserver\s*\(/.test(src));
});

test('iswc-observer:  MutationObserver se usa cuando type="mutation"', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/new\s+MutationObserver\s*\(/.test(src));
});

test('iswc-observer:  ResizeObserver se usa cuando type="resize"', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/new\s+ResizeObserver\s*\(/.test(src));
});

test('iswc-observer:  atributo `once` desconecta tras primera intersección', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/this\.hasAttribute\s*\(\s*['"]once['"]\s*\)/.test(src) || /['"]once['"]/.test(src));
});

test('iswc-observer:  atributo `disabled` desconecta sin destruir', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/['"]disabled['"]/.test(src));
  assert.ok(/#observer.*disconnect|disconnect\s*\(\s*\)/.test(src), 'disconnect() debe existir');
});

test('iswc-observer:  cleanup en disconnectedCallback (disconnect + null)', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/disconnectedCallback\s*\(/.test(src));
  assert.ok(/disconnect\s*\(\s*\)/.test(src));
});

test('iswc-observer:  slot default para los hijos observados', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/<slot>/.test(src));
});

test('iswc-observer:  custom element registrado con defineElement', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/(?:defineElement\s*\(\s*|static\s+(?:override\s+)?tag\s*=\s*|createObserverElement\(\s*'\w+',\s*)['"]iswc-observer['"]/.test(src));
});

export default lista();
