/**
 * types.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const TextFilterOpSchema = z.union([z.literal('contains'), z.literal('notContains'), z.literal('equals'), z.literal('notEqual'), z.literal('startsWith'), z.literal('endsWith'), z.literal('blank'), z.literal('notBlank')]);
export type TextFilterOp = z.infer<typeof TextFilterOpSchema>;


export const NumberFilterOpSchema = z.union([z.literal('eq'), z.literal('neq'), z.literal('gt'), z.literal('gte'), z.literal('lt'), z.literal('lte'), z.literal('inRange'), z.literal('blank'), z.literal('notBlank')]);
export type NumberFilterOp = z.infer<typeof NumberFilterOpSchema>;


export const DateFilterOpSchema = z.union([z.literal('eq'), z.literal('before'), z.literal('after'), z.literal('inRange')]);
export type DateFilterOp = z.infer<typeof DateFilterOpSchema>;


export const TextFilterSchema = z.object({
  type: z.literal('text'),
  op: TextFilterOpSchema,
  value: z.string(),
});
export type TextFilter = z.infer<typeof TextFilterSchema>;


export const NumberFilterSchema = z.object({
  type: z.literal('number'),
  op: NumberFilterOpSchema,
  value: z.union([z.number(), z.null()]),
  to: z.union([z.number(), z.null()]).optional(),
});
export type NumberFilter = z.infer<typeof NumberFilterSchema>;


export const DateFilterSchema = z.object({
  type: z.literal('date'),
  op: DateFilterOpSchema,
  value: z.string(),
  to: z.string().optional(),
});
export type DateFilter = z.infer<typeof DateFilterSchema>;


export const SetFilterSchema = z.object({
  type: z.literal('set'),
  values: z.array(z.string()),
});
export type SetFilter = z.infer<typeof SetFilterSchema>;


export const ColumnFilterSchema = z.union([TextFilterSchema, NumberFilterSchema, DateFilterSchema, SetFilterSchema]);
export type ColumnFilter = z.infer<typeof ColumnFilterSchema>;


export const FilterModelSchema = z.record(z.string(), ColumnFilterSchema);
export type FilterModel = z.infer<typeof FilterModelSchema>;


export const ColumnTypeNameSchema = z.unknown() /* TODO: cannot convert */;
export type ColumnTypeName = z.infer<typeof ColumnTypeNameSchema>;


export const AggFuncNameSchema = z.unknown() /* TODO: cannot convert */;
export type AggFuncName = z.infer<typeof AggFuncNameSchema>;


export const SortDirNameSchema = z.unknown() /* TODO: cannot convert */;
export type SortDirName = z.infer<typeof SortDirNameSchema>;


export const PinSideNameSchema = z.unknown() /* TODO: cannot convert */;
export type PinSideName = z.infer<typeof PinSideNameSchema>;


export const AlignNameSchema = z.unknown() /* TODO: cannot convert */;
export type AlignName = z.infer<typeof AlignNameSchema>;


export const DensityNameSchema = z.unknown() /* TODO: cannot convert */;
export type DensityName = z.infer<typeof DensityNameSchema>;


export const SelectionModeNameSchema = z.unknown() /* TODO: cannot convert */;
export type SelectionModeName = z.infer<typeof SelectionModeNameSchema>;


export const FilterTypeNameSchema = z.unknown() /* TODO: cannot convert */;
export type FilterTypeName = z.infer<typeof FilterTypeNameSchema>;


export const RowDataSchema = z.record(z.string(), z.unknown());
export type RowData = z.infer<typeof RowDataSchema>;


export const RowNodeSchema = z.object({
  id: z.string(),
  index: z.number(),
  data: RowDataSchema,
});
export type RowNode = z.infer<typeof RowNodeSchema>;


export const GroupRowSchema = z.object({
  kind: z.literal('group'),
  id: z.string(),
  colId: z.string(),
  field: z.string(),
  value: z.unknown(),
  label: z.string(),
  level: z.number(),
  count: z.number(),
  expanded: z.boolean(),
  agg: z.record(z.string(), z.unknown()),
  leafIds: z.array(z.string()),
});
export type GroupRow = z.infer<typeof GroupRowSchema>;


