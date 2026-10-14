/**
 * pivot-table.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const CellClickDetailSchema = z.object({
  row: z.string(),
  col: z.string(),
  value: z.unknown(),
});
export type CellClickDetail = z.infer<typeof CellClickDetailSchema>;

