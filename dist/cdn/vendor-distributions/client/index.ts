// @vendor 2026-10-13T13:43:10.250Z Jeff-Aporta/is-webcomponents@local dist/cdn/vendor-distributions/client/index.ts
// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/vendor-distributions/README.md
/**
 * index.ts — barrel del perfil `client/`: lo que solo un proyecto client (front, e2e de navegador,
 * render visual) necesita: render headless de diagramas (Playwright lo inyecta el consumidor), labs,
 * íconos de la app y el controlador de Stagehand.
 *
 *   testing/  stagehand (generador para `Stagehand.create`, destino por protocolo, `prepararStagehand`)
 *   (contratos: secciones `stagehand`, `render-*`, `download-iconify`, `static-server` de `../shared/schemas.ts`)
 *   tools/    render-diagram, render-lab, render-lote (lote con caché por hash), hosts, sanitize-svg, static-server, download-iconify
 *
 * Regla de perfiles: `client/` puede importar de `shared/`, nunca de `server/`. Lo neutro (pruebas,
 * proveedores LLM, jueces, obj…) se importa de `../shared/index.ts`, no se reexporta aquí.
 *
 *   import { renderDiagramBatch, writeDiagramOutputs } from './index.ts';
 *
 * Perfil: client. Vendor: cada archivo se baja por separado (`dist/cdn/vendor-distributions/client/<paquete>/<archivo>`)
 * con `tools/vendor.ts` (perfil `client` en el vendor.json); este barrel sirve dentro del kit (labs).
 * Skill: skills/iswc-foundation/SKILL.md
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
} from './tools/render-diagram.ts';
export type {
  HostAttrs,
  RenderDiagramOptions,
  RenderDiagramResult,
  SyntheticDiagramJob,
  PageDiagramJob,
  StaticServer,
} from './tools/render-diagram.ts';

export { jobDeEditable, jobsDeEditables, labDir, renderLab } from './tools/render-lab.ts';
export type { Editable, LabJob, OpcionesEditables, OpcionesLab } from './tools/render-lab.ts';

export { anotarCache, CACHE_NOMBRE, leerCache, pinDelKit, planificarLote, renderizarLote, renderizarUno, rutaCache, VERSION as RENDER_LOTE_VERSION } from './tools/render-lote.ts';
export type { CacheLote, DiagramaPlan, EditableLote, EntradaCache, OpcionesLote, PlanLote, ResultadoLote } from './tools/render-lote.ts';

export { descargarIconos, mapaDelKit } from './tools/download-iconify.ts';
export type { OpcionesDescarga, ResumenDescarga } from './tools/download-iconify.ts';

export { aPartesOpenAi, crearGenerador, destinoPreferido, mensajesDe, prepararStagehand, resolverDestino, unaVezPorProceso } from './testing/stagehand.ts';
export type { ContextoDestino, ContextoStagehand, ControlGenerador, DestinoPruebas, GeneradorStagehand, SondaDestino } from './testing/stagehand.ts';