export const LeafRowSchema = z.object({
  kind: z.literal('leaf'),
  level: z.number(),
  node: RowNodeSchema,
});
export type LeafRow = z.infer<typeof LeafRowSchema>;


export const DisplayRowSchema = z.union([GroupRowSchema, LeafRowSchema]);
export type DisplayRow = z.infer<typeof DisplayRowSchema>;


export const ColumnDefSchema = z.object({
  field: z.string(),
  colId: z.string().optional(),
  headerName: z.string().optional(),
  header: z.string().optional(),
  caption: z.string().optional(),
  type: z.union([ColumnTypeNameSchema, z.literal('currency'), z.literal('dateTime')]).optional(),
  width: z.number().optional(),
  minWidth: z.number().optional(),
  maxWidth: z.number().optional(),
  flex: z.number().optional(),
  sortable: z.boolean().optional(),
  resizable: z.boolean().optional(),
  filter: z.union([z.boolean(), FilterTypeNameSchema]).optional(),
  pinned: z.union([PinSideNameSchema, z.null()]).optional(),
  hide: z.boolean().optional(),
  align: AlignNameSchema.optional(),
  rowGroup: z.boolean().optional(),
  enableRowGroup: z.boolean().optional(),
  aggFunc: AggFuncNameSchema.optional(),
  checkboxSelection: z.boolean().optional(),
  valueGetter: z.function({ input: [z.unknown() /* TODO: ref RowData */], output: z.unknown() }).optional(),
  valueFormatter: z.function({ input: [z.unknown(), z.unknown() /* TODO: ref RowData */], output: z.string() }).optional(),
  comparator: z.function({ input: [z.unknown(), z.unknown(), z.unknown() /* TODO: ref RowData */, z.unknown() /* TODO: ref RowData */], output: z.number() }).optional(),
  cellClass: z.string().optional(),
  headerClass: z.string().optional(),
  editable: z.boolean().optional(),
  format: z.union([z.string(), z.function({ input: [z.unknown()], output: z.string() })]).optional(),
});
export type ColumnDef = z.infer<typeof ColumnDefSchema>;


export const ColumnStateSchema = z.object({
  colId: z.string(),
  field: z.string(),
  headerName: z.string(),
  type: z.union([ColumnTypeNameSchema, z.literal('currency'), z.literal('dateTime')]),
  width: z.number(),
  minWidth: z.number(),
  maxWidth: z.number(),
  flex: z.number().optional(),
  sortable: z.boolean(),
  resizable: z.boolean(),
  filterType: z.union([FilterTypeNameSchema, z.null()]),
  pinned: z.union([PinSideNameSchema, z.null()]),
  hide: z.boolean(),
  align: AlignNameSchema,
  enableRowGroup: z.boolean(),
  aggFunc: z.union([AggFuncNameSchema, z.null()]),
  checkboxSelection: z.boolean(),
  def: ColumnDefSchema,
});
export type ColumnState = z.infer<typeof ColumnStateSchema>;


export const SortModelItemSchema = z.object({
  colId: z.string(),
  dir: SortDirNameSchema,
});
export type SortModelItem = z.infer<typeof SortModelItemSchema>;


export const SortModelSchema = z.array(SortModelItemSchema);
export type SortModel = z.infer<typeof SortModelSchema>;


export const GridOptionsSchema = z.object({
  columns: z.array(ColumnDefSchema),
  rows: z.array(RowDataSchema),
  getRowId: z.function({ input: [z.unknown() /* TODO: ref RowData */, z.number()], output: z.string() }).optional(),
  rowHeight: z.number().optional(),
  headerHeight: z.number().optional(),
  selectionMode: SelectionModeNameSchema.optional(),
  pagination: z.boolean().optional(),
  pageSize: z.number().optional(),
  quickFilter: z.string().optional(),
  density: DensityNameSchema.optional(),
  defaultColWidth: z.number().optional(),
  rowGroupCols: z.array(z.string()).optional(),
  groupDefaultExpanded: z.number().optional(),
});
export type GridOptions = z.infer<typeof GridOptionsSchema>;


