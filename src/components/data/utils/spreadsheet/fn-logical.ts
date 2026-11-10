// @contexto INDICE.md · src/components/data/README.md
// logical.ts — lógica, control de flujo perezoso, LET/LAMBDA e información de celdas.
import { evalNode, callLambda } from './evaluator.js';
import type { Ctx, Env } from './evaluator.schemas.js';
import type { Node } from './parser.schemas.js';
import { CellError, compare, ERR, LambdaValue, RefValue, toBool } from './values.js';
import type { EvalValue, Matrix, Scalar } from './values.schemas.js';
import { forEach, isArrayLike, lifted, matrix, scalar, str } from './fn-helpers.js';
import { def, defLazy } from './fn-registry.js';

const CAT = 'Lógica';
const INFO = 'Información';

/** Evalúa la condición de IF; si es matricial, resuelve fila a fila. */
function condition(v: EvalValue, c: Ctx): boolean {
  const s = scalar(v, c);
  if (s instanceof CellError) throw s;
  return toBool(s);
}

/** Lógicos de los argumentos: en rangos solo cuentan números y lógicos. */
function logicals(a: EvalValue[], c: Ctx): boolean[] {
  const out: boolean[] = [];
  for (const x of a) {
    forEach(x, c, (v, fromRange) => {
      if (v instanceof CellError) throw v;
      if (v === null) return;
      if (typeof v === 'string') {
        if (fromRange) return;
        out.push(toBool(v));
        return;
      }
      out.push(toBool(v));
    });
  }
  if (!out.length) throw ERR.VALUE;
  return out;
}

defLazy(CAT, 'IF', 'condicion, si_verdadero, [si_falso]', 'Devuelve un valor u otro según la condición.', (n, c) => {
  const t = evalNode(n[0], c);
  const pick = (cond: Scalar, a: Scalar, b: Scalar): Scalar => {
    if (cond instanceof CellError) return cond;
    try { return toBool(cond) ? a : b; } catch (e) { return e as CellError; }
  };
  if (isArrayLike(t)) {
    const m = matrix(t, c);
    const yes = n[1] ? evalNode(n[1], c) : true;
    const no = n[2] ? evalNode(n[2], c) : false;
    const y = matrix(yes, c);
    const f = matrix(no, c);
    return m.map((row, r) => row.map((cond, k) => pick(cond, y[y.length === 1 ? 0 : r]?.[y[0].length === 1 ? 0 : k] ?? ERR.NA, f[f.length === 1 ? 0 : r]?.[f[0].length === 1 ? 0 : k] ?? ERR.NA)));
  }
  if (condition(t, c)) return n[1].t === 'miss' ? 0 : evalNode(n[1], c);
  if (n[2] === undefined) return false;
  return n[2].t === 'miss' ? 0 : evalNode(n[2], c);
});
defLazy(CAT, 'IFS', 'condicion1, valor1, ...', 'Primera condición verdadera.', (n, c) => {
  if (n.length % 2) throw ERR.NA;
  for (let i = 0; i < n.length; i += 2) if (condition(evalNode(n[i], c), c)) return evalNode(n[i + 1], c);
  throw ERR.NA;
});
defLazy(CAT, 'IFERROR', 'valor, si_error', 'Valor alterno si hay error.', (n, c) => handle(n, c, () => true));
defLazy(CAT, 'IFNA', 'valor, si_na', 'Valor alterno si hay #N/A.', (n, c) => handle(n, c, (e) => e === ERR.NA));

/** Sustituye errores que cumplen `test`, también dentro de matrices. */
function handle(n: Node[], c: Ctx, test: (e: CellError) => boolean): EvalValue {
  let v: EvalValue;
  try { v = evalNode(n[0], c); } catch (e) {
    if (!(e instanceof CellError) || !test(e)) throw e;
    return evalNode(n[1], c);
  }
  if (isArrayLike(v)) {
    const alt = scalar(evalNode(n[1], c), c);
    return matrix(v, c).map((row) => row.map((x) => (x instanceof CellError && test(x) ? alt : x)));
  }
  const s = scalar(v, c);
  return s instanceof CellError && test(s) ? evalNode(n[1], c) : v;
}

