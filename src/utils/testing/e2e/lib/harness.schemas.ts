/**
 * harness.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const BotonVisibleSchema = z.object({
  i: z.number(),
  texto: z.string(),
});
export type BotonVisible = z.infer<typeof BotonVisibleSchema>;

