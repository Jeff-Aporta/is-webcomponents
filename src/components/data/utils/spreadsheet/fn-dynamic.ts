// @contexto INDICE.md · src/components/data/README.md
// fn-dynamic.ts — funciones de matrices dinámicas: devuelven matrices que desbordan.
import type { Ctx } from './evaluator.schemas.js';
import { CellError, compare, ERR, toBool, toNumber } from './values.js';
import type { EvalValue, Matrix, Scalar } from './values.schemas.js';
import { flat, matrix, num, optBool, optNum } from './fn-helpers.js';
import { def } from './fn-registry.js';

const CAT = 'Matrices dinámicas';
const d = (name: string, sig: string, desc: string, fn: (a: EvalValue[], c: Ctx) => EvalValue, opts?: { volatile?: boolean }): void => def(CAT, name, sig, desc, fn, opts);

/** Comparación que deja los vacíos al final. */
function sortCompare(a: Scalar, b: Scalar): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return compare(a, b);
}

/** Tamaño pedido: no vacío. */
const nonEmpty = (m: Matrix): Matrix => {
  if (!m.length || !m[0].length) throw ERR.CALC;
  return m;
};

d('SORT', 'matriz, [indice], [orden], [por_columna]', 'Ordena filas o columnas.', (a, c) => {
  const m = matrix(a[0], c);
  const idx = optNum(a[1], c, 1) - 1;
  const asc = optNum(a[2], c, 1) >= 0;
  if (optBool(a[3], c, false)) {
    const order = m[0].map((_, i) => i).sort((p, q) => (asc ? 1 : -1) * sortCompare(m[idx][p], m[idx][q]));
    return m.map((row) => order.map((i) => row[i]));
  }
  return [...m].sort((p, q) => (asc ? 1 : -1) * sortCompare(p[idx], q[idx]));
});
d('SORTBY', 'matriz, por1, [orden1], ...', 'Ordena según otras matrices.', (a, c) => {
  const m = matrix(a[0], c);
  const keys: { v: Scalar[]; dir: number }[] = [];
  for (let i = 1; i < a.length; i += 2) keys.push({ v: flat(matrix(a[i], c)), dir: optNum(a[i + 1], c, 1) >= 0 ? 1 : -1 });
  if (keys.some((k) => k.v.length !== m.length)) throw ERR.VALUE;
  const order = m.map((_, i) => i).sort((p, q) => {
    for (const k of keys) {
      const s = sortCompare(k.v[p], k.v[q]);
      if (s) return k.dir * s;
    }
    return p - q;
  });
  return order.map((i) => m[i]);
});
d('FILTER', 'matriz, incluir, [si_vacio]', 'Filtra filas o columnas con una matriz lógica.', (a, c) => {
  const m = matrix(a[0], c);
  const inc = matrix(a[1], c);
  const test = (v: Scalar): boolean => {
    if (v instanceof CellError) throw v;
    return toBool(v);
  };
  let out: Matrix;
  if (inc[0].length === 1 && inc.length === m.length) out = m.filter((_, i) => test(inc[i][0]));
  else if (inc.length === 1 && inc[0].length === m[0].length) {
    const keep = inc[0].map(test);
    out = m.map((row) => row.filter((_, i) => keep[i]));
  } else throw ERR.VALUE;
  if (!out.length || !out[0].length) {
    if (a[2] !== undefined) return matrix(a[2], c);
    throw ERR.CALC;
  }
  return out;
});
d('UNIQUE', 'matriz, [por_columna], [solo_una_vez]', 'Valores distintos.', (a, c) => {
  const byCol = optBool(a[1], c, false);
  const once = optBool(a[2], c, false);
  const m = matrix(a[0], c);
  const lines = byCol ? m[0].map((_, k) => m.map((row) => row[k])) : m;
  const key = (l: Scalar[]): string => JSON.stringify(l.map((v) => (typeof v === 'string' ? v.toLowerCase() : v instanceof CellError ? v.code : v)));
  const count = new Map<string, number>();
  for (const l of lines) count.set(key(l), (count.get(key(l)) ?? 0) + 1);
  const seen = new Set<string>();
  const out: Matrix = [];
  for (const l of lines) {
    const k = key(l);
    if (seen.has(k) || (once && count.get(k)! > 1)) continue;
    seen.add(k);
    out.push(l);
  }
  if (!out.length) throw ERR.CALC;
  return byCol ? out[0].map((_, r) => out.map((l) => l[r])) : out;
});
d('SEQUENCE', 'filas, [columnas], [inicio], [paso]', 'Serie numérica.', (a, c) => {
  const rows = num(a[0], c);
  const cols = optNum(a[1], c, 1);
  const start = optNum(a[2], c, 1);
  const step = optNum(a[3], c, 1);
  if (rows < 1 || cols < 1) throw ERR.CALC;
  if (rows * cols > 1048576) throw ERR.NUM;
  const out: Matrix = [];
  for (let r = 0; r < rows; r++) {
    const row: Scalar[] = [];
    for (let k = 0; k < cols; k++) row.push(start + (r * cols + k) * step);
    out.push(row);
  }
  return out;
});
d('RANDARRAY', '[filas], [columnas], [minimo], [maximo], [entero]', 'Matriz aleatoria.', (a, c) => {
  const rows = optNum(a[0], c, 1);
  const cols = optNum(a[1], c, 1);
  const lo = optNum(a[2], c, 0);
  const hi = optNum(a[3], c, 1);
  const int = optBool(a[4], c, false);
  if (lo > hi) throw ERR.VALUE;
  const out: Matrix = [];
  for (let r = 0; r < rows; r++) {
    const row: Scalar[] = [];
    for (let k = 0; k < cols; k++) row.push(int ? lo + Math.floor(Math.random() * (hi - lo + 1)) : lo + Math.random() * (hi - lo));
    out.push(row);
  }
  return out;
}, { volatile: true });
d('VSTACK', 'matriz1, ...', 'Apila matrices en vertical.', (a, c) => {
  const ms = a.map((x) => matrix(x, c));
  const w = Math.max(...ms.map((m) => m[0].length));
  return ms.flatMap((m) => m.map((row) => Array.from({ length: w }, (_, i): Scalar => (i < row.length ? row[i] : ERR.NA))));
});
d('HSTACK', 'matriz1, ...', 'Apila matrices en horizontal.', (a, c) => {
  const ms = a.map((x) => matrix(x, c));
  const h = Math.max(...ms.map((m) => m.length));
  return Array.from({ length: h }, (_, r) => ms.flatMap((m) => m[r] ?? new Array<Scalar>(m[0].length).fill(ERR.NA)));
});
d('TAKE', 'matriz, filas, [columnas]', 'Toma filas o columnas de un extremo.', (a, c) => {
  const m = matrix(a[0], c);
  const r = a[1] === undefined ? m.length : num(a[1], c);
  const k = a[2] === undefined ? m[0].length : num(a[2], c);
  if (r === 0 || k === 0) throw ERR.CALC;
  const rows = r > 0 ? m.slice(0, r) : m.slice(r);
  return rows.map((row) => (k > 0 ? row.slice(0, k) : row.slice(k)));
});
d('DROP', 'matriz, filas, [columnas]', 'Quita filas o columnas de un extremo.', (a, c) => {
  const m = matrix(a[0], c);
  const r = a[1] === undefined ? 0 : num(a[1], c);
  const k = a[2] === undefined ? 0 : num(a[2], c);
  const rows = r >= 0 ? m.slice(r) : m.slice(0, r);
  return nonEmpty(rows.map((row) => (k >= 0 ? row.slice(k) : row.slice(0, k))));
});
d('EXPAND', 'matriz, filas, [columnas], [relleno]', 'Amplía una matriz.', (a, c) => {
  const m = matrix(a[0], c);
  const r = a[1] === undefined ? m.length : num(a[1], c);
  const k = a[2] === undefined ? m[0].length : num(a[2], c);
  const pad: Scalar = a[3] === undefined ? ERR.NA : (matrix(a[3], c)[0][0]);
  if (r < m.length || k < m[0].length) throw ERR.VALUE;
  return Array.from({ length: r }, (_, y) => Array.from({ length: k }, (_x, x) => (y < m.length && x < m[0].length ? m[y][x] : pad)));
});

