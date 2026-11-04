// math.ts — matemáticas, trigonometría y matrices.
import type { Ctx } from '@jeff-aporta/iswc-base/components/data/utils/spreadsheet/evaluator.schemas.js';
import { CellError, ERR, RefValue, toNumber } from '@jeff-aporta/iswc-base/components/data/utils/spreadsheet/values.js';
import type { EvalValue, Matrix, Scalar } from '@jeff-aporta/iswc-base/components/data/utils/spreadsheet/values.schemas.js';
import { finite, flat, lifted, matrix, num, numbers, optNum } from './fn-helpers.js';
import { def, lookupFn } from './registry.js';

const CAT = 'Matemáticas';
const d = (name: string, sig: string, desc: string, fn: (a: EvalValue[], c: Ctx) => EvalValue, opts?: { volatile?: boolean }): void => def(CAT, name, sig, desc, fn, opts);
const m1 = (name: string, desc: string, fn: (x: number) => number): void => d(name, 'numero', desc, lifted(([a]) => finite(fn(toNumber(a)))));

/** Redondeo decimal sin el ruido binario de 1.005 * 100. */
export function roundTo(x: number, digits: number, mode: 'near' | 'up' | 'down' = 'near'): number {
  const a = Math.abs(x);
  const p = 10 ** digits;
  const shifted = Number((a * p).toPrecision(15));
  const r = mode === 'near' ? Math.round(shifted) : mode === 'up' ? Math.ceil(shifted) : Math.floor(shifted);
  return Math.sign(x) * (digits >= 0 ? Number(`${r}e${-digits}`) : r / p);
}

/** Factorial. */
export function factorial(n: number): number {
  if (n < 0) throw ERR.NUM;
  let r = 1;
  for (let i = 2; i <= Math.floor(n); i++) r *= i;
  return finite(r);
}

/** Combinaciones. */
export function combin(n: number, k: number): number {
  if (k < 0 || n < 0 || k > n) throw ERR.NUM;
  let r = 1;
  for (let i = 1; i <= Math.min(k, n - k); i++) r = (r * (n - i + 1)) / i;
  return Math.round(r);
}

const gcd2 = (a: number, b: number): number => (b === 0 ? a : gcd2(b, a % b));

/** Reducción gaussiana: determinante e inversa. */
function gauss(src: number[][]): { det: number; inv: number[][] | null } {
  const n = src.length;
  const a = src.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  let det = 1;
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(a[r][i]) > Math.abs(a[p][i])) p = r;
    if (Math.abs(a[p][i]) < 1e-14) return { det: 0, inv: null };
    if (p !== i) { [a[p], a[i]] = [a[i], a[p]]; det = -det; }
    det *= a[i][i];
    const piv = a[i][i];
    for (let c = 0; c < 2 * n; c++) a[i][c] /= piv;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = a[r][i];
      for (let c = 0; c < 2 * n; c++) a[r][c] -= f * a[i][c];
    }
  }
  return { det, inv: a.map((r) => r.slice(n)) };
}

/** Matriz numérica, sin vacíos ni texto. */
export function numericMatrix(v: EvalValue, ctx: Ctx): number[][] {
  return matrix(v, ctx).map((row) => row.map((x) => {
    if (typeof x !== 'number') throw x instanceof CellError ? x : ERR.VALUE;
    return x;
  }));
}

const ROMAN: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];

/** Múltiplo más cercano en la dirección dada. */
function toMultiple(x: number, s: number, up: boolean): number {
  if (s === 0) return 0;
  const q = Number((x / s).toPrecision(15));
  return (up ? Math.ceil(q) : Math.floor(q)) * s;
}

d('SUM', 'numero1, ...', 'Suma números y rangos.', (a, c) => numbers(a, c).reduce((s, x) => s + x, 0));
d('PRODUCT', 'numero1, ...', 'Multiplica números y rangos.', (a, c) => finite(numbers(a, c).reduce((s, x) => s * x, 1)));
d('SUMSQ', 'numero1, ...', 'Suma de cuadrados.', (a, c) => numbers(a, c).reduce((s, x) => s + x * x, 0));
d('SUMPRODUCT', 'matriz1, ...', 'Suma los productos de matrices del mismo tamaño.', (a, c) => {
  const ms = a.map((x) => matrix(x, c));
  const rows = ms[0].length;
  const cols = ms[0][0].length;
  if (ms.some((m) => m.length !== rows || m[0].length !== cols)) throw ERR.VALUE;
  let sum = 0;
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      let p = 1;
      for (const m of ms) {
        const x = m[r][k];
        if (x instanceof CellError) throw x;
        p *= typeof x === 'number' ? x : 0;
      }
      sum += p;
    }
  }
  return sum;
});

