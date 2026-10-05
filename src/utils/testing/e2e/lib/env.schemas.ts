/**
 * env.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ConfigE2ESchema = z.object({
  baseUrl: z.string(),
  headless: z.boolean(),
  escritura: z.boolean(),
  estricto: z.boolean(),
  minimaxKey: z.string(),
  minimaxModelo: z.string(),
  minimaxUrl: z.string(),
  artefactos: z.string(),
  asentarseMs: z.number(),
  esperaMs: z.number(),
  navegador: z.string(),
  sweep: z.array(z.string()),
  puerto: z.number(),
  host: z.string(),
});
export type ConfigE2E = z.infer<typeof ConfigE2ESchema>;

