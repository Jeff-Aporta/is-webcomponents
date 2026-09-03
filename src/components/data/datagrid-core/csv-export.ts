import type { ColumnState, RowNode } from './types.js';
/**
 * datagrid-core/csv-export — Exportar filas a CSV.
 *
 *   rowsToCsv(columns, rows, opts) → string
 *       serializa columnas visibles y filas a un CSV estándar (RFC 4180).
 *       La descarga la dispara la capa de UI (Blob + URL.createObjectURL).
 *
 * Sin DOM. Compatible con el rowsToCsv del mimicus-react core (mismo contrato).
 */

function escapeCsv(value: string, sep: string): string {
  if (value.includes(sep) || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export type CsvOptions = {
  /** Separador de campos; por defecto, `,`. */
  separator?: string;
  onlySelected?: boolean;
  selection?: Set<string>;
};

/**
 * Construye el contenido CSV de las columnas visibles y las filas dadas.
 *
 * @param {ColumnState[]} columns
 * @param {RowNode[]} rows
 * @param {CsvOptions} [opts]
 * @returns {string}
 */
export function rowsToCsv(columns: ColumnState[], rows: RowNode[], opts: CsvOptions = {}): string {
  const sep = opts.separator ?? ',';
  const cols = columns.filter((c) => !c.hide);
  const src = opts.onlySelected && opts.selection
    ? rows.filter((r) => opts.selection!.has(r.id))
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
 * @param {ColumnState} col
 * @param {RowNode} node
 */
function cellText(col: ColumnState, node: RowNode) {
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

function getCellValue(col: ColumnState, node: RowNode): unknown {
  const def = col.def;
  if (typeof def.valueGetter === 'function') return def.valueGetter(node.data);
  return node.data?.[col.field];
}
