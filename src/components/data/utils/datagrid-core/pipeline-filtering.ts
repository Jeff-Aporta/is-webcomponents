/**
 * datagrid-core/pipeline-filtering — Filtros por columna + quick filter.
 *
 *   - filterRows(rows, filterModel, quickFilter, columns, colById)
 *       Devuelve las filas que pasan TODOS los filtros activos + quick filter.
 *   - uniqueValues(rows, col)
 *       Para set filter (lista de valores únicos ordenados).
 *
 * Operadores soportados (discriminados por ColumnFilter.type):
 *   text   : contains | notContains | equals | notEqual | startsWith | endsWith | blank | notBlank
 *   number : eq | neq | gt | gte | lt | lte | inRange | blank | notBlank
 *   date   : eq | before | after | inRange
 *   set    : values[]   (la fila pasa si cellText está en values)
 */

import { cellText, getCellValue } from './value-formatter.js';
import type { ColumnFilter, ColumnState, DateFilter, EvaluadoresFiltro, FiltroExterno, FilterModel, NumberFilter, RowNode, SetFilter, TextFilter } from "@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js";

function toNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toTime(v: unknown): number | null {
  if (v == null || v === '') return null;
  const t = v instanceof Date ? v.getTime() : new Date(String(v)).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * @param {string} raw
 * @param {TextFilter} f
 * @returns {boolean}
 */
function matchText(raw: string, f: TextFilter) {
  const hay = raw.toLowerCase();
  const needle = (f.value ?? '').toLowerCase();
  switch (f.op) {
    case 'contains': return hay.includes(needle);
    case 'notContains': return !hay.includes(needle);
    case 'equals': return hay === needle;
    case 'notEqual': return hay !== needle;
    case 'startsWith': return hay.startsWith(needle);
    case 'endsWith': return hay.endsWith(needle);
    case 'blank': return raw.trim() === '';
    case 'notBlank': return raw.trim() !== '';
    default: return true;
  }
}

/**
 * @param {unknown} value
 * @param {NumberFilter} f
 * @returns {boolean}
 */
function matchNumber(value: unknown, f: NumberFilter) {
  const n = toNum(value);
  if (f.op === 'blank') return n === null;
  if (f.op === 'notBlank') return n !== null;
  if (n === null) return false;
  const a = f.value ?? null;
  if (a === null && f.op !== 'inRange') return true;
  switch (f.op) {
    case 'eq': return n === a;
    case 'neq': return n !== a;
    case 'gt': return a !== null && n > a;
    case 'gte': return a !== null && n >= a;
    case 'lt': return a !== null && n < a;
    case 'lte': return a !== null && n <= a;
    case 'inRange': return (a === null || n >= a) && (f.to == null || n <= f.to);
    default: return true;
  }
}

/**
 * @param {unknown} value
 * @param {DateFilter} f
 * @returns {boolean}
 */
function matchDate(value: unknown, f: DateFilter) {
  const t = toTime(value);
  if (t === null) return false;
  const a = toTime(f.value);
  switch (f.op) {
    case 'eq': return a !== null && new Date(t).toISOString().slice(0, 10) === new Date(a).toISOString().slice(0, 10);
    case 'before': return a !== null && t < a;
    case 'after': return a !== null && t > a;
    case 'inRange': {
      const b = toTime(f.to ?? '');
      return (a === null || t >= a) && (b === null || t <= b);
    }
    default: return true;
  }
}

/**
 * @param {ColumnState} col
 * @param {RowNode} node
 * @param {ColumnFilter} f
 * @returns {boolean}
 */
function matchOne(col: ColumnState, node: RowNode, f: ColumnFilter, evaluadores?: EvaluadoresFiltro): boolean {
  const propio = evaluadores?.get(f.type);
  if (propio) return propio(f, getCellValue(col, node), cellText(col, node), node, col);
  if (f.type === 'combined') {
    const hijos = f.conditions.map((c) => matchOne(col, node, c, evaluadores));
    return f.op === 'OR' ? hijos.some(Boolean) : hijos.every(Boolean);
  }
  if (f.type === 'set') return f.values.length === 0 || conjuntoDe(f).has(cellText(col, node));
  if (f.type === 'text') return matchText(cellText(col, node), f);
  if (f.type === 'number') return matchNumber(getCellValue(col, node), f);
  if (f.type === 'date') return matchDate(getCellValue(col, node), f);
  return true;
}

/** Texto de busqueda por fila, cacheado por objeto de datos: una transaccion lo invalida sola. */
const cacheRapido = new WeakMap<object, { firma: string; texto: string }>();
function textoRapido(node: RowNode, cols: ColumnState[], firma: string): string {
  const previo = cacheRapido.get(node.data);
  if (previo?.firma === firma) return previo.texto;
  const texto = cols.map((c) => cellText(c, node)).join('\n').toLowerCase();
  cacheRapido.set(node.data, { firma, texto });
  return texto;
}

/** Cada `values` se indexa una sola vez: con 100.000 filas `includes` por fila no escala. */
const conjuntos = new WeakMap<string[], Set<string>>();
function conjuntoDe(f: SetFilter): Set<string> {
  let c = conjuntos.get(f.values);
  if (!c) {
    c = new Set(f.values);
    conjuntos.set(f.values, c);
  }
  return c;
}

/**
 * @param {RowNode[]} rows
 * @param {FilterModel} filterModel
 * @param {string} quickFilter
 * @param {ColumnState[]} columns
 * @param {Map<string, ColumnState>} colById
 * @returns {RowNode[]}
 */
export function filterRows(rows: RowNode[], filterModel: FilterModel, quickFilter: string, columns: ColumnState[], colById: Map<string, ColumnState>, evaluadores?: EvaluadoresFiltro, externo?: FiltroExterno | null) {
  const entries = Object.entries(filterModel);
  const q = quickFilter.trim().toLowerCase();
  if (!entries.length && !q && !externo) return rows;
  const visibleCols = columns.filter((c) => !c.hide);
  const firma = visibleCols.map((c) => c.colId).join('|');
  return rows.filter((node) => {
    for (const [colId, f] of entries) {
      const col = colById.get(colId);
      if (col && !matchOne(col, node, f, evaluadores)) return false;
    }
    if (externo && !externo(node)) return false;
    if (q) {
      if (!textoRapido(node, visibleCols, firma).includes(q)) return false;
    }
    return true;
  });
}

