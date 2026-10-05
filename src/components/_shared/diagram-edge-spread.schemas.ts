/**
 * diagram-edge-spread.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const SpreadPointSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type SpreadPoint = z.infer<typeof SpreadPointSchema>;


export const SpreadItemSchema = z.object({
  e: z.object({
  path: z.string(),
}),
  pts: z.array(SpreadPointSchema),
});
export type SpreadItem = z.infer<typeof SpreadItemSchema>;

