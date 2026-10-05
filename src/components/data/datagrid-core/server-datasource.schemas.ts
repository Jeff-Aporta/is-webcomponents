/**
 * server-datasource.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const FiltroEntradaSchema = z.object({
  filterType: z.string().optional(),
  type: z.string().optional(),
  values: z.array(z.unknown()).optional(),
  filterModels: z.array(z.union([FiltroEntradaSchema, z.null()])).optional(),
  /* TODO: member [extra: string]: unknown */
});
export type FiltroEntrada = z.infer<typeof FiltroEntradaSchema>;


export const PeticionListaSchema = z.object({
  startRow: z.number().optional(),
  endRow: z.number().optional(),
  sortModel: z.array(z.object({
  colId: z.string().optional(),
  sort: z.string().optional(),
  dir: z.string().optional(),
})).optional(),
  filterModel: z.record(z.string(), z.union([FiltroEntradaSchema, z.null()])).optional(),
});
export type PeticionLista = z.infer<typeof PeticionListaSchema>;


export const TFiltroListaSchema = z.object({
  qregistros: z.number().optional(),
  pagina: z.number().optional(),
  orden: z.record(z.string(), z.string()).optional(),
  filtro: z.object({
  idnfiltro: z.string(),
  sql: z.string().optional(),
}).optional(),
});
export type TFiltroLista = z.infer<typeof TFiltroListaSchema>;


export const TListaPaginacionSchema = z.object({
  datos: z.array(z.record(z.string(), z.unknown())).optional(),
  totalregistros: z.number().optional(),
  /* TODO: member [extra: string]: unknown */
});
export type TListaPaginacion = z.infer<typeof TListaPaginacionSchema>;


export const ParamsGetRowsSchema = z.object({
  request: PeticionListaSchema,
  success: z.function({ input: [z.object({
  rowData: z.array(z.record(z.string(), z.unknown())),
  rowCount: z.number(),
})], output: z.void() }),
  fail: z.function({ input: [], output: z.void() }),
});
export type ParamsGetRows = z.infer<typeof ParamsGetRowsSchema>;


export const LiteralSchema = z.union([z.string(), z.number(), z.null()]);
export type Literal = z.infer<typeof LiteralSchema>;

