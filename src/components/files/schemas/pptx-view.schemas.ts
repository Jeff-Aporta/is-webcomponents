/**
 * pptx-view.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ZipLikeSchema = z.object({
  loadAsync: z.function({ input: [z.unknown() /* TODO: ref ArrayBuffer */], output: z.promise(z.object({
  file: z.function({ input: [z.string()], output: z.union([z.object({
  async: z.function({ input: [z.string()], output: z.promise(z.string()) }),
}), z.null()]) }),
  files: z.record(z.string(), z.unknown()),
})) }),
});
export type ZipLike = z.infer<typeof ZipLikeSchema>;

