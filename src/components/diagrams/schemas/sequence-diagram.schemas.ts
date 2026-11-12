// @contexto INDICE.md · src/components/diagrams/README.md
/**
 * sequence-diagram.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import type { SequenceLayoutMessage } from './sequence-spec.schemas.js';
import { z } from "zod";
import type { DiagramTurtleDetail, DiagramRenderDetail, DiagramToggleDetail, DiagramViewerDetail } from './diagram-base.schemas.js';

const TurtleStateSchema = z.object({
  playing: z.boolean(),
  idx: z.number(),
  total: z.number(),
  replay: z.number(),
});
export type TurtleState = z.infer<typeof TurtleStateSchema>;

const MsgNodeSchema = z.object({
  m: z.custom<SequenceLayoutMessage>(() => true),
  g: z.custom<SVGGElement>(() => true),
  path: z.custom<SVGPathElement>(() => true),
  arrow: z.custom<SVGElement>(() => true),
  dot: z.custom<SVGCircleElement>(() => true),
  labelNode: z.union([z.custom<SVGElement>(() => true), z.null()]),
});
export type MsgNode = z.infer<typeof MsgNodeSchema>;

const LifelineNodeSchema = z.object({
  x: z.number(),
  line: z.custom<SVGLineElement>(() => true),
});
export type LifelineNode = z.infer<typeof LifelineNodeSchema>;

const ActorNodeSchema = z.object({
  x: z.number(),
  g: z.custom<SVGGElement>(() => true),
  rect: z.custom<SVGRectElement>(() => true),
});
export type ActorNode = z.infer<typeof ActorNodeSchema>;

/** Caja de participante (región que agrupa actores en la cabecera). */
const PartBoxSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type PartBox = z.infer<typeof PartBoxSchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type SequenceDiagramEventos = { 'iswc-turtle-state': DiagramTurtleDetail; 'iswc-render': DiagramRenderDetail; 'iswc-toggle-group': DiagramToggleDetail; 'iswc-open-viewer': DiagramViewerDetail };
