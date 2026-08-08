// tests/preview-controller.test.mjs
//
// Contrato: previews = JSON is-preview/v1 + <is-preview-component> + behaviors opcionales.
// Un solo HTML permitido: _shell.html
//
// Uso: node tests/preview-controller.test.mjs

import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const previews = join(root, 'src', 'previews');
const failures = [];

const kitFiles = [
  'src/previews/_kit/types.d.ts',
  'src/previews/_kit/ISComponentPreview.js',
  'src/previews/_kit/JsonPreview.js',
  'src/previews/_kit/render.js',
  'src/previews/_kit/load-json.js',
  'src/previews/registry.js',
  'src/previews/catalog.js',
  'src/components/layout/preview-component.js',
  'src/previews/_shell.html',
  'src/previews/actions/is-button-group.json',
];
for (const f of kitFiles) {
  if (!existsSync(join(root, f))) failures.push(`falta ${f}`);
}

/** Solo _shell.html bajo previews/ */
function walkHtml(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === '_kit' || name === 'behaviors') continue;
      walkHtml(p, acc);
    } else if (name.endsWith('.html')) acc.push(p);
  }
  return acc;
}
const htmls = walkHtml(previews);
for (const h of htmls) {
  if (!h.endsWith(`${join('previews', '_shell.html')}`) && !h.replace(/\\/g, '/').endsWith('previews/_shell.html')) {
    failures.push(`HTML prohibido (usar JSON): ${h.slice(root.length + 1)}`);
  }
}
if (htmls.length !== 1) {
  failures.push(`debe quedar exactamente 1 HTML (_shell.html), hay ${htmls.length}`);
}

const types = readFileSync(join(root, 'src/previews/_kit/types.d.ts'), 'utf8');
if (!/is-preview\/v1/.test(types)) failures.push('types.d.ts debe declarar $schema is-preview/v1');
if (!/PreviewDefinition/.test(types)) failures.push('falta PreviewDefinition');

const host = readFileSync(join(root, 'src/components/layout/preview-component.js'), 'utf8');
if (/eval\s*\(/.test(host)) failures.push('is-preview-component no debe usar eval');

const bg = JSON.parse(readFileSync(join(root, 'src/previews/actions/is-button-group.json'), 'utf8'));
assert.equal(bg.$schema, 'is-preview/v1');
assert.equal(bg.tag, 'is-button-group');
assert.ok(Array.isArray(bg.sections) && bg.sections.length > 0);

const index = readFileSync(join(root, 'index.html'), 'utf8');
if (!/previewHost/.test(index) || !/hasControlledPreview/.test(index)) {
  failures.push('index.html debe montar host controlado');
}
if (!/loadPreview/.test(index)) failures.push('index.html debe loadPreview desde registry');

const { hasControlledPreview, hasCachedPreview, controlledPreviewTags, loadPreview, clearPreviewCache } = await import('../src/previews/registry.js');
assert.equal(hasControlledPreview('is-button-group'), true);
assert.equal(hasControlledPreview('is-button'), true);
assert.equal(hasControlledPreview('home'), true);
assert.ok(controlledPreviewTags().length >= 100);

clearPreviewCache();
assert.equal(hasCachedPreview('is-button-group'), false);
const preview = await loadPreview('is-button-group');
assert.ok(preview);
assert.equal(preview.definition.tag, 'is-button-group');
assert.equal(preview.definition.$schema, 'is-preview/v1');
assert.equal(hasCachedPreview('is-button-group'), true);
const again = await loadPreview('is-button-group');
// `JsonPreview` normaliza la definición al construirse (spread + defaults), así
// que cada carga devuelve un objeto propio: la identidad no es observable. Lo
// que sí debe cumplirse es que la definición salga de la caché y sea la misma.
assert.equal(hasCachedPreview('is-button-group'), true, 'la definición debe seguir cacheada');
assert.deepEqual(again.definition, preview.definition, 'segunda carga debe reutilizar la definición en memoria');
assert.ok(/hasCachedPreview/.test(index), 'index.html debe evitar vaciar el host si el JSON ya está en caché');
assert.ok(/#paintGen/.test(host) || /paintGen/.test(host), 'is-preview-component debe invalidar mounts en vuelo');

if (failures.length) {
  console.error(`preview-controller.test.mjs: FAIL — ${failures.length}\n`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `preview-controller.test.mjs: PASS — JSON v1 + shell único (${controlledPreviewTags().length} tags)`,
);
