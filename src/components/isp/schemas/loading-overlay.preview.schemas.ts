/**
 * loading-overlay.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const LoadingOverlayLikeSchema = z.object({
  show: z.function({ input: [], output: z.void() }),
  hide: z.function({ input: [], output: z.void() }),
});
export type LoadingOverlayLike = z.infer<typeof LoadingOverlayLikeSchema>;

