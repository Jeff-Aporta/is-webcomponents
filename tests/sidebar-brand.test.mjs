import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const css = readFileSync(join(root, 'src', 'styles', 'presentation.css'), 'utf8');

// Tomamos el bloque de la regla `.sidebar { ... }` contando {} balanceados.
function pickBlock(src, selector) {
  const idx = src.indexOf(`${selector} {`);
  if (idx < 0) return null;
  const start = src.indexOf('{', idx);
  let depth = 1;
  let j = start + 1;
  while (j < src.length && depth > 0) {
    const c = src[j];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    j++;
  }
  return src.slice(start, j);
}

test('sidebar: font-family Manrope y peso ligero', () => {
  const block = pickBlock(css, '.sidebar');
  assert.ok(block, '.sidebar { ... } existe en presentation.css');
  assert.ok(
    /font-family:\s*["']Manrope["']\s*,\s*var\(--is-sans\)/.test(block),
    '.sidebar debe declarar font-family Manrope + --is-sans',
  );
  assert.ok(
    /font-weight:\s*400\b/.test(block),
    '.sidebar debe usar font-weight 400 (más ligero que el main)',
  );
});

test('sidebar: acento de marca sutil en el borde', () => {
  const block = pickBlock(css, '.sidebar');
  assert.ok(block, '.sidebar { ... } existe');
  // Acento sutil: 1px teñido con --is-accent (no side-tab grueso).
  assert.ok(
    /border-left:\s*1px\s+solid\s+color-mix\(in srgb, var\(--is-accent\)/.test(block),
    '.sidebar debe tener border-left 1px teñido con var(--is-accent)',
  );
  // No debe quedar el border gris antiguo de 1px.
  assert.ok(
    !/border-left:\s*1px\s+solid\s+color-mix\(in srgb, var\(--is-border\)/.test(block),
    '.sidebar NO debe tener el border-left antiguo de 1px gris',
  );
});

test('sidebar responsive: en móvil el accent pasa a border-top', () => {
  const mql = /\@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.sidebar\s*\{([\s\S]*?)\}/m.exec(css);
  assert.ok(mql, 'Hay media (max-width:900px) con bloque .sidebar');
  const block = mql[1];
  assert.ok(
    /border-left:\s*0\b/.test(block) || /border-left:\s*none\b/.test(block),
    'En móvil el border-left debe desactivarse (0 o none)',
  );
  assert.ok(
    /border-top:\s*1px\s+solid\s+color-mix\(in srgb, var\(--is-accent\)/.test(block),
    'En móvil el accent debe pasar a border-top 1px teñido con var(--is-accent)',
  );
});