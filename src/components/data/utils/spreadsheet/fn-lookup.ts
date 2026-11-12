// @contexto INDICE.md · src/components/data/README.md
// fn-lookup.ts — búsqueda y referencia.
import { colName, parseRange, quoteSheet } from './address.js';
import { wildcardRegex } from './criteria.js';
import { evalNode, evaluate } from './evaluator.js';
import type { Ctx } from './evaluator.schemas.js';
import { parseFormula } from './parser.js';
import { CellError, compare, ERR, RefValue, toNumber } from './values.js';
import type { EvalValue, Matrix, Scalar } from './values.schemas.js';
import { flat, isArrayLike, lifted, matrix, num, optBool, optNum, scalar, str } from './fn-helpers.js';
import { def, defLazy } from './fn-registry.js';

const CAT = 'Búsqueda';
const d = (name: string, sig: string, desc: string, fn: (a: EvalValue[], c: Ctx) => EvalValue, opts?: { volatile?: boolean }): void => def(CAT, name, sig, desc, fn, opts);

/** Búsqueda binaria: último índice con valor <= x (o >= si desc). */
function binaryFind(list: Scalar[], x: Scalar, desc = false): number {
  let lo = 0;
  let hi = list.length - 1;
  let best = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    const v = list[m];
    const sameType = typeof v === typeof x;
    const cmp = sameType ? compare(v, x) : (typeof v === 'number' ? -1 : 1);
    if (desc ? cmp >= 0 : cmp <= 0) { best = m; lo = m + 1; } else hi = m - 1;
  }
  return best;
}

/** Busca exacto, con comodines en texto si se pide. */
function exactFind(list: Scalar[], x: Scalar, wild: boolean, fromEnd = false): number {
  const re = wild && typeof x === 'string' && /[*?~]/.test(x) ? wildcardRegex(x) : null;
  const test = (v: Scalar): boolean => {
    if (v === null) return x === null;
    if (re) return typeof v === 'string' && re.test(v);
    return typeof v === typeof x && compare(v, x) === 0;
  };
  if (fromEnd) {
    for (let i = list.length - 1; i >= 0; i--) if (test(list[i])) return i;
    return -1;
  }
  for (let i = 0; i < list.length; i++) if (test(list[i])) return i;
  return -1;
}

/** XMATCH: modo 0 exacto, -1 menor siguiente, 1 mayor siguiente, 2 comodín. */
function xfind(list: Scalar[], x: Scalar, mode: number, search: number): number {
  if (search === 2 || search === -2) return binaryFind(list, x, search === -2);
  const fromEnd = search === -1;
  const hit = exactFind(list, x, mode === 2, fromEnd);
  if (hit >= 0 || mode === 0 || mode === 2) return hit;
  let best = -1;
  list.forEach((v, i) => {
    if (typeof v !== typeof x) return;
    const dist = compare(v, x);
    if (mode === -1 && dist < 0 && (best < 0 || compare(v, list[best]) > 0)) best = i;
    if (mode === 1 && dist > 0 && (best < 0 || compare(v, list[best]) < 0)) best = i;
  });
  return best;
}

/** Fila o columna de una matriz como vector. */
const column = (m: Matrix, k: number): Scalar[] => m.map((row) => row[k]);

/** Quita la dimensión si queda un solo elemento o escalar. */
function shrink(m: Matrix): EvalValue {
  return m.length === 1 && m[0].length === 1 ? m[0][0] : m;
}

