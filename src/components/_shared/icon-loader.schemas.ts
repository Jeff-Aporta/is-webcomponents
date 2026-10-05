/**
 * icon-loader.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const IconFamilySchema = z.object({
  prefix: z.string(),
  count: z.number(),
});
export type IconFamily = z.infer<typeof IconFamilySchema>;

