// values.ts — valores del motor: errores, escalares, matrices, referencias y coerciones.

/** Código de error de celda. */
export type ErrorCode = '#REF!' | '#DIV/0!' | '#VALUE!' | '#NAME?' | '#N/A' | '#NUM!' | '#NULL!' | '#SPILL!' | '#CALC!' | '#CYCLE!';

/** Error de celda. Se compara por identidad con las constantes de ERR. */
export class CellError {
  constructor(readonly code: ErrorCode) {}
  toString(): string { return this.code; }
}

export const ERR = {
  REF: new CellError('#REF!'), DIV0: new CellError('#DIV/0!'), VALUE: new CellError('#VALUE!'),
  NAME: new CellError('#NAME?'), NA: new CellError('#N/A'), NUM: new CellError('#NUM!'),
  NULL: new CellError('#NULL!'), SPILL: new CellError('#SPILL!'), CALC: new CellError('#CALC!'),
  CYCLE: new CellError('#CYCLE!'),
} as const;

const BY_CODE = new Map<string, CellError>(Object.values(ERR).map((e) => [e.code, e]));

/** Error por su texto (`#N/A`), o null. */
export function errorFromCode(code: string): CellError | null {
  return BY_CODE.get(code.toUpperCase()) ?? null;
}

/** Valor de una celda. null es celda vacía. */
export type Scalar = number | string | boolean | null | CellError;

/** Matriz rectangular (fila, columna). */
export type Matrix = Scalar[][];

/** Referencia evaluada: rango de una hoja. */
export class RefValue {
  constructor(readonly sheet: number, readonly r1: number, readonly c1: number, readonly r2: number, readonly c2: number) {}
  get rows(): number { return this.r2 - this.r1 + 1; }
  get cols(): number { return this.c2 - this.c1 + 1; }
  get single(): boolean { return this.r1 === this.r2 && this.c1 === this.c2; }
}

/** Función LAMBDA en valor. */
export class LambdaValue {
  constructor(readonly params: string[], readonly body: unknown, readonly env: unknown) {}
}

/** Resultado de evaluar una expresión. */
export type EvalValue = Scalar | Matrix | RefValue | LambdaValue;

/** Número desde texto, tal como lo coerciona una fórmula. NaN si no es número. */
export function parseNumberText(t: string): number {
  const s = t.trim();
  if (s === '') return NaN;
  const pct = s.endsWith('%');
  const body = (pct ? s.slice(0, -1) : s).replace(/^\$\s*/, '').replace(/,(?=\d{3}(\D|$))/g, '');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(body)) return NaN;
  const n = Number(body);
  return pct ? n / 100 : n;
}

/** Convierte a número o lanza el error de celda que corresponda. */
export function toNumber(v: Scalar): number {
  if (typeof v === 'number') return v;
  if (v === null) return 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof CellError) throw v;
  const n = parseNumberText(v);
  if (Number.isNaN(n)) throw ERR.VALUE;
  return n;
}

/** Número con hasta 15 cifras significativas, sin ruido binario. */
export function formatGeneral(n: number): string {
  if (!Number.isFinite(n)) return '#NUM!';
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  const a = Math.abs(n);
  if (a !== 0 && (a >= 1e21 || a < 1e-9)) return n.toExponential(9).replace(/\.?0+e/, 'e').replace('e', 'E');
  return String(Number(n.toPrecision(15)));
}

/** Convierte a texto como lo hace `&`. */
export function toText(v: Scalar): string {
  if (v === null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (v instanceof CellError) throw v;
  return formatGeneral(v);
}

/** Convierte a lógico o lanza #VALUE!. */
export function toBool(v: Scalar): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (v === null) return false;
  if (v instanceof CellError) throw v;
  const u = v.trim().toUpperCase();
  if (u === 'TRUE' || u === 'VERDADERO') return true;
  if (u === 'FALSE' || u === 'FALSO') return false;
  throw ERR.VALUE;
}

/** Iguala dos números hasta la cifra 15, como la comparación de Excel. */
export function nearlyEqual(a: number, b: number): boolean {
  if (a === b) return true;
  return Number(a.toPrecision(15)) === Number(b.toPrecision(15));
}

/** Orden de tipos: número < texto < lógico. */
function typeRank(v: Scalar): number {
  if (typeof v === 'number') return 0;
  if (typeof v === 'string') return 1;
  if (typeof v === 'boolean') return 2;
  return 3;
}

/** Compara dos escalares: negativo, cero o positivo. Vacío se adapta al tipo del otro lado. */
export function compare(a: Scalar, b: Scalar): number {
  let x = a;
  let y = b;
  if (x === null) x = typeof y === 'string' ? '' : typeof y === 'boolean' ? false : 0;
  if (y === null) y = typeof x === 'string' ? '' : typeof x === 'boolean' ? false : 0;
  const rx = typeRank(x);
  const ry = typeRank(y);
  if (rx !== ry) return rx - ry;
  if (typeof x === 'number' && typeof y === 'number') return nearlyEqual(x, y) ? 0 : x - y;
  if (typeof x === 'string' && typeof y === 'string') {
    const p = x.toLowerCase();
    const q = y.toLowerCase();
    return p < q ? -1 : p > q ? 1 : 0;
  }
  return Number(x) - Number(y);
}

/** Texto visible de un valor sin formato. */
export function displayValue(v: Scalar): string {
  if (v === null) return '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return formatGeneral(v);
  return String(v);
}