m1('ABS', 'Valor absoluto.', Math.abs);
m1('INT', 'Redondea hacia abajo al entero.', Math.floor);
m1('SIGN', 'Signo de un número.', Math.sign);
m1('SQRT', 'Raíz cuadrada.', (x) => { if (x < 0) throw ERR.NUM; return Math.sqrt(x); });
m1('SQRTPI', 'Raíz cuadrada de x·π.', (x) => { if (x < 0) throw ERR.NUM; return Math.sqrt(x * Math.PI); });
m1('EXP', 'e elevado a x.', Math.exp);
m1('LN', 'Logaritmo natural.', (x) => { if (x <= 0) throw ERR.NUM; return Math.log(x); });
m1('LOG10', 'Logaritmo en base 10.', (x) => { if (x <= 0) throw ERR.NUM; return Math.log10(x); });
m1('SIN', 'Seno.', Math.sin);
m1('COS', 'Coseno.', Math.cos);
m1('TAN', 'Tangente.', Math.tan);
m1('ASIN', 'Arcoseno.', (x) => { if (Math.abs(x) > 1) throw ERR.NUM; return Math.asin(x); });
m1('ACOS', 'Arcocoseno.', (x) => { if (Math.abs(x) > 1) throw ERR.NUM; return Math.acos(x); });
m1('ATAN', 'Arcotangente.', Math.atan);
m1('SINH', 'Seno hiperbólico.', Math.sinh);
m1('COSH', 'Coseno hiperbólico.', Math.cosh);
m1('TANH', 'Tangente hiperbólica.', Math.tanh);
m1('ASINH', 'Arcoseno hiperbólico.', Math.asinh);
m1('ACOSH', 'Arcocoseno hiperbólico.', (x) => { if (x < 1) throw ERR.NUM; return Math.acosh(x); });
m1('ATANH', 'Arcotangente hiperbólica.', (x) => { if (Math.abs(x) >= 1) throw ERR.NUM; return Math.atanh(x); });
m1('COT', 'Cotangente.', (x) => { if (x === 0) throw ERR.DIV0; return 1 / Math.tan(x); });
m1('CSC', 'Cosecante.', (x) => { if (x === 0) throw ERR.DIV0; return 1 / Math.sin(x); });
m1('SEC', 'Secante.', (x) => 1 / Math.cos(x));
m1('COTH', 'Cotangente hiperbólica.', (x) => { if (x === 0) throw ERR.DIV0; return 1 / Math.tanh(x); });
m1('CSCH', 'Cosecante hiperbólica.', (x) => { if (x === 0) throw ERR.DIV0; return 1 / Math.sinh(x); });
m1('SECH', 'Secante hiperbólica.', (x) => 1 / Math.cosh(x));
m1('ACOT', 'Arcocotangente.', (x) => Math.PI / 2 - Math.atan(x));
m1('ACOTH', 'Arcocotangente hiperbólica.', (x) => { if (Math.abs(x) <= 1) throw ERR.NUM; return Math.atanh(1 / x); });
m1('DEGREES', 'Radianes a grados.', (x) => (x * 180) / Math.PI);
m1('RADIANS', 'Grados a radianes.', (x) => (x * Math.PI) / 180);
m1('FACT', 'Factorial.', factorial);
m1('FACTDOUBLE', 'Doble factorial.', (x) => {
  if (x < -1) throw ERR.NUM;
  let r = 1;
  for (let i = Math.floor(x); i > 1; i -= 2) r *= i;
  return r;
});
m1('EVEN', 'Redondea alejándose de cero al par.', (x) => { const n = Math.ceil(Math.abs(x) / 2) * 2; return x < 0 ? -n : n; });
m1('ODD', 'Redondea alejándose de cero al impar.', (x) => {
  let n = Math.ceil(Math.abs(x));
  if (n % 2 === 0) n++;
  return x < 0 ? -n : n;
});

