/**
 * sparkline.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const SparkPointSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type SparkPoint = z.infer<typeof SparkPointSchema>;

