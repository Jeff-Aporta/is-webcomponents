// tests/preview-controller.test.mjs
//
// Contrato del sistema is-preview-component + ISComponentPreview:
// - definición tipada (sections/blocks)
// - mount/unmount son funciones (no strings de lógica)
// - registry lista tags migrados
//
// Uso: node tests/preview-controller.test.mjs

import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

const kitFiles = [
  'src/previews/_kit/types.d.ts',
  'src/previews/_kit/ISComponentPreview.js',
  'src/previews/_kit/render.js',
  'src/previews/registry.js',
  'src/components/layout/preview-component.js',
  'src/components/layout/preview-component.css',
  'src/previews/actions/is-button-group.preview.js',
  'src/previews/_shell.html',
];
for (const f of kitFiles) {
  if (!existsSync(join(root, f))) failures.push(`falta ${f}`);
}

const base = readFileSync(join(root, 'src/previews/_kit/ISComponentPreview.js'), 'utf8');
if (!/class ISComponentPreview/.test(base)) failures.push('ISComponentPreview class missing');
if (!/\bon\s*\(/.test(base) || !/AbortController/.test(base)) {
  failures.push('ISComponentPreview debe cablear listeners con AbortController (no strings)');
}

const host = readFileSync(join(root, 'src/components/layout/preview-component.js'), 'utf8');
if (!/is-preview-component/.test(host)) failures.push('is-preview-component no se define');
if (!/renderDefinition/.test(host)) failures.push('is-preview-component debe renderizar definition');
if (/eval\s*\(/.test(host)) failures.push('is-preview-component no debe usar eval');

const bg = readFileSync(join(root, 'src/previews/actions/is-button-group.preview.js'), 'utf8');
if (!/extends ISComponentPreview/.test(bg)) failures.push('button-group preview debe extender ISComponentPreview');
if (!/async mount\s*\(/.test(bg) && !/mount\s*\(/.test(bg)) {
  failures.push('button-group preview debe definir mount()');
}
if (!/sections\s*:/.test(bg)) failures.push('button-group preview sin sections');

const thin = readFileSync(join(root, 'src/previews/actions/is-button-group.html'), 'utf8');
if (!/is-preview-component/.test(thin)) {
  failures.push('is-button-group.html debe ser shell mínimo con is-preview-component');
}
if (thin.length > 2500) {
  failures.push(`is-button-group.html sigue gordo (${thin.length} bytes); el contenido va en .preview.js`);
}

const index = readFileSync(join(root, 'index.html'), 'utf8');
if (!/previewHost/.test(index) || !/hasControlledPreview/.test(index)) {
  failures.push('index.html debe montar host controlado + fallback iframe');
}

const { hasControlledPreview, controlledPreviewTags } = await import('../src/previews/registry.js');
assert.equal(hasControlledPreview('is-button-group'), true);
assert.ok(controlledPreviewTags().includes('is-button-group'));
assert.equal(hasControlledPreview('is-button'), false);

if (failures.length) {
  console.error(`preview-controller.test.mjs: FAIL — ${failures.length}\n`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `preview-controller.test.mjs: PASS — kit + button-group migrado (${controlledPreviewTags().length} tags controlados)`,
);
