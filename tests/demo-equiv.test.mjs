/**
 * demo-equiv.test.mjs — el bloque «HTML puro equivalente» ya no se pinta.
 * Los campos equiv* pueden seguir en el JSON (datos), pero render no los muestra.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

test('tipos aún declaran equivHtml / equivNote / equivFlow (opcionales)', async () => {
  const src = await readFile(join(raiz, 'src/previews/_kit/types.d.ts'), 'utf8');
  assert.match(src, /equivHtml\?:/);
  assert.match(src, /equivNote\?:/);
  assert.match(src, /equivFlow\?:/);
});

test('render NO pinta HTML puro equivalente ni .demo-equiv', async () => {
  const src = await readFile(join(raiz, 'src/previews/_kit/render.js'), 'utf8');
  assert.doesNotMatch(src, /HTML puro equivalente/);
  assert.doesNotMatch(src, /renderDemoEquiv/);
  assert.doesNotMatch(src, /demo-equiv/);
  assert.match(src, /demo-block/);
});

test('bloques code no marcan data-cm prematuro (deja paint/inferir lang)', async () => {
  const src = await readFile(join(raiz, 'src/previews/_kit/render.js'), 'utf8');
  const codeCase = src.slice(src.indexOf("case 'code':"), src.indexOf("case 'html':"));
  assert.doesNotMatch(codeCase, /dataset\.cm\s*=/);
  assert.match(codeCase, /is-code/);
});

test('demo-code monta is-code solo al abrir, con snippet ya cargado', async () => {
  const src = await readFile(join(raiz, 'scripts/demo-code.js'), 'utf8');
  assert.doesNotMatch(src, /<is-code class="code demo-code-pop__pre/,
    'no crear is-code vacío en el innerHTML del popover');
  assert.match(src, /mountCodeEl/);
  assert.match(src, /dataset\.src/);
});

test('demo-code excluye chrome de galería del snippet copiable', async () => {
  const src = await readFile(join(raiz, 'scripts/demo-code.js'), 'utf8');
  assert.match(src, /demo-sources-btn/);
  assert.match(src, /demo-label/);
  assert.match(src, /stripSnippetChrome/);
  assert.match(src, /SNIPPET_CHROME_SEL/);
});

test('demo-snippet-styles incluye CSS de matrix cuando hay cell-label', async () => {
  const { buildDemoSnippetStyles } = await import('../src/previews/_kit/demo-snippet-styles.js');
  const html = '<div class="matrix"><span class="cell-label">Fill</span></div>';
  const css = buildDemoSnippetStyles(html, '');
  assert.match(css, /\.matrix\s*\{/);
  assert.match(css, /\.cell-label/);
});

test('demo-snippet-styles incluye styles del preview cuando aplica', async () => {
  const { buildDemoSnippetStyles } = await import('../src/previews/_kit/demo-snippet-styles.js');
  const previewStyles = '.panel-demo { height: 100%; }\n.panel-demo--alt { opacity: 0.9; }';
  const html = '<div class="panel-demo panel-demo--alt">A</div>';
  const css = buildDemoSnippetStyles(html, previewStyles);
  assert.match(css, /\.panel-demo\s*\{/);
  assert.match(css, /\.panel-demo--alt/);
});

test('demo-code inyecta bloque style en el snippet', async () => {
  const src = await readFile(join(raiz, 'scripts/demo-code.js'), 'utf8');
  assert.match(src, /buildDemoSnippetStyles/);
  assert.match(src, /<style>/);
  assert.match(src, /preview\?\.definition\?\.styles/);
});
