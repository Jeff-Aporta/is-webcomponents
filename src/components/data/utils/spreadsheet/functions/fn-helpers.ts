// helpers.ts — utilidades compartidas por las familias de funciones.
import type { Ctx } from '@jeff-aporta/iswc-base/components/data/utils/spreadsheet/evaluator.schemas.js';
import { refMatrix } from '@jeff-aporta/iswc-base/components/data/utils/spreadsheet/evaluator.js';
import { CellError, ERR, LambdaValue, RefValue, toBool, toNumber, toText } from '@jeff-aporta/iswc-base/components/data/utils/spreadsheet/values.js';
import type { EvalValue, Matrix, Scalar } from '@jeff-aporta/iswc-base/components/data/utils/spreadsheet/values.schemas.js';

/** ¿Es un argumento matricial (rango de varias celdas o matriz)? */
export function isArrayLike(v: EvalValue): boolean {
  return Array.isArray(v) || (v instanceof RefValue && !v.single);
}

/** Escalar de un argumento. Un rango toma su primera celda solo si es una. */
export function scalar(v: EvalValue, ctx: Ctx): Scalar {
  if (v === undefined) return null;
  if (v instanceof RefValue) {
    if (v.single) return ctx.host.value(v.sheet, v.r1, v.c1);
    throw ERR.VALUE;
  }
  if (Array.isArray(v)) return v[0][0];
  if (v instanceof LambdaValue) throw ERR.CALC;
  return v;
}

/** Matriz de un argumento. */
export function matrix(v: EvalValue, ctx: Ctx): Matrix {
  if (v instanceof RefValue) return refMatrix(v, ctx);
  if (Array.isArray(v)) return v;
  if (v instanceof LambdaValue) throw ERR.CALC;
  return [[v ?? null]];
}

/** Número obligatorio. */
export function num(v: EvalValue, ctx: Ctx): number {
  return toNumber(scalar(v, ctx));
}

/** Número opcional con valor por defecto. */
export function optNum(v: EvalValue | undefined, ctx: Ctx, dflt: number): number {
  if (v === undefined || v === null) return dflt;
  return num(v, ctx);
}

/** Texto obligatorio. */
export function str(v: EvalValue, ctx: Ctx): string {
  return toText(scalar(v, ctx));
}

/** Lógico opcional. */
export function optBool(v: EvalValue | undefined, ctx: Ctx, dflt: boolean): boolean {
  if (v === undefined) return dflt;
  return toBool(scalar(v, ctx));
}

/** Recorre celdas de un argumento; los rangos enteros se recortan al área usada. */
export function forEach(v: EvalValue, ctx: Ctx, cb: (x: Scalar, fromRange: boolean) => void): void {
  if (v === undefined) return;
  if (v instanceof RefValue) {
    const used = ctx.host.used(v.sheet);
    const r2 = Math.min(v.r2, used.rows - 1);
    const c2 = Math.min(v.c2, used.cols - 1);
    for (let r = v.r1; r <= r2; r++) {
      for (let c = v.c1; c <= c2; c++) cb(ctx.host.value(v.sheet, r, c), true);
    }
    return;
  }
  if (Array.isArray(v)) {
    for (const row of v) for (const x of row) cb(x, true);
    return;
  }
  if (v instanceof LambdaValue) throw ERR.CALC;
  cb(v, false);
}

/** Números de los argumentos con la semántica de SUM: en rangos ignora texto y lógicos. */
export function numbers(args: EvalValue[], ctx: Ctx): number[] {
  const out: number[] = [];
  for (const a of args) {
    forEach(a, ctx, (x, fromRange) => {
      if (x instanceof CellError) throw x;
      if (typeof x === 'number') { out.push(x); return; }
      if (!fromRange && x !== null) out.push(toNumber(x));
    });
  }
  return out;
}

/** Variante A: texto cuenta 0 y lógicos 0/1. */
export function numbersA(args: EvalValue[], ctx: Ctx): number[] {
  const out: number[] = [];
  for (const a of args) {
    forEach(a, ctx, (x, fromRange) => {
      if (x instanceof CellError) throw x;
      if (x === null) return;
      if (typeof x === 'number') out.push(x);
      else if (typeof x === 'boolean') out.push(x ? 1 : 0);
      else out.push(fromRange ? 0 : toNumber(x));
    });
  }
  return out;
}

/** Función escalar elevada a matrices: difunde cada argumento matricial. */
export function lifted(fn: (a: Scalar[], ctx: Ctx) => Scalar): (args: EvalValue[], ctx: Ctx) => EvalValue {
  return (args, ctx) => {
    if (!args.some((a) => a !== undefined && isArrayLike(a))) return fn(args.map((a) => scalar(a, ctx)), ctx);
    const ms = args.map((a) => (a === undefined ? null : isArrayLike(a) ? matrix(a, ctx) : null));
    let rows = 1;
    let cols = 1;
    for (const m of ms) {
      if (!m) continue;
      rows = Math.max(rows, m.length);
      cols = Math.max(cols, m[0].length);
    }
    const out: Matrix = [];
    for (let r = 0; r < rows; r++) {
      const row: Scalar[] = [];
      for (let c = 0; c < cols; c++) {
        const cell = args.map((a, i): Scalar => {
          const m = ms[i];
          if (!m) return scalar(a, ctx);
          const rr = m.length === 1 ? 0 : r;
          const cc = m[0].length === 1 ? 0 : c;
          return rr < m.length && cc < m[0].length ? m[rr][cc] : ERR.NA;
        });
        try {
          const bad = cell.find((x) => x instanceof CellError);
          row.push(bad !== undefined ? bad : fn(cell, ctx));
        } catch (e) {
          if (!(e instanceof CellError)) throw e;
          row.push(e);
        }
      }
      out.push(row);
    }
    return out;
  };
}

/** Primer error de una matriz, para propagarlo. */
export function firstError(m: Matrix): CellError | null {
  for (const row of m) for (const x of row) if (x instanceof CellError) return x;
  return null;
}

/** Aplana una matriz por filas. */
export function flat(m: Matrix): Scalar[] {
  const out: Scalar[] = [];
  for (const row of m) for (const x of row) out.push(x);
  return out;
}

/** Valida un resultado numérico. */
export function finite(n: number): number {
  if (!Number.isFinite(n)) throw ERR.NUM;
  return n;
}
