/**
 * Prefetch de iconos: solo mdi/tabler viven en src/ git; no spamear 404
 * contra lucide/heroicons/material-symbols en Pages.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const loader = readFileSync(join(root, 'src/components/_shared/icon-loader.js'), 'utf8');
const preview = readFileSync(join(root, 'src/components/layout/preview-component.js'), 'utf8');

test('prefetch idle solo mdi + tabler (colecciones en git bajo src/)', () => {
  assert.match(loader, /SRC_SHIPPED_PREFIXES/);
  assert.match(loader, /['"]mdi['"]/);
  assert.match(loader, /['"]tabler['"]/);
  // No precargar colecciones gitignoreadas en fuente.
  assert.doesNotMatch(
    loader,
    /requestIdleCallback[\s\S]*lucide[\s\S]*heroicons[\s\S]*material-symbols/,
  );
  const idleBlock = loader.slice(loader.lastIndexOf('requestIdleCallback'));
  assert.doesNotMatch(idleBlock, /lucide/);
  assert.doesNotMatch(idleBlock, /heroicons/);
  assert.doesNotMatch(idleBlock, /material-symbols/);
});

test('src/assets no se intenta para prefijos no shipped', () => {
  assert.match(loader, /\/src\\\/assets\\\/icons\\\//);
  assert.match(loader, /SRC_SHIPPED_PREFIXES\.has\(prefix\)/);
});

test('is-preview-component no pone remember-scroll sin storage-key en el template', () => {
  const start = preview.indexOf('TEMPLATE.innerHTML');
  const end = preview.indexOf('class IsPreviewComponent');
  const tpl = preview.slice(start, end > start ? end : start + 800);
  assert.doesNotMatch(tpl, /remember-scroll/);
  assert.match(preview, /toggleAttribute\(['"]remember-scroll['"]/);
});

test('preview-component fuente declara dependencia de icon (por eso Pages no debe reimportarlo)', () => {
  // Documenta la cadena: src preview-component → icon.js → icon-loader.
  // Si index.html vuelve a loadPageModules(ese archivo) tras load('all'),
  // el prefetch de icon-loader corre con bases src/assets → 404.
  assert.match(preview, /import\s+['"]\.\.\/media\/icon\.js['"]/);
});
