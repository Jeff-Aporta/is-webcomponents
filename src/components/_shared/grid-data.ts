/**
 * Pipeline de datos del data grid: normalización de columnas, obtención y
 * formateo de valores, filtrado, ordenación, agrupación (row grouping y tree
 * data), agregación, pivot, paginación y serialización (CSV / TSV / Excel).
 *
 * Todo son funciones puras sobre arrays: el componente solo orquesta.
 */

import {
  AGGREGATION_FNS,
  COLUMN_TYPES,
  LOGIC,
  filterTest,
  operatorsFor,
  stringComparator,
  typeOf,
} from './grid-types.js';
import type { CellValue, ColumnDef, ColumnType, Comparator, Operator, Row } from './grid-types.js';

/** Columna con los defaults aplicados: misma forma que `ColumnDef` pero mutable,
 * porque `normalizeColumns` la construye con spreads + assigns. */
type ResolvedColumn = {
  field: string;
  headerName: string;
  align: string;
  headerAlign: string;
  width: number;
  minWidth: number;
  maxWidth: number;
  flex: number;
  sortable: boolean;
  filterable: boolean;
  hideable: boolean;
  resizable: boolean;
  editable: boolean;
  groupable: boolean;
  aggregable: boolean;
  comparator: Comparator;
  operators: readonly Operator[];
  type: string;
  valueFormatter?: ColumnDef['valueFormatter'];
};

export type NormalizeOptions = { defaultWidth?: number; editableAll?: boolean };

export type PivotModel = {
  rows?: readonly string[];
  columns?: readonly string[];
  values?: readonly { field: string; fn: string }[];
};

export type SortModelItem = { field: string; sort: 'asc' | 'desc' };

export type FilterModel = {
  items?: readonly { field?: string; operator?: string; value?: CellValue }[];
  logicOperator?: 'and' | 'or';
};

export type AggregationModel = Record<string, string>;

export type BuildTreeOpts = {
  paths: (row: Row, i: number) => readonly (string | number)[];
  getRowId: (row: Row, i: number) => CellValue;
};

export type FilterCtx = unknown;

/* ── Columnas ─────────────────────────────────────────────────────────── */

/** Aplica los defaults del tipo y del grid a cada definición de columna. */
export function normalizeColumns(columns: readonly ColumnDef[], opts: NormalizeOptions = {}): ResolvedColumn[] {
  const { defaultWidth = 120, editableAll = false } = opts;
  return (columns || []).map((raw: ColumnDef) => {
    const type = typeOf(raw);
    const meta: ColumnType = COLUMN_TYPES[type];
    const col = {
      ...meta,
      ...raw,
      type,
    } as ResolvedColumn;
    col.field = raw.field ?? '';
    col.headerName = raw.headerName ?? raw.field ?? '';
    col.align = raw.align ?? meta.align ?? 'left';
    col.headerAlign = raw.headerAlign ?? meta.headerAlign ?? col.align;
    col.width = raw.width ?? meta.width ?? defaultWidth;
    col.minWidth = raw.minWidth ?? 50;
    col.maxWidth = raw.maxWidth ?? Infinity;
    col.flex = raw.flex ?? 0;
    col.sortable = raw.sortable ?? meta.sortable ?? true;
    col.filterable = raw.filterable ?? meta.filterable ?? true;
    col.hideable = raw.hideable ?? meta.hideable ?? true;
    col.resizable = raw.resizable ?? meta.resizable ?? true;
    col.editable = raw.editable ?? meta.editable ?? editableAll;
    col.groupable = raw.groupable ?? (type !== 'actions');
    col.aggregable = raw.aggregable ?? (type !== 'actions');
    col.comparator = (raw as { sortComparator?: Comparator }).sortComparator ?? meta.comparator ?? stringComparator;
    col.operators = operatorsFor(col);
    return col;
  });
}

/** Ancho final de cada columna repartiendo el espacio libre entre las flex. */
export function resolveWidths(cols: readonly ResolvedColumn[], available: number, overrides: Record<string, number> = {}): Record<string, number> {
  const fixed = cols.filter((c: ResolvedColumn) => !c.flex || overrides[c.field] != null);
  const flexed = cols.filter((c: ResolvedColumn) => c.flex && overrides[c.field] == null);
  const used = fixed.reduce((sum: number, c: ResolvedColumn) => sum + (overrides[c.field] ?? c.width), 0);
  const totalFlex = flexed.reduce((sum: number, c: ResolvedColumn) => sum + c.flex, 0);
  const free = Math.max(0, available - used);
  const out: Record<string, number> = {};
  for (const c of cols) {
    if (overrides[c.field] != null) out[c.field] = overrides[c.field] as number;
    else if (!c.flex) out[c.field] = c.width;
    else {
      const share = totalFlex ? (free * c.flex) / totalFlex : 0;
      out[c.field] = Math.min(c.maxWidth, Math.max(c.minWidth, share || c.width));
    }
  }
  return out;
}

