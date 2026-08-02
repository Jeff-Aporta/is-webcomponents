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

/* ── Filter operators (Colección discriminada por tipo) ─────────────────── */

/** @typedef {'contains'|'notContains'|'equals'|'notEqual'|'startsWith'|'endsWith'|'blank'|'notBlank'} TextFilterOp */
/** @typedef {'eq'|'neq'|'gt'|'gte'|'lt'|'lte'|'inRange'|'blank'|'notBlank'} NumberFilterOp */
/** @typedef {'eq'|'before'|'after'|'inRange'} DateFilterOp */

/**
 * Definición de columna provista por el consumidor.
 * @typedef {Object} ColumnDef
 * @property {string} field              nombre del campo en row.data
 * @property {string} [colId]           id estable (default: field)
 * @property {string} [headerName]      etiqueta del header (default: field)
 * @property {keyof typeof ColumnType} [type]  text|number|date|boolean (default text)
 * @property {number} [width]           ancho en px (default 160)
 * @property {number} [minWidth]
 * @property {number} [maxWidth]
 * @property {number} [flex]            si >0, reparte el espacio restante del viewport
 * @property {boolean} [sortable]        default true
 * @property {boolean} [resizable]      default true
 * @property {boolean|keyof typeof FilterType} [filter]  false desactiva, true usa defaultFilterFor(type)
 * @property {keyof typeof PinSide} [pinned]  'left' | 'right' | null
 * @property {boolean} [hide]
 * @property {keyof typeof Align} [align]  default 'right' para number, 'left' para el resto
 * @property {boolean} [rowGroup]       agrupar por esta columna desde el inicio
 * @property {boolean} [enableRowGroup] permite arrastrarla al panel de agrupación (default true)
 * @property {keyof typeof AggFunc} [aggFunc]  para filas de grupo
 * @property {boolean} [checkboxSelection]  muestra checkbox en la celda
 * @property {(row: any) => unknown} [valueGetter]  override del row[field]
 * @property {(value: unknown, row: any) => string} [valueFormatter]
 * @property {(a: unknown, b: unknown, ra: any, rb: any) => number} [comparator]
 * @property {string} [cellClass]
 * @property {string} [headerClass]
 * @property {boolean} [editable]       permite prompt de edición al click (legacy)
 */

/**
 * Estado resuelto de una columna (lo que gestiona el motor).
 * @typedef {Object} ColumnState
 * @property {string} colId
 * @property {string} field
 * @property {string} headerName
 * @property {keyof typeof ColumnType} type
 * @property {number} width
 * @property {number} minWidth
 * @property {number} maxWidth
 * @property {number} [flex]
 * @property {boolean} sortable
 * @property {boolean} resizable
 * @property {keyof typeof FilterType|null} filterType
 * @property {keyof typeof PinSide} pinned
 * @property {boolean} hide
 * @property {keyof typeof Align} align
 * @property {boolean} enableRowGroup
 * @property {keyof typeof AggFunc|null} aggFunc
 * @property {boolean} checkboxSelection
 * @property {ColumnDef} def
 */

/** @typedef {{colId: string, dir: 'asc'|'desc'}} SortModelItem */
/** @typedef {SortModelItem[]} SortModel */

/** @typedef {{type: 'text', op: TextFilterOp, value: string}} TextFilter */
/** @typedef {{type: 'number', op: NumberFilterOp, value: number|null, to?: number|null}} NumberFilter */
/** @typedef {{type: 'date', op: DateFilterOp, value: string, to?: string}} DateFilter */
/** @typedef {{type: 'set', values: string[]}} SetFilter */
/** @typedef {TextFilter|NumberFilter|DateFilter|SetFilter} ColumnFilter */
/** @typedef {Record<string, ColumnFilter>} FilterModel */

/** @typedef {{id: string, index: number, data: any}} RowNode */

/** @typedef {{kind: 'group', id: string, colId: string, field: string, value: unknown, label: string, level: number, count: number, expanded: boolean, agg: Record<string, unknown>, leafIds: string[]}} GroupRow */
/** @typedef {{kind: 'leaf', level: number, node: RowNode}} LeafRow */
/** @typedef {GroupRow|LeafRow} DisplayRow */

/**
 * @typedef {Object} GridOptions
 * @property {ColumnDef[]} columns
 * @property {any[]} rows
 * @property {(row: any, index: number) => string} [getRowId]
 * @property {number} [rowHeight]
 * @property {number} [headerHeight]
 * @property {keyof typeof SelectionMode} [selectionMode]
 * @property {boolean} [pagination]
 * @property {number} [pageSize]
 * @property {string} [quickFilter]
 * @property {keyof typeof Density} [density]
 * @property {number} [defaultColWidth]
 * @property {string[]} [rowGroupCols]
 * @property {number} [groupDefaultExpanded]  -1 = todos, 0 = ninguno, N = N niveles
 */

/**
 * Snapshot derivado por el motor tras el pipeline filter→sort→group→paginate.
 * @typedef {Object} GridState
 * @property {ColumnState[]} columns
 * @property {SortModel} sortModel
 * @property {FilterModel} filterModel
 * @property {string} quickFilter
 * @property {Set<string>} selection
 * @property {keyof typeof Density} density
 * @property {boolean} pagination
 * @property {number} page
 * @property {number} pageSize
 * @property {RowNode[]} displayedRows   filas filtradas+ordenadas (sin paginar)
 * @property {RowNode[]} pageRows        filas de la página actual
 * @property {string[]} rowGroupCols
 * @property {Set<string>} expandedGroups
 * @property {DisplayRow[]} displayRows  vista renderizable (grupos + hojas)
 * @property {DisplayRow[]} pageDisplayRows  vista renderizable de la página
 * @property {number} totalRows
 */

/** @typedef {(state: GridState) => void} GridListener */
