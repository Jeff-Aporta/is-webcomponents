/**
 * block-layout.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const _BlockLayoutLikeSchema = z.object({
  sizew: z.string(),
  clientWidthMeasured: z.number(),
  fromJSON: z.function({ input: [z.unknown()], output: z.unknown() /* TODO: ref this */ }),
  toJSON: z.function({ input: [], output: z.unknown() }),
  html2json: z.function({ input: [], output: z.unknown() }),
});
export type _BlockLayoutLike = z.infer<typeof _BlockLayoutLikeSchema>;

