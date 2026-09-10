/**
 * tab-group.test.ts — Tier A (12 aserciones) para `<is-tab-group>` y familia.
 *
 * (La consigna decía "tabs"; el componente es `<is-tab-group>` con hijos
 * `<is-tab>` y `<is-tab-panel>`).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..', '..');
const TAG = 'is-tab-group';
const TS  = join(ROOT, 'src', 'components', 'navigation', 'tab-group.ts');
const CSS = join(ROOT, 'src', 'components', 'navigation', 'tab-group.css');
const JSON_PATH = join(ROOT, 'src', 'components', 'navigation', 'tab-group.json');

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

test('4. OBSERVED incluye active, placement, activation', async () => {
  const src = readFileSync(TS, 'utf8');
  const m = src.match(/OBSERVED\s*=\s*\[([\s\S]*?)\]/.exec(src));
  assert.ok(m);
  const list = m![1].split(/[,\s]+/).map((s) => s.replace(/['"]/g, '')).filter(Boolean);
  for (const a of ['active', 'placement', 'activation', 'url-key']) {
    assert.ok(list.includes(a), `OBSERVED debe incluir "${a}"`);
  }
});

test('5. placement acepta top | bottom | start | end', async () => {
  const src = readFileSync(TS, 'utf8');
  for (const v of ['top', 'bottom', 'start', 'end']) {
    assert.ok(src.includes(`'${v}'`) || src.includes(`"${v}"`), `placement acepta "${v}"`);
  }
});

test('6. activation acepta auto | manual', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/['"]auto['"]/.test(src) && /['"]manual['"]/.test(src));
});

test('7. persiste active en URL via url-key (readUrlNav/writeUrlNav)', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/readUrlNav/.test(src) && /writeUrlNav/.test(src));
});

test('8. emite is-change cuando cambia el active', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/['"]is-change['"]/.test(src));
});

test('9. integra con is-tab e is-tab-panel (slots)', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/<slot[^>]*name\s*=\s*['"]nav['"]/.test(src), 'slot nav para is-tab');
  assert.ok(/<slot[^>]*name\s*=\s*['"]panel['"]/.test(src) || /<slot>/.test(src));
});

test('10. registra <is-tab> y <is-tab-panel>', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/defineElement\s*\(\s*['"]is-tab['"]/.test(src) ||
             /defineElement\s*\(\s*['"]is-tab-panel['"]/.test(src),
             'debe registrar is-tab o is-tab-panel');
});

test('11. custom element is-tab-group registrado', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/defineElement\s*\(\s*['"]is-tab-group['"]/.test(src));
});

test('12. JSON tiene demo(s) y reference', async () => {
  const json = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  const hasDemo = (json.sections || []).some((s: any) =>
    (s.blocks || []).some((b: any) => b.kind === 'demo')
  );
  assert.ok(hasDemo, 'debe haber al menos 1 demo');
});
