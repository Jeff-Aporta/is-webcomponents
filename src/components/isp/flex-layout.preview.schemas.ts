/**
 * flex-layout.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const InputLikeSchema = z.object({
  value: z.string(),
  checked: z.boolean(),
});
export type InputLike = z.infer<typeof InputLikeSchema>;

