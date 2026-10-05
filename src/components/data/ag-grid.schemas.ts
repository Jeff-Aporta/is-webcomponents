/**
 * ag-grid.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ColumnDefWithActionsSchema = z.object({
  actions: z.array(ActionDefSchema).optional(),
});
export type ColumnDefWithActions = z.infer<typeof ColumnDefWithActionsSchema>;


export const ActionDefSchema = z.object({
  value: z.string(),
  label: z.string().optional(),
  icon: z.string().optional(),
});
export type ActionDef = z.infer<typeof ActionDefSchema>;


export const ColumnStateWithStickySchema = z.object({
  __stickLeft: z.string().optional(),
  __stickRight: z.string().optional(),
  cellStyle: z.record(z.string(), z.string()).optional(),
});
export type ColumnStateWithSticky = z.infer<typeof ColumnStateWithStickySchema>;


export const CellEditDetailSchema = z.object({
  row: z.unknown() /* TODO: ref RowData */,
  column: z.unknown() /* TODO: ref ColumnState */,
  oldValue: z.unknown(),
  newValue: z.unknown(),
});
export type CellEditDetail = z.infer<typeof CellEditDetailSchema>;


export const CellClickDetailSchema = z.object({
  row: z.unknown() /* TODO: ref RowData */,
  column: z.union([z.unknown() /* TODO: ref ColumnState */, z.null()]),
  value: z.unknown(),
});
export type CellClickDetail = z.infer<typeof CellClickDetailSchema>;


export const RowSelectDetailSchema = z.object({
  rows: z.array(z.unknown() /* TODO: ref RowData */),
});
export type RowSelectDetail = z.infer<typeof RowSelectDetailSchema>;


export const SortChangeDetailSchema = z.object({
  column: z.string(),
  direction: z.union([z.unknown() /* TODO: ref SortDirName */, z.null()]),
});
export type SortChangeDetail = z.infer<typeof SortChangeDetailSchema>;


export const FilterChangeDetailSchema = z.object({
  column: z.string(),
  op: z.union([z.string(), z.null(), z.undefined()]),
  value: z.unknown(),
});
export type FilterChangeDetail = z.infer<typeof FilterChangeDetailSchema>;


export const ActionEventDetailSchema = z.object({
  row: z.unknown() /* TODO: ref RowData */,
  column: z.union([z.unknown() /* TODO: ref ColumnState */, z.undefined()]),
  action: z.union([z.string(), z.undefined()]),
});
export type ActionEventDetail = z.infer<typeof ActionEventDetailSchema>;


export const ColumnPinDetailSchema = z.object({
  colId: z.string(),
  side: z.union([z.unknown() /* TODO: ref PinSideName */, z.null()]),
});
export type ColumnPinDetail = z.infer<typeof ColumnPinDetailSchema>;


export const PageChangeDetailSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
});
export type PageChangeDetail = z.infer<typeof PageChangeDetailSchema>;


export const StateSavedDetailSchema = z.object({
  key: z.string(),
  state: z.unknown(),
});
export type StateSavedDetail = z.infer<typeof StateSavedDetailSchema>;

