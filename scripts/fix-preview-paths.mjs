/**
 * scripts/fix-preview-paths.mjs
 *
 * Tras folderizar previews/ por categoria, los archivos is-*.html que antes
 * vivian en previews/ ahora viven en previews/<cat>/is-X.html. Las rutas
 * `../components/`, `../scripts/` y `../styles/` que tenian antes apuntan
 * un nivel por debajo de donde deberian. Las reescribe a `../../...`.
 *
 *   node scripts/fix-preview-paths.mjs
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const previews = join(root, 'src', 'previews');

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function fixPaths(text) {
  return text
    .replace(/src="\.\.\/(components|scripts)\//g, 'src="../../$1/')
    .replace(/href="\.\.\/(styles|components|scripts)\//g, 'href="../../$1/')
    .replace(/import\s+['"]\.\.\/(components|scripts)\//g, 'import \'../../$1/');
}

const all = await walk(previews);
let changed = 0;
for (const file of all) {
  const text = await readFile(file, 'utf8');
  const next = fixPaths(text);
  if (next !== text) {
    await writeFile(file, next, 'utf8');
    changed++;
    console.log(`fixed: ${file.replace(root + '\\', '')}`);
  }
}
console.log(`\n${changed} archivos modificados de ${all.length}`);