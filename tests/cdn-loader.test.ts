/**
 * tests/cdn-loader.test.ts — contrato del ISWebComponentsLoader.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, 'src', 'cdn', 'loader.ts');
const dist = join(root, 'dist', 'cdn', 'core', 'loader.min.js');
const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');

test('src/cdn/loader.ts expone API pública + mirrors/pin + has/getLoaded', () => {
  const code = readFileSync(src, 'utf8');
  assert.match(code, /export const ISWebComponentsLoader/);
  assert.match(code, /loadCSSBase\s*\(/);
  assert.match(code, /loadCSSPalettesDefault\s*\(/);
  assert.match(code, /async load\s*\(/);
  assert.match(code, /loadPageStyles/);
  assert.match(code, /loadPageModules/);
  assert.match(code, /\bpin\s*\(/);
  assert.match(code, /\bunpin\s*\(/);
  assert.match(code, /configure\s*\(/);
  assert.match(code, /\bhas\s*\(/);
  assert.match(code, /getLoaded/);
  assert.match(code, /planLoads/);
  assert.match(code, /cdn-ref\.js/);
  assert.match(code, /__IS_LOADER_CATALOG__/);
});

test('dist/cdn/core/loader.min.js y loader.md existen; banner con docs', () => {
  assert.ok(existsSync(dist), 'falta dist/cdn/core/loader.min.js — corre npm run build');
  assert.ok(existsSync(join(root, 'dist', 'cdn', 'core', 'loader.md')), 'falta dist/cdn/core/loader.md');
  const code = readFileSync(dist, 'utf8');
  assert.ok(code.length < 120_000, `loader.min.js demasiado grande (${code.length} B)`);
  assert.match(code, /ISWebComponentsLoader/);
  assert.match(code, /loadCSSBase/);
  assert.match(code, /jsdelivr|Jeff-Aporta\/is-webcomponents/);
  assert.match(code, /"is-button"/);
  assert.match(code, /src\/cdn\/loader\.md|loader\.md/);
});

test('min.js de componente lleva banner de docs MD', () => {
  const btn = readFileSync(join(root, 'dist', 'cdn', 'actions', 'button.min.js'), 'utf8');
  assert.match(btn, /^\/\*!/);
  assert.match(btn, /src\/components\/actions\/button\.md/);
  assert.match(btn, /src\/components\/actions\/LLM\.md/);
  assert.match(btn, /src\/cdn\/loader\.md/);
  assert.match(btn, /is-cdn-install\/SKILL\.md/);
});

test('index.html arranca con loader (sin all.min suelto; CSS estático)', () => {
  assert.match(indexHtml, /loader\.min\.js/);
  assert.match(indexHtml, /<link\s+rel="stylesheet"\s+href="src\/styles\/is-base\.css"/);
  assert.doesNotMatch(indexHtml, /L\.load\(['"]all['"]\)/);
  assert.doesNotMatch(indexHtml, /<script type="module" src="dist\/cdn\/all\.min\.js"/);
  // Detalle del orden await/shell → tests/gallery-boot.test.ts (error #43)
});

test('index.html no reimporta preview-component ni icon desde src/ (Pages 404)', () => {
  // preview-component se importa desde dist/cdn; src/ arrastra icon-loader → lucide 404.
  assert.doesNotMatch(
    indexHtml,
    /loadPageModules\([\s\S]*preview-component\.js/,
  );
  assert.doesNotMatch(indexHtml, /src\/components\/layout\/preview-component\.js/);
  assert.doesNotMatch(indexHtml, /src\/components\/media\/icon\.js/);
  assert.doesNotMatch(indexHtml, /src\/components\/_shared\/icon-loader\.js/);
});

test('LLM.md documenta pin y mirrors (sin README.txt)', () => {
  const llm = readFileSync(join(root, 'dist', 'cdn', 'LLM.md'), 'utf8');
  assert.match(llm, /loader\.min\.js/);
  assert.match(llm, /loadCSSBase/);
  assert.match(llm, /pin\(/);
  assert.match(llm, /mirrors|jsDelivr|Pages/i);
  assert.ok(!existsSync(join(root, 'dist', 'cdn', 'README.txt')), 'README.txt retirado — solo LLM.md');
});