def(CAT, 'AND', 'logico1, ...', 'Verdadero si todos lo son.', (a, c) => logicals(a, c).every(Boolean));
def(CAT, 'OR', 'logico1, ...', 'Verdadero si alguno lo es.', (a, c) => logicals(a, c).some(Boolean));
def(CAT, 'XOR', 'logico1, ...', 'Verdadero si un número impar lo es.', (a, c) => logicals(a, c).filter(Boolean).length % 2 === 1);
def(CAT, 'NOT', 'logico', 'Invierte un lógico.', lifted(([x]) => !toBool(x)));
def(CAT, 'TRUE', '', 'Valor verdadero.', () => true);
def(CAT, 'FALSE', '', 'Valor falso.', () => false);
defLazy(CAT, 'SWITCH', 'expresion, valor1, resultado1, ..., [por_defecto]', 'Elige por coincidencia exacta.', (n, c) => {
  const v = scalar(evalNode(n[0], c), c);
  let i = 1;
  for (; i + 1 < n.length; i += 2) if (compare(v, scalar(evalNode(n[i], c), c)) === 0) return evalNode(n[i + 1], c);
  if (i < n.length) return evalNode(n[i], c);
  throw ERR.NA;
});
defLazy(CAT, 'LET', 'nombre1, valor1, ..., calculo', 'Asigna nombres dentro de la fórmula.', (n, c) => {
  if (n.length % 2 === 0) throw ERR.VALUE;
  const env: Env = { vars: new Map(), parent: c.env };
  const inner: Ctx = { ...c, env };
  for (let i = 0; i + 1 < n.length; i += 2) {
    const id = n[i];
    if (id.t !== 'name') throw ERR.VALUE;
    env.vars.set(id.name.toUpperCase(), evalNode(n[i + 1], inner));
  }
  return evalNode(n[n.length - 1], inner);
});
defLazy(CAT, 'LAMBDA', 'parametro1, ..., calculo', 'Crea una función propia.', (n, c) => {
  const params = n.slice(0, -1).map((p) => {
    if (p.t !== 'name') throw ERR.VALUE;
    return p.name.toUpperCase();
  });
  return new LambdaValue(params, n[n.length - 1], c.env);
});
defLazy(CAT, 'ISOMITTED', 'argumento', 'Verdadero si el argumento de LAMBDA se omitió.', (n, c) => {
  const id = n[0];
  if (id.t !== 'name') return false;
  for (let e = c.env; e; e = e.parent) if (e.vars.has(id.name.toUpperCase())) return e.vars.get(id.name.toUpperCase()) === undefined;
  return false;
});

/** Función LAMBDA del último argumento. */
function lambdaArg(v: EvalValue): LambdaValue {
  if (!(v instanceof LambdaValue)) throw ERR.VALUE;
  return v;
}

/** Resultado escalar de una LAMBDA. */
function run(fn: LambdaValue, args: EvalValue[], c: Ctx): Scalar {
  const r = callLambda(fn, args, c);
  if (r instanceof RefValue) return scalar(r, c);
  if (Array.isArray(r)) return r[0][0];
  if (r instanceof LambdaValue) throw ERR.CALC;
  return r;
}

def(CAT, 'MAP', 'matriz1, ..., lambda', 'Aplica una LAMBDA a cada celda.', (a, c) => {
  const fn = lambdaArg(a[a.length - 1]);
  const ms = a.slice(0, -1).map((x) => matrix(x, c));
  return ms[0].map((row, r) => row.map((_, k) => run(fn, ms.map((m) => m[r]?.[k] ?? null), c)));
});
def(CAT, 'REDUCE', '[inicial], matriz, lambda', 'Acumula con una LAMBDA.', (a, c) => {
  const fn = lambdaArg(a[a.length - 1]);
  const items = matrix(a[a.length - 2], c).flat();
  let acc: Scalar = a.length === 3 ? scalar(a[0], c) : items.shift() ?? null;
  for (const x of items) acc = run(fn, [acc, x], c);
  return acc;
});
def(CAT, 'SCAN', '[inicial], matriz, lambda', 'Acumula y devuelve cada paso.', (a, c) => {
  const fn = lambdaArg(a[a.length - 1]);
  const m = matrix(a[a.length - 2], c);
  let started = a.length === 3;
  let acc: Scalar = started ? scalar(a[0], c) : null;
  return m.map((row) => row.map((x) => {
    acc = started ? run(fn, [acc, x], c) : x;
    started = true;
    return acc;
  }));
});
def(CAT, 'BYROW', 'matriz, lambda', 'Aplica una LAMBDA a cada fila.', (a, c) => {
  const fn = lambdaArg(a[1]);
  return matrix(a[0], c).map((row) => [run(fn, [[row]], c)]);
});
def(CAT, 'BYCOL', 'matriz, lambda', 'Aplica una LAMBDA a cada columna.', (a, c) => {
  const fn = lambdaArg(a[1]);
  const m = matrix(a[0], c);
  return [m[0].map((_, k) => run(fn, [m.map((row) => [row[k]])], c))];
});
def(CAT, 'MAKEARRAY', 'filas, columnas, lambda', 'Construye una matriz con una LAMBDA.', (a, c) => {
  const rows = Number(scalar(a[0], c));
  const cols = Number(scalar(a[1], c));
  const fn = lambdaArg(a[2]);
  if (!(rows >= 1) || !(cols >= 1)) throw ERR.CALC;
  const out: Matrix = [];
  for (let r = 1; r <= rows; r++) {
    const row: Scalar[] = [];
    for (let k = 1; k <= cols; k++) row.push(run(fn, [r, k], c));
    out.push(row);
  }
  return out;
});

