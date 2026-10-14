// tests/w25-dist-single-pg.test.mjs — Guardián W25: dist debe tener 1 solo PG por demo.
//
// Por qué este test (no runtime):
//   - W25 sincroniza `dist/previews/**/*.json` con `src/components/**/*.json`.
//   - Invariante estructural: cada demo en dist debe tener UNA sola sección
//     con `controls` o `target` (la misma regla que W22 aplica a src).
//   - Esto se verifica parseando los JSON sin necesidad de dev server.
//
// Convenciones (AGENTS.md §7 / §8):
//   - Salida: `w25-dist-single-pg.test.mjs: PASS — N demos, 0 con PG duplicados`
//   - Exit 1 si hay demos con más de 1 sección con controls o target.
//
// Aceptación del brief W25:
//   1. Cada demo en `dist/previews/**/*.json` tiene máximo 1 sección con
//      `controls` o `target`.
//   2. La regla es paralela a W22 pero apunta a dist (build artefact).

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const DIST_ROOT = join(root, 'dist', 'previews');

async function walk(dir, results = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, results);
    else if (e.isFile() && e.name.endsWith('.json')) results.push(p);
  }
  return results;
}

function blockIsPG(block) {
  if (!block) return false;
  if (Array.isArray(block.controls) && block.controls.length > 0) return true;
  if (typeof block.target === 'string' && block.target.length > 0) return true;
  return false;
}

const all = await walk(DIST_ROOT);
const violations = [];
let totalDemos = 0;

for (const path of all) {
  let def;
  try { def = JSON.parse(await readFile(path, 'utf8')); } catch { continue; }
  if (!def || !Array.isArray(def.sections)) continue;
  totalDemos++;

  const pgInfo = def.sections
    .map((s, i) => ({ idx: i, id: s ? s.id || '?' : '?', isPG: s && Array.isArray(s.blocks) && s.blocks.some(blockIsPG) }))
    .filter((x) => x.isPG);

  if (pgInfo.length > 1) {
    violations.push({
      tag: def.tag || '?',
      path: path.replace(root + '\\', ''),
      count: pgInfo.length,
      ids: pgInfo.map((p) => `${p.id}@${p.idx}`),
    });
  }
}

assert.equal(
  violations.length,
  0,
  `W25: hay ${violations.length} demos en dist con PG duplicado:\n` +
    violations.map((v) => `  - ${v.tag} [${v.path}]: ${v.count} PG(s) [${v.ids.join(', ')}]`).join('\n'),
);

console.log(`w25-dist-single-pg.test.mjs: PASS — ${totalDemos} demos en dist, 0 con PG duplicado`);
process.exit(0);
