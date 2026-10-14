/**
 * 07-roles.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const TARolesInternalsSchema = z.object({
  onrowdelete: z.function({ input: [z.unknown() /* TODO: ref TNode */], output: z.void() }),
});
export type TARolesInternals = z.infer<typeof TARolesInternalsSchema>;

