/**
 * csv-export.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const CsvOptionsSchema = z.object({
  separator: z.string().optional(),
  onlySelected: z.boolean().optional(),
  selection: z.set(z.string()).optional(),
});
export type CsvOptions = z.infer<typeof CsvOptionsSchema>;

