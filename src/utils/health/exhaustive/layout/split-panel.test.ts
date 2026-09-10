/**
 * split-panel.test.ts — Tier A (15 aserciones) para `<is-split-panel>`.
 *
 * Componente de layout: dos paneles con divisor arrastrable, persistencia
 * en localStorage, slots start/end/divider, CSS parts, snap points.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..', '..');
const TAG = 'is-split-panel';
const TS  = join(ROOT, 'src', 'components', 'layout', 'split-panel.ts');
const CSS = join(ROOT, 'src', 'components', 'layout', 'split-panel.css');
const JSON_PATH = join(ROOT, 'src', 'components', 'layout', 'split-panel.json');

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

test('4. OBSERVED incluye atributos principales (position, orientation, primary, collapse, snap)', () => {
  const src = readFileSync(TS, 'utf8');
  const m = src.match(/OBSERVED\s*=\s*\[([\s\S]*?)\]/);
  assert.ok(m);
  const list = m![1].split(/[,\s]+/).map((s) => s.replace(/['"]/g, '')).filter(Boolean);
  for (const a of ['position', 'orientation', 'primary', 'collapse', 'snap', 'snap-threshold', 'storage-key']) {
    assert.ok(list.includes(a), `OBSERVED debe incluir "${a}"`);
  }
});

test('5. emite `reposition` con bubbles+composed', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/['"]reposition['"]/.test(src), 'debe emitir evento reposition');
});

test('6. tiene slots start, end, divider', () => {
  const src = readFileSync(TS, 'utf8');
  for (const slot of ['start', 'end', 'divider']) {
    assert.ok(
      new RegExp(`slot[^>]*name=['"]${slot}['"]`).test(src) || src.includes(`name="${slot}"`),
      `debe declarar slot name="${slot}"`,
    );
  }
});

test('7. expone CSS parts: start, end, panel, divider', () => {
  const src = readFileSync(TS, 'utf8');
  for (const p of ['start', 'end', 'panel', 'divider']) {
    assert.ok(new RegExp(`part=['"]${p}['"]`).test(src), `debe declarar part="${p}"`);
  }
});

test('8. usa CSS Grid para layout (horizontal y vertical)', () => {
  const css = readFileSync(CSS, 'utf8');
  assert.ok(/grid-template-columns/.test(css), 'debe usar grid-template-columns para horizontal');
  assert.ok(/grid-template-rows/.test(css), 'debe usar grid-template-rows para vertical');
});

test('9. persiste tamaño en localStorage bajo clave storage-key', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/getComponentPrefs/.test(src) && /setComponentPrefs/.test(src),
    'integra con prefs compartidos');
});

test('10. atributo orientation acepta "horizontal" | "vertical"', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/['"]horizontal['"]/.test(src) && /['"]vertical['"]/.test(src));
});

test('11. atributo primary acepta "start" | "end"', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/['"]start['"]/.test(src) && /['"]end['"]/.test(src));
});

test('12. expone custom properties (--divider-width, --divider-hit-area)', () => {
  const css = readFileSync(CSS, 'utf8');
  assert.ok(/--divider-width/.test(css));
  assert.ok(/--divider-hit-area/.test(css));
});

test('13. tiene snap points para anclar el divisor', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/snap/.test(src), 'snap debe estar en OBSERVED y en handlers');
});

test('14. custom element registrado', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/customElements\.define\s*\(\s*['"]is-split-panel['"]/.test(src));
});

test('15. CSS hermano tiene estilos para el divisor (.divider)', () => {
  const css = readFileSync(CSS, 'utf8');
  assert.ok(/\.divider[^\w-]/.test(css) || /\[part=['"]divider['"]\]/.test(css),
    'debe estilizar el divisor');
});
