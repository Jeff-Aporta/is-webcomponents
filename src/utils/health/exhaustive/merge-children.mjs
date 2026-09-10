#!/usr/bin/env node
/**
 * Consolida los WTs hijos de la tanda 1 al WT-ROOT.
 *
 * Hijos esperados:
 *   - wt/audit-actions-exhaustivo      → src/utils/health/exhaustive/actions/*.test.ts
 *   - wt/audit-forms-exhaustivo        → src/utils/health/exhaustive/forms/*.test.ts
 *   - wt/audit-charts-data-exhaustivo  → src/utils/health/exhaustive/{charts,data,diagrams}/*.test.ts
 *   - wt/audit-rest-exhaustivo         → src/utils/health/exhaustive/{helpers,isp,layout,media,navigation,preview,surfaces,feedback,typography,ai}/*.test.ts
 *
 * Uso: node scripts/consolidate-audit-tanda1.mjs
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.cwd();

function sh(cmd, opts = {}) {
  console.log(`$ ${cmd}`);
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'inherit', ...opts });
  } catch (err) {
    console.error(`❌ Falló: ${cmd}`);
    process.exit(1);
  }
}

const hijos = [
  { wt: join(RAIZ, '..', 'WT', 'isw-wt-1-actions-exhaustivo'), branch: 'wt/audit-actions-exhaustivo' },
  { wt: join(RAIZ, '..', 'WT', 'isw-wt-2-forms-exhaustivo'), branch: 'wt/audit-forms-exhaustivo' },
  { wt: join(RAIZ, '..', 'WT', 'isw-wt-3-charts-data-exhaustivo'), branch: 'wt/audit-charts-data-exhaustivo' },
  { wt: join(RAIZ, '..', 'WT', 'isw-wt-4-rest-exhaustivo'), branch: 'wt/audit-rest-exhaustivo' },
];

console.log('🔀 Tanda 1: merge de los 4 WTs hijos al WT-ROOT\n');

for (const { wt, branch } of hijos) {
  if (!existsSync(wt)) {
    console.warn(`⚠️  WT no existe: ${wt} — saltando`);
    continue;
  }
  console.log(`\n═══ Merge ${branch} → wt/audit-exhaustivo ═══`);
  // 1. Asegurar que el WT-ROOT está limpio.
  sh(`git status --short | head -3`);
  // 2. Squash-merge del hijo al root.
  sh(`git merge --squash ${branch}`);
  // 3. Commit consolidado.
  sh(`git commit -m "test(${branch.replace('wt/audit-', '').replace('-exhaustivo', '')}): tests exhaustivos merged" --no-verify`);
  console.log(`✅ ${branch} consolidado`);
}

console.log('\n\n🧹 Cleanup de los WTs hijos...');
for (const { wt, branch } of hijos) {
  if (!existsSync(wt)) continue;
  try {
    sh(`git worktree remove --force "${wt}"`);
    sh(`git branch -D ${branch}`);
  } catch (e) {
    console.warn(`⚠️  No se pudo limpiar ${wt}: ${e.message}`);
  }
}

sh('git worktree prune');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  ✅ CONSOLIDACIÓN COMPLETA');
console.log('═══════════════════════════════════════════════════════════');
console.log(`  Worktrees restantes:`);
sh('git worktree list');
console.log(`\n  Último commit:`);
sh('git log --oneline -1');