/* ── Valores ──────────────────────────────────────────────────────────── */

export function rawValue(row: Row, col: ColumnDef): CellValue {
  const field = col.field;
  if (!row || !field) return undefined;
  if (field.includes('.')) {
    return field.split('.').reduce((acc: CellValue, key: string) => (acc == null ? acc : (acc as Record<string, CellValue>)[key]), row);
  }
  return row[field];
}

/** Valor usado para filtrar, ordenar y agrupar (respeta valueGetter). */
export function cellValue(row: Row, col: ColumnDef, ctx: FilterCtx): CellValue {
  const raw = rawValue(row, col);
  return typeof col.valueGetter === 'function' ? col.valueGetter(raw, row, col, ctx) : raw;
}

/** Texto mostrado (valueFormatter, si no el formato del tipo). */
export function formattedValue(value: CellValue, row: Row, col: ColumnDef, ctx: FilterCtx): string {
  if (typeof col.valueFormatter === 'function') {
    const out = col.valueFormatter(value, row, col, ctx);
    return out == null ? '' : String(out);
  }
  if (typeof col.format === 'function') return col.format(value);
  return value == null ? '' : String(value);
}

/* ── Filtrado ─────────────────────────────────────────────────────────── */

/**
 * Aplica el filterModel (reglas + and/or) y el quick filter.
 * Las palabras del quick filter se exigen todas (AND) contra cualquier columna.
 */
export type ApplyFiltersOpts = {
  model?: FilterModel;
  quick?: string;
  columns: readonly ResolvedColumn[];
  ctx: FilterCtx;
  quickLogic?: 'and' | 'or';
};

