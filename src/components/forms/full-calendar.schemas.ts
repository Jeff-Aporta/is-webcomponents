/**
 * full-calendar.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const CalEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  start: z.string().optional(),
  end: z.string().optional(),
  color: z.string().optional(),
});
export type CalEvent = z.infer<typeof CalEventSchema>;


export const ViewSchema = z.union([z.literal('month'), z.literal('week'), z.literal('day')]);
export type View = z.infer<typeof ViewSchema>;

