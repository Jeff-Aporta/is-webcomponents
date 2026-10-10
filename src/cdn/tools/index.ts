/**
 * Barrel vendor: dist/cdn/tools/
 *
 *   import {
 *     renderDiagram,
 *     renderDiagramBatch,
 *     writeDiagramOutputs,
 *     buildHostHtml,
 *     startStaticServer,
 *     sanitizeSvgRoot,
 *     DIAGRAM_HOSTS,
 *   } from './index.ts';
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
} from './render-diagram.js';

export type {
  HostAttrs,
  RenderDiagramOptions,
  RenderDiagramResult,
  SyntheticDiagramJob,
  PageDiagramJob,
  StaticServer,
} from './render-diagram.js';

export {
  cooldownMs,
  createTestCooldown,
  formatMs,
  testCooldownFromEnv,
  testId,
} from './test-cooldown.js';

export type {
  TestCooldown,
  TestCooldownCheck,
  TestCooldownEntry,
  TestCooldownOptions,
  TestCooldownRun,
} from './test-cooldown.js';

export { runQueue, TEST_CONCURRENCY, testConcurrency } from './test-queue.js';

export { denoTest, readDenoJunit } from './deno-test.js';
export type { DenoTestOptions } from './deno-test.js';

export { archivosDePrueba, codigoSalida, coleccionPruebas, correrCarpeta, correrPruebas, definirPruebas, esSaltada, lineaReporte, opcionesDeArgv, pruebasDe, resumirReporte } from './pruebas.js';
export type { TPrueba } from './pruebas.js';
export type { CategoriaPrueba, CtxPrueba, HooksPruebas, ListaPruebas, NivelPrueba, OpcionesCarpeta, OpcionesCorrida, OpcionesPrueba, Prueba, ReportePruebas, ResultadoPrueba } from './pruebas.js';

export { checkpointGit, codigoSync, coincideGlob, correrSync, modoDeArgv } from './sync-entregable.js';
export type { AccionSync, CambioSync, CheckpointSync, ConfigSync, CtxSync, EntradaSync, GateSync, ModoSync, ResumenEntrada, ResumenSync } from './sync-entregable.js';
