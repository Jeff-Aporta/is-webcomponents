/**
 * ag-grid.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const PageChangeDetailSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
});
export type PageChangeDetail = z.infer<typeof PageChangeDetailSchema>;

const StateSavedDetailSchema = z.object({
  key: z.string(),
  state: z.unknown(),
});
export type StateSavedDetail = z.infer<typeof StateSavedDetailSchema>;

