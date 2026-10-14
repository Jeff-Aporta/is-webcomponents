/**
 * scroll-memory.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const RestorePolicySchema = z.union([z.literal('reload'), z.literal('always')]);
export type RestorePolicy = z.infer<typeof RestorePolicySchema>;


export const ScrollMemoryOptsSchema = z.object({
  tag: z.string(),
  restorePolicy: RestorePolicySchema.optional(),
});
export type ScrollMemoryOpts = z.infer<typeof ScrollMemoryOptsSchema>;

