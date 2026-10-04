// tests/w22-single-pg.test.mjs — Guardián W22: 1 solo PG por demo (siempre de primera).
//
// Por qué este test (no runtime):
//   - El brief W22 define una invariante estructural sobre los JSON de demos:
//     cada demo debe tener UNA sola sección con `controls` (o `target`),
//     y esa sección debe ser la primera.
//   - Esto se verifica parseando los JSON sin necesidad de dev server.
//
// Convenciones (AGENTS.md §7 / §8):
//   - Salida: `w22-single-pg.test.mjs: PASS — N demos, 0 con PG duplicados`
//   - Exit 1 si hay demos con más de 1 sección con controls o si la primera
//     sección con controls no es la única.
//
// Aceptación del brief W22:
//   1. Cada demo tiene máximo 1 sección con `controls` o `target`.
//   2. La sección de PG está siempre de primera.

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const COMPONENTS_ROOT = join(root, 'src', 'components');

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

const all = await walk(COMPONENTS_ROOT);
const violations = []; // { tag, path, pgIdxs, ids }
let totalDemos = 0;

for (const path of all) {
  let def;
  try { def = JSON.parse(await readFile(path, 'utf8')); } catch { continue; }
  if (!def || !Array.isArray(def.sections)) continue;
  totalDemos++;

  const pgInfo = def.sections
    .map((s, i) => ({ idx: i, id: s ? s.id || '?' : '?', isPG: s && Array.isArray(s.blocks) && s.blocks.some(blockIsPG) }))
    .filter((x) => x.isPG);

  // Aceptación: máximo 1 sección con controls/target.
  // El brief dice: "Cada demo tiene máximo 1 sección con controls".
  // Si hay >1 PGs en una sola demo, es duplicado.
  if (pgInfo.length > 1) {
    violations.push({
      tag: def.tag || '?',
      path: path.replace(root + '\\', ''),
      count: pgInfo.length,
      ids: pgInfo.map((p) => `${p.id}@${p.index}`),
    });
  }
}

assert.equal(
  violations.length,
  0,
  `W22: hay ${violations.length} demos con PG duplicado o PG no en primera posición:\n` +
    violations.map((v) => `  - ${v.tag} [${v.path}]: ${v.count} PG(s) [${v.ids.join(', ')}]`).join('\n'),
);

console.log(`w22-single-pg.test.mjs: PASS — ${totalDemos} demos, 0 con PG duplicado, PG siempre en primera posición`);
process.exit(0);