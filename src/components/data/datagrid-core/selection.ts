/**
 * datagrid-core/selection — Gestión de selección de filas.
 *
 *   - toggleRowSelection(sel, rowId, mode, opts)
 *       Aplica la lógica single/multiple con modificadores (ctrl/shift).
 *   - selectAll(rows) → Set con todos los ids.
 *   - clearSelection() → Set vacío.
 *   - headerCheckboxState(sel, rows) → "all" | "none" | "some".
 *
 * Sin DOM. Las claves son row.id (proporcionado por getRowId del modelo).
 */

import { SelectionMode, HeaderCheckboxState } from './types.js';
import type { RowNode } from './types.js';
import type { SelectionModeName } from './types.js';

/**
 * Alterna la seleccion de una fila segun el modo.
 *
 * `mode` son los *valores* de `SelectionMode` (`'none'`, `'single'`…), no sus
 * claves. El JSDoc decia `keyof typeof SelectionMode` —o sea `'NONE'`,
 * `'SINGLE'`…— mientras el cuerpo comparaba contra `SelectionMode.NONE`.
 * Cualquiera que se fiara del tipo declarado pasaba `'NONE'` y la seleccion
 * seguia activa sin dar error.
 */
export function toggleRowSelection(
  selection: Set<string>,
  rowId: string,
  mode: SelectionModeName,
  opts: {
    additive?: boolean;
    range?: boolean;
    rangeFrom?: string;
    orderedIds?: string[];
  } = {},
): Set<string> {
  if (mode === SelectionMode.NONE) return selection;

  if (mode === SelectionMode.SINGLE) {
    const next = new Set<string>();
    if (!selection.has(rowId)) next.add(rowId);
    return next;
  }

  const next = new Set(selection);

  // Range con shift+click: desde rangeFrom hasta rowId en orderedIds.
  if (opts.range && opts.rangeFrom && opts.orderedIds) {
    const a = opts.orderedIds.indexOf(opts.rangeFrom);
    const b = opts.orderedIds.indexOf(rowId);
    if (a >= 0 && b >= 0) {
      const [lo, hi] = a < b ? [a, b] : [b, a];
      for (let i = lo; i <= hi; i++) {
        const id = opts.orderedIds[i];
        if (id) next.add(id);
      }
      return next;
    }
  }

  // Click simple en multi: si era la única seleccionada, la deselecciona;
  // si no, deja SOLO esta fila seleccionada.
  if (!opts.additive && !opts.range) {
    if (next.has(rowId) && next.size === 1) {
      next.delete(rowId);
      return next;
    }
    next.clear();
    next.add(rowId);
    return next;
  }

  // additive/ctrl: toggle normal.
  if (next.has(rowId)) next.delete(rowId);
  else next.add(rowId);
  return next;
}

/**
 * @param {RowNode[]} rows
 * @returns {Set<string>}
 */
export function selectAll(rows: RowNode[]) {
  return new Set(rows.map((r) => r.id));
}

/**
 * @returns {Set<string>}
 */
export function clearSelection() {
  return new Set();
}

/**
 * Estado del checkbox del header: all / none / some.
 *
 * @param {Set<string>} selection
 * @param {RowNode[]} rows
 * @returns {'all'|'none'|'some'}
 */
export function headerCheckboxState(selection: Set<string>, rows: RowNode[]) {
  if (!rows.length) return HeaderCheckboxState.NONE;
  let sel = 0;
  for (const r of rows) if (selection.has(r.id)) sel++;
  if (sel === 0) return HeaderCheckboxState.NONE;
  if (sel === rows.length) return HeaderCheckboxState.ALL;
  return HeaderCheckboxState.SOME;
}
