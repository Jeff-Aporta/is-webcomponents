/**
 * grid-data.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ResolvedColumnSchema = z.object({
  field: z.string(),
  headerName: z.string(),
  align: z.string(),
  headerAlign: z.string(),
  width: z.number(),
  minWidth: z.number(),
  maxWidth: z.number(),
  flex: z.number(),
  sortable: z.boolean(),
  filterable: z.boolean(),
  hideable: z.boolean(),
  resizable: z.boolean(),
  editable: z.boolean(),
  groupable: z.boolean(),
  aggregable: z.boolean(),
  comparator: z.unknown() /* TODO: ref Comparator */,
  operators: z.array(z.unknown() /* TODO: cannot convert */),
  type: z.string(),
  valueFormatter: z.unknown() /* TODO: cannot convert */.optional(),
});
export type ResolvedColumn = z.infer<typeof ResolvedColumnSchema>;


export const NormalizeOptionsSchema = z.object({
  defaultWidth: z.number().optional(),
  editableAll: z.boolean().optional(),
});
export type NormalizeOptions = z.infer<typeof NormalizeOptionsSchema>;


export const PivotModelSchema = z.object({
  rows: z.array(z.unknown() /* TODO: cannot convert */).optional(),
  columns: z.array(z.unknown() /* TODO: cannot convert */).optional(),
  values: z.array(z.unknown() /* TODO: cannot convert */).optional(),
});
export type PivotModel = z.infer<typeof PivotModelSchema>;


export const SortModelItemSchema = z.object({
  field: z.string(),
  sort: z.union([z.literal('asc'), z.literal('desc')]),
});
export type SortModelItem = z.infer<typeof SortModelItemSchema>;


export const FilterModelSchema = z.object({
  items: z.array(z.unknown() /* TODO: cannot convert */).optional(),
  logicOperator: z.union([z.literal('and'), z.literal('or')]).optional(),
});
export type FilterModel = z.infer<typeof FilterModelSchema>;


export const AggregationModelSchema = z.record(z.string(), z.string());
export type AggregationModel = z.infer<typeof AggregationModelSchema>;


export const BuildTreeOptsSchema = z.object({
  paths: z.array(z.union([z.unknown() /* TODO: cannot convert */, z.number()])),
  getRowId: z.function({ input: [z.unknown() /* TODO: ref Row */, z.number()], output: z.unknown() /* TODO: ref CellValue */ }),
});
export type BuildTreeOpts = z.infer<typeof BuildTreeOptsSchema>;


export const FilterCtxSchema = z.unknown();
export type FilterCtx = z.infer<typeof FilterCtxSchema>;


export const ApplyFiltersOptsSchema = z.object({
  model: FilterModelSchema.optional(),
  quick: z.string().optional(),
  columns: z.array(z.unknown() /* TODO: cannot convert */),
  ctx: FilterCtxSchema,
  quickLogic: z.union([z.literal('and'), z.literal('or')]).optional(),
});
export type ApplyFiltersOpts = z.infer<typeof ApplyFiltersOptsSchema>;


export const TreeNodeSchema = z.object({
  kind: z.union([z.literal('leaf'), z.literal('group')]),
  id: z.unknown() /* TODO: ref CellValue */,
  key: z.union([z.string(), z.number()]).optional(),
  depth: z.number(),
  path: z.array(z.unknown() /* TODO: cannot convert */),
  parent: z.union([TreeNodeSchema, z.null()]),
  children: z.array(TreeNodeSchema),
  rows: z.array(z.unknown() /* TODO: ref Row */),
  row: z.unknown() /* TODO: ref Row */.optional(),
  leafRow: z.union([z.unknown() /* TODO: ref Row */, z.null()]).optional(),
  aggregates: z.record(z.string(), z.object({
  value: z.unknown() /* TODO: ref CellValue */,
  fn: z.string(),
})).optional(),
});
export type TreeNode = z.infer<typeof TreeNodeSchema>;


export const PivotResultSchema = z.object({
  rows: z.array(z.unknown() /* TODO: ref Row */),
  columns: z.array(z.unknown() /* TODO: ref ColumnDef */),
  colKeys: z.array(z.string()),
});
export type PivotResult = z.infer<typeof PivotResultSchema>;

