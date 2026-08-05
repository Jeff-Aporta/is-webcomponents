// tests/preview-paths.test.mjs
//
// Verifica que las rutas <script src=...> y <link href=...> en cada preview
// apuntan a archivos que existen.
//
// Esto evita la trampa mortal del folderize: si mueves un preview a un
// nivel mas adentro sin reescribir sus rutas, las paginas quedan en blanco
// sin error visible. Aqui lo detectamos en CI.
//
// Reglas:
//   1. <script src="path"> resuelve a un archivo existente (path relativo al preview).
//   2. <link rel="stylesheet" href="path"> resuelve a un archivo existente.
//   3. URLs http(s)://, //, data:, y {{templates}} se ignoran.
//
// Uso:  node tests/preview-paths.test.mjs

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, dirname, relative, resolve as resolvePath, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const previewsDir = join(root, 'src', 'previews');

const SRC_RE = /<(?:script|link)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (e.isFile() && e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const SKIP = (url) => {
  if (!url || url.startsWith('//')) return true;
  if (/^(?:https?|data|blob|mailto|tel|javascript):/i.test(url)) return true;
  if (url.includes('{{')) return true;
  return false;
};

const files = await walk(previewsDir);
let checked = 0;
const failures = [];

for (const f of files) {
  const body = await readFile(f, 'utf8');
  const baseDir = dirname(f);
  let m;
  SRC_RE.lastIndex = 0;
  while ((m = SRC_RE.exec(body)) !== null) {
    const url = m[1];
    if (SKIP(url)) continue;
    if (isAbsolute(url)) {
      // En Windows una URL absoluta "C:\..." se confunde con un path; en este
      // contexto todos los paths son relativos, asi que fallamos en silencio.
      continue;
    }
    const target = resolvePath(baseDir, url);
    try {
      const s = await stat(target);
      if (s.isDirectory()) {
        failures.push(`${relative(root, f)}: ${url} -> es un directorio, no un archivo`);
      }
    } catch {
      failures.push(`${relative(root, f)}: ${url} -> no existe (resuelve a ${relative(root, target)})`);
    }
    checked++;
  }
}

console.log(`previews escaneados: ${files.length}`);
console.log(`referencias chequeadas: ${checked}`);

if (failures.length) {
  console.log('\nFAIL:');
  for (const f of failures.slice(0, 25)) console.log(`  - ${f}`);
  if (failures.length > 25) console.log(`  ... y ${failures.length - 25} mas`);
  process.exit(1);
}

console.log(`preview-paths.test.mjs: PASS — ${files.length} previews con paths correctos`);