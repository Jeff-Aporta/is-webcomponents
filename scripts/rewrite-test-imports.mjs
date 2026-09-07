#!/usr/bin/env node
/**
 * scripts/rewrite-test-imports.mjs
 *
 * Re-escribe imports y paths en tests movidos de tests/ → src/utils/health/<cat>/.
 *
 * Reglas:
 *   '../src/<rest>'        →  '../../../<rest>'        (subir 3 niveles)
 *   '../scripts/<rest>'    →  '../../../../scripts/<rest>' (subir 4 niveles)
 *
 * Cálculo de root/raiz/ROOT/here/__dirname:
 *   Old: tests/foo.test.ts — 2 niveles arriba de fileURLToPath = root
 *   New: src/utils/health/<cat>/foo.test.ts — 5 niveles arriba de fileURLToPath = root
 *
 * Uso: node scripts/rewrite-test-imports.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const health = join(root, 'src', 'utils', 'health');

let changed = 0;
let skipped = 0;

function rewrite(content) {
  let out = content;
  // Imports: '../src/X' -> '../../../X'
  out = out.replace(/(['"])\.\.\/src\//g, '$1../../../');
  // Imports: '../scripts/X' -> '../../../../scripts/X' (raíz del repo)
  out = out.replace(/(['"])\.\.\/scripts\//g, '$1../../../../scripts/');

  // Cálculo de root desde here (1 dirname): ahora necesita 4 dirnames
  out = out.replace(/const root = dirname\(here\);/g, 'const root = dirname(dirname(dirname(dirname(here))));');
  out = out.replace(/const root = dirname\(dirname\(here\)\);/g, 'const root = dirname(dirname(dirname(dirname(here))));');
  out = out.replace(/const root = dirname\(dirname\(dirname\(here\)\)\);/g, 'const root = dirname(dirname(dirname(dirname(here))));');
  // join(..., '..') con 1 '..' → 4 '..' arriba
  out = out.replace(/const root = join\(dirname\(fileURLToPath\(import\.meta\.url\)\), '\.\.'\);/g, "const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');");
  // Variantes con raiz/ROOT
  out = out.replace(/const raiz = join\(dirname\(fileURLToPath\(import\.meta\.url\)\), '\.\.'\);/g, "const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');");
  out = out.replace(/const ROOT = join\(dirname\(fileURLToPath\(import\.meta\.url\)\), '\.\.'\);/g, "const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');");
  // __dirname (legacy): añadir 3 '..'
  out = out.replace(/const __dirname = dirname\(fileURLToPath\(import\.meta\.url\)\);/g, 'const __dirname = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");');
  // fileURLToPath directo: 1 o 2 dirnames → 5
  out = out.replace(/const root = dirname\(fileURLToPath\(import\.meta\.url\)\);/g, 'const root = dirname(dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url))))));');
  out = out.replace(/const root = dirname\(dirname\(fileURLToPath\(import\.meta\.url\)\)\);/g, 'const root = dirname(dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url))))));');
  out = out.replace(/const root = dirname\(dirname\(dirname\(fileURLToPath\(import\.meta\.url\)\)\)\);/g, 'const root = dirname(dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url))))));');
  out = out.replace(/const root = dirname\(dirname\(dirname\(dirname\(fileURLToPath\(import\.meta\.url\)\)\)\)\);/g, 'const root = dirname(dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url))))));');
  return out;
}

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.mjs')) {
      const before = readFileSync(full, 'utf8');
      const after = rewrite(before);
      if (after !== before) {
        writeFileSync(full, after, 'utf8');
        changed++;
      } else {
        skipped++;
      }
    }
  }
}

walk(health);
console.log(`reescritos: ${changed}`);
console.log(`sin cambios: ${skipped}`);