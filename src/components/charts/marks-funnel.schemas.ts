/**
 * marks-funnel.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const FunnelBandSchema = z.object({
  index: z.number(),
  ratio: z.number(),
  dropPct: z.number(),
});
export type FunnelBand = z.infer<typeof FunnelBandSchema>;

