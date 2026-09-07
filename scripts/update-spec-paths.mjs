#!/usr/bin/env node
/**
 * scripts/update-spec-paths.mjs
 *
 * TAREA 9 (continuación): actualiza los specs y guardianes que quedaron con
 * paths stale post-TAREA 3 (tests/ → src/utils/health/<sub>/) y TAREA 5
 * (src/manifest.js → src/manifest.ts).
 *
 * Mapeo de tests/ → src/utils/health/<sub>/ derivado del estado real del repo.
 *
 * Uso: node scripts/update-spec-paths.mjs [--dry-run]
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const health = join(root, 'src', 'utils', 'health');
const dryRun = process.argv.includes('--dry-run');

// Construir mapeo: basename → 'src/utils/health/<sub>/<basename>'
const mapping = new Map();
for (const sub of ['meta', 'diagrams', 'domain', 'e2e']) {
  const dir = join(health, sub);
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir)) {
    if (name.endsWith('.test.ts') || name.endsWith('.test.mjs')) {
      mapping.set(name, `src/utils/health/${sub}/${name}`);
    }
  }
}
console.log(`mapeo: ${mapping.size} archivos de test`);

// Archivos a tocar: specs/**/*.md + tests meta/*.ts (los guardianes).
const targets = [];
function walk(dir, ext, list) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, list);
    else if (e.name.endsWith(ext)) list.push(p);
  }
}
walk(join(root, 'specs'), '.md', targets);
walk(join(root, 'src', 'utils', 'health', 'meta'), '.ts', targets);

let changed = 0;
const changes = [];
for (const file of targets) {
  let text = readFileSync(file, 'utf8');
  let before = text;

  // 1) src/manifest.js → src/manifest.ts (en links y código)
  text = text.replace(/\bsrc\/manifest\.js\b/g, 'src/manifest.ts');
  // 2) `tests/<X>.test.ts` → `src/utils/health/<sub>/<X>.test.ts`
  text = text.replace(/`tests\/([a-z0-9-]+\.test\.[a-z]+)`/g, (m, name) => {
    const mapped = mapping.get(name);
    return mapped ? `\`${mapped}\`` : m;
  });
  // 3) ../../tests/<X>.test.ts (links relativos) → ../../src/utils/health/<sub>/<X>.test.ts
  text = text.replace(/\.\.\/\.\.\/tests\/([a-z0-9-]+\.test\.[a-z]+)/g, (m, name) => {
    const mapped = mapping.get(name);
    return mapped ? `../../${mapped}` : m;
  });
  // 4) ../tests/<X>.test.ts (links relativos) → ../src/utils/health/<sub>/<X>.test.ts
  text = text.replace(/\.\.\/tests\/([a-z0-9-]+\.test\.[a-z]+)/g, (m, name) => {
    const mapped = mapping.get(name);
    return mapped ? `../${mapped}` : m;
  });

  if (text !== before) {
    changed++;
    changes.push(file);
    if (!dryRun) writeFileSync(file, text, 'utf8');
  }
}

console.log(`archivos modificados: ${changed}`);
for (const c of changes) console.log(`  ${c.replace(root + '\\', '')}`);
if (dryRun) console.log('(dry-run: no se escribió nada)');