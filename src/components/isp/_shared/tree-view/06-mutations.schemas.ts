/**
 * 06-mutations.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const MutationResultSchema = z.object({
  selectedNode: z.string(),
  flashRowFlatPaths: z.array(z.string()),
  ensureExpandedIds: z.array(z.string()).optional(),
});
export type MutationResult = z.infer<typeof MutationResultSchema>;

