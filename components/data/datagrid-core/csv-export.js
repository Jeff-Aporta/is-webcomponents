/**
 * datagrid-core/csv-export — Exportar filas a CSV.
 *
 *   rowsToCsv(columns, rows, opts) → string
 *       serializa columnas visibles y filas a un CSV estándar (RFC 4180).
 *       La descarga la dispara la capa de UI (Blob + URL.createObjectURL).
 *
 * Sin DOM. Compatible con el rowsToCsv del mimicus-react core (mismo contrato).
 */

function escapeCsv(value, sep) {
  if (value.includes(sep) || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * @typedef {Object} CsvOptions
 * @property {string} [separator]   default ','
 * @property {boolean} [onlySelected]
 * @property {Set<string>} [selection]
 */

/**
 * Construye el contenido CSV de las columnas visibles y las filas dadas.
 *
 * @param {import('./types.js').ColumnState[]} columns
 * @param {import('./types.js').RowNode[]} rows
 * @param {CsvOptions} [opts]
 * @returns {string}
 */
export function rowsToCsv(columns, rows, opts = {}) {
  const sep = opts.separator ?? ',';
  const cols = columns.filter((c) => !c.hide);
  const src = opts.onlySelected && opts.selection
    ? rows.filter((r) => opts.selection.has(r.id))
    : rows;
  const head = cols.map((c) => escapeCsv(c.headerName, sep)).join(sep);
  const body = src.map((node) =>
    cols.map((c) => escapeCsv(cellText(c, node), sep)).join(sep),
  );
  return [head, ...body].join('\r\n');
}

/**
 * Helper local para no tener que importar value-formatter y construir un
 * ciclo de imports. Se duplica el cuerpo de cellText (5 líneas) para mantener
 * el módulo sin dependencias.
 * @param {import('./types.js').ColumnState} col
 * @param {import('./types.js').RowNode} node
 */
function cellText(col, node) {
  const def = col.def;
  if (typeof def.valueFormatter === 'function') {
    return def.valueFormatter(getCellValue(col, node), node.data);
  }
  if (col.type === 'number') {
    const v = getCellValue(col, node);
    return typeof v === 'number' && Number.isFinite(v) ? String(v) : '';
  }
  if (col.type === 'boolean') return getCellValue(col, node) ? '✓' : '';
  if (col.type === 'date') {
    const v = getCellValue(col, node);
    const d = v instanceof Date ? v : new Date(String(v ?? ''));
    return Number.isNaN(d.getTime()) ? String(v ?? '') : d.toISOString().slice(0, 10);
  }
  const v = getCellValue(col, node);
  return v == null ? '' : String(v);
}

function getCellValue(col, node) {
  const def = col.def;
  if (typeof def.valueGetter === 'function') return def.valueGetter(node.data);
  return node.data?.[col.field];
}
