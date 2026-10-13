// @vendor 2026-10-13T15:02:33.985Z Jeff-Aporta/is-webcomponents@main dist/cdn/vendor-distributions/shared/index.ts
// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/vendor-distributions/README.md
/**
 * index.ts — barrel del perfil `shared/`: lo que sirve igual a un proyecto server (ISS) y a uno client
 * (ISW), sin navegador: obj, pruebas, cooldown + cola, deno-test, proveedores LLM, jueces, semántica, vendor, sync.
 *
 *   schemas.ts  TODOS los contratos, por secciones (`vendor.ts` lo poda a lo que cada consumidor usa)
 *   lib/        obj (operaciones sobre objetos JSON y referencias), zod (bundle único del CDN)
 *   testing/    pruebas (con su modo hijo `--hijo`), test-cooldown (con la cola estándar), deno-test, proveedores-llm, jueces, semantica
 *   tools/      vendor (con el protocolo de pines), pin-update, sync-entregable
 *
 * Regla de perfiles: nada de `shared/` importa de `client/` ni de `server/`, ni dependencias de
 * navegador (guardián `src/utils/health/meta/vendor-perfiles.test.ts`).
 *
 * Perfil: shared. Vendor: cada archivo se baja por separado (`dist/cdn/vendor-distributions/shared/<paquete>/<archivo>`)
 * con `tools/vendor.ts`; este barrel sirve dentro del kit y a quien vendorice `shared/` completo
 * conservando la estructura.
 * Skill: skills/iswc-foundation/SKILL.md
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/vendor-distributions/README.md
 */
export { cooldownMs, createTestCooldown, formatMs, runQueue, TEST_CONCURRENCY, testConcurrency, testCooldownFromEnv, testId } from './testing/test-cooldown.ts';
export type { OpcionesCola, TestCooldown, TestCooldownCheck, TestCooldownEntry, TestCooldownOptions, TestCooldownRun } from './testing/test-cooldown.ts';

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

export { coincide, coseno, embed, MARGEN_PREFIERE, masCercana, MODELO, MOTIVO_SIN_MODELO, prefiere, semanticaDisponible, similitud, ubicacionModelo, UMBRAL_COINCIDE } from './testing/semantica.ts';
export type { ExtractorSemantico, ResultadoCoincide, ResultadoMasCercana, ResultadoPrefiere, UbicacionModelo } from './testing/semantica.ts';

export { checkpointGit, codigoSync, coincideGlob, correrSync, modoDeArgv } from './tools/sync-entregable.ts';
export type { AccionSync, CambioSync, CheckpointSync, ConfigSync, CtxSync, EntradaSync, GateSync, ModoSync, ResumenEntrada, ResumenSync } from './tools/sync-entregable.ts';

export { dependenciasDeNavegador, importsFaltantes, PERFILES, perfilDeRuta, podarSchemas, protocoloPines, seccionesDeSchemas, vendorizar } from './tools/vendor.ts';
export type { TArchivoVendor, TConfigVendor, TPerfil, TPerfilVendor, TPinVendor, TResultadoVendor } from './tools/vendor.ts';

export { Obj, ObjError, resolverUrl } from './lib/obj.ts';
