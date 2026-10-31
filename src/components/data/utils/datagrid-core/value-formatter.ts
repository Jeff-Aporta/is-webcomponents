/**
 * datagrid-core/value-formatter — Obtención y formato de valores de celda.
 *
 * Sin DOM, sin React. Helpers puros que la capa de render usa para:
 *   - getCellValue(col, node) → valor crudo (respeta valueGetter del def).
 *   - formatCellValue(col, value, node) → texto para mostrar (respeta valueFormatter).
 *   - cellText(col, node) → texto para búsqueda/quick-filter/export.
 *   - formatValue(col, value) → texto sin nodo (etiquetas de grupo).
 */

import { ColumnType } from './types.js';
import type { ColumnState, Lectora, RowNode } from "../../schemas/datagrid-types.schemas.js";

/**
 * @param {ColumnState} col
 * @param {RowNode} node
 * @returns {unknown}
 */
export function getCellValue(col: ColumnState, node: RowNode) {
  const def = col.def as ColumnState['def'] & Lectora;
  if (def.__leer) return def.__leer.valor(col, node);
  if (typeof def.valueGetter === 'function') return def.valueGetter(node.data);
  return node.data?.[col.field];
}

/**
 * @param {ColumnState} col
 * @param {unknown} value
 * @param {RowNode} node
 * @returns {string}
 */
export function formatCellValue(col: ColumnState, value: unknown, node: RowNode) {
  const def = col.def;
  if (typeof def.valueFormatter === 'function') return def.valueFormatter(value, node.data);
  if (value == null || value === '') return '';
  if (col.type === ColumnType.NUMBER && typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }
  if (col.type === ColumnType.BOOLEAN) return value ? '✓' : '';
  if (col.type === ColumnType.DATE) {
    const d = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, 10);
  }
  return String(value);
}

/**
 * Texto plano para búsqueda/quick-filter/export.
 * @param {ColumnState} col
 * @param {RowNode} node
 * @returns {string}
 */
export function cellText(col: ColumnState, node: RowNode) {
  const lector = (col.def as Lectora).__leer;
  if (lector) return lector.texto(col, node);
  return formatCellValue(col, getCellValue(col, node), node);
}

/**
 * Texto para etiquetas de grupo (sin nodo, sin valueFormatter deprecado).
 * @param {ColumnState} col
 * @param {unknown} value
 * @returns {string}
 */
export function formatValue(col: ColumnState, value: unknown) {
  const def = col.def;
  if (typeof def.valueFormatter === 'function') {
    return def.valueFormatter(value, {});
  }
  if (value == null || value === '') return '';
  if (col.type === ColumnType.BOOLEAN) return value ? '✓' : '—';
  if (col.type === ColumnType.DATE) {
    const d = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, 10);
  }
  return String(value);
}
