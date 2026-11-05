// evaluator.ts — evalúa el árbol de una fórmula contra un `EvalHost`. No conoce el grafo ni el
// DOM: el motor le entrega los valores y resuelve el orden.
import type { Node } from './parser.schemas.js';
import { compare, CellError, ERR, LambdaValue, RefValue, toNumber, toText } from './values.js';
import type { EvalValue, Matrix, Scalar } from './values.schemas.js';
import { lookupFn } from './functions/registry.js';
import type { Env, Ctx } from './evaluator.schemas.js';

const MAX_DEPTH = 256;

/** Busca una variable en la cadena de entornos. */
function lookupVar(env: Env | null, key: string): { found: boolean; value?: EvalValue } {
  for (let e = env; e; e = e.parent) {
    if (e.vars.has(key)) return { found: true, value: e.vars.get(key) };
  }
  return { found: false };
}

/** Matriz de una referencia. */
export function refMatrix(ref: RefValue, ctx: Ctx): Matrix {
  const out: Matrix = new Array(ref.rows);
  for (let r = 0; r < ref.rows; r++) {
    const row: Scalar[] = new Array(ref.cols);
    for (let c = 0; c < ref.cols; c++) row[c] = ctx.host.value(ref.sheet, ref.r1 + r, ref.c1 + c);
    out[r] = row;
  }
  return out;
}

/** Valor de operando: referencia de una celda a escalar; rango a matriz. */
function operand(v: EvalValue, ctx: Ctx): Scalar | Matrix {
  if (v instanceof RefValue) return v.single ? ctx.host.value(v.sheet, v.r1, v.c1) : refMatrix(v, ctx);
  if (v instanceof LambdaValue) throw ERR.CALC;
  return v;
}

/** Aplica una operación celda a celda con difusión de dimensiones. */
function broadcast(a: Scalar | Matrix, b: Scalar | Matrix, fn: (x: Scalar, y: Scalar) => Scalar): Scalar | Matrix {
  const ma = Array.isArray(a);
  const mb = Array.isArray(b);
  if (!ma && !mb) return fn(a as Scalar, b as Scalar);
  const x = (ma ? a : [[a]]) as Matrix;
  const y = (mb ? b : [[b]]) as Matrix;
  const rows = Math.max(x.length, y.length);
  const cols = Math.max(x[0].length, y[0].length);
  const pick = (m: Matrix, r: number, c: number): Scalar => {
    const rr = m.length === 1 ? 0 : r;
    const cc = m[0].length === 1 ? 0 : c;
    if (rr >= m.length || cc >= m[0].length) return ERR.NA;
    return m[rr][cc];
  };
  const out: Matrix = [];
  for (let r = 0; r < rows; r++) {
    const row: Scalar[] = [];
    for (let c = 0; c < cols; c++) row.push(safely(() => fn(pick(x, r, c), pick(y, r, c))));
    out.push(row);
  }
  return out;
}

/** Convierte un error lanzado en su valor de celda. */
function safely(fn: () => Scalar): Scalar {
  try { return fn(); } catch (e) {
    if (e instanceof CellError) return e;
    throw e;
  }
}

/** Operación binaria sobre escalares. */
function binary(op: string, x: Scalar, y: Scalar): Scalar {
  if (x instanceof CellError) return x;
  if (y instanceof CellError) return y;
  switch (op) {
    case '+': return toNumber(x) + toNumber(y);
    case '-': return toNumber(x) - toNumber(y);
    case '*': return toNumber(x) * toNumber(y);
    case '/': {
      const d = toNumber(y);
      if (d === 0) return ERR.DIV0;
      return toNumber(x) / d;
    }
    case '^': {
      const r = Math.pow(toNumber(x), toNumber(y));
      return Number.isFinite(r) ? r : ERR.NUM;
    }
    case '&': return toText(x) + toText(y);
    case '=': return compare(x, y) === 0;
    case '<>': return compare(x, y) !== 0;
    case '<': return compare(x, y) < 0;
    case '>': return compare(x, y) > 0;
    case '<=': return compare(x, y) <= 0;
    case '>=': return compare(x, y) >= 0;
    default: return ERR.VALUE;
  }
}

/** Mapea una matriz o escalar. */
function mapValue(v: Scalar | Matrix, fn: (x: Scalar) => Scalar): Scalar | Matrix {
  if (Array.isArray(v)) return v.map((row) => row.map((x) => safely(() => fn(x))));
  return fn(v);
}

/** Evalúa un nodo. Puede lanzar CellError. */
export function evalNode(n: Node, ctx: Ctx): EvalValue {
  switch (n.t) {
    case 'num': case 'str': case 'bool': case 'err': return n.v;
    case 'miss': return null;
    case 'ref': return evalRef(n, ctx);
    case 'name': return evalName(n.name, ctx);
    case 'un': return evalUnary(n.op, n.x, ctx);
    case 'pct': return mapValue(operand(evalNode(n.x, ctx), ctx), (x) => (x instanceof CellError ? x : toNumber(x) / 100));
    case 'bin': return evalBinary(n.op, n.l, n.r, ctx);
    case 'arr': return n.rows.map((row) => row.map((x) => {
      const v = operand(evalNode(x, ctx), ctx);
      return Array.isArray(v) ? v[0][0] : v;
    }));
    case 'spill': {
      const v = evalNode(n.x, ctx);
      if (!(v instanceof RefValue)) throw ERR.REF;
      return ctx.host.spill(v.sheet, v.r1, v.c1) ?? v;
    }
    case 'call': return evalCall(n.name, n.args, ctx);
  }
}

