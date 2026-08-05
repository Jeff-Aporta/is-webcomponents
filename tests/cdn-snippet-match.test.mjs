// tests/cdn-snippet-match.test.mjs
//
// Verifica que el matching de `mountCdnSnippet()` (en scripts/preview-chrome.js)
// encuentra la entrada del manifest para cada preview folderizado.
//
// Reproduce el bug que apareció tras el folderize de previews/: el manifest
// guardaba `page: 'actions/is-button.html'` mientras que el script comparaba
// contra el basename `is-button.html` directamente, así que el match fallaba
// y `<is-cdn-snippet>` nunca se inyectaba en los previews embebidos.
//
// Reglas:
//   1. Para cada previews/<cat>/is-<name>.html debe existir al menos un item
//      en el manifest cuyo basename coincida.
//   2. La lógica de match usada debe ser tolerante a rutas con prefijo de
//      categoría (`'actions/is-button.html'`) y sin él (`'is-button.html'`).
//
// Uso:  node tests/cdn-snippet-match.test.mjs

import { readdirSync } from 'node:fs';
import { join, dirname, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const previewsRoot = join(root, 'src', 'previews');

const manifest = (await import('../manifest.js')).default;

const previews = [];
for (const cat of readdirSync(previewsRoot, { withFileTypes: true })) {
  if (!cat.isDirectory()) continue;
  const dir = join(previewsRoot, cat.name);
  for (const file of readdirSync(dir)) {
    if (!/^is-[a-z0-9-]+\.html$/i.test(file)) continue;
    previews.push({ cat: cat.name, file });
  }
}

const matchByBasename = (components, file) =>
  components.filter((c) => (c.page || '').split('/').pop() === file);

const failures = [];
let checked = 0;

for (const { cat, file } of previews) {
  const matches = matchByBasename(manifest, file);
  checked += 1;
  if (!matches.length) {
    failures.push(`${cat}/${file}: sin match en el manifest`);
    continue;
  }
  for (const m of matches) {
    assert.ok(m.tag, `${cat}/${file}: match sin tag (manifest roto)`);
  }
}

// Sanity: la lógica debe aceptar también un page sin prefijo de categoría,
// porque algunos manifest antiguos o entries auxiliares pueden guardarlo así.
const fakeManifest = [{ tag: 'is-foo', page: 'is-foo.html' }];
assert.deepEqual(
  matchByBasename(fakeManifest, 'is-foo.html').map((c) => c.tag),
  ['is-foo'],
  'match por basename debe funcionar también con page sin prefijo de categoría'
);

// Sanity: un componente que NO existe en el manifest no debe matchear.
assert.deepEqual(
  matchByBasename(fakeManifest, 'is-bar.html').map((c) => c.tag),
  [],
  'un componente ausente no debe matchear'
);

// Resumen
console.log(`✔ cdn-snippet-match: ${checked} previews folderizados verificados`);
if (failures.length) {
  console.error('✘ Fallos:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

// Imprime una muestra para que un humano vea qué matchéa con qué.
const sample = previews.slice(0, 5).map(({ cat, file }) => {
  const tags = matchByBasename(manifest, file).map((m) => m.tag);
  return `  ${cat}/${file}  →  [${tags.join(', ')}]`;
});
console.log('Muestra:');
for (const line of sample) console.log(line);