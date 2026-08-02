/**
 * datagrid-core/column-state — Resolución y mutación de columnas.
 *
 * Maneja el ciclo de vida de las columnas: defaults, ancho, pin, hide, reorder,
 * autosize. Centraliza las reglas que usan:
 *   - resolveColumns(defs)       ← al construir el modelo o al cambiar setColumnDefs.
 *   - setColumnWidth(cols, ...)  ← resize via drag.
 *   - setColumnPinned(cols, ...) ← pin left/right vía HeaderMenu.
 *   - setColumnHidden(cols, ...).
 *   - moveColumn(cols, ...)      ← reorder via drag.
 *   - autosizeColumn(cols, ...)  ← ajusta al contenido más largo.
 *   - orderedForLayout(cols)     ← layout sticky/center split.
 */

import { cellText } from './value-formatter.js';
import {
  ColumnType,
  PinSide,
  FilterType,
  DEFAULT_COL_WIDTH,
  DEFAULT_MIN_WIDTH,
  DEFAULT_MAX_WIDTH,
} from './types.js';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * @param {import('./types.js').ColumnDef} def
 * @returns {keyof typeof FilterType|null}
 */
function defaultFilterFor(def) {
  if (def.type === ColumnType.NUMBER) return FilterType.NUMBER;
  if (def.type === ColumnType.DATE) return FilterType.DATE;
  return FilterType.TEXT;
}

/**
 * @param {import('./types.js').ColumnDef} def
 * @returns {keyof typeof FilterType|null}
 */
function filterTypeOf(def) {
  if (def.filter === false || def.filter == null) {
    return def.filter === undefined ? defaultFilterFor(def) : null;
  }
  if (def.filter === true) return defaultFilterFor(def) ?? FilterType.TEXT;
  return def.filter;
}

/**
 * Convierte ColumnDef[] en ColumnState[] con todos los defaults aplicados.
 * @param {import('./types.js').ColumnDef[]} defs
 * @param {number} [defaultColWidth]
 * @returns {import('./types.js').ColumnState[]}
 */
export function resolveColumns(defs, defaultColWidth = DEFAULT_COL_WIDTH) {
  return (defs ?? []).map((def, i) => ({
    colId: def.colId ?? def.field ?? `col-${i}`,
    field: def.field,
    headerName: def.headerName ?? def.field,
    type: def.type ?? ColumnType.TEXT,
    width: def.width ?? defaultColWidth,
    minWidth: def.minWidth ?? DEFAULT_MIN_WIDTH,
    maxWidth: def.maxWidth ?? DEFAULT_MAX_WIDTH,
    flex: def.flex,
    sortable: def.sortable !== false,
    resizable: def.resizable !== false,
    filterType: def.filter === false ? null : filterTypeOf(def),
    pinned: def.pinned ?? null,
    hide: def.hide === true,
    align: def.align ?? (def.type === ColumnType.NUMBER ? 'right' : 'left'),
    enableRowGroup: def.enableRowGroup !== false,
    aggFunc: def.aggFunc ?? null,
    checkboxSelection: def.checkboxSelection === true,
    def,
  }));
}

/**
 * @param {import('./types.js').ColumnState[]} cols
 * @param {string} colId
 * @param {number} width
 * @returns {import('./types.js').ColumnState[]}
 */
export function setColumnWidth(cols, colId, width) {
  return cols.map((c) =>
    c.colId === colId
      ? { ...c, width: clamp(Math.round(width), c.minWidth, c.maxWidth), flex: undefined }
      : c,
  );
}

/**
 * @param {import('./types.js').ColumnState[]} cols
 * @param {string} colId
 * @param {'left'|'right'|null} pinned
 * @returns {import('./types.js').ColumnState[]}
 */
export function setColumnPinned(cols, colId, pinned) {
  return cols.map((c) => (c.colId === colId ? { ...c, pinned } : c));
}

/**
 * @param {import('./types.js').ColumnState[]} cols
 * @param {string} colId
 * @param {boolean} hide
 * @returns {import('./types.js').ColumnState[]}
 */
export function setColumnHidden(cols, colId, hide) {
  return cols.map((c) => (c.colId === colId ? { ...c, hide } : c));
}

/**
 * Mueve una columna a un nuevo índice (reorder por drag).
 * @param {import('./types.js').ColumnState[]} cols
 * @param {string} colId
 * @param {number} toIndex
 * @returns {import('./types.js').ColumnState[]}
 */
export function moveColumn(cols, colId, toIndex) {
  const from = cols.findIndex((c) => c.colId === colId);
  if (from < 0) return cols;
  const next = cols.slice();
  const [moved] = next.splice(from, 1);
  if (moved) next.splice(clamp(toIndex, 0, next.length), 0, moved);
  return next;
}

/**
 * Autosize: ancho aproximado por contenido (texto más largo, en px estimados).
 * @param {import('./types.js').ColumnState[]} cols
 * @param {string} colId
 * @param {import('./types.js').RowNode[]} rows
 * @param {number} [charPx=7.4]
 * @param {number} [padding=28]
 * @returns {import('./types.js').ColumnState[]}
 */
export function autosizeColumn(cols, colId, rows, charPx = 7.4, padding = 28) {
  const col = cols.find((c) => c.colId === colId);
  if (!col) return cols;
  let max = col.headerName.length;
  for (const node of rows) max = Math.max(max, cellText(col, node).length);
  const width = clamp(Math.round(max * charPx + padding), col.minWidth, col.maxWidth);
  return setColumnWidth(cols, colId, width);
}

/**
 * Ordena columnas para layout: pinned-left, centro, pinned-right.
 * @param {import('./types.js').ColumnState[]} cols
 * @returns {{left: import('./types.js').ColumnState[], center: import('./types.js').ColumnState[], right: import('./types.js').ColumnState[]}}
 */
export function orderedForLayout(cols) {
  const visible = cols.filter((c) => !c.hide);
  return {
    left: visible.filter((c) => c.pinned === PinSide.LEFT),
    center: visible.filter((c) => !c.pinned),
    right: visible.filter((c) => c.pinned === PinSide.RIGHT),
  };
}
