/**
 * er-archify.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const AnchorLikeSchema = z.object({
  cx: z.number(),
  cy: z.number(),
});
export type AnchorLike = z.infer<typeof AnchorLikeSchema>;

