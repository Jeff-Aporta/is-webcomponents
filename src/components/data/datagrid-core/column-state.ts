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
import type { ColumnDef, ColumnState, RowNode } from './types.js';
import {
  ColumnType,
  PinSide,
  FilterType,
  DEFAULT_COL_WIDTH,
  DEFAULT_MIN_WIDTH,
  DEFAULT_MAX_WIDTH,
} from './types.js';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * @param {ColumnDef} def
 * @returns {keyof typeof FilterType|null}
 */
function defaultFilterFor(def: ColumnDef) {
  // Paridad ISP: bool → filtro de conjunto, dateTime → filtro de fecha,
  // currency comparte el filtro numérico.
  if (def.type === ColumnType.BOOLEAN) return FilterType.SET;
  if (def.type === ColumnType.NUMBER || def.type === 'currency') return FilterType.NUMBER;
  if (def.type === ColumnType.DATE || def.type === 'dateTime') return FilterType.DATE;
  return FilterType.TEXT;
}

/**
 * @param {ColumnDef} def
 * @returns {keyof typeof FilterType|null}
 */
function filterTypeOf(def: ColumnDef) {
  if (def.filter === false || def.filter == null) {
    return def.filter === undefined ? defaultFilterFor(def) : null;
  }
  if (def.filter === true) return defaultFilterFor(def) ?? FilterType.TEXT;
  return def.filter;
}

/**
 * @param {string} [type]
 * @returns {'left'|'center'|'right'}
 */
function defaultAlignFor(type: string) {
  if (type === ColumnType.NUMBER || type === 'currency') return 'right';
  if (type === ColumnType.BOOLEAN) return 'center';
  return 'left';
}

/**
 * Convierte ColumnDef[] en ColumnState[] con todos los defaults aplicados.
 * @param {ColumnDef[]} defs
 * @param {number} [defaultColWidth]
 * @returns {ColumnState[]}
 */
export function resolveColumns(defs: ColumnDef[], defaultColWidth: number = DEFAULT_COL_WIDTH) {
  return (defs ?? []).map((def, i) => ({
    colId: def.colId ?? def.field ?? `col-${i}`,
    field: def.field,
    // `header` es el alias corto que usan los previews y `caption` el de ISP.
    headerName: def.headerName ?? def.header ?? def.caption ?? def.field,
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
    // Alineación por defecto según ISP: números/moneda a la derecha,
    // booleanos centrados, el resto a la izquierda.
    align: def.align ?? defaultAlignFor(def.type),
    enableRowGroup: def.enableRowGroup !== false,
    aggFunc: def.aggFunc ?? null,
    checkboxSelection: def.checkboxSelection === true,
    def,
  }));
}

/**
 * @param {ColumnState[]} cols
 * @param {string} colId
 * @param {number} width
 * @returns {ColumnState[]}
 */
export function setColumnWidth(cols: ColumnState[], colId: string, width: number) {
  return cols.map((c) =>
    c.colId === colId
      ? { ...c, width: clamp(Math.round(width), c.minWidth, c.maxWidth), flex: undefined }
      : c,
  );
}

/**
 * @param {ColumnState[]} cols
 * @param {string} colId
 * @param {'left'|'right'|null} pinned
 * @returns {ColumnState[]}
 */
export function setColumnPinned(cols: ColumnState[], colId: string, pinned: 'left'|'right'|null) {
  return cols.map((c) => (c.colId === colId ? { ...c, pinned } : c));
}

/**
 * @param {ColumnState[]} cols
 * @param {string} colId
 * @param {boolean} hide
 * @returns {ColumnState[]}
 */
export function setColumnHidden(cols: ColumnState[], colId: string, hide: boolean) {
  return cols.map((c) => (c.colId === colId ? { ...c, hide } : c));
}

/**
 * Mueve una columna a un nuevo índice (reorder por drag).
 * @param {ColumnState[]} cols
 * @param {string} colId
 * @param {number} toIndex
 * @returns {ColumnState[]}
 */
export function moveColumn(cols: ColumnState[], colId: string, toIndex: number) {
  const from = cols.findIndex((c) => c.colId === colId);
  if (from < 0) return cols;
  const next = cols.slice();
  const [moved] = next.splice(from, 1);
  if (moved) next.splice(clamp(toIndex, 0, next.length), 0, moved);
  return next;
}

/**
 * Autosize: ancho aproximado por contenido (texto más largo, en px estimados).
 * @param {ColumnState[]} cols
 * @param {string} colId
 * @param {RowNode[]} rows
 * @param {number} [charPx=7.4]
 * @param {number} [padding=28]
 * @returns {ColumnState[]}
 */
export function autosizeColumn(cols: ColumnState[], colId: string, rows: RowNode[], charPx: number = 7.4, padding: number = 28) {
  const col = cols.find((c) => c.colId === colId);
  if (!col) return cols;
  let max = col.headerName.length;
  for (const node of rows) max = Math.max(max, cellText(col, node).length);
  const width = clamp(Math.round(max * charPx + padding), col.minWidth, col.maxWidth);
  return setColumnWidth(cols, colId, width);
}

/**
 * Ordena columnas para layout: pinned-left, centro, pinned-right.
 * @param {ColumnState[]} cols
 * @returns {{left: ColumnState[], center: ColumnState[], right: ColumnState[]}}
 */
export function orderedForLayout(cols: ColumnState[]) {
  const visible = cols.filter((c) => !c.hide);
  return {
    left: visible.filter((c) => c.pinned === PinSide.LEFT),
    center: visible.filter((c) => !c.pinned),
    right: visible.filter((c) => c.pinned === PinSide.RIGHT),
  };
}
