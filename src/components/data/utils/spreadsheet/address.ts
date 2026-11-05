// address.ts — direcciones A1: letras de columna, celdas y rangos. Índices base 0.

/** Máximos admitidos por el motor (los de Excel). */
import type { Rect } from './address.schemas.ts';
const MAX_ROWS = 1048576;
const MAX_COLS = 16384;

/** Índice de columna a letras: 0 → A, 26 → AA. */
export function colName(c: number): string {
  let s = '';
  let n = c + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Letras de columna a índice: A → 0, AA → 26. */
export function colIndex(letters: string): number {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Texto A1 de una celda. */
export function cellName(r: number, c: number): string {
  return `${colName(c)}${r + 1}`;
}

/** Interpreta `B7` o `$B$7`; null si no es una celda. */
export function parseCell(text: string): { r: number; c: number } | null {
  const m = /^\$?([A-Za-z]{1,3})\$?(\d{1,7})$/.exec(text.trim());
  if (!m) return null;
  const r = Number(m[2]) - 1;
  const c = colIndex(m[1]);
  if (r < 0 || r >= MAX_ROWS || c >= MAX_COLS) return null;
  return { r, c };
}

/** Ordena las esquinas de un rectángulo. */
export function normalize(x: Rect): Rect {
  return { r1: Math.min(x.r1, x.r2), c1: Math.min(x.c1, x.c2), r2: Math.max(x.r1, x.r2), c2: Math.max(x.c1, x.c2) };
}

/** Interpreta `A1`, `A1:C3`, `A:C` o `2:5`; columnas o filas completas usan los límites dados. */
export function parseRange(text: string, rows = MAX_ROWS, cols = MAX_COLS): Rect | null {
  const t = text.trim().replace(/\$/g, '');
  const whole = /^([A-Za-z]{1,3}):([A-Za-z]{1,3})$/.exec(t);
  if (whole) return normalize({ r1: 0, c1: colIndex(whole[1]), r2: rows - 1, c2: colIndex(whole[2]) });
  const wholeRows = /^(\d+):(\d+)$/.exec(t);
  if (wholeRows) return normalize({ r1: Number(wholeRows[1]) - 1, c1: 0, r2: Number(wholeRows[2]) - 1, c2: cols - 1 });
  const [a, b] = t.split(':');
  const p = parseCell(a);
  if (!p) return null;
  const q = b === undefined ? p : parseCell(b);
  if (!q) return null;
  return normalize({ r1: p.r, c1: p.c, r2: q.r, c2: q.c });
}

/** Texto de un rango; una sola celda sale sin `:`. */
export function rangeName(x: Rect): string {
  const a = cellName(x.r1, x.c1);
  const b = cellName(x.r2, x.c2);
  return a === b ? a : `${a}:${b}`;
}

/** ¿La celda cae dentro del rectángulo? */
export function inRect(x: Rect, r: number, c: number): boolean {
  return r >= x.r1 && r <= x.r2 && c >= x.c1 && c <= x.c2;
}

/** ¿Se tocan los dos rectángulos? */
export function intersects(a: Rect, b: Rect): boolean {
  return a.r1 <= b.r2 && a.r2 >= b.r1 && a.c1 <= b.c2 && a.c2 >= b.c1;
}

/** Cita un nombre de hoja si hace falta para usarlo en una fórmula. */
export function quoteSheet(name: string): string {
  return /^[\p{L}_][\p{L}\p{N}_.]*$/u.test(name) ? name : `'${name.replace(/'/g, "''")}'`;
}
