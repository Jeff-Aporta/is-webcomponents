// @contexto INDICE.md · src/components/diagrams/README.md
/**
 * journey-map.ts — Zod schemas propios del componente.
 *
 * El layout (JourneyLayout, JourneyLayoutStep, JourneyLayoutPhase,
 * JourneyLayoutGridLine) vive en `journey-spec.schemas.ts`; aquí solo lo que
 * el componente añade por encima.
 */
import { z } from "zod";
import { JourneyLayoutStepSchema } from "./journey-spec.schemas.js";
import type { DiagramRenderDetail, DiagramViewerDetail } from './diagram-base.schemas.js';

const StepEntrySchema = z.object({
  s: JourneyLayoutStepSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type StepEntry = z.infer<typeof StepEntrySchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type JourneyMapEventos = { 'iswc-render': DiagramRenderDetail; 'iswc-toggle-phase': { id: string | undefined }; 'iswc-open-viewer': DiagramViewerDetail };