d('PI', '', 'Número π.', () => Math.PI);
d('ATAN2', 'x, y', 'Arcotangente de y/x.', lifted(([x, y]) => {
  if (toNumber(x) === 0 && toNumber(y) === 0) throw ERR.DIV0;
  return Math.atan2(toNumber(y), toNumber(x));
}));
d('ROUND', 'numero, decimales', 'Redondea a los decimales indicados.', lifted(([x, n]) => roundTo(toNumber(x), Math.trunc(toNumber(n)))));
d('ROUNDUP', 'numero, decimales', 'Redondea alejándose de cero.', lifted(([x, n]) => roundTo(toNumber(x), Math.trunc(toNumber(n)), 'up')));
d('ROUNDDOWN', 'numero, decimales', 'Redondea hacia cero.', lifted(([x, n]) => roundTo(toNumber(x), Math.trunc(toNumber(n)), 'down')));
d('TRUNC', 'numero, [decimales]', 'Trunca a los decimales indicados.', lifted(([x, n]) => roundTo(toNumber(x), n === undefined || n === null ? 0 : Math.trunc(toNumber(n)), 'down')));
d('MROUND', 'numero, multiplo', 'Redondea al múltiplo más cercano.', lifted(([x, m]) => {
  const a = toNumber(x);
  const b = toNumber(m);
  if (b === 0) return 0;
  if (a * b < 0) throw ERR.NUM;
  return Math.round(Number((a / b).toPrecision(15))) * b;
}));
d('CEILING', 'numero, multiplo', 'Redondea hacia arriba al múltiplo.', lifted(([x, m]) => toMultiple(toNumber(x), toNumber(m), true)));
d('FLOOR', 'numero, multiplo', 'Redondea hacia abajo al múltiplo.', lifted(([x, m]) => toMultiple(toNumber(x), toNumber(m), false)));
d('CEILING.MATH', 'numero, [multiplo], [modo]', 'Redondea hacia arriba al múltiplo.', lifted(([x, m, k]) => {
  const n = toNumber(x);
  const s = Math.abs(m === undefined || m === null ? 1 : toNumber(m));
  return n < 0 && k ? -toMultiple(-n, s, true) : toMultiple(n, s, true);
}));
d('FLOOR.MATH', 'numero, [multiplo], [modo]', 'Redondea hacia abajo al múltiplo.', lifted(([x, m, k]) => {
  const n = toNumber(x);
  const s = Math.abs(m === undefined || m === null ? 1 : toNumber(m));
  return n < 0 && k ? -toMultiple(-n, s, false) : toMultiple(n, s, false);
}));
d('CEILING.PRECISE', 'numero, [multiplo]', 'Redondea hacia arriba, sin importar el signo.', lifted(([x, m]) => toMultiple(toNumber(x), Math.abs(m === undefined || m === null ? 1 : toNumber(m)), true)));
d('FLOOR.PRECISE', 'numero, [multiplo]', 'Redondea hacia abajo, sin importar el signo.', lifted(([x, m]) => toMultiple(toNumber(x), Math.abs(m === undefined || m === null ? 1 : toNumber(m)), false)));
d('ISO.CEILING', 'numero, [multiplo]', 'Redondeo ISO hacia arriba.', lifted(([x, m]) => toMultiple(toNumber(x), Math.abs(m === undefined || m === null ? 1 : toNumber(m)), true)));
d('MOD', 'numero, divisor', 'Resto de la división, con el signo del divisor.', lifted(([x, m]) => {
  const b = toNumber(m);
  if (b === 0) throw ERR.DIV0;
  const a = toNumber(x);
  return a - b * Math.floor(a / b);
}));
d('QUOTIENT', 'numerador, denominador', 'Parte entera de la división.', lifted(([x, m]) => {
  if (toNumber(m) === 0) throw ERR.DIV0;
  return Math.trunc(toNumber(x) / toNumber(m));
}));
d('POWER', 'base, exponente', 'Potencia.', lifted(([x, y]) => {
  if (toNumber(x) === 0 && toNumber(y) < 0) throw ERR.DIV0;
  return finite(toNumber(x) ** toNumber(y));
}));
d('LOG', 'numero, [base]', 'Logaritmo en la base indicada (10 por defecto).', lifted(([x, b]) => {
  const n = toNumber(x);
  const base = b === undefined || b === null ? 10 : toNumber(b);
  if (n <= 0 || base <= 0) throw ERR.NUM;
  if (base === 1) throw ERR.DIV0;
  return Math.log(n) / Math.log(base);
}));
d('RAND', '', 'Aleatorio entre 0 y 1.', () => Math.random(), { volatile: true });
d('RANDBETWEEN', 'inferior, superior', 'Entero aleatorio entre dos límites.', (a, c) => {
  const lo = Math.ceil(num(a[0], c));
  const hi = Math.floor(num(a[1], c));
  if (lo > hi) throw ERR.NUM;
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}, { volatile: true });
d('COMBIN', 'n, k', 'Combinaciones sin repetición.', lifted(([n, k]) => combin(Math.trunc(toNumber(n)), Math.trunc(toNumber(k)))));
d('COMBINA', 'n, k', 'Combinaciones con repetición.', lifted(([n, k]) => {
  const a = Math.trunc(toNumber(n));
  const b = Math.trunc(toNumber(k));
  return a === 0 && b === 0 ? 1 : combin(a + b - 1, b);
}));
d('PERMUT', 'n, k', 'Permutaciones sin repetición.', lifted(([n, k]) => {
  const a = Math.trunc(toNumber(n));
  const b = Math.trunc(toNumber(k));
  if (b > a || b < 0) throw ERR.NUM;
  let r = 1;
  for (let i = 0; i < b; i++) r *= a - i;
  return r;
}));
d('PERMUTATIONA', 'n, k', 'Permutaciones con repetición.', lifted(([n, k]) => toNumber(n) ** toNumber(k)));
d('MULTINOMIAL', 'numero1, ...', 'Coeficiente multinomial.', (a, c) => {
  const v = numbers(a, c).map(Math.trunc);
  if (v.some((x) => x < 0)) throw ERR.NUM;
  return factorial(v.reduce((s, x) => s + x, 0)) / v.reduce((s, x) => s * factorial(x), 1);
});
d('GCD', 'numero1, ...', 'Máximo común divisor.', (a, c) => numbers(a, c).map((x) => { if (x < 0) throw ERR.NUM; return Math.trunc(x); }).reduce(gcd2, 0));
d('LCM', 'numero1, ...', 'Mínimo común múltiplo.', (a, c) => numbers(a, c).map((x) => { if (x < 0) throw ERR.NUM; return Math.trunc(x); }).reduce((p, x) => (x === 0 || p === 0 ? 0 : (p * x) / gcd2(p, x)), 1));
d('ROMAN', 'numero, [forma]', 'Número romano.', lifted(([x]) => {
  let n = Math.trunc(toNumber(x));
  if (n < 0 || n > 3999) throw ERR.VALUE;
  let s = '';
  for (const [v, t] of ROMAN) while (n >= v) { s += t; n -= v; }
  return s;
}));
d('ARABIC', 'texto', 'De romano a número.', lifted(([t]) => {
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const s = String(t ?? '').toUpperCase().trim();
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const v = map[s[i]];
    if (!v) throw ERR.VALUE;
    total += v < (map[s[i + 1]] ?? 0) ? -v : v;
  }
  return total;
}));
d('BASE', 'numero, base, [longitud]', 'Número en otra base.', lifted(([x, b, l]) => {
  const radix = toNumber(b);
  if (radix < 2 || radix > 36 || toNumber(x) < 0) throw ERR.NUM;
  return Math.trunc(toNumber(x)).toString(radix).toUpperCase().padStart(l === undefined || l === null ? 0 : toNumber(l), '0');
}));
d('DECIMAL', 'texto, base', 'De otra base a decimal.', lifted(([t, b]) => {
  const n = parseInt(String(t), toNumber(b));
  if (Number.isNaN(n)) throw ERR.NUM;
  return n;
}));
d('SERIESSUM', 'x, n, m, coeficientes', 'Suma de una serie de potencias.', (a, c) => {
  const x = num(a[0], c);
  const n = num(a[1], c);
  const m = num(a[2], c);
  return flat(matrix(a[3], c)).reduce<number>((s, k, i) => s + toNumber(k) * x ** (n + i * m), 0);
});
d('SUMX2MY2', 'x, y', 'Suma de la diferencia de cuadrados.', (a, c) => paired(a, c, (x, y) => x * x - y * y));
d('SUMX2PY2', 'x, y', 'Suma de la suma de cuadrados.', (a, c) => paired(a, c, (x, y) => x * x + y * y));
d('SUMXMY2', 'x, y', 'Suma de cuadrados de las diferencias.', (a, c) => paired(a, c, (x, y) => (x - y) ** 2));

