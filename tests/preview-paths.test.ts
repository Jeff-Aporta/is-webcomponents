// tests/preview-paths.test.ts
//
// Tras la migración a JSON, el único HTML bajo previews/ es _shell.html.
// Verifica que sus script/link resuelven a archivos reales.
//
// Uso:  node tests/preview-paths.test.ts

import { readFile, stat } from 'node:fs/promises';
import { join, dirname, relative, resolve as resolvePath, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const shell = join(root, 'src', 'previews', '_shell.html');

const SRC_RE = /<(?:script|link)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;

const SKIP = (url) => {
  if (!url || url.startsWith('//')) return true;
  if (/^(?:https?|data|blob|mailto|tel|javascript):/i.test(url)) return true;
  if (url.includes('{{')) return true;
  return false;
};

const body = await readFile(shell, 'utf8');
const baseDir = dirname(shell);
let checked = 0;
const failures = [];

let m;
SRC_RE.lastIndex = 0;
while ((m = SRC_RE.exec(body)) !== null) {
  const url = m[1];
  if (SKIP(url)) continue;
  if (isAbsolute(url)) continue;
  const target = resolvePath(baseDir, url);
  try {
    const s = await stat(target);
    if (s.isDirectory()) {
      failures.push(`_shell.html: ${url} -> directorio`);
    }
  } catch {
    failures.push(`_shell.html: ${url} -> no existe (${relative(root, target)})`);
  }
  checked++;
}

if (failures.length) {
  console.log('FAIL:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

console.log(`preview-paths.test.ts: PASS — _shell.html OK (${checked} refs)`);
