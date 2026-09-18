/**
 * data-grid.smoke.test.ts — smoke test del módulo `<is-data-grid>`.
 *
 * No toca DOM (no `document`, no `customElements`). Cubre las piezas puras
 * de los shared que tipamos al mismo tiempo que el componente:
 *
 *  - `normalizeColumns`, `resolveWidths`, `applyFilters`, `applySort`,
 *    `buildTree`, `flattenTree`, `aggregateRows`, `aggregateTree`,
 *    `pivotData`, `cellValue`, `formattedValue`, `toDelimited`,
 *    `toSpreadsheetXml`, `leavesOf`, `rawValue`.
 *  - operadores y comparadores de `grid-types.ts`.
 *  - shape de `ColumnDef`, `FilterRule`, `Operator`.
 *
 * El exhaustivo de `exhaustive/data/data-grid.test.ts` cubre el lado DOM
 * (shadow, parts, eventos, hooks). Este smoke garantiza que los tipos
 * explícitos añadidos al tipar el módulo no rompen las firmas.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  CellValue,
  ColumnDef,
  FilterRule,
  Operator,
  Row,
} from '../../components/_shared/grid-types.ts';
import {
  AGGREGATION_FNS,
  COLUMN_TYPES,
  LOGIC,
  STRING_OPERATORS,
  NUMBER_OPERATORS,
  BOOLEAN_OPERATORS,
  DATE_OPERATORS,
  DATE_TIME_OPERATORS,
  SINGLE_SELECT_OPERATORS,
  filterTest,
  operatorNeedsInput,
  prepareFilterValue,
  stringComparator,
  numberComparator,
  dateComparator,
  booleanComparator,
  toDate,
} from '../../components/_shared/grid-types.ts';
import {
  aggregateRows,
  applyFilters,
  applySort,
  buildTree,
  cellValue,
  formattedValue,
  flattenTree,
  leavesOf,
  normalizeColumns,
  pivotData,
  rawValue,
  resolveWidths,
  toDelimited,
  toSpreadsheetXml,
} from '../../components/_shared/grid-data.ts';

/* ── Columnas ─────────────────────────────────────────────────────────── */

test('normalizeColumns: aplica defaults del tipo y editableAll', () => {
  const cols = normalizeColumns([
    { field: 'name', headerName: 'Nombre' },
    { field: 'count', type: 'number' },
  ], { editableAll: true });
  assert.equal(cols.length, 2);
  const name = cols[0]!;
  const count = cols[1]!;
  assert.equal(name.field, 'name');
  assert.equal(name.type, 'string');
  assert.equal(name.headerName, 'Nombre');
  assert.equal(count.field, 'count');
  assert.equal(count.type, 'number');
  assert.equal(count.editable, true);
  // El editableAll enciende `editable` también en la de string.
  assert.equal(name.editable, true);
});

test('resolveWidths: reparte espacio respetando min/max/flex', () => {
  const cols = normalizeColumns([
    { field: 'a', width: 100 },
    { field: 'b', flex: 1, minWidth: 80, maxWidth: 200 },
  ]);
  const widths = resolveWidths(cols, 400, {});
  assert.equal(widths['a'], 100);
  // 300 libres para b (flex:1).
  assert.ok(widths['b']! >= 80 && widths['b']! <= 200);
});

/* ── Valores ──────────────────────────────────────────────────────────── */

test('rawValue / cellValue: respeta dot-path y valueGetter', () => {
  const row: Row = { a: { b: 7 } };
  const col: ColumnDef = { field: 'a.b' };
  assert.equal(rawValue(row, col), 7);
  assert.equal(cellValue(row, col, null), 7);

  const colWithGetter: ColumnDef = {
    field: 'a.b',
    valueGetter: (v: CellValue) => Number(v) * 10,
  };
  assert.equal(cellValue(row, colWithGetter, null), 70);
});

test('formattedValue: usa valueFormatter si existe', () => {
  const col: ColumnDef = {
    field: 'price',
    valueFormatter: (v: CellValue) => `$${Number(v).toFixed(2)}`,
  };
  assert.equal(formattedValue(3.5, {}, col, null), '$3.50');
});

/* ── Filtrado y orden ─────────────────────────────────────────────────── */