/** Suma una función sobre pares numéricos. */
function paired(a: EvalValue[], c: Ctx, fn: (x: number, y: number) => number): number {
  const x = flat(matrix(a[0], c));
  const y = flat(matrix(a[1], c));
  if (x.length !== y.length) throw ERR.NA;
  let s = 0;
  x.forEach((v, i) => {
    const w = y[i];
    if (typeof v === 'number' && typeof w === 'number') s += fn(v, w);
  });
  return s;
}

d('MMULT', 'matriz1, matriz2', 'Producto de matrices.', (a, c) => {
  const x = numericMatrix(a[0], c);
  const y = numericMatrix(a[1], c);
  if (x[0].length !== y.length) throw ERR.VALUE;
  return x.map((row) => y[0].map((_, k) => row.reduce((s, v, i) => s + v * y[i][k], 0)));
});
d('MDETERM', 'matriz', 'Determinante.', (a, c) => {
  const m = numericMatrix(a[0], c);
  if (m.length !== m[0].length) throw ERR.VALUE;
  return gauss(m).det;
});
d('MINVERSE', 'matriz', 'Matriz inversa.', (a, c) => {
  const m = numericMatrix(a[0], c);
  if (m.length !== m[0].length) throw ERR.VALUE;
  const r = gauss(m).inv;
  if (!r) throw ERR.NUM;
  return r;
});
d('MUNIT', 'dimension', 'Matriz identidad.', (a, c) => {
  const n = num(a[0], c);
  if (n < 1) throw ERR.VALUE;
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_x, j): Scalar => (i === j ? 1 : 0)));
});

