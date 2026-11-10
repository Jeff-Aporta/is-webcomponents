// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const AgGridApiSchema = z.object({
  selectAll: z.function({ input: [], output: z.void() }).optional(),
  exportCSV: z.function({ input: [z.string()], output: z.void() }).optional(),
  goToPage: z.function({ input: [z.number()], output: z.void() }).optional(),
  setDensity: z.function({ input: [z.union([z.literal('compact'), z.literal('normal'), z.literal('comfortable')])], output: z.void() }).optional(),
  resetPersistedState: z.function({ input: [], output: z.void() }).optional(),
});

const IswcAgGridElSchema = z.object({
  api: AgGridApiSchema.optional(),
});
export type IswcAgGridEl = z.infer<typeof IswcAgGridElSchema>;

