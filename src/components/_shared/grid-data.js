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

/* ── Columnas ─────────────────────────────────────────────────────────── */

/** Aplica los defaults del tipo y del grid a cada definición de columna. */
export function normalizeColumns(columns, opts = {}) {
  const { defaultWidth = 120, editableAll = false } = opts;
  return (columns || []).map((raw) => {
    const type = typeOf(raw);
    const meta = COLUMN_TYPES[type];
    const col = { ...meta, ...raw, type };
    col.field = raw.field;
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
    col.comparator = raw.sortComparator ?? meta.comparator ?? stringComparator;
    col.operators = operatorsFor(col);
    return col;
  });
}

/** Ancho final de cada columna repartiendo el espacio libre entre las flex. */
export function resolveWidths(cols, available, overrides = {}) {
  const fixed = cols.filter((c) => !c.flex || overrides[c.field] != null);
  const flexed = cols.filter((c) => c.flex && overrides[c.field] == null);
  const used = fixed.reduce((sum, c) => sum + (overrides[c.field] ?? c.width), 0);
  const totalFlex = flexed.reduce((sum, c) => sum + c.flex, 0);
  const free = Math.max(0, available - used);
  const out = {};
  for (const c of cols) {
    if (overrides[c.field] != null) out[c.field] = overrides[c.field];
    else if (!c.flex) out[c.field] = c.width;
    else {
      const share = totalFlex ? (free * c.flex) / totalFlex : 0;
      out[c.field] = Math.min(c.maxWidth, Math.max(c.minWidth, share || c.width));
    }
  }
  return out;
}

/* ── Valores ──────────────────────────────────────────────────────────── */

export function rawValue(row, col) {
  if (!row || !col?.field) return undefined;
  if (col.field.includes('.')) {
    return col.field.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), row);
  }
  return row[col.field];
}

/** Valor usado para filtrar, ordenar y agrupar (respeta valueGetter). */
export function cellValue(row, col, ctx) {
  const raw = rawValue(row, col);
  return typeof col.valueGetter === 'function' ? col.valueGetter(raw, row, col, ctx) : raw;
}

/** Texto mostrado (valueFormatter, si no el formato del tipo). */
export function formattedValue(value, row, col, ctx) {
  if (typeof col.valueFormatter === 'function') {
    const out = col.valueFormatter(value, row, col, ctx);
    return out == null ? '' : String(out);
  }
  if (typeof col.format === 'function') return col.format(value, row, col);
  return value == null ? '' : String(value);
}

/* ── Filtrado ─────────────────────────────────────────────────────────── */

/**
 * Aplica el filterModel (reglas + and/or) y el quick filter.
 * Las palabras del quick filter se exigen todas (AND) contra cualquier columna.
 */
export function applyFilters(rows, { model, quick, columns, ctx, quickLogic = 'and' }) {
  const items = (model?.items || [])
    .map((item) => {
      const col = columns.find((c) => c.field === item.field);
      if (!col || col.filterable === false) return null;
      const test = filterTest(item, col);
      return test ? { col, test } : null;
    })
    .filter(Boolean);

  const words = String(quick || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const quickCols = columns.filter((c) => c.filterable !== false && c.type !== 'actions');
  if (!items.length && !words.length) return rows;

  const logic = model?.logicOperator === LOGIC.OR ? LOGIC.OR : LOGIC.AND;

  return rows.filter((row) => {
    if (items.length) {
      const results = items.map(({ col, test }) => test(cellValue(row, col, ctx), row, col));
      const ok = logic === LOGIC.OR ? results.some(Boolean) : results.every(Boolean);
      if (!ok) return false;
    }
    if (!words.length) return true;
    const haystack = quickCols
      .map((col) => formattedValue(cellValue(row, col, ctx), row, col, ctx).toLowerCase())
      .join(' ');
    return quickLogic === 'or'
      ? words.some((w) => haystack.includes(w))
      : words.every((w) => haystack.includes(w));
  });
}

/* ── Ordenación ───────────────────────────────────────────────────────── */

export function applySort(rows, sortModel, columns, ctx) {
  const active = (sortModel || [])
    .map((s) => ({ col: columns.find((c) => c.field === s.field), sort: s.sort }))
    .filter((s) => s.col && s.sort);
  if (!active.length) return rows;
  // Índice original como criterio final: ordenación estable y reproducible.
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => {
      for (const { col, sort } of active) {
        const dir = sort === 'desc' ? -1 : 1;
        const diff = col.comparator(cellValue(a.row, col, ctx), cellValue(b.row, col, ctx), a.row, b.row) * dir;
        if (diff) return diff;
      }
      return a.i - b.i;
    })
    .map((entry) => entry.row);
}

/* ── Árbol y agrupación ───────────────────────────────────────────────── */

/**
 * Construye el árbol de nodos. `paths` viene de getTreeDataPath (tree data) o
 * de las columnas de rowGroupingModel. Devuelve la raíz como array de nodos.
 */
export function buildTree(rows, { paths, getRowId }) {
  const root = [];
  const index = new Map();

  rows.forEach((row, i) => {
    const path = paths(row, i) || [];
    if (!path.length) {
      root.push({ kind: 'leaf', id: getRowId(row, i), row, depth: 0, path: [], parent: null });
      return;
    }
    let level = root;
    let parent = null;
    path.forEach((key, depth) => {
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
        node.children.push({
          kind: 'leaf',
          id: getRowId(row, i),
          row,
          depth: depth + 1,
          parent: node,
          path,
        });
      }
      parent = node;
      level = node.children;
    });
  });

  return root;
}

