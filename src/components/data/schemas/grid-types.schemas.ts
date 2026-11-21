// @contexto INDICE.md · src/components/data/README.md
/**
 * grid-types.schemas.ts — Tipos del data grid (superficie MUI X Data Grid):
 * valor de celda, fila, definición de columna, tipo de columna, operador de
 * filtro y función de agregación.
 *
 * Los esquemas son la fuente de la verdad: los consumidores heredan el tipo de
 * aquí (regla W54). Los callbacks con firma propia (`test`, `valueGetter`,
 * `renderCell`…) no se pueden expresar en zod, así que se declaran con
 * `z.custom` o como miembros de la interfaz — mismo patrón que
 * `datagrid-types.schemas.ts` (`GridApi`) y que `ag-grid/celdas.schemas.ts`.
 */
import { z } from 'zod';

/** El valor de una celda lo pone el consumidor: aqui no se supone nada de el. */
const CellValueSchema = z.unknown();
export type CellValue = z.infer<typeof CellValueSchema>;

/** Una fila: mapa columna -> valor. */
const RowSchema = z.record(z.string(), CellValueSchema);
export type Row = z.infer<typeof RowSchema>;

/**
 * El valor tecleado en un filtro, ya preparado por `prepareFilterValue`.
 * Escalar por defecto, lista si el operador declara `multiple`, par si declara
 * `range`.
 */
const FilterValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.array(z.number()),
]);
export type FilterValue = z.infer<typeof FilterValueSchema>;

/** Comparador de ordenacion: mismo contrato que `Array.prototype.sort`. */
const ComparatorSchema = z.custom<(a: CellValue, b: CellValue) => number>();
export type Comparator = z.infer<typeof ComparatorSchema>;

const ColumnTypeNameSchema = z.enum([
  'string',
  'number',
  'date',
  'dateTime',
  'boolean',
  'singleSelect',
  'actions',
]);
export type ColumnTypeName = z.infer<typeof ColumnTypeNameSchema>;

/**
 * Operador de filtro.
 *
 * `test` se declara con sintaxis de método a proposito: cada operador narrowa
 * el valor a su forma (texto, numero, lista, rango) y asi conviven en la misma
 * lista sin `any` ni casts. Los métodos son bivalentes en TypeScript, que es
 * justo lo que hace falta aqui.
 */
export interface Operator {
  value: string;
  label: string;
  input?: boolean;
  multiple?: boolean;
  range?: boolean;
  inputType?: string;
  test(value: CellValue, filter: FilterValue): boolean;
}

/** Forma en runtime de un operador (validación de configuraciones JSON). */
const OperatorSchema = z.custom<Operator>();

/** Contenido que puede devolver un render: nodo, texto o `{ html }`. */
type RenderContent = Node | string | { html?: string } | null | undefined;

/** Parámetros que recibe `renderCell`. */
interface CellRenderParams {
  value: CellValue;
  row: Row;
  id: CellValue;
  colDef: ColumnDef;
  field: string;
  api?: unknown;
  tabIndex?: number;
  hasFocus?: boolean;
}

/** Parámetros que recibe `cellClassName` cuando es función. */
interface CellClassParams {
  value: CellValue;
  row: Row;
  id: CellValue;
  colDef: ColumnDef;
}

/** Parámetros que recibe `renderHeader`. */
interface HeaderRenderParams {
  field: string;
  colDef: ColumnDef;
}

/** Parámetros que recibe `getActions`. */
interface ActionParams {
  row: Row;
  id: CellValue;
  colDef: ColumnDef;
}

/**
 * Acción por fila expuesta por `getActions`. El tipo de `api` lo fija quien
 * lo consume: el kit usa `IswcDataGrid`, el consumidor ve `unknown`.
 */
interface RowAction<TApi = unknown> {
  label?: string;
  icon?: string;
  onClick?: (params: { id: CellValue; row: Row; api: TApi }) => void;
  showInMenu?: boolean;
  disabled?: boolean;
}

/** Resultado de `preProcessEditCellProps`. */
interface EditCellProps {
  value?: CellValue;
  error?: unknown;
}

/** Parámetros que recibe `preProcessEditCellProps`. */
interface PreProcessEditParams {
  props: { value: CellValue };
  row: Row;
  id: CellValue;
  field: string;
}

