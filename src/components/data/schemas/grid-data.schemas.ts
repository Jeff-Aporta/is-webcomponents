// @contexto INDICE.md · src/components/data/README.md
/**
 * grid-data.schemas.ts — Tipos del pipeline de datos del data grid: columnas
 * resueltas, modelos de filtro, orden, agrupación, árbol y pivot.
 *
 * Los tipos que secledan entre si (árbol, columna) se declaran a mano: zod no
 * puede expresar esa recursion (mismo criterio que `GridApi` en
 * `datagrid-types.schemas.ts`).
 */
import { z } from 'zod';
import type {
  CellValue,
  ColumnDef,
  ColumnTypeName,
  Comparator,
  FilterRule,
  Operator,
  Row,
} from './grid-types.schemas.js';

/** Normalización de columnas: defaults del grid. */
const NormalizeOptionsSchema = z.object({
  defaultWidth: z.number().optional(),
  editableAll: z.boolean().optional(),
});
export type NormalizeOptions = z.infer<typeof NormalizeOptionsSchema>;

/**
 * Columna con los defaults aplicados: misma forma que `ColumnDef` pero con
 * los campos que el grid siempre necesita ya resueltos.
 */
export type ResolvedColumn = ColumnDef & {
  field: string;
  type: ColumnTypeName;
  headerName: string;
  align: string;
  headerAlign: string;
  width: number;
  minWidth: number;
  maxWidth: number;
  flex: number;
  sortable: boolean;
  filterable: boolean;
  editable: boolean;
  resizable: boolean;
  hideable: boolean;
  groupable: boolean;
  aggregable: boolean;
  comparator: Comparator;
  operators: Operator[];
};

/** Reglas de filtro del grid: lista de reglas + operador lógico. */
export type FilterModel = {
  items: FilterRule[];
  logicOperator?: 'and' | 'or';
};

/** Una entrada de ordenación: la columna y el sentido (`asc` / `desc`). */
const SortModelItemSchema = z.object({
  field: z.string(),
  sort: z.string().nullable(),
});
export type SortModelItem = z.infer<typeof SortModelItemSchema>;

/** Modelo de pivot: qué columnas van en filas, en columnas y qué se agrega. */
export type PivotModel = {
  rows?: string[];
  columns?: string[];
  values?: Array<{ field: string; fn: string }>;
};

const AggregationModelSchema = z.record(z.string(), z.string());
export type AggregationModel = z.infer<typeof AggregationModelSchema>;

/** Contexto que se pasa a los callbacks de celda. */
const FilterCtxSchema = z.unknown();
export type FilterCtx = z.infer<typeof FilterCtxSchema>;

/** Opciones para construir el árbol de filas. */
export type BuildTreeOpts = {
  paths: (row: Row, index: number) => readonly (string | number)[];
  getRowId: (row: Row, index: number) => CellValue;
};

/** Opciones de `applyFilters`. */
export type ApplyFiltersOpts = {
  model?: FilterModel;
  quick?: string;
  columns: ResolvedColumn[];
  ctx: FilterCtx;
  quickLogic?: 'and' | 'or';
};

/** Nodo del árbol de filas. */
export type TreeNode = {
  kind: 'leaf' | 'group';
  id: CellValue;
  key?: string | number;
  depth: number;
  path: readonly (string | number)[];
  parent: TreeNode | null;
  children: TreeNode[];
  rows: Row[];
  row?: Row;
  leafRow?: Row | null;
  aggregates?: Record<string, { value: CellValue; fn: string }>;
};

/** Resultado de `pivotData`. */
export type PivotResult = { rows: Row[]; columns: ColumnDef[]; colKeys: string[] };
