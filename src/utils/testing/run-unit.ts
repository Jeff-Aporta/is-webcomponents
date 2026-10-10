// run-unit.ts — `deno task test`: tests unitarios de iswc con el runner
// estándar (cola de 3 + cooldown, src/cdn/tools/ISDenoTest.ts).
//
//   deno task test                    # con cooldown
//   deno task test -- --sin-cooldown  # todo
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { denoTest } from '../../cdn/tools/ISDenoTest.ts';

const RAICES = [
  'src/utils/health/meta',
  'src/utils/health/diagrams',
  'src/utils/health/audit',
  'src/utils/testing/domain/load-plan.test.ts',
];

function listar(p: string, out: string[]): void {
  if (statSync(p).isFile()) {
    if (/\.test\.ts$/.test(p)) out.push(p);
    return;
  }
  for (const n of readdirSync(p)) listar(join(p, n), out);
}

const archivos: string[] = [];
for (const r of RAICES) listar(r, archivos);
process.exit(await denoTest(archivos.sort(), { args: ['-A', '--no-check'] }));
