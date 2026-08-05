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

function toNum(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toTime(v) {
  if (v == null || v === '') return null;
  const t = v instanceof Date ? v.getTime() : new Date(String(v)).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * @param {string} raw
 * @param {import('../types.js').TextFilter} f
 * @returns {boolean}
 */
function matchText(raw, f) {
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
 * @param {import('../types.js').NumberFilter} f
 * @returns {boolean}
 */
function matchNumber(value, f) {
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
 * @param {import('../types.js').DateFilter} f
 * @returns {boolean}
 */
function matchDate(value, f) {
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
 * @param {import('../types.js').ColumnState} col
 * @param {import('../types.js').RowNode} node
 * @param {import('../types.js').ColumnFilter} f
 * @returns {boolean}
 */
function matchOne(col, node, f) {
  if (f.type === 'set') return f.values.length === 0 || f.values.includes(cellText(col, node));
  if (f.type === 'text') return matchText(cellText(col, node), f);
  if (f.type === 'number') return matchNumber(getCellValue(col, node), f);
  if (f.type === 'date') return matchDate(getCellValue(col, node), f);
  return true;
}

/**
 * @param {import('../types.js').RowNode[]} rows
 * @param {import('../types.js').FilterModel} filterModel
 * @param {string} quickFilter
 * @param {import('../types.js').ColumnState[]} columns
 * @param {Map<string, import('../types.js').ColumnState>} colById
 * @returns {import('../types.js').RowNode[]}
 */
export function filterRows(rows, filterModel, quickFilter, columns, colById) {
  const entries = Object.entries(filterModel);
  const q = quickFilter.trim().toLowerCase();
  if (!entries.length && !q) return rows;
  const visibleCols = columns.filter((c) => !c.hide);
  return rows.filter((node) => {
    for (const [colId, f] of entries) {
      const col = colById.get(colId);
      if (col && !matchOne(col, node, f)) return false;
    }
    if (q) {
      const hit = visibleCols.some((c) => cellText(c, node).toLowerCase().includes(q));
      if (!hit) return false;
    }
    return true;
  });
}

/**
 * Valores únicos de una columna (para set filter).
 * @param {import('../types.js').RowNode[]} rows
 * @param {import('../types.js').ColumnState} col
 * @returns {string[]}
 */
export function uniqueValues(rows, col) {
  const set = new Set();
  for (const node of rows) set.add(cellText(col, node));
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
