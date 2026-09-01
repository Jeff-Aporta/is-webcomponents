/**
 * Tipos de columna del data grid: alineación por defecto, comparador,
 * formateo y operadores de filtro. Réplica de los tipos nativos de MUI X
 * (string, number, date, dateTime, boolean, singleSelect, actions).
 */

/* -- Contratos ---------------------------------------------------------- */

/** El valor de una celda lo pone el consumidor: aqui no se supone nada de el. */
export type CellValue = unknown;

/**
 * El valor tecleado en un filtro, ya preparado por `prepareFilterValue`.
 * Escalar por defecto, lista si el operador declara `multiple`, par si declara
 * `range`.
 */
export type FilterValue = string | number | boolean | readonly (string | number)[];

/** Una fila: mapa columna -> valor. */
export type Row = Record<string, CellValue>;

export interface Operator {
  readonly value: string;
  readonly label: string;
  /** `false` cuando el operador no pide valor (`isEmpty`). */
  readonly input?: boolean;
  /** El operador toma una lista (`isAnyOf`). */
  readonly multiple?: boolean;
  /** El operador toma dos extremos (`between`). */
  readonly range?: boolean;
  /** Control con el que se pide el valor: `date`, `select`, `boolean`... */
  readonly inputType?: string;
  /**
   * `f` llega con la forma que el propio operador declara arriba. Se usa
   * sintaxis de metodo a proposito: hace el parametro bivariante, y asi cada
   * operador declara el tipo concreto que espera (`string`, `number`, una
   * lista) en vez de repetir el mismo estrechamiento treinta veces.
   */
  test(v: CellValue, f: FilterValue): boolean;
}

/**
 * Columna tal y como la declara el consumidor del grid.
 *
 * Casi todo es opcional a proposito: solo `field` identifica la columna, y el
 * resto son anulaciones sobre lo que ya aporta su `type`. La forma esta sacada
 * de lo que data-grid y grid-data leen de verdad, no de la API de MUI X
 * completa, para que el tipo no prometa mas de lo que el kit soporta.
 */
export interface ColumnDef {
  readonly field?: string;
  readonly type?: string;
  readonly headerName?: string;
  readonly description?: string;

  /* Presentacion */
  readonly align?: string;
  readonly headerAlign?: string;
  readonly cellClassName?: string | ((row: Row) => string);
  readonly headerClassName?: string;
  readonly showTooltip?: boolean;
  readonly width?: number;
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly flex?: number;
  readonly colSpan?: number;

  /* Capacidades: sin valor, manda el `type` de la columna. */
  readonly sortable?: boolean;
  readonly filterable?: boolean;
  readonly editable?: boolean;
  readonly resizable?: boolean;
  readonly hideable?: boolean;
  readonly groupable?: boolean;
  readonly aggregable?: boolean;
  readonly disableColumnMenu?: boolean;
  /** Columna interna del grid (seleccion, detalle): no es dato del consumidor. */
  readonly system?: boolean;

  /* Valor */
  readonly valueGetter?: (row: Row) => CellValue;
  readonly valueFormatter?: (v: CellValue, row?: Row) => string;
  readonly valueParser?: (v: CellValue, row?: Row) => CellValue;
  readonly valueOptions?: readonly CellValue[];
  readonly format?: (v: CellValue) => string;
  readonly comparator?: Comparator;

  /* Render y edicion */
  readonly editor?: string;
  readonly renderCell?: (row: Row, col: ColumnDef) => unknown;
  readonly renderHeader?: (col: ColumnDef) => unknown;
  readonly getActions?: (row: Row) => readonly unknown[];
  readonly preProcessEditCellProps?: (params: Record<string, CellValue>) => unknown;

  /* Filtrado */
  readonly operators?: readonly Operator[];
  readonly filterOperators?: readonly Operator[];
}

/** Comparador de ordenacion: mismo contrato que `Array.prototype.sort`. */
export type Comparator = (a: CellValue, b: CellValue) => number;

export interface ColumnType {
  readonly align: string;
  readonly headerAlign?: string;
  readonly comparator?: Comparator;
  readonly operators?: readonly Operator[];
  readonly editor?: string;
  readonly format?: (v: CellValue) => string;
  readonly sortable?: boolean;
  readonly filterable?: boolean;
  readonly editable?: boolean;
  readonly resizable?: boolean;
  readonly hideable?: boolean;
  readonly disableColumnMenu?: boolean;
  readonly width?: number;
}

