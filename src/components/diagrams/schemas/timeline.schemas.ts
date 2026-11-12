// @contexto INDICE.md · src/components/diagrams/README.md
/**
 * timeline.ts — Zod schemas propios del componente.
 *
 * El layout (TimelineLayout, TimelineLayoutEvent, TimelineTick) vive en
 * `timeline-spec.schemas.ts`; aquí solo lo que el componente añade por encima.
 */
import { z } from "zod";
import { TimelineLayoutEventSchema } from "./timeline-spec.schemas.js";
import type { DiagramRenderDetail, DiagramToggleDetail, DiagramViewerDetail } from './diagram-base.schemas.js';

const EventEntrySchema = z.object({
  e: TimelineLayoutEventSchema,
  g: z.custom<SVGGElement>(() => true),
});
export type EventEntry = z.infer<typeof EventEntrySchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type TimelineEventos = { 'iswc-render': DiagramRenderDetail; 'iswc-toggle-group': DiagramToggleDetail; 'iswc-open-viewer': DiagramViewerDetail };
