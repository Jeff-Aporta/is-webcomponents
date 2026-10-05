/**
 * float-card.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const LinearTransformSchema = z.object({
  tx: z.union([z.string(), z.number()]).optional(),
  ty: z.union([z.string(), z.number()]).optional(),
  e: z.number().optional(),
});
export type LinearTransform = z.infer<typeof LinearTransformSchema>;