export type ColumnTypeName = keyof typeof COLUMN_TYPES;

export const LOGIC = { AND: 'and', OR: 'or' } as const;

/* ── Comparadores ─────────────────────────────────────────────────────── */

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export function stringComparator(a: CellValue, b: CellValue): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  return collator.compare(String(a), String(b));
}

export function numberComparator(a: CellValue, b: CellValue): number {
  const na = a == null || a === '' ? null : Number(a);
  const nb = b == null || b === '' ? null : Number(b);
  if (na == null && nb == null) return 0;
  if (na == null) return -1;
  if (nb == null) return 1;
  return na - nb;
}

export function dateComparator(a: CellValue, b: CellValue): number {
  const ta = toDate(a)?.getTime() ?? null;
  const tb = toDate(b)?.getTime() ?? null;
  if (ta == null && tb == null) return 0;
  if (ta == null) return -1;
  if (tb == null) return 1;
  return ta - tb;
}

export function booleanComparator(a: CellValue, b: CellValue): number {
  return (a ? 1 : 0) - (b ? 1 : 0);
}

/** Acepta Date, número (epoch) o cadena ISO. */
export function toDate(v: CellValue): Date | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ── Operadores de filtro ─────────────────────────────────────────────── */

/**
 * Cada operador declara si necesita valor (`input`) y devuelve un test.
 * `null` como test significa "regla incompleta": no filtra nada.
 */
const needsNoInput = new Set(['isEmpty', 'isNotEmpty']);

function isEmptyValue(v: CellValue): boolean {
  return v == null || v === '';
}

function asList(value: CellValue): string[] {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  return String(value).split(',').map((s: string) => s.trim()).filter(Boolean);
}

export const STRING_OPERATORS: Operator[] = [
  { value: 'contains', label: 'contiene', test: (v: CellValue, f: string) => String(v ?? '').toLowerCase().includes(f) },
  { value: 'doesNotContain', label: 'no contiene', test: (v: CellValue, f: string) => !String(v ?? '').toLowerCase().includes(f) },
  { value: 'equals', label: 'es igual a', test: (v: CellValue, f: string) => String(v ?? '').toLowerCase() === f },
  { value: 'doesNotEqual', label: 'no es igual a', test: (v: CellValue, f: string) => String(v ?? '').toLowerCase() !== f },
  { value: 'startsWith', label: 'empieza por', test: (v: CellValue, f: string) => String(v ?? '').toLowerCase().startsWith(f) },
  { value: 'endsWith', label: 'termina en', test: (v: CellValue, f: string) => String(v ?? '').toLowerCase().endsWith(f) },
  { value: 'isEmpty', label: 'está vacío', input: false, test: (v: CellValue) => isEmptyValue(v) },
  { value: 'isNotEmpty', label: 'no está vacío', input: false, test: (v: CellValue) => !isEmptyValue(v) },
  {
    value: 'isAnyOf',
    label: 'es cualquiera de',
    multiple: true,
    test: (v: CellValue, f: readonly string[]) => f.length === 0 || f.includes(String(v ?? '').toLowerCase()),
  },
];

export const NUMBER_OPERATORS: Operator[] = [
  { value: '=', label: '=', test: (v: CellValue, f: number) => Number(v) === f },
  { value: '!=', label: '≠', test: (v: CellValue, f: number) => Number(v) !== f },
  { value: '>', label: '>', test: (v: CellValue, f: number) => Number(v) > f },
  { value: '>=', label: '≥', test: (v: CellValue, f: number) => Number(v) >= f },
  { value: '<', label: '<', test: (v: CellValue, f: number) => Number(v) < f },
  { value: '<=', label: '≤', test: (v: CellValue, f: number) => Number(v) <= f },
  { value: 'between', label: 'entre', range: true, test: (v: CellValue, f: readonly number[]) => Number(v) >= f[0]! && Number(v) <= f[1]! },
  { value: 'isEmpty', label: 'está vacío', input: false, test: (v: CellValue) => isEmptyValue(v) },
  { value: 'isNotEmpty', label: 'no está vacío', input: false, test: (v: CellValue) => !isEmptyValue(v) },
  {
    value: 'isAnyOf',
    label: 'es cualquiera de',
    multiple: true,
    test: (v: CellValue, f: readonly number[]) => f.length === 0 || f.some((n) => Number(n) === Number(v)),
  },
];

