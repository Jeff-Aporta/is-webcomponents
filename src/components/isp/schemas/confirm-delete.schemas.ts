/**
 * confirm-delete.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const InputLikeSchema = z.object({
  label: z.string(),
  value: z.string(),
  maxlength: z.union([z.string(), z.null()]),
});
export type InputLike = z.infer<typeof InputLikeSchema>;

