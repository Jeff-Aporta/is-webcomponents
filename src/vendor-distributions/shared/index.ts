// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/vendor-distributions/README.md
/**
 * index.ts — barrel del perfil `shared/`: lo que sirve igual a un proyecto server (ISS) y a uno client
 * (ISW), sin navegador: obj, pruebas, cooldown, cola, deno-test, proveedores LLM, jueces, vendor, sync.
 *
 *   lib/      obj (operaciones sobre objetos JSON y referencias), zod (bundle único del CDN)
 *   testing/  pruebas, pruebas-hijo, test-cooldown, test-queue, deno-test, proveedores-llm, jueces
 *   tools/    vendor, pin-update, sync-entregable
 *
 * Regla de perfiles: nada de `shared/` importa de `client/` ni de `server/`, ni dependencias de
 * navegador (guardián `src/utils/health/meta/vendor-perfiles.test.ts`).
 *
 * Perfil: shared. Vendor: cada archivo se baja por separado (`dist/cdn/vendor-distributions/shared/<paquete>/<archivo>`)
 * con `tools/vendor.ts`; este barrel sirve dentro del kit y a quien vendorice `shared/` completo
 * conservando la estructura.
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/vendor-distributions/README.md
 */
export { cooldownMs, createTestCooldown, formatMs, testCooldownFromEnv, testId } from './testing/test-cooldown.ts';
export type { TestCooldown, TestCooldownCheck, TestCooldownEntry, TestCooldownOptions, TestCooldownRun } from './testing/test-cooldown.ts';

export { runQueue, TEST_CONCURRENCY, testConcurrency } from './testing/test-queue.ts';

export { denoTest, readDenoJunit } from './testing/deno-test.ts';
export type { DenoTestOptions } from './testing/deno-test.ts';

export { archivosDePrueba, codigoSalida, coleccionPruebas, correrCarpeta, correrPruebas, definirPruebas, esSaltada, lineaReporte, opcionesDeArgv, pruebasDe, resumirReporte } from './testing/pruebas.ts';
export type { TPrueba } from './testing/pruebas.ts';
export type { CategoriaPrueba, CtxPrueba, HooksPruebas, ListaPruebas, NivelPrueba, OpcionesCarpeta, OpcionesCorrida, OpcionesPrueba, Prueba, ReportePruebas, ResultadoPrueba } from './testing/pruebas.ts';

export {
  barrerProveedores,
  CACHE_TTL_MS,
  elegirProveedor,
  elegirProveedorOpcional,
  evaluarSondaLlm,
  leerProveedoresDeArchivo,
  normalizarJson,
  sondearProveedor,
  validarProveedores,
} from './testing/proveedores-llm.ts';
export type { EleccionProveedor, ProveedorLlm, SondaLlm } from './testing/proveedores-llm.ts';

export { capaOpcional, exigirJuez, juzgarConLlm, preguntarJev, SaltoJuez, UMBRAL_DUDA, UMBRAL_RECHAZO, veredictoProbabilidad } from './testing/jueces.ts';

export { checkpointGit, codigoSync, coincideGlob, correrSync, modoDeArgv } from './tools/sync-entregable.ts';
export type { AccionSync, CambioSync, CheckpointSync, ConfigSync, CtxSync, EntradaSync, GateSync, ModoSync, ResumenEntrada, ResumenSync } from './tools/sync-entregable.ts';

export { dependenciasDeNavegador, importsFaltantes, PERFILES, perfilDeRuta, vendorizar } from './tools/vendor.ts';
export type { TArchivoVendor, TConfigVendor, TPerfil, TPerfilVendor, TResultadoVendor } from './tools/vendor.ts';

export { Obj, ObjError, resolverUrl } from './lib/obj.ts';