export function applyFilters(rows: readonly Row[], { model, quick, columns, ctx, quickLogic = 'and' }: ApplyFiltersOpts): Row[] {
  const items: { col: ResolvedColumn; test: (v: CellValue) => boolean }[] = (model?.items || [])
    .map((item: { field?: string; operator?: string; value?: CellValue }) => {
      const col = columns.find((c: ResolvedColumn) => c.field === item.field);
      if (!col || col.filterable === false) return null;
      const test = filterTest(item, col);
      return test ? { col, test } : null;
    })
    .filter((x): x is { col: ResolvedColumn; test: (v: CellValue) => boolean } => x !== null);

  const words = String(quick || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const quickCols = columns.filter((c: ResolvedColumn) => c.filterable !== false && c.type !== 'actions');
  if (!items.length && !words.length) return [...rows];

  const logic = model?.logicOperator === LOGIC.OR ? LOGIC.OR : LOGIC.AND;

  return rows.filter((row: Row) => {
    if (items.length) {
      const results = items.map(({ col, test }: { col: ResolvedColumn; test: (v: CellValue) => boolean }) => test(cellValue(row, col, ctx)));
      const ok = logic === LOGIC.OR ? results.some(Boolean) : results.every(Boolean);
      if (!ok) return false;
    }
    if (!words.length) return true;
    const haystack = quickCols
      .map((col: ResolvedColumn) => formattedValue(cellValue(row, col, ctx), row, col, ctx).toLowerCase())
      .join(' ');
    return quickLogic === 'or'
      ? words.some((w: string) => haystack.includes(w))
      : words.every((w: string) => haystack.includes(w));
  });
}

/* ── Ordenación ───────────────────────────────────────────────────────── */

export function applySort(rows: readonly Row[], sortModel: readonly SortModelItem[] | undefined, columns: readonly ResolvedColumn[], ctx: FilterCtx): Row[] {
  const active = (sortModel || [])
    .map((s: SortModelItem) => ({ col: columns.find((c: ResolvedColumn) => c.field === s.field), sort: s.sort }))
    .filter((s: { col?: ResolvedColumn; sort?: string }) => s.col && s.sort);
  if (!active.length) return [...rows];
  // Índice original como criterio final: ordenación estable y reproducible.
  return rows
    .map((row: Row, i: number) => ({ row, i }))
    .sort((a: { row: Row; i: number }, b: { row: Row; i: number }) => {
      for (const { col, sort } of active as { col: ResolvedColumn; sort: string }[]) {
        const dir = sort === 'desc' ? -1 : 1;
        const diff = col.comparator(cellValue(a.row, col, ctx), cellValue(b.row, col, ctx)) * dir;
        if (diff) return diff;
      }
      return a.i - b.i;
    })
    .map((entry: { row: Row; i: number }) => entry.row);
}

/* ── Árbol y agrupación ───────────────────────────────────────────────── */

/** Nodo del árbol construido por `buildTree`. */
export type TreeNode = {
  kind: 'leaf' | 'group';
  id: CellValue;
  key?: string | number;
  depth: number;
  path: readonly (string | number)[];
  parent: TreeNode | null;
  children: TreeNode[];
  rows: Row[];
  row?: Row;
  leafRow?: Row | null;
  aggregates?: Record<string, { value: CellValue; fn: string }>;
};

/**
 * Construye el árbol de nodos. `paths` viene de getTreeDataPath (tree data) o
 * de las columnas de rowGroupingModel. Devuelve la raíz como array de nodos.
 */
export function buildTree(rows: readonly Row[], { paths, getRowId }: BuildTreeOpts): TreeNode[] {
  const root: TreeNode[] = [];
  const index = new Map<string, TreeNode>();

  rows.forEach((row: Row, i: number) => {
    const path = paths(row, i) || [];
    if (!path.length) {
      const leaf: TreeNode = { kind: 'leaf', id: getRowId(row, i), row, depth: 0, path: [], parent: null, children: [], rows: [], leafRow: null };
      root.push(leaf);
      return;
    }
    let level: TreeNode[] = root;
    let parent: TreeNode | null = null;
    path.forEach((key: string | number, depth: number) => {
      const isLast = depth === path.length - 1;
      const groupKey = `${parent ? parent.id : ''}/${key}`;
      let node = index.get(groupKey);
      if (!node) {
        node = {
          kind: 'group',
          id: `group:${groupKey}`,
          key,
          depth,
          parent,
          children: [],
          path: path.slice(0, depth + 1),
          rows: [],
        };
        index.set(groupKey, node);
        level.push(node);
      }
      node.rows.push(row);
      if (isLast) {
        // En tree data la última rama ES la fila; en row grouping es un grupo
        // que contiene hojas.
        node.leafRow = node.leafRow ?? null;
        const child: TreeNode = {
          kind: 'leaf',
          id: getRowId(row, i),
          row,
          depth: depth + 1,
          parent: node,
          path,
          children: [],
          rows: [],
          leafRow: null,
        };
        node.children.push(child);
      }
      parent = node;
      level = node.children;
    });
  });

  return root;
}

/** Aplana el árbol respetando los grupos colapsados. */
export function flattenTree(nodes: readonly TreeNode[], expanded: ReadonlySet<CellValue>, out: TreeNode[] = []): TreeNode[] {
  for (const node of nodes) {
    out.push(node);
    if (node.kind !== 'group') continue;
    if (!expanded.has(node.id)) continue;
    flattenTree(node.children, expanded, out);
  }
  return out;
}

/** Hojas de un nodo (para agregar y para seleccionar en cascada). */
export function leavesOf<T extends { kind: string; children?: T[]; row?: Row }>(node: T, out: T[] = []): T[] {
  if (node.kind === 'leaf') {
    out.push(node);
    return out;
  }
  for (const child of node.children ?? []) leavesOf(child, out);
  return out;
}

/* ── Agregación ───────────────────────────────────────────────────────── */

/** { field: 'sum' } → { field: valorAgregado } sobre un conjunto de filas. */
export function aggregateRows(rows: readonly Row[], model: AggregationModel | undefined, columns: readonly ResolvedColumn[], ctx: FilterCtx): Record<string, { value: CellValue; fn: string }> {
  const out: Record<string, { value: CellValue; fn: string }> = {};
  for (const [field, fnName] of Object.entries(model || {})) {
    const col = columns.find((c: ResolvedColumn) => c.field === field);
    const fn = AGGREGATION_FNS[fnName];
    if (!col || !fn) continue;
    const values = rows.map((row: Row) => cellValue(row, col, ctx));
    out[field] = { value: fn.apply(values, col.type), fn: fnName };
  }
  return out;
}

/** Rellena node.aggregates en cada grupo del árbol. */
export function aggregateTree(nodes: readonly TreeNode[], model: AggregationModel | undefined, columns: readonly ResolvedColumn[], ctx: FilterCtx): void {
  for (const node of nodes) {
    if (node.kind !== 'group') continue;
    aggregateTree(node.children, model, columns, ctx);
    // Se agregan los descendientes; en tree data la fila del propio nodo no
    // entra (una carpeta no se suma a sí misma).
    const rows = (node.rows.length ? node.rows : leavesOf(node).map((leaf) => leaf.row))
      .filter((row: Row | undefined): row is Row => row != null && row !== node.row);
    node.aggregates = aggregateRows(rows, model, columns, ctx);
  }
}

/* ── Pivot ────────────────────────────────────────────────────────────── */

export type PivotResult = {
  rows: Row[];
  columns: ColumnDef[];
  colKeys: string[];
};

/**
 * Pivot simple: filas agrupadas por `rows`, una columna por cada combinación
 * de valores de `columns` × `values`. Devuelve { rows, columns } listos para
 * alimentar el grid.
 */
export function pivotData(rows: readonly Row[], pivotModel: PivotModel | undefined, columns: readonly ResolvedColumn[], ctx: FilterCtx): PivotResult | null {
  const rowFields = pivotModel?.rows || [];
  const colFields = pivotModel?.columns || [];
  const values = pivotModel?.values || [];
  if (!values.length) return null;

  const colOf = (field: string): ResolvedColumn | undefined => columns.find((c: ResolvedColumn) => c.field === field);
  const keyOf = (row: Row, fields: readonly string[]) => fields
    .map((f: string) => {
      const c = colOf(f);
      if (!c) return '';
      return formattedValue(cellValue(row, c, ctx), row, c, ctx);
    })
    .join(' · ');

  const groups = new Map<string, { __pivotGroup: string; __buckets: Map<string, Row[]> }>();
  const colKeys = new Set<string>();

  for (const row of rows) {
    const rowKey = keyOf(row, rowFields) || 'Total';
    const colKey = keyOf(row, colFields);
    colKeys.add(colKey);
    if (!groups.has(rowKey)) groups.set(rowKey, { __pivotGroup: rowKey, __buckets: new Map() });
    const bucket = groups.get(rowKey)!.__buckets;
    if (!bucket.has(colKey)) bucket.set(colKey, []);
    bucket.get(colKey)!.push(row);
  }

  const outColumns: ColumnDef[] = [{
    field: '__pivotGroup',
    headerName: rowFields.map((f: string) => colOf(f)?.headerName || f).join(' / ') || 'Grupo',
    width: 200,
  }];
  const sortedColKeys = [...colKeys].sort(stringComparator);

  for (const colKey of sortedColKeys) {
    for (const v of values) {
      const col = colOf(v.field);
      if (!col) continue;
      const field = `${colKey}|${v.field}`;
      outColumns.push({
        field,
        headerName: values.length > 1 ? `${col.headerName} (${AGGREGATION_FNS[v.fn]?.label || v.fn})` : colKey || col.headerName,
        type: 'number',
        // El cruce se muestra con el formato de la columna de origen.
        valueFormatter: col.valueFormatter,
      });
    }
  }

  const outRows = [...groups.values()].map((group: { __pivotGroup: string; __buckets: Map<string, Row[]> }) => {
    const out: Row = { id: `pivot:${group.__pivotGroup}`, __pivotGroup: group.__pivotGroup };
    for (const colKey of sortedColKeys) {
      for (const v of values) {
        const col = colOf(v.field);
        const fn = AGGREGATION_FNS[v.fn];
        if (!col || !fn) continue;
        const bucketRows = group.__buckets.get(colKey);
        // Sin datos en el cruce se deja vacío, no un cero engañoso.
        out[`${colKey}|${v.field}`] = bucketRows
          ? fn.apply(bucketRows.map((r: Row) => cellValue(r, col, ctx)), col.type)
          : null;
      }
    }
    return out;
  });

  return { rows: outRows, columns: outColumns, colKeys: sortedColKeys };
}

/* ── Serialización ────────────────────────────────────────────────────── */

function escapeCsv(text: CellValue, delimiter: string): string {
  const s = String(text ?? '');
  return /["\n\r]|^\s|\s$/.test(s) || s.includes(delimiter) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toDelimited(matrix: readonly (readonly CellValue[])[], delimiter = ','): string {
  return matrix.map((line: readonly CellValue[]) => line.map((cell: CellValue) => escapeCsv(cell, delimiter)).join(delimiter)).join('\r\n');
}

/** SpreadsheetML 2003: Excel lo abre nativo y no necesita dependencias. */
export function toSpreadsheetXml(matrix: readonly (readonly CellValue[])[], sheetName = 'Datos'): string {
  const esc = (s: CellValue) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const cell = (v: CellValue) => {
    const isNum = typeof v === 'number' && Number.isFinite(v);
    return `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${esc(v)}</Data></Cell>`;
  };
  const rows = matrix.map((line: readonly CellValue[]) => `<Row>${line.map(cell).join('')}</Row>`).join('');
  return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="${esc(sheetName)}"><Table>${rows}</Table></Worksheet></Workbook>`;
}

export function download(filename: string, content: BlobPart, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
