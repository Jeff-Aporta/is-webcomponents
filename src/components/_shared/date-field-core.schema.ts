/**
 * date-field-core.schema.ts — esquemas Zod para tipos locales del motor de campos fecha/hora.
 */
import { z } from "zod";

/** Tipos de sección que conoce el motor. */
export const SectionTypeSchema = z.enum([
  "year",
  "month",
  "day",
  "hour",
  "hour12",
  "minute",
  "second",
  "meridiem",
]);
export type SectionType = z.infer<typeof SectionTypeSchema>;

/** Item del layout devuelto por `Intl.DateTimeFormat.formatToParts`. */
export const LayoutItemSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("section"), type: SectionTypeSchema }),
  z.object({ kind: z.literal("literal"), text: z.string() }),
]);
export type LayoutItem = z.infer<typeof LayoutItemSchema>;