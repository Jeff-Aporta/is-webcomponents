// @contexto INDICE.md · src/components/diagrams/README.md
/**
 * mindmap.ts — Zod schemas propios del componente.
 *
 * El layout (MindmapLayout, MindmapLayoutNode, MindmapLayoutEdge) vive en
 * `mindmap-spec.schemas.ts`; aquí solo lo que el componente añade por encima.
 */
import { z } from "zod";
import { MindmapLayoutNodeSchema, MindmapLayoutEdgeSchema } from "./mindmap-spec.schemas.js";
import type { DiagramRenderDetail, DiagramViewerDetail } from './diagram-base.schemas.js';

const NodeEntrySchema = z.object({
  n: MindmapLayoutNodeSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type NodeEntry = z.infer<typeof NodeEntrySchema>;

const EdgeEntrySchema = z.object({
  e: MindmapLayoutEdgeSchema,
  path: z.unknown() /* TODO: ref SVGPathElement */,
});
export type EdgeEntry = z.infer<typeof EdgeEntrySchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type MindmapEventos = { 'iswc-render': DiagramRenderDetail; 'iswc-open-viewer': DiagramViewerDetail };
