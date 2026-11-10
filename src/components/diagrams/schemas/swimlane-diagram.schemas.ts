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
