/**
 * softFormat / unwrapHandHighlight — indentación de snippets y limpieza del
 * coloreado a mano que CodeMirror marcaba como cm-error (fondo rojo).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hl = await import(pathToFileURL(join(root, 'src/components/_shared/highlight-code.js')).href);

test('unwrapHandHighlight quita el coloreado a mano de la migración', () => {
  const dirty = '<span class="tag"><button</span> <span class="attr">part</span>=<span class="val">"button"</span><span class="tag">></span>';
  assert.equal(hl.unwrapHandHighlight(dirty), '<button part="button">');
});

test('softFormat expande anidación HTML en la misma línea', () => {
  const src = '<button class="btn"><span part="start"><slot name="start"></slot></span></button>';
  const out = hl.softFormat(src, 'htmlmixed');
  const lines = out.split('\n');
  assert.ok(lines.length >= 5, `esperaba varias líneas, got:\n${out}`);
  assert.match(lines[0], /^<button/);
  assert.match(lines[1], /^  <span/);
  assert.match(lines[2], /^    <slot/);
  assert.match(lines.at(-1), /^<\/button>/);
});

test('softFormat no aplana HTML ya bien indentado sin anidación inline', () => {
  const src = '<div>\n  <p>hola</p>\n</div>';
  assert.equal(hl.softFormat(src, 'htmlmixed'), src);
});

test('softFormat repara el markup a mano de anatomy y lo indenta', () => {
  const dirty = [
    '<span class="tag"><button</span> <span class="attr">part</span>=<span class="val">"button"</span> <span class="attr">class</span>=<span class="val">"btn"</span><span class="tag">></span>',
    '  <span class="tag"><span</span> <span class="attr">part</span>=<span class="val">"start"</span> <span class="attr">class</span>=<span class="val">"btn__prefix"</span><span class="tag">></span><span class="tag"><slot</span> <span class="attr">name</span>=<span class="val">"start"</span><span class="tag">></slot></span></span>',
    '<span class="tag"></button></span>',
  ].join('\n');
  const out = hl.softFormat(dirty, 'htmlmixed');
  assert.doesNotMatch(out, /class="tag"/);
  assert.match(out, /<button part="button" class="btn">/);
  assert.match(out, /^\s+<span part="start"/m);
  assert.match(out, /^\s+<slot name="start">/m);
});

test('presentation.css neutraliza el fondo rojo de cm-error', () => {
  const css = readFileSync(join(root, 'src/styles/presentation.css'), 'utf8');
  assert.match(css, /pre\.code\s+\.cm-error/);
  assert.match(css, /background:\s*transparent\s*!important/);
});
