// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/vendor-distributions/README.md
/**
 * index.ts — barrel de `vendor-distributions/`: todo lo que un consumidor (ISS, ISW…) trae del kit
 * por vendor strategy, agrupado por paquete:
 *
 *   lib/      obj (operaciones sobre objetos JSON y referencias), zod (bundle único del CDN)
 *   testing/  pruebas, pruebas-hijo, test-cooldown, test-queue, deno-test, stagehand
 *   tools/    vendor, pin-update, sync-entregable, render-diagram, render-lab, download-iconify…
 *
 * Vendor: cada archivo se baja por separado (`dist/cdn/vendor-distributions/<paquete>/<archivo>`)
 * con `tools/vendor.ts`; este barrel sirve dentro del kit (labs) y a quien vendorice las tres
 * carpetas completas conservando la estructura.
 *
 *   import { renderDiagramBatch, writeDiagramOutputs, definirPruebas } from './index.ts';
 *
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/vendor-distributions/README.md
 */
export {
  renderDiagram,
  renderDiagramBatch,
  writeDiagramOutputs,
  buildHostHtml,
  resolveCdnScript,
  DIAGRAM_HOSTS,
  probeSvgExpression,
  sanitizeSvgRoot,
  staticSvgWrapper,
  startStaticServer,
} from './tools/render-diagram.js';

export { jobDeEditable, jobsDeEditables, labDir, renderLab } from './tools/render-lab.js';
export type { Editable, LabJob, OpcionesEditables, OpcionesLab } from './tools/render-lab.js';

export type {
  HostAttrs,
  RenderDiagramOptions,
  RenderDiagramResult,
  SyntheticDiagramJob,
  PageDiagramJob,
  StaticServer,
} from './tools/render-diagram.js';

export {
  cooldownMs,
  createTestCooldown,
  formatMs,
  testCooldownFromEnv,
  testId,
} from './testing/test-cooldown.js';

export type {
  TestCooldown,
  TestCooldownCheck,
  TestCooldownEntry,
  TestCooldownOptions,
  TestCooldownRun,
} from './testing/test-cooldown.js';

export { runQueue, TEST_CONCURRENCY, testConcurrency } from './testing/test-queue.js';

export { denoTest, readDenoJunit } from './testing/deno-test.js';
export type { DenoTestOptions } from './testing/deno-test.js';

export { archivosDePrueba, codigoSalida, coleccionPruebas, correrCarpeta, correrPruebas, definirPruebas, esSaltada, lineaReporte, opcionesDeArgv, pruebasDe, resumirReporte } from './testing/pruebas.js';
export type { TPrueba } from './testing/pruebas.js';
export type { CategoriaPrueba, CtxPrueba, HooksPruebas, ListaPruebas, NivelPrueba, OpcionesCarpeta, OpcionesCorrida, OpcionesPrueba, Prueba, ReportePruebas, ResultadoPrueba } from './testing/pruebas.js';

export {
  barrerProveedores,
  crearGenerador,
  destinoPreferido,
  elegirProveedor,
  evaluarSondaLlm,
  leerProveedoresDeArchivo,
  normalizarJson,
  prepararStagehand,
  resolverDestino,
  sondearProveedor,
  unaVezPorProceso,
  validarProveedores,
} from './testing/stagehand.js';
export type { ContextoDestino, ContextoStagehand, ControlGenerador, DestinoPruebas, EleccionProveedor, GeneradorStagehand, ProveedorLlm, SondaDestino, SondaLlm } from './testing/stagehand.js';

export { checkpointGit, codigoSync, coincideGlob, correrSync, modoDeArgv } from './tools/sync-entregable.js';
export type { AccionSync, CambioSync, CheckpointSync, ConfigSync, CtxSync, EntradaSync, GateSync, ModoSync, ResumenEntrada, ResumenSync } from './tools/sync-entregable.js';

export { vendorizar, importsFaltantes } from './tools/vendor.js';
export type { TArchivoVendor, TConfigVendor, TResultadoVendor } from './tools/vendor.js';

export { Obj, ObjError, resolverUrl } from './lib/obj.js';