/** Celdas en orden, omitiendo vacíos o errores si se pide. */
function ordered(a: EvalValue[], c: Ctx): Scalar[] {
  const m = matrix(a[0], c);
  const skip = optNum(a[1], c, 0);
  const byCol = optBool(a[2], c, false);
  const list = byCol ? m[0].flatMap((_, k) => m.map((row) => row[k])) : flat(m);
  return list.filter((v) => !((skip === 1 || skip === 3) && v === null) && !((skip === 2 || skip === 3) && v instanceof CellError));
}

d('TOCOL', 'matriz, [omitir], [por_columna]', 'Matriz a una columna.', (a, c) => ordered(a, c).map((v) => [v]));
d('TOROW', 'matriz, [omitir], [por_columna]', 'Matriz a una fila.', (a, c) => [ordered(a, c)]);
const wrap = (rows: boolean) => (a: EvalValue[], c: Ctx): EvalValue => {
  const list = flat(matrix(a[0], c));
  const n = num(a[1], c);
  const pad: Scalar = a[2] === undefined ? ERR.NA : matrix(a[2], c)[0][0];
  if (n < 1) throw ERR.NUM;
  const lines: Matrix = [];
  for (let i = 0; i < list.length; i += n) lines.push(Array.from({ length: n }, (_, j) => (i + j < list.length ? list[i + j] : pad)));
  return rows ? lines : lines[0].map((_, k) => lines.map((l) => l[k]));
};
d('WRAPROWS', 'vector, ancho, [relleno]', 'Reparte un vector en filas.', wrap(true));
d('WRAPCOLS', 'vector, alto, [relleno]', 'Reparte un vector en columnas.', wrap(false));
d('CHOOSEROWS', 'matriz, fila1, ...', 'Elige filas.', (a, c) => {
  const m = matrix(a[0], c);
  return a.slice(1).flatMap((x) => flat(matrix(x, c)).map(toNumber)).map((i) => {
    const row = m[i < 0 ? m.length + i : i - 1];
    if (!row) throw ERR.VALUE;
    return row;
  });
});
d('CHOOSECOLS', 'matriz, columna1, ...', 'Elige columnas.', (a, c) => {
  const m = matrix(a[0], c);
  const ids = a.slice(1).flatMap((x) => flat(matrix(x, c)).map(toNumber)).map((i) => (i < 0 ? m[0].length + i : i - 1));
  if (ids.some((i) => i < 0 || i >= m[0].length)) throw ERR.VALUE;
  return m.map((row) => ids.map((i) => row[i]));
});
