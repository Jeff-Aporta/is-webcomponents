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
} from './ISTestCooldown.js';

export type {
  TestCooldown,
  TestCooldownCheck,
  TestCooldownEntry,
  TestCooldownOptions,
  TestCooldownRun,
} from './ISTestCooldown.js';

export { runQueue, TEST_CONCURRENCY, testConcurrency } from './ISTestQueue.js';

export { denoTest, readDenoJunit } from './ISDenoTest.js';
export type { DenoTestOptions } from './ISDenoTest.js';

export { archivosDePrueba, codigoSalida, coleccionPruebas, correrCarpeta, correrPruebas, definirPruebas, esSaltada, lineaReporte, opcionesDeArgv, pruebasDe, resumirReporte } from './ISPruebas.js';
export type { TPrueba } from './ISPruebas.js';
export type { CategoriaPrueba, CtxPrueba, HooksPruebas, ListaPruebas, NivelPrueba, OpcionesCarpeta, OpcionesCorrida, OpcionesPrueba, Prueba, ReportePruebas, ResultadoPrueba } from './ISPruebas.js';

export { checkpointGit, codigoSync, coincideGlob, correrSync, modoDeArgv } from './ISSyncEntregable.js';
export type { AccionSync, CambioSync, CheckpointSync, ConfigSync, CtxSync, EntradaSync, GateSync, ModoSync, ResumenEntrada, ResumenSync } from './ISSyncEntregable.js';
