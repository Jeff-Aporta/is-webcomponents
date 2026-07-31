/**
 * Tipos de columna del data grid: alineación por defecto, comparador,
 * formateo y operadores de filtro. Réplica de los tipos nativos de MUI X
 * (string, number, date, dateTime, boolean, singleSelect, actions).
 */

export const LOGIC = { AND: 'and', OR: 'or' };

/* ── Comparadores ─────────────────────────────────────────────────────── */

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export function stringComparator(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  return collator.compare(String(a), String(b));
}

export function numberComparator(a, b) {
  const na = a == null || a === '' ? null : Number(a);
  const nb = b == null || b === '' ? null : Number(b);
  if (na == null && nb == null) return 0;
  if (na == null) return -1;
  if (nb == null) return 1;
  return na - nb;
}

export function dateComparator(a, b) {
  const ta = toDate(a)?.getTime() ?? null;
  const tb = toDate(b)?.getTime() ?? null;
  if (ta == null && tb == null) return 0;
  if (ta == null) return -1;
  if (tb == null) return 1;
  return ta - tb;
}

export function booleanComparator(a, b) {
  return (a ? 1 : 0) - (b ? 1 : 0);
}

/** Acepta Date, número (epoch) o cadena ISO. */
export function toDate(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ── Operadores de filtro ─────────────────────────────────────────────── */

/**
 * Cada operador declara si necesita valor (`input`) y devuelve un test.
 * `null` como test significa "regla incompleta": no filtra nada.
 */
const needsNoInput = new Set(['isEmpty', 'isNotEmpty']);

function isEmptyValue(v) {
  return v == null || v === '';
}

function asList(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  return String(value).split(',').map((s) => s.trim()).filter(Boolean);
}

export const STRING_OPERATORS = [
  { value: 'contains', label: 'contiene', test: (v, f) => String(v ?? '').toLowerCase().includes(f) },
  { value: 'doesNotContain', label: 'no contiene', test: (v, f) => !String(v ?? '').toLowerCase().includes(f) },
  { value: 'equals', label: 'es igual a', test: (v, f) => String(v ?? '').toLowerCase() === f },
  { value: 'doesNotEqual', label: 'no es igual a', test: (v, f) => String(v ?? '').toLowerCase() !== f },
  { value: 'startsWith', label: 'empieza por', test: (v, f) => String(v ?? '').toLowerCase().startsWith(f) },
  { value: 'endsWith', label: 'termina en', test: (v, f) => String(v ?? '').toLowerCase().endsWith(f) },
  { value: 'isEmpty', label: 'está vacío', input: false, test: (v) => isEmptyValue(v) },
  { value: 'isNotEmpty', label: 'no está vacío', input: false, test: (v) => !isEmptyValue(v) },
  {
    value: 'isAnyOf',
    label: 'es cualquiera de',
    multiple: true,
    test: (v, f) => f.length === 0 || f.includes(String(v ?? '').toLowerCase()),
  },
];

export const NUMBER_OPERATORS = [
  { value: '=', label: '=', test: (v, f) => Number(v) === f },
  { value: '!=', label: '≠', test: (v, f) => Number(v) !== f },
  { value: '>', label: '>', test: (v, f) => Number(v) > f },
  { value: '>=', label: '≥', test: (v, f) => Number(v) >= f },
  { value: '<', label: '<', test: (v, f) => Number(v) < f },
  { value: '<=', label: '≤', test: (v, f) => Number(v) <= f },
  { value: 'between', label: 'entre', range: true, test: (v, f) => Number(v) >= f[0] && Number(v) <= f[1] },
  { value: 'isEmpty', label: 'está vacío', input: false, test: (v) => isEmptyValue(v) },
  { value: 'isNotEmpty', label: 'no está vacío', input: false, test: (v) => !isEmptyValue(v) },
  {
    value: 'isAnyOf',
    label: 'es cualquiera de',
    multiple: true,
    test: (v, f) => f.length === 0 || f.some((n) => Number(n) === Number(v)),
  },
];

export const BOOLEAN_OPERATORS = [
  {
    value: 'is',
    label: 'es',
    inputType: 'boolean',
    test: (v, f) => (f === '' ? true : Boolean(v) === (f === 'true' || f === true)),
  },
];

const dayStamp = (v) => {
  const d = toDate(v);
  if (!d) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

function dateOps(withTime) {
  const stamp = withTime ? (v) => toDate(v)?.getTime() ?? null : dayStamp;
  const inputType = withTime ? 'datetime-local' : 'date';
  const cmp = (v, f, fn) => {
    const a = stamp(v);
    const b = stamp(f);
    return a != null && b != null && fn(a, b);
  };
  return [
    { value: 'is', label: 'es', inputType, test: (v, f) => cmp(v, f, (a, b) => a === b) },
    { value: 'not', label: 'no es', inputType, test: (v, f) => cmp(v, f, (a, b) => a !== b) },
    { value: 'after', label: 'después de', inputType, test: (v, f) => cmp(v, f, (a, b) => a > b) },
    { value: 'onOrAfter', label: 'en o después de', inputType, test: (v, f) => cmp(v, f, (a, b) => a >= b) },
    { value: 'before', label: 'antes de', inputType, test: (v, f) => cmp(v, f, (a, b) => a < b) },
    { value: 'onOrBefore', label: 'en o antes de', inputType, test: (v, f) => cmp(v, f, (a, b) => a <= b) },
    { value: 'isEmpty', label: 'está vacío', input: false, test: (v) => isEmptyValue(v) },
    { value: 'isNotEmpty', label: 'no está vacío', input: false, test: (v) => !isEmptyValue(v) },
  ];
}

export const DATE_OPERATORS = dateOps(false);
export const DATE_TIME_OPERATORS = dateOps(true);

export const SINGLE_SELECT_OPERATORS = [
  { value: 'is', label: 'es', inputType: 'select', test: (v, f) => f === '' || String(v ?? '') === String(f) },
  { value: 'not', label: 'no es', inputType: 'select', test: (v, f) => f === '' || String(v ?? '') !== String(f) },
  {
    value: 'isAnyOf',
    label: 'es cualquiera de',
    inputType: 'select',
    multiple: true,
    test: (v, f) => f.length === 0 || f.map(String).includes(String(v ?? '')),
  },
];

/* ── Tipos ────────────────────────────────────────────────────────────── */

const numberFormatter = new Intl.NumberFormat();

export const COLUMN_TYPES = {
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
    format: (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? '' : numberFormatter.format(Number(v))),
  },
  date: {
    align: 'left',
    comparator: dateComparator,
    operators: DATE_OPERATORS,
    editor: 'date',
    format: (v) => {
      const d = toDate(v);
      return d ? d.toLocaleDateString() : '';
    },
  },
  dateTime: {
    align: 'left',
    comparator: dateComparator,
    operators: DATE_TIME_OPERATORS,
    editor: 'datetime-local',
    format: (v) => {
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
    format: (v) => (v ? '✓' : '✕'),
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

export function typeOf(col) {
  return COLUMN_TYPES[col?.type] ? col.type : 'string';
}

export function operatorsFor(col) {
  const custom = col?.filterOperators;
  if (Array.isArray(custom) && custom.length) return custom;
  return COLUMN_TYPES[typeOf(col)].operators || STRING_OPERATORS;
}

export function operatorNeedsInput(op) {
  if (!op) return true;
  if (op.input === false) return false;
  return !needsNoInput.has(op.value);
}

/** Prepara el valor de la regla una vez (minúsculas, número, lista…). */
export function prepareFilterValue(op, raw, col) {
  if (!operatorNeedsInput(op)) return null;
  // Regla sin valor: incompleta. `Number('')` es 0 y filtraría de más.
  if (raw == null || raw === '') return null;
  if (op.multiple) {
    const list = asList(raw);
    const type = typeOf(col);
    return type === 'string' ? list.map((s) => s.toLowerCase()) : list;
  }
  if (op.range) {
    const parts = (Array.isArray(raw) ? raw : String(raw).split(/\s*[,-]\s*/))
      .map((part) => String(part ?? '').trim());
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
  return raw;
}

/** Fábrica del test de una regla: null si la regla está incompleta. */
export function filterTest(item, col) {
  const op = operatorsFor(col).find((o) => o.value === item.operator);
  if (!op) return null;
  if (!operatorNeedsInput(op)) return (value) => op.test(value);
  const prepared = prepareFilterValue(op, item.value, col);
  const empty = prepared == null || (Array.isArray(prepared) && prepared.length === 0 && !op.multiple);
  if (empty && !op.multiple) return null;
  if (op.multiple && (!prepared || prepared.length === 0)) return null;
  return (value) => op.test(value, prepared);
}

/* ── Agregación ───────────────────────────────────────────────────────── */

const nums = (values) => values.map(Number).filter((n) => Number.isFinite(n));

export const AGGREGATION_FNS = {
  sum: { label: 'suma', types: ['number'], apply: (v) => nums(v).reduce((a, b) => a + b, 0) },
  avg: {
    label: 'media',
    types: ['number'],
    apply: (v) => {
      const list = nums(v);
      return list.length ? list.reduce((a, b) => a + b, 0) / list.length : null;
    },
  },
  min: {
    label: 'mínimo',
    types: ['number', 'date', 'dateTime'],
    apply: (v, type) => reduceExtreme(v, type, -1),
  },
  max: {
    label: 'máximo',
    types: ['number', 'date', 'dateTime'],
    apply: (v, type) => reduceExtreme(v, type, 1),
  },
  size: { label: 'cuenta', types: null, apply: (v) => v.length },
};

function reduceExtreme(values, type, sign) {
  const cmp = type === 'date' || type === 'dateTime' ? dateComparator : numberComparator;
  const list = values.filter((v) => v != null && v !== '');
  if (!list.length) return null;
  return list.reduce((best, v) => (cmp(v, best) * sign > 0 ? v : best));
}
