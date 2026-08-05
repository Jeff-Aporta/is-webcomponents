/**
 * datagrid-core/pipeline-sorting — Orden multi-columna con comparadores por tipo.
 *
 *   - sortRows(rows, sortModel, colById) → rows ordenados (estable).
 *   - cycleSort(model, colId, additive)  → ciclo none→asc→desc→none.
 *
 * Para cada par (a, b) usa primero comparator de la colDef si existe,
 * luego defaultCompare(type) con:
 *   - number : resta numérica.
 *   - boolean: a-b (false=0, true=1).
 *   - date   : milliseconds.
 *   - text   : String(...).localeCompare(..., { numeric: true, sensitivity: 'base' }).
 */

import { ColumnType } from './types.js';
import { getCellValue } from './value-formatter.js';

/**
 * @param {unknown} a
 * @param {unknown} b
 * @param {string} type
 * @returns {number}
 */
function defaultCompare(a, b, type) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (type === ColumnType.NUMBER) return Number(a) - Number(b);
  if (type === ColumnType.BOOLEAN) return (a ? 1 : 0) - (b ? 1 : 0);
  if (type === ColumnType.DATE) {
    const ta = a instanceof Date ? a.getTime() : new Date(String(a)).getTime();
    const tb = b instanceof Date ? b.getTime() : new Date(String(b)).getTime();
    return (Number.isNaN(ta) ? 0 : ta) - (Number.isNaN(tb) ? 0 : tb);
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * @param {import('../types.js').RowNode[]} rows
 * @param {import('../types.js').SortModel} sortModel
 * @param {Map<string, import('../types.js').ColumnState>} colById
 * @returns {import('../types.js').RowNode[]}
 */
export function sortRows(rows, sortModel, colById) {
  if (!sortModel.length) return rows;
  const active = sortModel
    .map((s) => ({ col: colById.get(s.colId), dir: s.dir }))
    .filter((s) => Boolean(s.col));
  if (!active.length) return rows;
  // copia indexada para orden estable
  const indexed = rows.map((node, i) => ({ node, i }));
  indexed.sort((x, y) => {
    for (const { col, dir } of active) {
      const va = getCellValue(col, x.node);
      const vb = getCellValue(col, y.node);
      const c = typeof col.def.comparator === 'function'
        ? col.def.comparator(va, vb, x.node.data, y.node.data)
        : defaultCompare(va, vb, col.type);
      if (c !== 0) return dir === 'asc' ? c : -c;
    }
    return x.i - y.i;
  });
  return indexed.map((e) => e.node);
}

/**
 * Alterna el sort de una columna: none → asc → desc → none.
 * `additive=true` para multi-sort (preserva el resto del SortModel).
 *
 * @param {import('../types.js').SortModel} model
 * @param {string} colId
 * @param {boolean} additive
 * @returns {import('../types.js').SortModel}
 */
export function cycleSort(model, colId, additive) {
  const existing = model.find((s) => s.colId === colId);
  const next = additive ? model.filter((s) => s.colId !== colId) : [];
  if (!existing) return [...next, { colId, dir: 'asc' }];
  if (existing.dir === 'asc') return [...next, { colId, dir: 'desc' }];
  return next; // desc → quitar
}
