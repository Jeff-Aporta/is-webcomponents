/**
 * doc-demo.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const LoaderLikeSchema = z.object({
  loadPageStyles: z.function({ input: [z.array(z.string())], output: z.promise(z.unknown()) }),
  loadPageModules: z.function({ input: [z.array(z.string())], output: z.promise(z.unknown()) }),
});
export type LoaderLike = z.infer<typeof LoaderLikeSchema>;

