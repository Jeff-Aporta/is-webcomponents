/**
 * datagrid-core/types — Motor agnóstico del <is-ag-grid>.
 *
 * Espejo del core mimicus-react (Jeff-Aporta/mimicus-react · src/datagrid/core/types.ts)
 * pero en JavaScript vanilla para web components. Sin React, sin ShadowDOM, sin DOM.
 * Sólo tipos/documentación en runtime (JSDoc) y constantes exportadas.
 *
 * Conceptos:
 *   - ColumnDef  : definición provista por el consumidor (field, header, type, ...).
 *   - ColumnState: estado resuelto tras aplicar defaults (width, sortable, pinned, ...).
 *   - FilterModel: mapa colId → ColumnFilter (text/number/date/set).
 *   - SortModel  : array de { colId, dir } (multi-sort).
 *   - RowNode    : { id, index, data } — nodo indexable para selección/teclado.
 *   - DisplayRow : union GroupRow | LeafRow (renderizable tras grouping).
 *   - GridState  : snapshot derivado de filter→sort→group→paginate.
 *   - GridApi    : store observable con subscribe().
 *
 * Capa de render encima (adentro de is-ag-grid.js) usa estos tipos para:
 *   - Estructurar columnas con resolveColumns() → ColumnState[].
 *   - Pintar celdas con getCellValue() + formatCellValue().
 *   - Renderizar ventana con rowWindow() + columnLayout().
 *   - Manejar selección con toggleRowSelection().
 */

/* ── Enums como Object.freeze para que `intent in ENUM` funcione en runtime ── */

export const ColumnType = Object.freeze({
  TEXT: 'text',
  NUMBER: 'number',
  DATE: 'date',
  BOOLEAN: 'boolean',
});

export const AggFunc = Object.freeze({
  SUM: 'sum',
  AVG: 'avg',
  MIN: 'min',
  MAX: 'max',
  COUNT: 'count',
  FIRST: 'first',
  LAST: 'last',
});

export const SortDir = Object.freeze({
  ASC: 'asc',
  DESC: 'desc',
});

export const PinSide = Object.freeze({
  LEFT: 'left',
  RIGHT: 'right',
});

export const Align = Object.freeze({
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
});

export const Density = Object.freeze({
  COMPACT: 'compact',
  NORMAL: 'normal',
  COMFORTABLE: 'comfortable',
});

export const SelectionMode = Object.freeze({
  NONE: 'none',
  SINGLE: 'single',
  MULTIPLE: 'multiple',
});

export const FilterType = Object.freeze({
  TEXT: 'text',
  NUMBER: 'number',
  DATE: 'date',
  SET: 'set',
});

export const HeaderCheckboxState = Object.freeze({
  ALL: 'all',
  NONE: 'none',
  SOME: 'some',
});

/* ── Default constants ──────────────────────────────────────────────────── */

export const DEFAULT_COL_WIDTH = 160;
export const DEFAULT_MIN_WIDTH = 60;
export const DEFAULT_MAX_WIDTH = 2000;
export const DEFAULT_HEADER_HEIGHT = 44;
export const DEFAULT_ROW_HEIGHT = 40;
export const DEFAULT_PAGE_SIZE = 50;

export const DENSITY_ROW_HEIGHT = Object.freeze({
  [Density.COMPACT]: 32,
  [Density.NORMAL]: 40,
  [Density.COMFORTABLE]: 52,
});

/* ── Filtros ──────────────────────────────────────────────────────────── */

export type TextFilterOp =
  | 'contains' | 'notContains' | 'equals' | 'notEqual'
  | 'startsWith' | 'endsWith' | 'blank' | 'notBlank';
export type NumberFilterOp =
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'inRange' | 'blank' | 'notBlank';
export type DateFilterOp = 'eq' | 'before' | 'after' | 'inRange';

export type TextFilter = { type: 'text'; op: TextFilterOp; value: string; };
export type NumberFilter = { type: 'number'; op: NumberFilterOp; value: number | null; to?: number | null; };
export type DateFilter = { type: 'date'; op: DateFilterOp; value: string; to?: string; };
export type SetFilter = { type: 'set'; values: string[]; };

/** Discriminada por `type`: estrechar por ahí antes de leer `op`/`values`. */
export type ColumnFilter = TextFilter | NumberFilter | DateFilter | SetFilter;

/** Mapa colId → filtro activo. */
export type FilterModel = Record<string, ColumnFilter>;

/* ── Vocabularios ─────────────────────────────────────────────────────── */

export type ColumnTypeName = (typeof ColumnType)[keyof typeof ColumnType];
export type AggFuncName = (typeof AggFunc)[keyof typeof AggFunc];
export type SortDirName = (typeof SortDir)[keyof typeof SortDir];
export type PinSideName = (typeof PinSide)[keyof typeof PinSide];
export type AlignName = (typeof Align)[keyof typeof Align];
export type DensityName = (typeof Density)[keyof typeof Density];
export type SelectionModeName = (typeof SelectionMode)[keyof typeof SelectionMode];
export type FilterTypeName = (typeof FilterType)[keyof typeof FilterType];

/* ── Filas ────────────────────────────────────────────────────────────── */

/**
 * Una fila del consumidor. El motor no interpreta su contenido: solo lee los
 * campos que las columnas nombran, así que el valor queda en `unknown` y quien
 * lo use lo estrecha.
 */
export type RowData = Record<string, unknown>;

export type RowNode = { id: string; index: number; data: RowData; };
export type GroupRow = { kind: 'group'; id: string; colId: string; field: string; value: unknown; label: string; level: number; count: number; expanded: boolean; agg: Record<string, unknown>; leafIds: string[]; };
export type LeafRow = { kind: 'leaf'; level: number; node: RowNode; };