function evalRef(n: Extract<Node, { t: 'ref' }>, ctx: Ctx): EvalValue {
  const sheet = n.sheet === undefined ? ctx.sheet : ctx.host.sheetId(n.sheet);
  if (sheet === null) return ERR.REF;
  const dims = ctx.host.dims(sheet);
  const b = n.b ?? n.a;
  const r1 = n.a.r < 0 ? 0 : n.a.r;
  const c1 = n.a.c < 0 ? 0 : n.a.c;
  const r2 = b.r < 0 ? dims.rows - 1 : b.r;
  const c2 = b.c < 0 ? dims.cols - 1 : b.c;
  return new RefValue(sheet, Math.min(r1, r2), Math.min(c1, c2), Math.max(r1, r2), Math.max(c1, c2));
}

function evalName(name: string, ctx: Ctx): EvalValue {
  const local = lookupVar(ctx.env, name.toUpperCase());
  if (local.found) return local.value ?? null;
  const ast = ctx.host.name(name, ctx.sheet);
  if (!ast) return ERR.NAME;
  if (ctx.depth > MAX_DEPTH) throw ERR.CALC;
  return evalNode(ast, { ...ctx, env: null, depth: ctx.depth + 1 });
}

function evalUnary(op: string, x: Node, ctx: Ctx): EvalValue {
  const v = evalNode(x, ctx);
  if (op === '@') {
    if (v instanceof RefValue) {
      if (v.single) return v;
      if (v.cols === 1 && ctx.r >= v.r1 && ctx.r <= v.r2) return ctx.host.value(v.sheet, ctx.r, v.c1);
      if (v.rows === 1 && ctx.c >= v.c1 && ctx.c <= v.c2) return ctx.host.value(v.sheet, v.r1, ctx.c);
      return ERR.VALUE;
    }
    return Array.isArray(v) ? v[0][0] : v;
  }
  const sign = op === '-' ? -1 : 1;
  return mapValue(operand(v, ctx), (s) => (s instanceof CellError ? s : op === '+' && typeof s === 'string' ? s : sign * toNumber(s)));
}

function evalBinary(op: string, l: Node, r: Node, ctx: Ctx): EvalValue {
  const a = evalNode(l, ctx);
  const b = evalNode(r, ctx);
  if (op === ':') {
    if (!(a instanceof RefValue) || !(b instanceof RefValue) || a.sheet !== b.sheet) return ERR.REF;
    return new RefValue(a.sheet, Math.min(a.r1, b.r1), Math.min(a.c1, b.c1), Math.max(a.r2, b.r2), Math.max(a.c2, b.c2));
  }
  return broadcast(operand(a, ctx), operand(b, ctx), (x, y) => binary(op, x, y));
}

/** Llama a una LAMBDA con argumentos ya evaluados. */
export function callLambda(fn: LambdaValue, args: EvalValue[], ctx: Ctx): EvalValue {
  if (args.length > fn.params.length) throw ERR.VALUE;
  if (ctx.depth > MAX_DEPTH) throw ERR.CALC;
  const vars = new Map<string, EvalValue | undefined>();
  fn.params.forEach((p, i) => vars.set(p, args[i]));
  const env: Env = { vars, parent: fn.env as Env | null };
  return evalNode(fn.body as Node, { ...ctx, env, depth: ctx.depth + 1 });
}

function evalCall(name: string, args: Node[], ctx: Ctx): EvalValue {
  const local = lookupVar(ctx.env, name.toUpperCase());
  const named = local.found ? local.value : ctx.host.name(name, ctx.sheet) ? evalName(name, ctx) : undefined;
  if (named instanceof LambdaValue) return callLambda(named, args.map((a) => evalNode(a, ctx)), ctx);
  const def = lookupFn(name);
  if (!def) return ERR.NAME;
  const count = args.length === 1 && args[0].t === 'miss' ? 0 : args.length;
  if (count < def.min || count > def.max) return ERR.VALUE;
  if (def.lazy) return def.lazy(args, ctx);
  const vals = new Array<EvalValue>(args.length);
  for (let i = 0; i < args.length; i++) vals[i] = args[i].t === 'miss' ? undefined as unknown as EvalValue : evalNode(args[i], ctx);
  return def.fn!(vals, ctx);
}

/** Evalúa una fórmula completa: nunca lanza; los errores salen como valor de celda. */
export function evaluate(ast: Node, ctx: Ctx): EvalValue {
  try { return evalNode(ast, ctx); } catch (e) {
    if (e instanceof CellError) return e;
    if (e instanceof RangeError) return ERR.CALC;
    throw e;
  }
}
