/**
 * viewport.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ColLayoutSchema = z.object({
  positions: z.array(z.number()),
  totalWidth: z.number(),
  leftWidth: z.number(),
  rightWidth: z.number(),
});
export type ColLayout = z.infer<typeof ColLayoutSchema>;