// ---- Información ----

const is = (name: string, desc: string, fn: (v: Scalar) => boolean): void => {
  def(INFO, name, 'valor', desc, (a, c) => {
    const x = a[0];
    if (isArrayLike(x)) return matrix(x, c).map((row) => row.map(fn));
    return fn(scalar(x, c));
  });
};
is('ISBLANK', '¿Celda vacía?', (v) => v === null);
is('ISERROR', '¿Es un error?', (v) => v instanceof CellError);
is('ISERR', '¿Es un error distinto de #N/A?', (v) => v instanceof CellError && v !== ERR.NA);
is('ISNA', '¿Es #N/A?', (v) => v === ERR.NA);
is('ISNUMBER', '¿Es número?', (v) => typeof v === 'number');
is('ISTEXT', '¿Es texto?', (v) => typeof v === 'string');
is('ISNONTEXT', '¿No es texto?', (v) => typeof v !== 'string');
is('ISLOGICAL', '¿Es lógico?', (v) => typeof v === 'boolean');
is('ISEVEN', '¿Es par?', (v) => Math.trunc(Number(v)) % 2 === 0);
is('ISODD', '¿Es impar?', (v) => Math.abs(Math.trunc(Number(v))) % 2 === 1);
defLazy(INFO, 'ISREF', 'valor', '¿Es una referencia?', (n, c) => { try { return evalNode(n[0], c) instanceof RefValue; } catch { return false; } });
def(INFO, 'ISFORMULA', 'referencia', '¿La celda tiene fórmula?', (a, c) => {
  const r = a[0];
  if (!(r instanceof RefValue)) throw ERR.VALUE;
  return c.host.isFormula(r.sheet, r.r1, r.c1);
});
def(INFO, 'FORMULATEXT', 'referencia', 'Texto de la fórmula.', (a, c) => {
  const r = a[0];
  if (!(r instanceof RefValue)) throw ERR.VALUE;
  const t = c.host.formulaText(r.sheet, r.r1, r.c1);
  if (t === null) throw ERR.NA;
  return t;
});
def(INFO, 'N', 'valor', 'Valor como número.', lifted(([x]) => (typeof x === 'number' ? x : typeof x === 'boolean' ? (x ? 1 : 0) : 0)));
def(INFO, 'NA', '', 'Devuelve #N/A.', () => ERR.NA);
def(INFO, 'TYPE', 'valor', 'Tipo: 1 número, 2 texto, 4 lógico, 16 error, 64 matriz.', (a, c) => {
  const x = a[0];
  if (isArrayLike(x)) return 64;
  const v = scalar(x, c);
  return typeof v === 'number' || v === null ? 1 : typeof v === 'string' ? 2 : typeof v === 'boolean' ? 4 : 16;
});
def(INFO, 'ERROR.TYPE', 'error', 'Número del tipo de error.', (a, c) => {
  const v = scalar(a[0], c);
  const list = [ERR.NULL, ERR.DIV0, ERR.VALUE, ERR.REF, ERR.NAME, ERR.NUM, ERR.NA];
  const i = list.indexOf(v as never);
  if (i < 0) throw ERR.NA;
  return i + 1;
});
def(INFO, 'SHEET', '[valor]', 'Número de hoja.', (a, c) => {
  const x = a[0];
  if (x instanceof RefValue) return c.host.sheetIndex(x.sheet) + 1;
  if (x !== undefined) {
    const id = c.host.sheetId(str(x, c));
    if (id === null) throw ERR.NA;
    return c.host.sheetIndex(id) + 1;
  }
  return c.host.sheetIndex(c.sheet) + 1;
});
def(INFO, 'SHEETS', '', 'Número de hojas del libro.', (_a, c) => c.host.sheetCount());
def(INFO, 'CELL', 'tipo, [referencia]', 'Información de una celda: address, col, row, contents, type.', (a, c) => {
  const k = str(a[0], c).toLowerCase();
  const r = a[1] instanceof RefValue ? a[1] : new RefValue(c.sheet, c.r, c.c, c.r, c.c);
  if (k === 'row') return r.r1 + 1;
  if (k === 'col') return r.c1 + 1;
  if (k === 'address') return `$${colLetters(r.c1)}$${r.r1 + 1}`;
  if (k === 'contents') return c.host.value(r.sheet, r.r1, r.c1);
  if (k === 'type') {
    const v = c.host.value(r.sheet, r.r1, r.c1);
    return v === null ? 'b' : typeof v === 'string' ? 'l' : 'v';
  }
  throw ERR.VALUE;
});

/** Letras de una columna, sin depender del módulo de direcciones en la firma pública. */
function colLetters(c: number): string {
  let s = '';
  for (let n = c + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}
