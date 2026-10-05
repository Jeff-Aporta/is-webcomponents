/**
 * md-hydrate.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const LoaderLikeSchema = z.object({
  has: z.function({ input: [z.string()], output: z.boolean() }).optional(),
  ensure: z.function({ input: [z.string()], output: z.promise(z.boolean()) }).optional(),
  load: z.function({ input: [z.array(z.unknown() /* TODO: cannot convert */)], output: z.promise(z.unknown()) }).optional(),
});
export type LoaderLike = z.infer<typeof LoaderLikeSchema>;

