/**
 * diagram-arrow.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ArrowPointSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type ArrowPoint = z.infer<typeof ArrowPointSchema>;


export const SvgArrowHeadOptsSchema = z.object({
  d: z.string(),
  tip: ArrowPointSchema,
  color: z.string(),
  len: z.number().optional(),
  halfWidth: z.number().optional(),
  className: z.union([z.string(), z.null()]).optional(),
  fallbackDir: ArrowPointSchema.optional(),
});
export type SvgArrowHeadOpts = z.infer<typeof SvgArrowHeadOptsSchema>;