export const BOOLEAN_OPERATORS: Operator[] = [
  {
    value: 'is',
    label: 'es',
    inputType: 'boolean',
    test: (v: CellValue, f: string | boolean) => (f === '' ? true : Boolean(v) === (f === 'true' || f === true)),
  },
];

const dayStamp = (v: CellValue): number | null => {
  const d = toDate(v);
  if (!d) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

function dateOps(withTime: boolean): Operator[] {
  const stamp = withTime ? (v: CellValue) => toDate(v)?.getTime() ?? null : dayStamp;
  const inputType = withTime ? 'datetime-local' : 'date';
  const cmp = (v: CellValue, f: CellValue, fn: (a: number, b: number) => boolean): boolean => {
    const a = stamp(v);
    const b = stamp(f);
    return a != null && b != null && fn(a, b);
  };
  return [
    { value: 'is', label: 'es', inputType, test: (v: CellValue, f: CellValue) => cmp(v, f, (a, b) => a === b) },
    { value: 'not', label: 'no es', inputType, test: (v: CellValue, f: CellValue) => cmp(v, f, (a, b) => a !== b) },
    { value: 'after', label: 'después de', inputType, test: (v: CellValue, f: CellValue) => cmp(v, f, (a, b) => a > b) },
    { value: 'onOrAfter', label: 'en o después de', inputType, test: (v: CellValue, f: CellValue) => cmp(v, f, (a, b) => a >= b) },
    { value: 'before', label: 'antes de', inputType, test: (v: CellValue, f: CellValue) => cmp(v, f, (a, b) => a < b) },
    { value: 'onOrBefore', label: 'en o antes de', inputType, test: (v: CellValue, f: CellValue) => cmp(v, f, (a, b) => a <= b) },
    { value: 'isEmpty', label: 'está vacío', input: false, test: (v: CellValue) => isEmptyValue(v) },
    { value: 'isNotEmpty', label: 'no está vacío', input: false, test: (v: CellValue) => !isEmptyValue(v) },
  ];
}

export const DATE_OPERATORS = dateOps(false);
export const DATE_TIME_OPERATORS = dateOps(true);

export const SINGLE_SELECT_OPERATORS: Operator[] = [
  { value: 'is', label: 'es', inputType: 'select', test: (v, f: string) => f === '' || String(v ?? '') === String(f) },
  { value: 'not', label: 'no es', inputType: 'select', test: (v, f: string) => f === '' || String(v ?? '') !== String(f) },
  {
    value: 'isAnyOf',
    label: 'es cualquiera de',
    inputType: 'select',
    multiple: true,
    test: (v: CellValue, f: readonly string[]) => f.length === 0 || f.map(String).includes(String(v ?? '')),
  },
];

/* ── Tipos ────────────────────────────────────────────────────────────── */

const numberFormatter = new Intl.NumberFormat();

export const COLUMN_TYPES: Record<string, ColumnType> = {
  string: {
    align: 'left',
    comparator: stringComparator,
    operators: STRING_OPERATORS,
    editor: 'text',
  },
  number: {
    align: 'right',
    headerAlign: 'right',
    comparator: numberComparator,
    operators: NUMBER_OPERATORS,
    editor: 'number',
    format: (v: CellValue) => (v == null || v === '' || Number.isNaN(Number(v)) ? '' : numberFormatter.format(Number(v))),
  },
  date: {
    align: 'left',
    comparator: dateComparator,
    operators: DATE_OPERATORS,
    editor: 'date',
    format: (v: CellValue) => {
      const d = toDate(v);
      return d ? d.toLocaleDateString() : '';
    },
  },
  dateTime: {
    align: 'left',
    comparator: dateComparator,
    operators: DATE_TIME_OPERATORS,
    editor: 'datetime-local',
    format: (v: CellValue) => {
      const d = toDate(v);
      return d ? `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';
    },
  },
  boolean: {
    align: 'center',
    headerAlign: 'center',
    comparator: booleanComparator,
    operators: BOOLEAN_OPERATORS,
    editor: 'boolean',
    format: (v: CellValue) => (v ? '✓' : '✕'),
  },
  singleSelect: {
    align: 'left',
    comparator: stringComparator,
    operators: SINGLE_SELECT_OPERATORS,
    editor: 'select',
  },
  actions: {
    align: 'center',
    headerAlign: 'center',
    sortable: false,
    filterable: false,
    editable: false,
    resizable: false,
    hideable: false,
    disableColumnMenu: true,
    width: 100,
  },
};

export function typeOf(col: ColumnDef | null | undefined): ColumnTypeName {
  const t = col?.type;
  return t != null && t in COLUMN_TYPES ? (t as ColumnTypeName) : 'string';
}

export function operatorsFor(col: ColumnDef | null | undefined): readonly Operator[] {
  const custom = col?.filterOperators;
  if (Array.isArray(custom) && custom.length) return custom;
  return COLUMN_TYPES[typeOf(col)].operators || STRING_OPERATORS;
}

export function operatorNeedsInput(op: Operator | null | undefined): boolean {
  if (!op) return true;
  if (op.input === false) return false;
  return !needsNoInput.has(op.value);
}

/** Prepara el valor de la regla una vez (minúsculas, número, lista…). */
export function prepareFilterValue(
  op: Operator | null | undefined,
  raw: CellValue,
  col: ColumnDef | null | undefined,
): FilterValue | null {
  if (!op || !operatorNeedsInput(op)) return null;
  // Regla sin valor: incompleta. `Number('')` es 0 y filtraría de más.
  if (raw == null || raw === '') return null;
  if (op.multiple) {
    const list = asList(raw);
    const type = typeOf(col);
    return type === 'string' ? list.map((s: string) => s.toLowerCase()) : list;
  }
  if (op.range) {
    const parts: string[] = (Array.isArray(raw) ? raw : String(raw).split(/\s*[,-]\s*/))
      .map((part: unknown) => String(part ?? '').trim());
    // Con un extremo vacío el rango está a medias: mejor no filtrar.
    if (parts.length !== 2 || parts.some((part) => part === '')) return null;
    const nums = parts.map(Number);
    return nums.every((n) => Number.isFinite(n)) ? nums : null;
  }
  const type = typeOf(col);
  if (type === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  if (type === 'string') return String(raw ?? '').toLowerCase();
  return raw as FilterValue;
}

/** Fábrica del test de una regla: null si la regla está incompleta. */
export interface FilterRule {
  readonly operator?: string;
  readonly value?: CellValue;
}

export function filterTest(
  item: FilterRule,
  col: ColumnDef | null | undefined,
): ((value: CellValue) => boolean) | null {
  const op = operatorsFor(col).find((o) => o.value === item.operator);
  if (!op) return null;
  // Sin valor que comparar, el segundo argumento no lo mira nadie.
  if (!operatorNeedsInput(op)) return (value: CellValue) => op.test(value, '');
  const prepared = prepareFilterValue(op, item.value, col);
  const lista = Array.isArray(prepared) ? prepared : null;
  const empty = prepared == null || (lista != null && lista.length === 0 && !op.multiple);
  if (empty && !op.multiple) return null;
  if (op.multiple && (prepared == null || lista == null || lista.length === 0)) return null;
  return (value: CellValue) => op.test(value, prepared as FilterValue);
}

/* ── Agregación ───────────────────────────────────────────────────────── */

const nums = (values: readonly CellValue[]): number[] =>
  values.map(Number).filter((n) => Number.isFinite(n));

export interface AggregationFn {
  readonly label: string;
  /** Tipos de columna que la admiten; `null` = todas. */
  readonly types: readonly string[] | null;
  apply(values: readonly CellValue[], type?: string): CellValue;
}

export const AGGREGATION_FNS: Record<string, AggregationFn> = {
  sum: { label: 'suma', types: ['number'], apply: (v: readonly CellValue[]) => nums(v).reduce((a, b) => a + b, 0) },
  avg: {
    label: 'media',
    types: ['number'],
    apply: (v: readonly CellValue[]) => {
      const list = nums(v);
      return list.length ? list.reduce((a, b) => a + b, 0) / list.length : null;
    },
  },
  min: {
    label: 'mínimo',
    types: ['number', 'date', 'dateTime'],
    apply: (v: readonly CellValue[], type?: string) => reduceExtreme(v, type, -1),
  },
  max: {
    label: 'máximo',
    types: ['number', 'date', 'dateTime'],
    apply: (v: readonly CellValue[], type?: string) => reduceExtreme(v, type, 1),
  },
  size: { label: 'cuenta', types: null, apply: (v: readonly CellValue[]) => v.length },
};

function reduceExtreme(
  values: readonly CellValue[],
  type: string | undefined,
  sign: number,
): CellValue {
  const cmp = type === 'date' || type === 'dateTime' ? dateComparator : numberComparator;
  const list = values.filter((v) => v != null && v !== '');
  if (!list.length) return null;
  return list.reduce((best, v) => (cmp(v, best) * sign > 0 ? v : best));
}