export const GridStateSchema = z.object({
  columns: z.array(ColumnStateSchema),
  sortModel: SortModelSchema,
  filterModel: FilterModelSchema,
  quickFilter: z.string(),
  selection: z.set(z.string()),
  density: DensityNameSchema,
  pagination: z.boolean(),
  page: z.number(),
  pageSize: z.number(),
  displayedRows: z.array(RowNodeSchema),
  pageRows: z.array(RowNodeSchema),
  rowGroupCols: z.array(z.string()),
  expandedGroups: z.set(z.string()),
  displayRows: z.array(DisplayRowSchema),
  pageDisplayRows: z.array(DisplayRowSchema),
  totalRows: z.number(),
});
export type GridState = z.infer<typeof GridStateSchema>;


export const GridListenerSchema = z.function({ input: [z.unknown() /* TODO: ref GridState */, z.string()], output: z.void() });
export type GridListener = z.infer<typeof GridListenerSchema>;


export const GridApiSchema = z.object({
  getState: z.function({ input: [], output: z.unknown() /* TODO: ref GridState */ }),
  subscribe: z.function({ input: [z.unknown() /* TODO: ref GridListener */], output: z.function({ input: [], output: z.void() }) }),
  setRows: z.function({ input: [z.union([z.array(z.unknown() /* TODO: ref RowData */), z.null(), z.undefined()])], output: z.void() }),
  setColumnDefs: z.function({ input: [z.union([z.array(z.unknown() /* TODO: ref ColumnDef */), z.null(), z.undefined()])], output: z.void() }),
  setSortModel: z.function({ input: [z.unknown() /* TODO: ref SortModel */], output: z.void() }),
  toggleSort: z.function({ input: [z.string(), z.boolean()], output: z.void() }),
  setFilter: z.function({ input: [z.string(), z.union([z.unknown() /* TODO: ref ColumnFilter */, z.null()])], output: z.void() }),
  setQuickFilter: z.function({ input: [z.string()], output: z.void() }),
  setSelection: z.function({ input: [z.unknown() /* TODO: ref Iterable<...> */], output: z.void() }),
  setDensity: z.function({ input: [z.unknown() /* TODO: ref DensityName */], output: z.void() }),
  setPage: z.function({ input: [z.number()], output: z.void() }),
  setPageSize: z.function({ input: [z.number()], output: z.void() }),
  resizeColumn: z.function({ input: [z.string(), z.number()], output: z.void() }),
  pinColumn: z.function({ input: [z.string(), z.union([z.unknown() /* TODO: ref PinSideName */, z.null()])], output: z.void() }),
  hideColumn: z.function({ input: [z.string(), z.boolean()], output: z.void() }),
  reorderColumn: z.function({ input: [z.string(), z.number()], output: z.void() }),
  autosizeColumn: z.function({ input: [z.string()], output: z.void() }),
  setRowGroupCols: z.function({ input: [z.array(z.string())], output: z.void() }),
  addRowGroupCol: z.function({ input: [z.string(), z.number()], output: z.void() }),
  removeRowGroupCol: z.function({ input: [z.string()], output: z.void() }),
  toggleGroup: z.function({ input: [z.string()], output: z.void() }),
  expandAllGroups: z.function({ input: [], output: z.void() }),
  collapseAllGroups: z.function({ input: [], output: z.void() }),
  getColumns: z.function({ input: [], output: z.array(z.unknown() /* TODO: ref ColumnState */) }),
  getDisplayedRows: z.function({ input: [], output: z.array(z.unknown() /* TODO: ref RowNode */) }),
  getAllRows: z.function({ input: [], output: z.array(z.unknown() /* TODO: ref RowNode */) }),
  serializeState: z.function({ input: [], output: z.string() }),
  loadState: z.function({ input: [z.string()], output: z.void() }),
});
export type GridApi = z.infer<typeof GridApiSchema>;

