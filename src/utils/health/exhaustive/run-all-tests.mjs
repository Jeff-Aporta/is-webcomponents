#!/usr/bin/env -S deno run -A --no-check
/**
 * Runner exhaustivo: corre los tests de `src/utils/health/exhaustive/<categoría>/` con el runner estándar
 * (cola de 3 + cooldown, src/vendor-distributions/shared/testing/deno-test.ts). Úsalo tras mergear los WTs
 * hijos para verificar que la suite completa pasa.
 *
 *   deno run -A --no-check src/utils/health/exhaustive/run-all-tests.mjs                 # con cooldown
 *   deno run -A --no-check src/utils/health/exhaustive/run-all-tests.mjs --sin-cooldown  # todo
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { denoTest } from '../../../vendor-distributions/shared/testing/deno-test.ts';

const DIR = join(process.cwd(), 'src/utils/health/exhaustive');
if (!existsSync(DIR)) {
  console.error(`No existe ${DIR}: corre desde la raíz del kit.`);
  process.exit(1);
}

const archivos = [];
for (const cat of readdirSync(DIR)) {
  const p = join(DIR, cat);
  if (cat.startsWith('_') || !statSync(p).isDirectory()) continue;
  for (const f of readdirSync(p)) if (f.endsWith('.test.ts')) archivos.push(join(p, f));
}
console.log(`[exhaustive] ${archivos.length} archivos de test`);
process.exit(await denoTest(archivos.sort(), { args: ['-A', '--no-check'] }));