test('applyFilters: descarta filas que no cumplen el filtro', () => {
  const rows: Row[] = [{ name: 'Ada' }, { name: 'Boole' }, { name: 'Cee' }];
  const columns: ColumnDef[] = [normalizeColumns([{ field: 'name' }])[0]!];
  const out = applyFilters(rows, {
    model: { items: [{ field: 'name', operator: 'contains', value: 'a' }], logicOperator: LOGIC.AND },
    quick: '',
    columns,
    ctx: null,
  });
  assert.equal(out.length, 1);
  assert.equal(out[0]!['name'], 'Ada');
});

test('applySort: ordena ascendente por number', () => {
  const rows: Row[] = [{ v: 3 }, { v: 1 }, { v: 2 }];
  const columns: ColumnDef[] = [normalizeColumns([{ field: 'v', type: 'number' }])[0]!];
  const out = applySort(rows, [{ field: 'v', sort: 'asc' }], columns, null);
  assert.deepEqual(out.map((r: Row) => r['v']), [1, 2, 3]);
});

test('filterTest / operatorNeedsInput / prepareFilterValue: contratos', () => {
  const col: ColumnDef = { field: 'x', type: 'number' };
  // Operator sin valor (`isEmpty`) → filterTest devuelve test que ignora f.
  const noInputOp = NUMBER_OPERATORS.find((o: Operator) => o.value === 'isEmpty')!;
  assert.equal(operatorNeedsInput(noInputOp), false);
  const t = filterTest({ field: 'x', operator: 'isEmpty', value: '' }, col);
  assert.equal(typeof t, 'function');
  assert.equal(t!(7), false);
  assert.equal(t!(null), true);
  // Operator con valor → filterTest devuelve null si el valor está vacío.
  assert.equal(filterTest({ field: 'x', operator: '>', value: '' }, col), null);
  // prepareFilterValue normaliza a número.
  assert.equal(prepareFilterValue(NUMBER_OPERATORS[0]!, '42', col), 42);
});

/* ── Tree, leaves, aggregate ──────────────────────────────────────────── */

test('leavesOf: devuelve solo los nodos leaf', () => {
  type N = { kind: string; id: number; children?: N[] };
  const tree: N = { kind: 'group', id: 0, children: [
    { kind: 'leaf', id: 1 },
    { kind: 'group', id: 2, children: [{ kind: 'leaf', id: 3 }] },
  ] };
  const leaves = leavesOf<N>(tree);
  assert.deepEqual(leaves.map((n: N) => n.id).sort(), [1, 3]);
});

test('buildTree + flattenTree: agrupa por path y expande con Set', () => {
  const rows: Row[] = [
    { id: 'a1', name: 'a1' },
    { id: 'a2', name: 'a2' },
    { id: 'b1', name: 'b1' },
  ];
  const tree = buildTree(rows, {
    paths: (row: Row) => [String(row['id']![0])],
    getRowId: (row: Row, _i: number) => String(row['id']),
  });
  // Recoge los ids de los grupos para marcarlos como expandidos.
  const expanded = new Set<string>();
  const collectGroups = (nodes: Array<{ kind: string; id: string; children?: unknown[] }>): void => {
    for (const n of nodes) {
      if (n.kind === 'group') expanded.add(n.id);
      if (n.children) collectGroups(n.children as Array<{ kind: string; id: string; children?: unknown[] }>);
    }
  };
  collectGroups(tree as Array<{ kind: string; id: string; children?: unknown[] }>);
  const flat = flattenTree(tree, expanded);
  // 2 grupos ('a', 'b') + 3 hojas.
  assert.equal(flat.length, 5);
  const groups = flat.filter((n: { kind: string }) => n.kind === 'group');
  assert.equal(groups.length, 2);
});

test('aggregateRows: suma sobre modelo { field: "sum" }', () => {
  const rows: Row[] = [{ v: 1 }, { v: 2 }, { v: 3 }];
  const cols: ColumnDef[] = [normalizeColumns([{ field: 'v', type: 'number' }])[0]!];
  const agg = aggregateRows(rows, { v: 'sum' }, cols, null);
  assert.equal(agg['v']?.value, 6);
});

/* ── Pivot ───────────────────────────────────────────────────────────── */

