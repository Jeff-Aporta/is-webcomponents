/**
 * server.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ServidorE2ESchema = z.object({
  url: z.string(),
  cerrar: z.function({ input: [], output: z.promise(z.void()) }),
});
export type ServidorE2E = z.infer<typeof ServidorE2ESchema>;

