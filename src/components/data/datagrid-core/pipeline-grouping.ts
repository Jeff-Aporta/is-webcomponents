/**
 * datagrid-core/pipeline-grouping — Agrupación de filas + agregación.
 *
 *   - buildDisplayRows(leaves, rowGroupCols, colById, expandedGroups)
 *       Convierte las hojas ordenadas/filtradas en filas de display = grupos + hojas,
 *       respetando la expansión actual.
 *   - collectGroupIds(leaves, rowGroupCols, colById)
 *       Recolecta todos los ids de grupo (expandAllGroups).
 *
 * Cada GroupRow tiene:
 *   - id       : ruta única ('colId=value|colId=value…') para expandir/colapsar.
 *   - level    : profundidad (0 = raíz).
 *   - count    : nº de hojas descendientes.
 *   - agg      : { [colId]: aggregatedValue } para cada columna con aggFunc.
 *   - leafIds  : ids de las hojas descendientes (rango de selección).
 *
 * Compatible con mimicus-react core/pipeline/grouping.ts.
 */

import { AggFunc } from './types.js';
import { getCellValue, formatValue } from './value-formatter.js';
import type { ColumnState, DisplayRow, RowNode } from './types.js';

/**
 * @param {string} fn
 * @param {unknown[]} values
 * @returns {unknown}
 */
function applyAgg(fn: string, values: unknown[]) {
  if (fn === AggFunc.COUNT) return values.length;
  if (fn === AggFunc.FIRST) return values.length ? values[0] : null;
  if (fn === AggFunc.LAST) return values.length ? values[values.length - 1] : null;
  // El guardia va como predicado: sin el, `filter` deja `unknown[]` y las
  // cuatro agregaciones de abajo no pueden sumar ni comparar.
  const nums = values.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
  if (!nums.length) return null;
  if (fn === AggFunc.SUM) return nums.reduce((a, b) => a + b, 0);
  if (fn === AggFunc.AVG) return nums.reduce((a, b) => a + b, 0) / nums.length;
  if (fn === AggFunc.MIN) return Math.min(...nums);
  if (fn === AggFunc.MAX) return Math.max(...nums);
  return null;
}

/**
 * @param {RowNode[]} leaves
 * @param {Map<string, ColumnState>} colById
 * @returns {Record<string, unknown>}
 */
function aggregateGroup(leaves: RowNode[], colById: Map<string, ColumnState>): Record<string, unknown> {
  const agg: Record<string, unknown> = {};
  for (const col of colById.values()) {
    if (!col.aggFunc) continue;
    agg[col.colId] = applyAgg(col.aggFunc, leaves.map((n) => getCellValue(col, n)));
  }
  return agg;
}

/**
 * @param {RowNode[]} leaves
 * @param {ColumnState} col
 * @returns {Array<{value: unknown, label: string, leaves: RowNode[]}>}
 */
/** Un valor distinto de la columna, con las hojas que lo comparten. */
interface Cubo {
  value: unknown;
  label: string;
  leaves: RowNode[];
}

function groupLevel(leaves: RowNode[], col: ColumnState): Cubo[] {
  const map = new Map<string, Cubo>();
  for (const node of leaves) {
    const value = getCellValue(col, node);
    const key = String(value ?? '');
    let g = map.get(key);
    if (!g) {
      g = { value, label: formatValue(col, value) || '(vacío)', leaves: [] };
      map.set(key, g);
    }
    g.leaves.push(node);
  }
  return [...map.values()];
}

/**
 * @param {RowNode[]} leaves
 * @param {string[]} rowGroupCols
 * @param {Map<string, ColumnState>} colById
 * @param {Set<string>} expandedGroups
 * @returns {DisplayRow[]}
 */
export function buildDisplayRows(
  leaves: RowNode[],
  rowGroupCols: string[],
  colById: Map<string, ColumnState>,
  expandedGroups: Set<string>,
): DisplayRow[] {
  if (!rowGroupCols.length) {
    return leaves.map((node) => ({ kind: 'leaf', level: 0, node }));
  }
  const out: DisplayRow[] = [];
  const walk = (rows: RowNode[], depth: number, prefix: string): void => {
    const colId = rowGroupCols[depth];
    if (colId == null) return;
    const col = colById.get(colId);
    if (!col) return;
    for (const g of groupLevel(rows, col)) {
      const id = prefix ? `${prefix}|${colId}=${String(g.value ?? '')}` : `${colId}=${String(g.value ?? '')}`;
      const expanded = expandedGroups.has(id);
      out.push({
        kind: 'group',
        id,
        colId,
        field: col.field,
        value: g.value,
        label: g.label,
        level: depth,
        count: g.leaves.length,
        expanded,
        agg: aggregateGroup(g.leaves, colById),
        leafIds: g.leaves.map((n) => n.id),
      });
      if (!expanded) continue;
      if (depth + 1 < rowGroupCols.length) walk(g.leaves, depth + 1, id);
      else for (const node of g.leaves) out.push({ kind: 'leaf', level: depth + 1, node });
    }
  };
  walk(leaves, 0, '');
  return out;
}

/**
 * Ids de todos los grupos (todos los niveles) — para expandAllGroups.
 * @param {RowNode[]} leaves
 * @param {string[]} rowGroupCols
 * @param {Map<string, ColumnState>} colById
 * @returns {string[]}
 */
export function collectGroupIds(
  leaves: RowNode[],
  rowGroupCols: string[],
  colById: Map<string, ColumnState>,
): string[] {
  if (!rowGroupCols.length) return [];
  const ids: string[] = [];
  const walk = (rows: RowNode[], depth: number, prefix: string): void => {
    const colId = rowGroupCols[depth];
    if (colId == null) return;
    const col = colById.get(colId);
    if (!col) return;
    for (const g of groupLevel(rows, col)) {
      const id = prefix ? `${prefix}|${col.colId}=${String(g.value ?? '')}` : `${col.colId}=${String(g.value ?? '')}`;
      ids.push(id);
      if (depth + 1 < rowGroupCols.length) walk(g.leaves, depth + 1, id);
    }
  };
  walk(leaves, 0, '');
  return ids;
}
