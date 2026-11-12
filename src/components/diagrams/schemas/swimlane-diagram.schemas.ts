// @contexto INDICE.md · src/components/diagrams/README.md
/**
 * swimlane-diagram.ts — Zod schemas propios del componente.
 *
 * El layout (SwimlaneLayout, SwimlaneLayoutLane, SwimlaneLayoutStep,
 * SwimlaneLayoutLink, SwimlaneStepKind) vive en `swimlane-spec.schemas.ts`;
 * aquí solo lo que el componente añade por encima.
 */
import { z } from "zod";
import { SwimlaneLayoutStepSchema, SwimlaneLayoutLinkSchema } from "./swimlane-spec.schemas.js";
import type { DiagramRenderDetail, DiagramViewerDetail } from './diagram-base.schemas.js';

const StepEntrySchema = z.object({
  s: SwimlaneLayoutStepSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type StepEntry = z.infer<typeof StepEntrySchema>;

const LinkEntrySchema = z.object({
  l: SwimlaneLayoutLinkSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type LinkEntry = z.infer<typeof LinkEntrySchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type SwimlaneDiagramEventos = { 'iswc-render': DiagramRenderDetail; 'iswc-toggle-lane': { id: string | undefined }; 'iswc-open-viewer': DiagramViewerDetail };