test('pivotData: cruza rows × cols × values', () => {
  const rows: Row[] = [
    { city: 'A', role: 'Dev', gross: 10 },
    { city: 'A', role: 'Dev', gross: 20 },
    { city: 'A', role: 'QA', gross: 30 },
    { city: 'B', role: 'Dev', gross: 40 },
  ];
  const cols: ColumnDef[] = [
    normalizeColumns([{ field: 'city' }])[0]!,
    normalizeColumns([{ field: 'role' }])[0]!,
    normalizeColumns([{ field: 'gross', type: 'number' }])[0]!,
  ];
  const out = pivotData(rows, {
    rows: ['city'],
    columns: ['role'],
    values: [{ field: 'gross', fn: 'sum' }],
  }, cols, null);
  assert.ok(out.columns.length > 0, 'pivot produce columnas');
  assert.ok(out.rows.length === 2, 'pivot produce 2 filas (ciudades)');
});

/* ── Comparadores / operadores ───────────────────────────────────────── */

test('comparadores: ordenan correctamente', () => {
  assert.ok(stringComparator('a', 'B') <= 0); // numeric + insensitive
  assert.ok(numberComparator(1, 10) < 0);
  assert.ok(booleanComparator(false, true) < 0);
  assert.ok(dateComparator(new Date(2020, 0, 1), new Date(2021, 0, 1)) < 0);
});

test('toDate: acepta Date / número / string ISO', () => {
  assert.ok(toDate('2024-01-01') instanceof Date);
  assert.ok(toDate(0) instanceof Date);
  assert.ok(toDate(new Date()) instanceof Date);
  assert.equal(toDate(null), null);
  assert.equal(toDate(''), null);
});

test('COLUMN_TYPES: cubr los tipos nativos', () => {
  assert.ok(COLUMN_TYPES['string']);
  assert.ok(COLUMN_TYPES['number']);
  assert.ok(COLUMN_TYPES['date']);
  assert.ok(COLUMN_TYPES['dateTime']);
  assert.ok(COLUMN_TYPES['boolean']);
  assert.ok(COLUMN_TYPES['singleSelect']);
  assert.ok(COLUMN_TYPES['actions']);
});

test('operadores por tipo: existen todos', () => {
  assert.ok(STRING_OPERATORS.length > 0);
  assert.ok(NUMBER_OPERATORS.length > 0);
  assert.ok(BOOLEAN_OPERATORS.length > 0);
  assert.ok(DATE_OPERATORS.length > 0);
  assert.ok(DATE_TIME_OPERATORS.length > 0);
  assert.ok(SINGLE_SELECT_OPERATORS.length > 0);
});

/* ── Serialización ───────────────────────────────────────────────────── */

test('toDelimited: respeta delimiter y escapado', () => {
  const matrix: string[][] = [['a', 'b'], ['1', '2,3']];
  const out = toDelimited(matrix, ',');
  // Normalizar CRLF → LF para asserts estables en Windows.
  const norm = out.replace(/\r\n/g, '\n');
  assert.equal(norm, 'a,b\n1,"2,3"');
});

test('toSpreadsheetXml: emite XML con sheetName', () => {
  const xml = toSpreadsheetXml([['h1', 'h2'], ['v1', 'v2']], 'Hoja');
  assert.ok(xml.includes('<?xml'));
  assert.ok(xml.includes('Hoja'));
  assert.ok(xml.includes('h1'));
  assert.ok(xml.includes('v1'));
});

/* ── AGGREGATION_FNS ─────────────────────────────────────────────────── */

test('AGGREGATION_FNS: sum, avg, min, max, size funcionan', () => {
  assert.equal(AGGREGATION_FNS['sum']?.apply([1, 2, 3]), 6);
  assert.equal(AGGREGATION_FNS['avg']?.apply([2, 4, 6]), 4);
  assert.equal(AGGREGATION_FNS['min']?.apply([3, 1, 2], 'number'), 1);
  assert.equal(AGGREGATION_FNS['max']?.apply([1, 2, 3], 'number'), 3);
  assert.equal(AGGREGATION_FNS['size']?.apply([1, 2, 3, 4]), 4);
});

/* ── Tipos ───────────────────────────────────────────────────────────── */

test('ColumnDef / FilterRule / Operator: campos esperados', () => {
  const col: ColumnDef = {
    field: 'x',
    headerName: 'X',
    type: 'number',
    sortable: true,
    editable: false,
  };
  assert.equal(col.field, 'x');
  assert.equal(col.type, 'number');

  const rule: FilterRule = { field: 'x', operator: '>', value: 5 };
  assert.equal(rule.field, 'x');
  assert.equal(rule.operator, '>');

  // Operator.test acepta CellValue y FilterValue.
  const op: Operator = NUMBER_OPERATORS[0]!;
  assert.equal(typeof op.test, 'function');
});