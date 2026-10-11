/**
 * swimlane-diagram.ts — Zod schemas propios del componente.
 *
 * El layout (SwimlaneLayout, SwimlaneLayoutLane, SwimlaneLayoutStep,
 * SwimlaneLayoutLink, SwimlaneStepKind) vive en `swimlane-spec.schemas.ts`;
 * aquí solo lo que el componente añade por encima.
 */
import { z } from "zod";
import { SwimlaneLayoutStepSchema, SwimlaneLayoutLinkSchema } from "./swimlane-spec.schemas.js";

export const StepEntrySchema = z.object({
  s: SwimlaneLayoutStepSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type StepEntry = z.infer<typeof StepEntrySchema>;


export const LinkEntrySchema = z.object({
  l: SwimlaneLayoutLinkSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type LinkEntry = z.infer<typeof LinkEntrySchema>;
