// @contexto INDICE.md · src/components/data/README.md
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
import type { SortDirName, ColumnState, RowNode, SortModel } from "@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js";

/** Normaliza el valor a algo barato de comparar: numero, texto o null. */
function claveOrden(v: unknown, type: string): number | string | null {
  if (v == null) return null;
  if (type === ColumnType.BOOLEAN) return v ? 1 : 0;
  if (type === ColumnType.DATE || type === 'dateTime') {
    const t = v instanceof Date ? v.getTime() : new Date(String(v)).getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  if (typeof v === 'number') return v;
  if (type === ColumnType.NUMBER || type === 'currency') return Number(v);
  return claveTexto(String(v));
}

/**
 * Clave comparable con `<`: sin mayusculas ni acentos y con los numeros
 * rellenos, para que 'a2' vaya antes de 'a10'. Un colador por comparacion
 * tardaba un segundo con 100.000 filas.
 */
function claveTexto(s: string): string {
  const base = s.toLowerCase();
  const plana = /[^\u0000-\u007f]/.test(base) ? base.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : base;
  return /\d/.test(plana) ? plana.replace(/\d+/g, (d) => d.padStart(15, '0')) : plana;
}

function compararClaves(a: number | string | null | undefined, b: number | string | null | undefined): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
  return String(a) < String(b) ? -1 : 1;
}

/**
 * @param {RowNode[]} rows
 * @param {SortModel} sortModel
 * @param {Map<string, ColumnState>} colById
 * @returns {RowNode[]}
 */
export function sortRows(rows: RowNode[], sortModel: SortModel, colById: Map<string, ColumnState>) {
  if (!sortModel.length) return rows;
  const active = sortModel
    .map((s) => ({ col: colById.get(s.colId), dir: s.dir }))
    // El predicado estrecha `col`: sin el, `filter` deja el `undefined` dentro
    // y cada uso de `col` mas abajo hay que volver a comprobarlo.
    .filter((s): s is { col: ColumnState; dir: SortDirName } => s.col != null);
  if (!active.length) return rows;
  // Las claves se calculan una vez por fila: repetir getCellValue y parsear
  // fechas dentro del comparador es lo que hacia lento ordenar 100.000 filas.
  const claves = active.map(({ col }) => rows.map((node) => claveOrden(getCellValue(col, node), String(col.type))));
  const orden = rows.map((_, i) => i);
  orden.sort((x, y) => {
    for (let k = 0; k < active.length; k++) {
      const { col, dir } = active[k]!;
      const fila = claves[k]!;
      const c = typeof col.def.comparator === 'function'
        ? (col.def.comparator as (a: unknown, b: unknown, na: RowNode, nb: RowNode, desc: boolean) => number)(getCellValue(col, rows[x]!), getCellValue(col, rows[y]!), rows[x]!, rows[y]!, dir === 'desc')
        : compararClaves(fila[x], fila[y]);
      if (c !== 0) return dir === 'asc' ? c : -c;
    }
    return x - y;
  });
  return orden.map((i) => rows[i]!);
}

/**
 * Alterna el sort de una columna: none → asc → desc → none.
 * `additive=true` para multi-sort (preserva el resto del SortModel).
 *
 * @param {SortModel} model
 * @param {string} colId
 * @param {boolean} additive
 * @returns {SortModel}
 */
export function cycleSort(model: SortModel, colId: string, additive: boolean): SortModel {
  const existing = model.find((s) => s.colId === colId);
  const next = additive ? model.filter((s) => s.colId !== colId) : [];
  // Sin el retorno declarado, `dir` se infiere como `string` y el resultado no
  // encaja en `SortModel`, que solo admite 'asc' | 'desc'.
  if (!existing) return [...next, { colId, dir: 'asc' }];
  if (existing.dir === 'asc') return [...next, { colId, dir: 'desc' }];
  return next; // desc → quitar
}
