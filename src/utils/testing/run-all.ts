// run-all.ts — suites de `src/utils/testing/` (meta, domain, diagrams y smokes sueltos) con el runner estándar
// (cola de 3 + cooldown, src/vendor-distributions/shared/testing/deno-test.ts). `e2e/` tiene su propio runner
// (`deno task test:e2e`, también con cooldown).
//
//   deno run -A --no-check src/utils/testing/run-all.ts                  # con cooldown, sin servidor
//   PORT=8391 deno run -A --no-check src/utils/testing/run-all.ts        # incluye los que piden servidor
//   deno run -A --no-check src/utils/testing/run-all.ts --sin-cooldown   # todo
import { readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { denoTest } from '../../vendor-distributions/shared/testing/deno-test.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));
/** Necesitan `deno task dev` arriba (PORT=8391). */
const CON_SERVIDOR = new Set(['meta/cdn-icons.test.ts']);
const conServidor = process.env.PORT != null;

function listar(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (n !== 'e2e') listar(p, out); continue; }
    if (n.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

const archivos = listar(AQUI).filter((p) => conServidor || !CON_SERVIDOR.has(relative(AQUI, p).replaceAll('\\', '/'))).sort();
console.log(`[run-all] ${archivos.length} suites${conServidor ? ' (con servidor)' : ' (sin servidor)'}`);
process.exit(await denoTest(archivos, { args: ['-A', '--no-check'] }));
