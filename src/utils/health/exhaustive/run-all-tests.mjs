#!/usr/bin/env node
/**
 * runner exhaustivo: corre TODOS los tests exhaustivos por categoría y
 * emite un reporte consolidado. Úsalo tras mergear los WTs hijos para
 * verificar que la suite completa pasa.
 *
 * Uso: node scripts/run-exhaustive-tests.mjs
 */

import { execSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.cwd();
const EXHAUSTIVE_DIR = join(RAIZ, 'src/utils/health/exhaustive');

if (!existsSync(EXHAUSTIVE_DIR)) {
  console.error(`❌ No existe ${EXHAUSTIVE_DIR}`);
  process.exit(1);
}

const categorias = readdirSync(EXHAUSTIVE_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((n) => n !== 'node_modules');

console.log(`📊 Ejecutando tests exhaustivos para ${categorias.length} categorías...`);
console.log();

const resultados = [];
for (const cat of categorias) {
  const dir = join(EXHAUSTIVE_DIR, cat);
  const tests = readdirSync(dir).filter((f) => f.endsWith('.test.ts'));
  if (tests.length === 0) {
    resultados.push({ categoria: cat, total: 0, pasando: 0, fallando: 0, errores: 0 });
    continue;
  }

  console.log(`▶ ${cat}: ${tests.length} archivos de test`);
  try {
    const out = execSync(
      `node --import ./scripts/ts-resolve-hook.ts --test "${dir}/*.test.ts"`,
      { encoding: 'utf8', stdio: 'pipe' },
    );
    // Parsear TAP output: contar "ok" y "not ok".
    const ok = (out.match(/^ok /gm) ?? []).length;
    const notOk = (out.match(/^not ok /gm) ?? []).length;
    resultados.push({ categoria: cat, total: ok + notOk, pasando: ok, fallando: notOk, errores: 0 });
    console.log(`  ✅ ${ok} pasan, ❌ ${notOk} fallan`);
  } catch (err) {
    const out = (err.stdout ?? '') + (err.stderr ?? '');
    const ok = (out.match(/^ok /gm) ?? []).length;
    const notOk = (out.match(/^not ok /gm) ?? []).length;
    resultados.push({ categoria: cat, total: ok + notOk, pasando: ok, fallando: notOk, errores: 1 });
    console.log(`  ⚠️  ${ok} pasan, ❌ ${notOk} fallan (errores de ejecución)`);
  }
}

console.log();
console.log('═══════════════════════════════════════════════════════════');
console.log('  RESUMEN FINAL — TESTS EXHAUSTIVOS');
console.log('═══════════════════════════════════════════════════════════');
let totPasan = 0, totFallan = 0;
for (const r of resultados) {
  console.log(`  ${r.categoria.padEnd(15)} ${String(r.total).padStart(4)} total  ${String(r.pasando).padStart(4)} ✅  ${String(r.fallando).padStart(4)} ❌`);
  totPasan += r.pasando;
  totFallan += r.fallando;
}
console.log('───────────────────────────────────────────────────────────');
console.log(`  ${'TOTAL'.padEnd(15)} ${String(totPasan + totFallan).padStart(4)} total  ${String(totPasan).padStart(4)} ✅  ${String(totFallan).padStart(4)} ❌`);
console.log('═══════════════════════════════════════════════════════════');

process.exit(totFallan > 0 ? 1 : 0);
