/**
 * run.ts — runner e2e (`deno task test:e2e`): asegura el servidor, fija `E2E_BASE_URL` y corre
 * `tests/e2e/*.test.ts` con el sistema común de pruebas del kit (una por una, cooldown, cada archivo
 * en su proceso: comparten navegador y almacenamiento, en paralelo se pisan).
 *   E2E_FILES=a,b      solo los archivos cuyo nombre contenga alguna subcadena
 *   E2E_HEADLESS=false navegador visible
 * Sin archivos e2e todavía: verde con total 0 (la app recién creada no trae pruebas).
 */
import { join } from 'node:path';
import { archivosDePrueba, codigoSalida, correrPruebas, opcionesDeArgv, resumirReporte } from '../../../src/vendor/iswc-root/tools/pruebas.ts';
import { asegurarServidor } from './servidor.ts';

const raiz = Deno.cwd();
const filtro = (Deno.env.get('E2E_FILES') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const archivos = archivosDePrueba(join(raiz, 'tests', 'e2e')).filter((f) => !filtro.length || filtro.some((s) => f.includes(s)));

const servidor = await asegurarServidor(raiz);
Deno.env.set('E2E_BASE_URL', servidor.base);
let codigo = 1;
try {
  const reporte = await correrPruebas({ archivos, raiz, aislar: { comando: [Deno.execPath(), 'run', '-A', '--no-check'] }, ...opcionesDeArgv() });
  console.log(resumirReporte(reporte));
  codigo = codigoSalida(reporte);
} finally {
  await servidor.apagar();
}
Deno.exit(codigo);