/** Operación de SUBTOTAL/AGGREGATE. */
const AGG: Record<number, string> = { 1: 'AVERAGE', 2: 'COUNT', 3: 'COUNTA', 4: 'MAX', 5: 'MIN', 6: 'PRODUCT', 7: 'STDEV.S', 8: 'STDEV.P', 9: 'SUM', 10: 'VAR.S', 11: 'VAR.P', 12: 'MEDIAN', 13: 'MODE.SNGL', 14: 'LARGE', 15: 'SMALL', 16: 'PERCENTILE.INC', 17: 'QUARTILE.INC', 18: 'PERCENTILE.EXC', 19: 'QUARTILE.EXC' };

/** Ejecuta la función canónica de un código de SUBTOTAL. */
function aggregate(code: number, args: EvalValue[], c: Ctx, ignoreErrors: boolean): EvalValue {
  const name = AGG[code];
  if (!name) throw ERR.VALUE;
  // Los rangos se materializan para saltar otros SUBTOTAL y, si se pide, errores.
  const clean = args.map((x): EvalValue => {
    if (!(x instanceof RefValue)) return x;
    const rows: Matrix = [];
    for (let r = x.r1; r <= x.r2; r++) {
      const row: Scalar[] = [];
      for (let k = x.c1; k <= x.c2; k++) {
        const text = c.host.formulaText(x.sheet, r, k);
        let v = c.host.value(x.sheet, r, k);
        if (text && /^\s*=\s*(SUBTOTAL|AGGREGATE|SUBTOTALES|AGREGAR)\s*\(/i.test(text)) v = null;
        if (ignoreErrors && v instanceof CellError) v = null;
        row.push(v);
      }
      rows.push(row);
    }
    return rows;
  });
  return lookupFn(name)!.fn!(clean, c);
}

d('SUBTOTAL', 'funcion, rango1, ...', 'Subtotal: 1 promedio, 2 contar, 3 contara, 4 max, 5 min, 6 producto, 7-8 desviación, 9 suma, 10-11 varianza.', (a, c) => {
  const code = num(a[0], c);
  return aggregate(code > 100 ? code - 100 : code, a.slice(1), c, false);
});
d('AGGREGATE', 'funcion, opciones, rango1, ...', 'Agregado que puede ignorar errores.', (a, c) => {
  const opt = optNum(a[1], c, 0);
  return aggregate(num(a[0], c), a.slice(2), c, opt === 2 || opt === 3 || opt === 6 || opt === 7);
});

