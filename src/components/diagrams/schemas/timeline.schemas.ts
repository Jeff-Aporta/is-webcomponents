/**
 * timeline.ts — Zod schemas propios del componente.
 *
 * El layout (TimelineLayout, TimelineLayoutEvent, TimelineTick) vive en
 * `timeline-spec.schemas.ts`; aquí solo lo que el componente añade por encima.
 */
import { z } from "zod";
import { TimelineLayoutEventSchema } from "./timeline-spec.schemas.js";

export const EventEntrySchema = z.object({
  e: TimelineLayoutEventSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type EventEntry = z.infer<typeof EventEntrySchema>;
