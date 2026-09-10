/**
 * block-layout.test.ts — Tier A (15 aserciones) para `<is-block-layout>`.
 *
 * Componente de layout con breakpoints (xs/sm/md/lg/xl), body JSON,
 * geometría API y scroll memory.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..', '..');
const TAG = 'is-block-layout';
const TS  = join(ROOT, 'src', 'components', 'isp', 'block-layout.ts');
const CSS = join(ROOT, 'src', 'components', 'isp', 'block-layout.css');
const JSON_PATH = join(ROOT, 'src', 'components', 'isp', 'block-layout.json');

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

test('4. exporta constantes BREAKPOINTS = [xs, sm, md, lg, xl]', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/export\s+const\s+BREAKPOINTS\s*=\s*\[\s*['"]xs['"]/.test(src));
  assert.ok(/['"]sm['"]/.test(src) && /['"]md['"]/.test(src));
  assert.ok(/['"]lg['"]/.test(src) && /['"]xl['"]/.test(src));
});

test('5. exporta BREAKPOINT_W con anchos numéricos', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/export\s+const\s+BREAKPOINT_W\s*=\s*\{/.test(src));
});

test('6. exporta sizewFor(width) para resolver breakpoint desde ancho', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/export\s+function\s+sizewFor\b/.test(src));
});

test('7. emite is-breakpoint cuando cambia el sizew', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/['"]is-breakpoint['"]/.test(src), 'debe emitir is-breakpoint');
});

test('8. tiene API de geometría (getWidth/getHeight/rect)', () => {
  const src = readFileSync(TS, 'utf8');
  for (const m of ['getWidth', 'getHeight', 'rect']) {
    assert.ok(src.includes(m), `API debe incluir ${m}()`);
  }
});

test('9. usa codec json2html/html2json (round-trip)', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/json2html\b/.test(src) && /html2json\b/.test(src), 'codec bidireccional');
});

test('10. soporta scroll memory opt-in (remember-scroll + storage-key)', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/remember-scroll/.test(src) && /storage-key/.test(src));
  assert.ok(/ScrollMemory|scroll-memory/.test(src), 'integra con helper ScrollMemory');
});

test('11. OBSERVED incluye atributos principales', () => {
  const src = readFileSync(TS, 'utf8');
  const m = src.match(/OBSERVED\s*=\s*\[([\s\S]*?)\]/);
  assert.ok(m);
  const list = m![1].split(/[,\s]+/).map((s) => s.replace(/['"]/g, '')).filter(Boolean);
  for (const a of ['inline', 'cscroll', 'remember-scroll', 'storage-key']) {
    assert.ok(list.includes(a), `OBSERVED debe incluir "${a}"`);
  }
});

test('12. custom element registrado', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/defineElement\s*\(\s*['"]is-block-layout['"]/.test(src));
});

test('13. CSS hermano tiene reglas para grid/flex (es un layout)', () => {
  const css = readFileSync(CSS, 'utf8');
  assert.ok(/display\s*:\s*(grid|flex|block)/.test(css), 'debe tener regla display');
  assert.ok(/--/.test(css), 'debe exponer CSS custom properties');
});

test('14. JSON tiene sección intro con lede (no es solo una tabla)', () => {
  const json = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  const intro = (json.sections || [])[0];
  assert.ok(intro && typeof intro.lede === 'string' && intro.lede.length > 30);
});

test('15. preview.ts existe (componente complejo → tiene behavior)', () => {
  const preview = join(ROOT, 'src', 'components', 'isp', 'block-layout.preview.ts');
  assert.ok(existsSync(preview));
});
