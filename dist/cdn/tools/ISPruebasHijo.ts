/**
 * Proceso hijo de `correrPruebas({ aislar })`: corre UN archivo de pruebas y
 * entrega su reporte al padre en una linea marcada. Lo lanza el kit; no se usa a mano.
 */
import process from 'node:process';
import { correrPruebas, lineaReporte } from './ISPruebas.ts';
import type { OpcionesHijo } from './ISPruebas.schemas.ts';

// Sin top-level await: el ISS carga los .ts como CommonJS (tsx).
async function main(): Promise<void> {
  const o = JSON.parse(process.argv[process.argv.length - 1]) as OpcionesHijo;
  const { archivo, ...resto } = o;
  const reporte = await correrPruebas({ ...resto, archivos: [archivo] });
  console.log(lineaReporte(reporte));
}

// Las pruebas pueden dejar timers o sockets vivos: el hijo termina al entregar.
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