/** Aplana el árbol respetando los grupos colapsados. */
export function flattenTree(nodes, expanded, out = []) {
  for (const node of nodes) {
    out.push(node);
    if (node.kind !== 'group') continue;
    if (!expanded.has(node.id)) continue;
    flattenTree(node.children, expanded, out);
  }
  return out;
}

/** Hojas de un nodo (para agregar y para seleccionar en cascada). */
export function leavesOf(node, out = []) {
  if (node.kind === 'leaf') {
    out.push(node);
    return out;
  }
  for (const child of node.children) leavesOf(child, out);
  return out;
}

/* ── Agregación ───────────────────────────────────────────────────────── */

/** { field: 'sum' } → { field: valorAgregado } sobre un conjunto de filas. */
export function aggregateRows(rows, model, columns, ctx) {
  const out = {};
  for (const [field, fnName] of Object.entries(model || {})) {
    const col = columns.find((c) => c.field === field);
    const fn = AGGREGATION_FNS[fnName];
    if (!col || !fn) continue;
    const values = rows.map((row) => cellValue(row, col, ctx));
    out[field] = { value: fn.apply(values, col.type), fn: fnName };
  }
  return out;
}

/** Rellena node.aggregates en cada grupo del árbol. */
export function aggregateTree(nodes, model, columns, ctx) {
  for (const node of nodes) {
    if (node.kind !== 'group') continue;
    aggregateTree(node.children, model, columns, ctx);
    // Se agregan los descendientes; en tree data la fila del propio nodo no
    // entra (una carpeta no se suma a sí misma).
    const rows = (node.rows || leavesOf(node).map((leaf) => leaf.row))
      .filter((row) => row !== node.row);
    node.aggregates = aggregateRows(rows, model, columns, ctx);
  }
}

/* ── Pivot ────────────────────────────────────────────────────────────── */

/**
 * Pivot simple: filas agrupadas por `rows`, una columna por cada combinación
 * de valores de `columns` × `values`. Devuelve { rows, columns } listos para
 * alimentar el grid.
 */
export function pivotData(rows, pivotModel, columns, ctx) {
  const rowFields = pivotModel?.rows || [];
  const colFields = pivotModel?.columns || [];
  const values = pivotModel?.values || [];
  if (!values.length) return null;

  const colOf = (field) => columns.find((c) => c.field === field);
  const keyOf = (row, fields) => fields
    .map((f) => formattedValue(cellValue(row, colOf(f), ctx), row, colOf(f), ctx))
    .join(' · ');

  const groups = new Map();
  const colKeys = new Set();

  for (const row of rows) {
    const rowKey = keyOf(row, rowFields) || 'Total';
    const colKey = keyOf(row, colFields);
    colKeys.add(colKey);
    if (!groups.has(rowKey)) groups.set(rowKey, { __pivotGroup: rowKey, __buckets: new Map() });
    const bucket = groups.get(rowKey).__buckets;
    if (!bucket.has(colKey)) bucket.set(colKey, []);
    bucket.get(colKey).push(row);
  }

  const outColumns = [{
    field: '__pivotGroup',
    headerName: rowFields.map((f) => colOf(f)?.headerName || f).join(' / ') || 'Grupo',
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
        group: colKey,
        type: 'number',
        // El cruce se muestra con el formato de la columna de origen.
        valueFormatter: col.valueFormatter,
      });
    }
  }

  const outRows = [...groups.values()].map((group) => {
    const out = { id: `pivot:${group.__pivotGroup}`, __pivotGroup: group.__pivotGroup };
    for (const colKey of sortedColKeys) {
      for (const v of values) {
        const col = colOf(v.field);
        const fn = AGGREGATION_FNS[v.fn];
        if (!col || !fn) continue;
        const bucketRows = group.__buckets.get(colKey);
        // Sin datos en el cruce se deja vacío, no un cero engañoso.
        out[`${colKey}|${v.field}`] = bucketRows
          ? fn.apply(bucketRows.map((r) => cellValue(r, col, ctx)), col.type)
          : null;
      }
    }
    return out;
  });

  return { rows: outRows, columns: outColumns, colKeys: sortedColKeys };
}

/* ── Serialización ────────────────────────────────────────────────────── */

function escapeCsv(text, delimiter) {
  const s = String(text ?? '');
  return /["\n\r]|^\s|\s$/.test(s) || s.includes(delimiter) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toDelimited(matrix, delimiter = ',') {
  return matrix.map((line) => line.map((cell) => escapeCsv(cell, delimiter)).join(delimiter)).join('\r\n');
}

/** SpreadsheetML 2003: Excel lo abre nativo y no necesita dependencias. */
export function toSpreadsheetXml(matrix, sheetName = 'Datos') {
  const esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const cell = (v) => {
    const isNum = typeof v === 'number' && Number.isFinite(v);
    return `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${esc(v)}</Data></Cell>`;
  };
  const rows = matrix.map((line) => `<Row>${line.map(cell).join('')}</Row>`).join('');
  return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="${esc(sheetName)}"><Table>${rows}</Table></Worksheet></Workbook>`;
}

export function download(filename, content, mime) {
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