/** Discriminada por `kind`. */
export type DisplayRow = GroupRow | LeafRow;

/* ── Columnas ─────────────────────────────────────────────────────────── */

/** Definición de columna provista por el consumidor. */
export type ColumnDef = {
  /** Nombre del campo en `row.data`. */
  field: string;
  /** Id estable; por defecto, `field`. */
  colId?: string;
  /** Etiqueta de la cabecera; por defecto, `field`. */
  headerName?: string;
  /** Alias corto que usan los previews. */
  header?: string;
  /** Alias de ISP. */
  caption?: string;
  /**
   * `currency` y `dateTime` no estan en `ColumnType` pero el motor los trata
   * por paridad con ISP: el primero comparte el filtro numerico y el segundo
   * el de fecha (ver `defaultFilterFor`). Dejarlos fuera del tipo convertia
   * esas dos ramas en codigo inalcanzable segun el compilador.
   */
  type?: ColumnTypeName | 'currency' | 'dateTime';
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  /** Si es > 0, reparte el espacio sobrante del viewport. */
  flex?: number;
  sortable?: boolean;
  resizable?: boolean;
  /** `false` desactiva; `true` usa el filtro por defecto del tipo. */
  filter?: boolean | FilterTypeName;
  pinned?: PinSideName | null;
  hide?: boolean;
  /** Por defecto `right` en numéricas, `left` en el resto. */
  align?: AlignName;
  /** Agrupa por esta columna desde el arranque. */
  rowGroup?: boolean;
  /** Permite arrastrarla al panel de agrupación. Por defecto, sí. */
  enableRowGroup?: boolean;
  aggFunc?: AggFuncName;
  checkboxSelection?: boolean;
  valueGetter?: (row: RowData) => unknown;
  valueFormatter?: (value: unknown, row: RowData) => string;
  comparator?: (a: unknown, b: unknown, ra: RowData, rb: RowData) => number;
  cellClass?: string;
  headerClass?: string;
  /** Edición por prompt al hacer clic (legado). */
  editable?: boolean;
};

/** Estado resuelto de una columna: lo que gestiona el motor. */
export type ColumnState = { colId: string; field: string; headerName: string; type: ColumnTypeName | 'currency' | 'dateTime'; width: number; minWidth: number; maxWidth: number; flex?: number; sortable: boolean; resizable: boolean; filterType: FilterTypeName | null; pinned: PinSideName | null; hide: boolean; align: AlignName; enableRowGroup: boolean; aggFunc: AggFuncName | null; checkboxSelection: boolean; def: ColumnDef; };

export type SortModelItem = { colId: string; dir: SortDirName };
export type SortModel = SortModelItem[];

/* ── Motor ────────────────────────────────────────────────────────────── */

export type GridOptions = {
  columns: ColumnDef[];
  rows: RowData[];
  getRowId?: (row: RowData, index: number) => string;
  rowHeight?: number;
  headerHeight?: number;
  selectionMode?: SelectionModeName;
  pagination?: boolean;
  pageSize?: number;
  quickFilter?: string;
  density?: DensityName;
  defaultColWidth?: number;
  rowGroupCols?: string[];
  /** -1 = todos los niveles, 0 = ninguno, N = N niveles. */
  groupDefaultExpanded?: number;
};

/** Snapshot derivado tras el pipeline filtrar → ordenar → agrupar → paginar. */
export type GridState = {
  columns: ColumnState[];
  sortModel: SortModel;
  filterModel: FilterModel;
  quickFilter: string;
  selection: Set<string>;
  density: DensityName;
  pagination: boolean;
  page: number;
  pageSize: number;
  /** Filtradas y ordenadas, sin paginar. */
  displayedRows: RowNode[];
  /** Filas de la página actual. */
  pageRows: RowNode[];
  rowGroupCols: string[];
  expandedGroups: Set<string>;
  /** Vista renderizable: grupos y hojas. */
  displayRows: DisplayRow[];
  /** Vista renderizable de la página actual. */
  pageDisplayRows: DisplayRow[];
  totalRows: number;
};

export type GridListener = (state: GridState, reason?: string) => void;

/**
 * Store observable del motor. `createGridModel` la devuelve y es todo lo que
 * la capa de render necesita: no se accede al estado interno por fuera.
 */
export type GridApi = {
  getState(): GridState;
  /** Devuelve la funcion para darse de baja. */
  subscribe(fn: GridListener): () => void;

  setRows(rows: RowData[] | null | undefined): void;
  setColumnDefs(defs: ColumnDef[] | null | undefined): void;
  setSortModel(model: SortModel): void;
  toggleSort(colId: string, additive?: boolean): void;
  setFilter(colId: string, filter: ColumnFilter | null): void;
  setQuickFilter(text: string): void;
  setSelection(ids: Iterable<string>): void;
  setDensity(d: DensityName): void;
  setPage(page: number): void;
  setPageSize(size: number): void;

  resizeColumn(colId: string, width: number): void;
  pinColumn(colId: string, side: PinSideName | null): void;
  hideColumn(colId: string, hide: boolean): void;
  reorderColumn(colId: string, toIndex: number): void;
  autosizeColumn(colId: string): void;

  setRowGroupCols(colIds: string[]): void;
  addRowGroupCol(colId: string, index?: number): void;
  removeRowGroupCol(colId: string): void;
  toggleGroup(groupId: string): void;
  expandAllGroups(): void;
  collapseAllGroups(): void;

  getColumns(): ColumnState[];
  getDisplayedRows(): RowNode[];
  getAllRows(): RowNode[];

  serializeState(): string;
  loadState(json: string): void;
};
