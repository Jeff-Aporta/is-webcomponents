/**
 * journey-map.ts — Zod schemas propios del componente.
 *
 * El layout (JourneyLayout, JourneyLayoutStep, JourneyLayoutPhase,
 * JourneyLayoutGridLine) vive en `journey-spec.schemas.ts`; aquí solo lo que
 * el componente añade por encima.
 */
import { z } from "zod";
import { JourneyLayoutStepSchema } from "./journey-spec.schemas.js";

export const StepEntrySchema = z.object({
  s: JourneyLayoutStepSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type StepEntry = z.infer<typeof StepEntrySchema>;