/**
 * Columna tal y como la declara el consumidor del grid: los campos que el
 * esquema puede describir. Los callbacks van en la interfaz de abajo porque
 * se refers a la propia columna (y zod no puede expresar esa recursion).
 */
const ColumnDefSchema = z.object({
  field: z.string().optional(),
  type: ColumnTypeNameSchema.optional(),
  headerName: z.string().optional(),
  description: z.string().optional(),
  align: z.string().optional(),
  headerAlign: z.string().optional(),
  headerClassName: z.string().optional(),
  showTooltip: z.boolean().optional(),
  width: z.number().optional(),
  minWidth: z.number().optional(),
  maxWidth: z.number().optional(),
  flex: z.number().optional(),
  sortable: z.boolean().optional(),
  filterable: z.boolean().optional(),
  editable: z.boolean().optional(),
  resizable: z.boolean().optional(),
  hideable: z.boolean().optional(),
  groupable: z.boolean().optional(),
  aggregable: z.boolean().optional(),
  disableColumnMenu: z.boolean().optional(),
  /** Columna interna del grid (checkbox, grupo): no la ve el consumidor. */
  system: z.boolean().optional(),
  valueOptions: z.array(CellValueSchema).optional(),
  comparator: ComparatorSchema.optional(),
  sortComparator: ComparatorSchema.optional(),
  editor: z.string().optional(),
  operators: z.array(OperatorSchema).optional(),
  filterOperators: z.array(OperatorSchema).optional(),
  /** Columna de agrupamiento que el grid pinta él. */
  group: z.boolean().optional(),
});
type ColumnDefBase = z.infer<typeof ColumnDefSchema>;

/**
 * Columna tal y como la declara el consumidor del grid.
 *
 * Casi todo es opcional a proposito: solo `field` identifica la columna, y el
 * resto son anulaciones sobre lo que ya aporta su `type`. La forma esta sacada
 * de lo que data-grid y grid-data leen de verdad, no de la API de MUI X
 * completa, para que el tipo no prometa mas de lo que el kit soporta.
 */
export interface ColumnDef extends ColumnDefBase {
  cellClassName?: string | ((params: CellClassParams) => string | undefined);
  colSpan?: number | ((value: CellValue, row: Row, col: ColumnDef, ctx: unknown) => number);
  valueGetter?: (value: CellValue, row: Row, col: ColumnDef, ctx: unknown) => CellValue;
  valueFormatter?: (v: CellValue, row: Row, col: ColumnDef, ctx: unknown) => string;
  valueParser?: (v: CellValue, row: Row, col: ColumnDef) => CellValue;
  format?: (v: CellValue) => string;
  renderCell?: (params: CellRenderParams) => RenderContent;
  renderHeader?: (params: HeaderRenderParams) => RenderContent;
  getActions?: (params: ActionParams) => RowAction[];
  preProcessEditCellProps?: (
    params: PreProcessEditParams,
  ) => EditCellProps | Promise<EditCellProps | undefined> | undefined;
}

/** Defaults del tipo de columna: los que se aplican si la columna no los pisa. */
const ColumnTypeSchema = z.object({
  align: z.string().optional(),
  headerAlign: z.string().optional(),
  comparator: ComparatorSchema.optional(),
  operators: z.array(OperatorSchema).optional(),
  editor: z.string().optional(),
  format: z.custom<(v: CellValue) => string>().optional(),
  sortable: z.boolean().optional(),
  filterable: z.boolean().optional(),
  editable: z.boolean().optional(),
  resizable: z.boolean().optional(),
  hideable: z.boolean().optional(),
  groupable: z.boolean().optional(),
  aggregable: z.boolean().optional(),
  disableColumnMenu: z.boolean().optional(),
  width: z.number().optional(),
});
export type ColumnType = z.infer<typeof ColumnTypeSchema>;

/** Regla de filtro: sobre qué columna, con qué operador y qué valor. */
const FilterRuleSchema = z.object({
  field: z.string().optional(),
  operator: z.string().optional(),
  value: CellValueSchema.optional(),
});
export type FilterRule = z.infer<typeof FilterRuleSchema>;

/** Agregación por columna: `sum`, `avg`, `min`, `max`, `size`. */
const AggregationFnSchema = z.object({
  label: z.string(),
  types: z.array(z.string()).nullable().optional(),
  apply: z.custom<(values: readonly CellValue[], type?: string) => CellValue>(),
});
export type AggregationFn = z.infer<typeof AggregationFnSchema>;
