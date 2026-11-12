// @contexto INDICE.md · src/components/diagrams/README.md
/**
 * state-diagram.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import type { StateLayoutNode, StateLayoutTransition } from './state-spec.schemas.js';
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
  n: z.custom<StateLayoutNode>(() => true),
  g: z.custom<SVGGElement>(() => true),
});
export type NodeNodeEntry = z.infer<typeof NodeNodeEntrySchema>;

const EdgeNodeEntrySchema = z.object({
  e: z.custom<StateLayoutTransition>(() => true),
  g: z.custom<SVGGElement>(() => true),
});
export type EdgeNodeEntry = z.infer<typeof EdgeNodeEntrySchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type StateDiagramEventos = { 'iswc-turtle-state': DiagramTurtleDetail; 'iswc-render': DiagramRenderDetail; 'iswc-toggle-group': DiagramToggleDetail; 'iswc-open-viewer': DiagramViewerDetail };
