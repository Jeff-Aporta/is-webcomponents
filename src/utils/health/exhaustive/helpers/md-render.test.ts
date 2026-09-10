/**
 * md-render.test.ts — Tier A (12 aserciones) para `<is-md-render>`.
 *
 * Dimensiones: módulo, CSS, JSON, OBSERVED, parser interno, XSS, shadow,
 * eventos, custom element, slot para markdown inline, can-edit.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..', '..');
const TAG = 'is-md-render';
const TS  = join(ROOT, 'src', 'components', 'helpers', 'md-render.ts');
const CSS = join(ROOT, 'src', 'components', 'helpers', 'md-render.css');
const JSON_PATH = join(ROOT, 'src', 'components', 'helpers', 'md-render.json');

test('1. módulo .ts existe', () => {
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

test('4. lee markdown desde <script type="text/markdown"> hijo', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(
    /text\/markdown/.test(src) || /type=['"]text\/markdown['"]/.test(src),
    'debe leer <script type="text/markdown">',
  );
});

test('5. tiene su propio parser md (md-lite) — no dependencia externa', () => {
  // Acepta import directo de md-lite o indirecto via prompt-md.
  const mdRenderSrc = readFileSync(TS, 'utf8');
  const promptMdSrc = readFileSync(join(ROOT, 'src', 'components', '_shared', 'prompt-md.ts'), 'utf8');
  const mdLiteSrc = readFileSync(join(ROOT, 'src', 'components', 'helpers', 'md-lite.ts'), 'utf8');
  const usaMdLite =
    /from\s*['"][./]+md-lite/.test(mdRenderSrc) ||
    /from\s*['"][./]+md-lite/.test(promptMdSrc) ||
    /from\s*['"][./]+helpers\/md-lite/.test(promptMdSrc) ||
    /from\s*['"][./]+helpers\/md-lite/.test(mdRenderSrc);
  assert.ok(usaMdLite, 'md-render (o prompt-md que importa) debe usar md-lite');
  // Y md-lite existe.
  assert.ok(mdLiteSrc.length > 100, 'md-lite.ts debe existir y tener contenido');
});

test('6. escapa HTML del usuario (anti-XSS)', () => {
  const mdLiteSrc = readFileSync(join(ROOT, 'src', 'components', 'helpers', 'md-lite.ts'), 'utf8');
  const hasEscape =
    /escapeHtml\s*\(/.test(mdLiteSrc) ||
    /escape\s*\(/.test(mdLiteSrc) ||
    /replace\(\s*\/[<>&]/.test(mdLiteSrc);
  assert.ok(hasEscape, 'md-lite debe escapar caracteres peligrosos (XSS)');
});

test('7. atributo can-edit cambia a modo editor', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/['"]can-edit['"]/.test(src), 'can-edit debe estar en OBSERVED');
});

test('8. shadow DOM tiene parte prose o root', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/<div[^>]*part\s*=/.test(src) || /<article[^>]*part\s*=/.test(src), 'shadow debe exponer part para estilos');
});

test('9. custom element registrado', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(
    /customElements\.define\s*\(\s*['"]is-md-render['"]/.test(src) ||
    /defineElement\s*\(\s*['"]is-md-render['"]/.test(src),
  );
});

test('10. emite is-md-change o is-change al cambiar contenido (modo edit)', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/is-md-change/.test(src) || /is-change/.test(src), 'debe emitir is-change');
});

test('11. el módulo no depende de marked/remark (vanilla)', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  for (const dep of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
    assert.ok(
      !/^(marked|remark|markdown-it)$/.test(dep),
      `${dep} no debe estar en package.json (el parser es local)`,
    );
  }
});

test('12. el CSS hermano define estilo para .prose o contenedor', () => {
  const css = readFileSync(CSS, 'utf8');
  assert.ok(css.length > 100, 'el .css debe tener reglas reales');
  assert.ok(/\.[a-z][\w-]*\s*\{/.test(css), 'debe haber al menos una clase CSS');
});
