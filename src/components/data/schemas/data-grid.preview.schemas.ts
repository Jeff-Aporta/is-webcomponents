/**
 * data-grid.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const DataGridElementSchema = z.intersection(z.unknown() /* TODO: ref HTMLElement */, z.object({
  columns: z.array(z.unknown() /* TODO: ref ColumnDef */),
  rows: z.array(z.unknown() /* TODO: ref Row */),
  pinnedRows: z.object({
  top: z.array(z.unknown() /* TODO: ref Row */),
  bottom: z.array(z.unknown() /* TODO: ref Row */),
}),
  sortModel: z.array(z.object({
  field: z.string(),
  sort: z.union([z.string(), z.null()]),
})),
  filterModel: z.object({
  items: z.array(z.object({
  field: z.string().optional(),
  operator: z.string().optional(),
  value: z.unknown().optional(),
})),
  logicOperator: z.string(),
}),
  quickFilterValue: z.string(),
  columnVisibilityModel: z.record(z.string(), z.boolean()),
  pinnedColumns: z.object({
  left: z.array(z.string()),
  right: z.array(z.string()),
}),
  columnOrder: z.array(z.string()),
  columnGroupingModel: z.array(z.record(z.string(), z.unknown())),
  rowGroupingModel: z.array(z.string()),
  aggregationModel: z.record(z.string(), z.string()),
  pivotModel: z.union([z.object({
  rows: z.array(z.string()),
  columns: z.array(z.string()),
  values: z.array(z.object({
  field: z.string(),
  fn: z.string(),
})),
}), z.null()]),
  listViewColumn: z.union([z.unknown() /* TODO: ref ColumnDef */, z.null()]),
  paginationModel: z.object({
  page: z.number(),
  pageSize: z.number(),
}),
  rowSelectionModel: z.array(z.unknown()),
  selectedRows: z.array(z.unknown() /* TODO: ref Row */),
  selectedIndices: z.array(z.number()),
  cellSelectionModel: z.union([z.object({
  start: z.object({
  id: z.unknown(),
  field: z.string(),
}),
  end: z.object({
  id: z.unknown(),
  field: z.string(),
}),
}), z.null()]),
  hooks: z.record(z.string(), z.unknown()),
  density: z.string(),
  editMode: z.union([z.literal('cell'), z.literal('row')]),
  listView: z.boolean(),
  loading: z.boolean(),
  setSortModel: z.function({ input: [z.array(z.object({
  field: z.string(),
  sort: z.union([z.string(), z.null()]),
}))], output: z.void() }),
  setFilterModel: z.function({ input: [z.object({
  items: z.array(z.object({
  field: z.string().optional(),
  operator: z.string().optional(),
  value: z.unknown().optional(),
})).optional(),
  logicOperator: z.string().optional(),
})], output: z.void() }),
  pinColumn: z.function({ input: [z.string(), z.union([z.literal('left'), z.literal('right'), z.null()])], output: z.void() }),
  autosizeColumns: z.function({ input: [], output: z.void() }),
  setColumnVisibility: z.function({ input: [z.string(), z.boolean()], output: z.void() }),
  setRowGroupingModel: z.function({ input: [z.array(z.string())], output: z.void() }),
  setDensity: z.function({ input: [z.string()], output: z.void() }),
  expandAll: z.function({ input: [], output: z.void() }),
  collapseAll: z.function({ input: [], output: z.void() }),
  setQuickFilter: z.function({ input: [z.string()], output: z.void() }),
  setPage: z.function({ input: [z.number()], output: z.void() }),
  setPageSize: z.function({ input: [z.number()], output: z.void() }),
  selectAll: z.function({ input: [z.boolean()], output: z.void() }),
  copySelectionToClipboard: z.function({ input: [], output: z.string() }),
  undo: z.function({ input: [], output: z.void() }),
  redo: z.function({ input: [], output: z.void() }),
  exportDataAsCsv: z.function({ input: [z.object({
  fileName: z.string().optional(),
})], output: z.void() }),
  exportDataAsExcel: z.function({ input: [z.object({
  fileName: z.string().optional(),
})], output: z.void() }),
  exportDataAsPrint: z.function({ input: [], output: z.void() }),
}));
export type DataGridElement = z.infer<typeof DataGridElementSchema>;