const vlookup = (byColumn: boolean) => (a: EvalValue[], c: Ctx): EvalValue => {
  const key = (x: Scalar, t: Matrix, idx: number, approx: boolean): Scalar => {
    if (x instanceof CellError) return x;
    if (idx < 1) throw ERR.VALUE;
    const list = byColumn ? column(t, 0) : t[0];
    if (idx > (byColumn ? t[0].length : t.length)) throw ERR.REF;
    const pos = approx ? binaryFind(list, x) : exactFind(list, x, true);
    if (pos < 0) return ERR.NA;
    return (byColumn ? t[pos][idx - 1] : t[idx - 1][pos]) ?? 0;
  };
  const t = matrix(a[1], c);
  const idx = Math.trunc(num(a[2], c));
  const approx = optBool(a[3], c, true);
  if (isArrayLike(a[0])) return matrix(a[0], c).map((row) => row.map((x) => key(x, t, idx, approx)));
  return key(scalar(a[0], c), t, idx, approx);
};
d('VLOOKUP', 'buscado, tabla, columna, [aproximado]', 'Busca en la primera columna y devuelve de otra.', vlookup(true));
d('HLOOKUP', 'buscado, tabla, fila, [aproximado]', 'Busca en la primera fila y devuelve de otra.', vlookup(false));
d('LOOKUP', 'buscado, vector, [resultado]', 'Búsqueda aproximada en un vector ordenado.', (a, c) => {
  const x = scalar(a[0], c);
  const m = matrix(a[1], c);
  const wide = m[0].length > m.length;
  const list = wide ? m[0] : column(m, 0);
  const pos = binaryFind(list, x);
  if (pos < 0) throw ERR.NA;
  if (a[2] !== undefined) return flat(matrix(a[2], c))[pos] ?? ERR.NA;
  return wide ? m[m.length - 1][pos] : m[pos][m[0].length - 1];
});
d('MATCH', 'buscado, lista, [tipo]', 'Posición de un valor en una lista.', (a, c) => {
  const m = matrix(a[1], c);
  if (m.length > 1 && m[0].length > 1) throw ERR.NA;
  const list = flat(m);
  const type = optNum(a[2], c, 1);
  const one = (x: Scalar): Scalar => {
    if (x instanceof CellError) return x;
    const pos = type === 0 ? exactFind(list, x, true) : binaryFind(list, x, type < 0);
    return pos < 0 ? ERR.NA : pos + 1;
  };
  if (isArrayLike(a[0])) return matrix(a[0], c).map((row) => row.map(one));
  const r = one(scalar(a[0], c));
  if (r instanceof CellError) throw r;
  return r;
});
d('XMATCH', 'buscado, lista, [modo], [busqueda]', 'Posición con coincidencia flexible.', (a, c) => {
  const pos = xfind(flat(matrix(a[1], c)), scalar(a[0], c), optNum(a[2], c, 0), optNum(a[3], c, 1));
  if (pos < 0) throw ERR.NA;
  return pos + 1;
});
d('XLOOKUP', 'buscado, lista, resultado, [si_no_hay], [modo], [busqueda]', 'Búsqueda moderna en cualquier dirección.', (a, c) => {
  const lm = matrix(a[1], c);
  const rm = matrix(a[2], c);
  const vertical = lm[0].length === 1;
  const list = vertical ? column(lm, 0) : lm[0];
  const mode = optNum(a[4], c, 0);
  const search = optNum(a[5], c, 1);
  const one = (x: Scalar): EvalValue => {
    const pos = xfind(list, x, mode, search);
    if (pos < 0) {
      if (a[3] !== undefined) return scalar(a[3], c);
      return ERR.NA;
    }
    const row = vertical ? [rm[pos]] : rm.map((r) => [r[pos]]);
    return shrink(row as Matrix);
  };
  if (isArrayLike(a[0])) return matrix(a[0], c).map((row) => row.map((x) => one(x) as Scalar));
  const out = one(scalar(a[0], c));
  if (out instanceof CellError) throw out;
  return out;
});
d('INDEX', 'matriz, fila, [columna]', 'Valor o referencia en una posición.', (a, c) => {
  const src = a[0];
  const rowN = optNum(a[1], c, 0);
  const colN = optNum(a[2], c, a[2] === undefined && (src instanceof RefValue ? src.rows === 1 : (matrix(src, c).length === 1)) ? rowN : 0);
  const singleRow = a[2] === undefined && (src instanceof RefValue ? src.rows === 1 : matrix(src, c).length === 1);
  const r = singleRow ? 1 : rowN;
  const k = colN;
  if (r < 0 || k < 0) throw ERR.VALUE;
  if (src instanceof RefValue) {
    if (r > src.rows || k > src.cols) throw ERR.REF;
    return new RefValue(src.sheet, r ? src.r1 + r - 1 : src.r1, k ? src.c1 + k - 1 : src.c1, r ? src.r1 + r - 1 : src.r2, k ? src.c1 + k - 1 : src.c2);
  }
  const m = matrix(src, c);
  if (r > m.length || k > m[0].length) throw ERR.REF;
  if (r && k) return m[r - 1][k - 1];
  if (r) return [m[r - 1]];
  return k ? m.map((row) => [row[k - 1]]) : m;
});
d('OFFSET', 'referencia, filas, columnas, [alto], [ancho]', 'Referencia desplazada.', (a, c) => {
  const b = a[0];
  if (!(b instanceof RefValue)) throw ERR.VALUE;
  const r = b.r1 + num(a[1], c);
  const k = b.c1 + num(a[2], c);
  const h = optNum(a[3], c, b.rows);
  const w = optNum(a[4], c, b.cols);
  if (r < 0 || k < 0 || h < 1 || w < 1) throw ERR.REF;
  return new RefValue(b.sheet, r, k, r + h - 1, k + w - 1);
}, { volatile: true });
d('INDIRECT', 'texto, [a1]', 'Referencia desde un texto.', (a, c) => {
  const text = str(a[0], c);
  if (!optBool(a[1], c, true)) throw ERR.REF;
  const bang = text.lastIndexOf('!');
  let sheet: number | null = c.sheet;
  let tail = text;
  if (bang >= 0) {
    sheet = c.host.sheetId(text.slice(0, bang).replace(/^'|'$/g, '').replace(/''/g, "'"));
    tail = text.slice(bang + 1);
  }
  if (sheet !== null) {
    const dims = c.host.dims(sheet);
    const x = parseRange(tail, dims.rows, dims.cols);
    if (x) return new RefValue(sheet, x.r1, x.c1, x.r2, x.c2);
  }
  try {
    const v = evaluate(parseFormula(text), c);
    if (v instanceof RefValue) return v;
  } catch { /* texto no evaluable: #REF! abajo */ }
  throw ERR.REF;
}, { volatile: true });
defLazy(CAT, 'CHOOSE', 'indice, valor1, ...', 'Elige un valor por posición.', (n, c) => {
  const i = Math.trunc(toNumber(scalar(evalNode(n[0], c), c)));
  if (i < 1 || i >= n.length) throw ERR.VALUE;
  return evalNode(n[i], c);
});
d('ROW', '[referencia]', 'Número de fila.', (a, c) => {
  const x = a[0];
  if (x === undefined) return c.r + 1;
  if (!(x instanceof RefValue)) throw ERR.VALUE;
  if (x.rows === 1) return x.r1 + 1;
  return Array.from({ length: x.rows }, (_, i): Scalar[] => [x.r1 + i + 1]);
});
d('COLUMN', '[referencia]', 'Número de columna.', (a, c) => {
  const x = a[0];
  if (x === undefined) return c.c + 1;
  if (!(x instanceof RefValue)) throw ERR.VALUE;
  if (x.cols === 1) return x.c1 + 1;
  return [Array.from({ length: x.cols }, (_, i): Scalar => x.c1 + i + 1)];
});
d('ROWS', 'matriz', 'Número de filas.', (a, c) => (a[0] instanceof RefValue ? a[0].rows : matrix(a[0], c).length));
d('COLUMNS', 'matriz', 'Número de columnas.', (a, c) => (a[0] instanceof RefValue ? a[0].cols : matrix(a[0], c)[0].length));
d('AREAS', 'referencia', 'Número de áreas.', () => 1);
d('ADDRESS', 'fila, columna, [abs], [a1], [hoja]', 'Texto de una dirección.', lifted(([r, k, ab, _a1, sh]) => {
  const y = toNumber(r);
  const x = toNumber(k);
  if (y < 1 || x < 1) throw ERR.VALUE;
  const mode = ab === undefined || ab === null ? 1 : toNumber(ab);
  const col = (mode === 1 || mode === 3 ? '$' : '') + colName(x - 1);
  const row = (mode === 1 || mode === 2 ? '$' : '') + y;
  return `${sh ? `${quoteSheet(String(sh))}!` : ''}${col}${row}`;
}));
d('TRANSPOSE', 'matriz', 'Intercambia filas y columnas.', (a, c) => {
  const m = matrix(a[0], c);
  return m[0].map((_, k) => m.map((row) => row[k] ?? 0));
});
d('HYPERLINK', 'enlace, [texto]', 'Texto de un enlace.', (a, c) => (a[1] === undefined ? str(a[0], c) : scalar(a[1], c)));
