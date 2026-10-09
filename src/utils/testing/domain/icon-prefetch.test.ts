/**
 * icon-loader sin prefetch de índices: el flujo es local (mapa de la app) o API de Iconify.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const loader = readFileSync(join(root, 'src/components/_shared/icon-loader.ts'), 'utf8');
const preview = readFileSync(join(root, 'src/components/layout/preview-component.ts'), 'utf8');

test('icon-loader: local (mapa de la app) o API de Iconify, sin prefetch de índices ni CDN del kit', () => {
  // Ya no hay índices <set>.json que precargar ni bases del kit por CDN: el mapa de la app dice qué
  // hay en local y todo lo demás sale de la API.
  assert.doesNotMatch(loader, /requestIdleCallback/);
  assert.doesNotMatch(loader, /jsdelivr|githack|github\.io/);
  assert.match(loader, /api\.iconify\.design/);
  assert.match(loader, /__ISWC_ICONS__/);
});

test('iswc-preview-component no pone remember-scroll sin storage-key en el template', () => {
  const start = preview.indexOf('TEMPLATE.innerHTML');
  const end = preview.indexOf('class IswcPreviewComponent');
  const tpl = preview.slice(start, end > start ? end : start + 800);
  assert.doesNotMatch(tpl, /remember-scroll/);
  assert.match(preview, /toggleAttribute\(['"]remember-scroll['"]/);
});

test('preview-component fuente declara dependencia de icon (por eso Pages no debe reimportarlo)', () => {
  // Documenta la cadena: src preview-component → icon.ts → icon-loader.
  // Si index.html vuelve a loadPageModules(ese archivo) tras load('all'),
  // el prefetch de icon-loader corre con bases src/assets → 404.
  assert.match(preview, /import\s+['"]\.\.\/media\/icon\.js['"]/);
});
