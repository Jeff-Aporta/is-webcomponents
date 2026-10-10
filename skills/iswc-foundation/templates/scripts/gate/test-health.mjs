// test-health.mjs — pruebas de salud: TODO `tests/` menos `tests/e2e` (eso lo corre test:e2e).
// Sistema comun del kit: recorre la carpeta, toma solo los *.test.ts, importa la lista que cada uno
// exporta por defecto (`definirPruebas`) y corre las pruebas UNA POR UNA, con cooldown (x600: un
// verde reciente no se repite; un rojo corre siempre). Un id repetido entre archivos aborta la corrida.
//   deno task test:health [--solo=a,b] [--categoria=what|how] [--sin-cooldown]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { codigoSalida, correrCarpeta, opcionesDeArgv, resumirReporte } from '../../src/vendor/iswc-root/tools/ISPruebas.ts';

const raiz = Deno.cwd();
// Cada archivo en su proceso: varios instalan DOM, localStorage o fetch globales.
const reporte = await correrCarpeta({
  carpeta: join(raiz, 'tests'),
  excluir: ['e2e'],
  raiz,
  aislar: { comando: [Deno.execPath(), 'run', '-A', '--no-check'] },
  ...opcionesDeArgv(),
});
console.log(resumirReporte(reporte));
mkdirSync(join(raiz, '.tmp'), { recursive: true });
writeFileSync(join(raiz, '.tmp', 'test-health.json'), JSON.stringify(reporte, null, 2));
Deno.exit(codigoSalida(reporte));
