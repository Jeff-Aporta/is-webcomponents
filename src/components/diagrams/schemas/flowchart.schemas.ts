// @contexto INDICE.md · src/components/diagrams/README.md
/**
 * flowchart.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";
import type { DiagramTurtleDetail, DiagramRenderDetail, DiagramToggleDetail, DiagramViewerDetail } from './diagram-base.schemas.js';

const TurtleStateSchema = z.object({
  playing: z.boolean(),
  idx: z.number(),
  total: z.number(),
  replay: z.number(),
});
export type TurtleState = z.infer<typeof TurtleStateSchema>;

const NodeNodeEntrySchema = z.object({
  n: z.unknown() /* TODO: ref FlowLayoutNode */,
  g: z.unknown() /* TODO: ref SVGGElement */,
  box: z.unknown() /* TODO: ref SVGPathElement */,
});
export type NodeNodeEntry = z.infer<typeof NodeNodeEntrySchema>;

const EdgeNodeEntrySchema = z.object({
  e: z.unknown() /* TODO: ref FlowLayoutEdge */,
  g: z.unknown() /* TODO: ref SVGGElement */,
  path: z.unknown() /* TODO: ref SVGPathElement */,
});
export type EdgeNodeEntry = z.infer<typeof EdgeNodeEntrySchema>;

/** Tinta del texto de un nodo (iswc o clásico). */
const FlowInkSchema = z.object({
  text: z.string(),
  muted: z.string(),
  font: z.string(),
  fontSize: z.number(),
  fontWeight: z.number(),
});
export type FlowInk = z.infer<typeof FlowInkSchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type FlowchartEventos = { 'iswc-turtle-state': DiagramTurtleDetail; 'iswc-render': DiagramRenderDetail; 'iswc-toggle-group': DiagramToggleDetail; 'iswc-open-viewer': DiagramViewerDetail };
