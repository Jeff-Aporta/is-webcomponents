// run.ts — `deno task test`: corre tests/ con el sistema común del kit (el mismo de ISS e ISW):
// definirPruebas, categoría what/how, cooldown por prueba (`.tmp/test-cooldown.json`) y cada
// archivo en su propio proceso. `tests/e2e/` (navegador real con Stagehand) va aparte:
// `deno task test:e2e`.
//
//   deno task test                          # con cooldown
//   deno task test -- --sin-cooldown        # todo
//   deno task test -- --categoria=what      # solo caja negra
//   deno task test -- --solo=hash,vendor    # por id
//
// category: "how"
import { join } from 'node:path';
import process from 'node:process';
import { codigoSalida, correrCarpeta, opcionesDeArgv, resumirReporte } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const raiz = join(import.meta.dirname ?? '.', '..', '..');
const reporte = await correrCarpeta({
  carpeta: join(raiz, 'tests'),
  excluir: ['e2e', '_shared'],
  raiz,
  aislar: { comando: [Deno.execPath(), 'run', '-A', '--no-check'] },
  ...opcionesDeArgv(),
});
console.log(resumirReporte(reporte));
process.exit(codigoSalida(reporte));
