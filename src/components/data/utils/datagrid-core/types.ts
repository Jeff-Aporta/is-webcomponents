/**
 * datagrid-core/types — Motor agnóstico del <iswc-ag-grid>.
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
 * Capa de render encima (adentro de iswc-ag-grid.js) usa estos tipos para:
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

export const PinSide = Object.freeze({
  LEFT: 'left',
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
export const DEFAULT_PAGE_SIZE = 50;

/* ── Filtros ──────────────────────────────────────────────────────────── */

/** Discriminada por `type`: estrechar por ahí antes de leer `op`/`values`. */

/** Mapa colId → filtro activo. */

/* ── Vocabularios ─────────────────────────────────────────────────────── */

/* ── Filas ────────────────────────────────────────────────────────────── */

/**
 * Una fila del consumidor. El motor no interpreta su contenido: solo lee los
 * campos que las columnas nombran, así que el valor queda en `unknown` y quien
 * lo use lo estrecha.
 */

/** Discriminada por `kind`. */

/* ── Columnas ─────────────────────────────────────────────────────────── */

/** Definición de columna provista por el consumidor. */

/** Estado resuelto de una columna: lo que gestiona el motor. */

/* ── Motor ────────────────────────────────────────────────────────────── */

/** Snapshot derivado tras el pipeline filtrar → ordenar → agrupar → paginar. */

/**
 * Store observable del motor. `createGridModel` la devuelve y es todo lo que
 * la capa de render necesita: no se accede al estado interno por fuera.
 */
