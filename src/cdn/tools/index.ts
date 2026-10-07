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
