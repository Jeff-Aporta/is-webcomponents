/**
 * runtime.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const OpcionesRuntimeSchema = z.object({
  esModulo: z.boolean().optional(),
});
export type OpcionesRuntime = z.infer<typeof OpcionesRuntimeSchema>;

