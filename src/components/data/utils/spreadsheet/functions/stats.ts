// stats.ts — estadística, condicionales (*IF, *IFS) y distribuciones.
import { criterion } from '../criteria.js';
import type { Ctx } from '../evaluator.schemas.js';
import { CellError, ERR, RefValue, toNumber } from '../values.js';
import type { EvalValue, Matrix } from '../values.schemas.js';
import { finite, flat, forEach, lifted, matrix, num, numbers, numbersA, optNum, scalar } from './fn-helpers.js';
import { numericMatrix } from './math.js';
import { def } from './registry.js';

const CAT = 'Estadística';
const d = (name: string, sig: string, desc: string, fn: (a: EvalValue[], c: Ctx) => EvalValue): void => def(CAT, name, sig, desc, fn);

const mean = (v: number[]): number => {
  if (!v.length) throw ERR.DIV0;
  return v.reduce((s, x) => s + x, 0) / v.length;
};
const sumSq = (v: number[]): number => {
  const m = mean(v);
  return v.reduce((s, x) => s + (x - m) ** 2, 0);
};
const variance = (v: number[], sample: boolean): number => {
  if (v.length < (sample ? 2 : 1)) throw ERR.DIV0;
  return sumSq(v) / (v.length - (sample ? 1 : 0));
};
const sorted = (v: number[]): number[] => [...v].sort((a, b) => a - b);

/** Percentil incluyente o excluyente. */
function percentile(v: number[], p: number, exc: boolean): number {
  const s = sorted(v);
  const n = s.length;
  if (!n) throw ERR.NUM;
  if (p < 0 || p > 1) throw ERR.NUM;
  const pos = exc ? p * (n + 1) - 1 : p * (n - 1);
  if (exc && (pos < 0 || pos > n - 1)) throw ERR.NUM;
  const lo = Math.floor(pos);
  const hi = Math.min(lo + 1, n - 1);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

/** Moda(s) en orden de aparición. */
function modes(v: number[]): number[] {
  const count = new Map<number, number>();
  for (const x of v) count.set(x, (count.get(x) ?? 0) + 1);
  const max = Math.max(...count.values());
  if (max < 2) throw ERR.NA;
  return [...count].filter(([, n]) => n === max).map(([x]) => x);
}

/** Pares numéricos alineados de dos argumentos. */
function pairs(a: EvalValue, b: EvalValue, c: Ctx): [number[], number[]] {
  const x = flat(matrix(a, c));
  const y = flat(matrix(b, c));
  if (x.length !== y.length) throw ERR.NA;
  const p: number[] = [];
  const q: number[] = [];
  x.forEach((v, i) => {
    const w = y[i];
    if (v instanceof CellError) throw v;
    if (w instanceof CellError) throw w;
    if (typeof v === 'number' && typeof w === 'number') { p.push(v); q.push(w); }
  });
  return [p, q];
}

const covariance = (p: number[], q: number[]): number => {
  const mx = mean(p);
  const my = mean(q);
  return p.reduce((s, x, i) => s + (x - mx) * (q[i] - my), 0);
};

/** Regresión lineal simple de y sobre x. */
function regress(y: number[], x: number[]): { slope: number; intercept: number } {
  const sxx = sumSq(x);
  if (sxx === 0) throw ERR.DIV0;
  const slope = covariance(x, y) / sxx;
  return { slope, intercept: mean(y) - slope * mean(x) };
}

// ---- Conteos y promedios ----

d('AVERAGE', 'numero1, ...', 'Promedio.', (a, c) => mean(numbers(a, c)));
d('AVERAGEA', 'valor1, ...', 'Promedio contando texto como 0.', (a, c) => mean(numbersA(a, c)));
d('COUNT', 'valor1, ...', 'Cuenta números.', (a, c) => {
  let n = 0;
  for (const x of a) forEach(x, c, (v, fromRange) => {
    if (typeof v === 'number') n++;
    else if (!fromRange && typeof v === 'boolean') n++;
    else if (!fromRange && typeof v === 'string' && !Number.isNaN(Number(v)) && v.trim() !== '') n++;
  });
  return n;
});
d('COUNTA', 'valor1, ...', 'Cuenta celdas no vacías.', (a, c) => {
  let n = 0;
  for (const x of a) forEach(x, c, (v) => { if (v !== null) n++; });
  return n;
});
d('COUNTBLANK', 'rango', 'Cuenta celdas vacías.', (a, c) => flat(matrix(a[0], c)).filter((v) => v === null || v === '').length);
d('MAX', 'numero1, ...', 'Mayor valor.', (a, c) => { const v = numbers(a, c); return v.length ? v.reduce((p, x) => (x > p ? x : p)) : 0; });
d('MIN', 'numero1, ...', 'Menor valor.', (a, c) => { const v = numbers(a, c); return v.length ? v.reduce((p, x) => (x < p ? x : p)) : 0; });
d('MAXA', 'valor1, ...', 'Mayor valor contando texto como 0.', (a, c) => { const v = numbersA(a, c); return v.length ? Math.max(...v) : 0; });
d('MINA', 'valor1, ...', 'Menor valor contando texto como 0.', (a, c) => { const v = numbersA(a, c); return v.length ? Math.min(...v) : 0; });
d('MEDIAN', 'numero1, ...', 'Mediana.', (a, c) => {
  const v = numbers(a, c);
  if (!v.length) throw ERR.NUM;
  return percentile(v, 0.5, false);
});
d('MODE', 'numero1, ...', 'Valor más frecuente.', (a, c) => modes(numbers(a, c))[0]);
d('MODE.SNGL', 'numero1, ...', 'Valor más frecuente.', (a, c) => modes(numbers(a, c))[0]);
d('MODE.MULT', 'numero1, ...', 'Todos los valores más frecuentes.', (a, c) => modes(numbers(a, c)).map((x) => [x]));

for (const [names, sample] of [[['STDEV', 'STDEV.S'], true], [['STDEVP', 'STDEV.P'], false]] as const) {
  for (const n of names) d(n, 'numero1, ...', sample ? 'Desviación estándar de una muestra.' : 'Desviación estándar de la población.', (a, c) => Math.sqrt(variance(numbers(a, c), sample)));
}
for (const [names, sample] of [[['VAR', 'VAR.S'], true], [['VARP', 'VAR.P'], false]] as const) {
  for (const n of names) d(n, 'numero1, ...', sample ? 'Varianza de una muestra.' : 'Varianza de la población.', (a, c) => variance(numbers(a, c), sample));
}
d('STDEVA', 'valor1, ...', 'Desviación estándar con texto como 0.', (a, c) => Math.sqrt(variance(numbersA(a, c), true)));
d('STDEVPA', 'valor1, ...', 'Desviación poblacional con texto como 0.', (a, c) => Math.sqrt(variance(numbersA(a, c), false)));
d('VARA', 'valor1, ...', 'Varianza con texto como 0.', (a, c) => variance(numbersA(a, c), true));
d('VARPA', 'valor1, ...', 'Varianza poblacional con texto como 0.', (a, c) => variance(numbersA(a, c), false));

for (const [name, exc] of [['PERCENTILE', false], ['PERCENTILE.INC', false], ['PERCENTILE.EXC', true]] as const) {
  d(name, 'matriz, k', 'Percentil k.', (a, c) => percentile(numbers([a[0]], c), num(a[1], c), exc));
}
for (const [name, exc] of [['QUARTILE', false], ['QUARTILE.INC', false], ['QUARTILE.EXC', true]] as const) {
  d(name, 'matriz, cuartil', 'Cuartil.', (a, c) => {
    const q = Math.trunc(num(a[1], c));
    if (q < 0 || q > 4) throw ERR.NUM;
    return percentile(numbers([a[0]], c), q / 4, exc);
  });
}
for (const [name, exc] of [['PERCENTRANK', false], ['PERCENTRANK.INC', false], ['PERCENTRANK.EXC', true]] as const) {
  d(name, 'matriz, x, [cifras]', 'Rango porcentual de un valor.', (a, c) => {
    const s = sorted(numbers([a[0]], c));
    const x = num(a[1], c);
    const digits = optNum(a[2], c, 3);
    if (!s.length || x < s[0] || x > s[s.length - 1]) throw ERR.NA;
    const lo = s.filter((v) => v < x).length;
    const pos = s.indexOf(x);
    let rank: number;
    if (pos >= 0) rank = exc ? (lo + 1) / (s.length + 1) : lo / (s.length - 1);
    else {
      const a0 = s[lo - 1];
      const b0 = s[lo];
      const f = (x - a0) / (b0 - a0);
      rank = exc ? (lo + f) / (s.length + 1) : (lo - 1 + f) / (s.length - 1);
    }
    return Math.floor(rank * 10 ** digits) / 10 ** digits;
  });
}
for (const [name, avg] of [['RANK', false], ['RANK.EQ', false], ['RANK.AVG', true]] as const) {
  d(name, 'numero, referencia, [orden]', 'Posición de un número en una lista.', (a, c) => {
    const x = num(a[0], c);
    const list = numbers([a[1]], c);
    const asc = optNum(a[2], c, 0) !== 0;
    if (!list.includes(x)) throw ERR.NA;
    const better = list.filter((v) => (asc ? v < x : v > x)).length;
    const ties = list.filter((v) => v === x).length;
    return avg ? better + (ties + 1) / 2 : better + 1;
  });
}
d('LARGE', 'matriz, k', 'k-ésimo mayor.', (a, c) => {
  const s = sorted(numbers([a[0]], c)).reverse();
  const k = Math.ceil(num(a[1], c));
  if (k < 1 || k > s.length) throw ERR.NUM;
  return s[k - 1];
});
d('SMALL', 'matriz, k', 'k-ésimo menor.', (a, c) => {
  const s = sorted(numbers([a[0]], c));
  const k = Math.ceil(num(a[1], c));
  if (k < 1 || k > s.length) throw ERR.NUM;
  return s[k - 1];
});
d('GEOMEAN', 'numero1, ...', 'Media geométrica.', (a, c) => {
  const v = numbers(a, c);
  if (!v.length || v.some((x) => x <= 0)) throw ERR.NUM;
  return Math.exp(v.reduce((s, x) => s + Math.log(x), 0) / v.length);
});
d('HARMEAN', 'numero1, ...', 'Media armónica.', (a, c) => {
  const v = numbers(a, c);
  if (!v.length || v.some((x) => x <= 0)) throw ERR.NUM;
  return v.length / v.reduce((s, x) => s + 1 / x, 0);
});
d('TRIMMEAN', 'matriz, porcentaje', 'Media sin los extremos.', (a, c) => {
  const s = sorted(numbers([a[0]], c));
  const p = num(a[1], c);
  if (p < 0 || p >= 1) throw ERR.NUM;
  const cut = Math.floor((s.length * p) / 2);
  return mean(s.slice(cut, s.length - cut));
});
d('AVEDEV', 'numero1, ...', 'Desviación absoluta media.', (a, c) => {
  const v = numbers(a, c);
  const m = mean(v);
  return v.reduce((s, x) => s + Math.abs(x - m), 0) / v.length;
});
d('DEVSQ', 'numero1, ...', 'Suma de cuadrados de las desviaciones.', (a, c) => sumSq(numbers(a, c)));
d('SKEW', 'numero1, ...', 'Asimetría.', (a, c) => {
  const v = numbers(a, c);
  const n = v.length;
  if (n < 3) throw ERR.DIV0;
  const m = mean(v);
  const s = Math.sqrt(variance(v, true));
  if (s === 0) throw ERR.DIV0;
  return (n / ((n - 1) * (n - 2))) * v.reduce((p, x) => p + ((x - m) / s) ** 3, 0);
});
d('KURT', 'numero1, ...', 'Curtosis.', (a, c) => {
  const v = numbers(a, c);
  const n = v.length;
  if (n < 4) throw ERR.DIV0;
  const m = mean(v);
  const s = Math.sqrt(variance(v, true));
  if (s === 0) throw ERR.DIV0;
  const sum = v.reduce((p, x) => p + ((x - m) / s) ** 4, 0);
  return (n * (n + 1) * sum) / ((n - 1) * (n - 2) * (n - 3)) - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
});
d('STANDARDIZE', 'x, media, desviacion', 'Valor normalizado.', lifted(([x, m, s]) => {
  if (toNumber(s) <= 0) throw ERR.NUM;
  return (toNumber(x) - toNumber(m)) / toNumber(s);
}));
d('FREQUENCY', 'datos, grupos', 'Distribución de frecuencias.', (a, c) => {
  const data = numbers([a[0]], c);
  const bins = sorted(numbers([a[1]], c));
  const out = new Array(bins.length + 1).fill(0);
  for (const x of data) {
    const i = bins.findIndex((b) => x <= b);
    out[i < 0 ? bins.length : i]++;
  }
  return out.map((n) => [n]);
});
d('PROB', 'x, probabilidades, inferior, [superior]', 'Probabilidad de un intervalo.', (a, c) => {
  const [x, p] = pairs(a[0], a[1], c);
  const lo = num(a[2], c);
  const hi = a[3] === undefined ? lo : num(a[3], c);
  return x.reduce((s, v, i) => (v >= lo && v <= hi ? s + p[i] : s), 0);
});

// ---- Relaciones ----

for (const n of ['CORREL', 'PEARSON']) {
  d(n, 'matriz1, matriz2', 'Coeficiente de correlación.', (a, c) => {
    const [x, y] = pairs(a[0], a[1], c);
    const den = Math.sqrt(sumSq(x) * sumSq(y));
    if (den === 0) throw ERR.DIV0;
    return covariance(x, y) / den;
  });
}
d('RSQ', 'y, x', 'Coeficiente de determinación.', (a, c) => {
  const [y, x] = pairs(a[0], a[1], c);
  const den = sumSq(x) * sumSq(y);
  if (den === 0) throw ERR.DIV0;
  return covariance(x, y) ** 2 / den;
});
for (const [n, s] of [['COVAR', false], ['COVARIANCE.P', false], ['COVARIANCE.S', true]] as const) {
  d(n, 'matriz1, matriz2', 'Covarianza.', (a, c) => {
    const [x, y] = pairs(a[0], a[1], c);
    return covariance(x, y) / (x.length - (s ? 1 : 0));
  });
}
d('SLOPE', 'y, x', 'Pendiente de la regresión.', (a, c) => { const [y, x] = pairs(a[0], a[1], c); return regress(y, x).slope; });
d('INTERCEPT', 'y, x', 'Intersección de la regresión.', (a, c) => { const [y, x] = pairs(a[0], a[1], c); return regress(y, x).intercept; });
d('STEYX', 'y, x', 'Error típico de la predicción.', (a, c) => {
  const [y, x] = pairs(a[0], a[1], c);
  const { slope, intercept } = regress(y, x);
  if (y.length < 3) throw ERR.DIV0;
  return Math.sqrt(y.reduce((s, v, i) => s + (v - slope * x[i] - intercept) ** 2, 0) / (y.length - 2));
});
for (const n of ['FORECAST', 'FORECAST.LINEAR']) {
  d(n, 'x, y_conocidos, x_conocidos', 'Pronóstico lineal.', (a, c) => {
    const [y, x] = pairs(a[1], a[2], c);
    const { slope, intercept } = regress(y, x);
    return intercept + slope * num(a[0], c);
  });
}
d('TREND', 'y_conocidos, [x_conocidos], [x_nuevos]', 'Valores sobre una tendencia lineal.', (a, c) => fit(a, c, (v) => v, (v) => v));
d('GROWTH', 'y_conocidos, [x_conocidos], [x_nuevos]', 'Valores sobre una tendencia exponencial.', (a, c) => fit(a, c, Math.log, Math.exp));

/** Ajuste lineal, opcionalmente transformado. */
function fit(a: EvalValue[], c: Ctx, tf: (v: number) => number, inv: (v: number) => number): Matrix {
  const y = numbers([a[0]], c).map(tf);
  const x = a[1] === undefined ? y.map((_, i) => i + 1) : numbers([a[1]], c);
  if (x.length !== y.length) throw ERR.REF;
  const { slope, intercept } = regress(y, x);
  const shape = a[2] === undefined ? (a[1] === undefined ? matrix(a[0], c) : matrix(a[1], c)) : matrix(a[2], c);
  return shape.map((row) => row.map((v) => inv(intercept + slope * toNumber(v))));
}

d('LINEST', 'y_conocidos, [x_conocidos]', 'Pendiente e intersección de la recta.', (a, c) => {
  const y = numbers([a[0]], c);
  const x = a[1] === undefined ? y.map((_, i) => i + 1) : numbers([a[1]], c);
  const { slope, intercept } = regress(y, x);
  return [[slope, intercept]];
});

// ---- Condicionales ----

/** Pares rango/criterio de *IFS sobre filas alineadas. */
function matchMask(c: Ctx, pairsList: EvalValue[]): { mask: boolean[]; rows: number; cols: number } {
  const first = matrix(pairsList[0], c);
  const rows = first.length;
  const cols = first[0].length;
  const mask = new Array<boolean>(rows * cols).fill(true);
  for (let i = 0; i < pairsList.length; i += 2) {
    const m = matrix(pairsList[i], c);
    if (m.length !== rows || m[0].length !== cols) throw ERR.VALUE;
    const test = criterion(scalar(pairsList[i + 1], c));
    for (let r = 0; r < rows; r++) {
      for (let k = 0; k < cols; k++) if (mask[r * cols + k] && !test(m[r][k])) mask[r * cols + k] = false;
    }
  }
  return { mask, rows, cols };
}

/** Rango de valores alineado con el de criterios. */
function valueRange(v: EvalValue | undefined, fallback: EvalValue, c: Ctx, rows: number, cols: number): Matrix {
  const base = v === undefined ? fallback : v;
  if (base instanceof RefValue) return matrix(new RefValue(base.sheet, base.r1, base.c1, base.r1 + rows - 1, base.c1 + cols - 1), c);
  return matrix(base, c);
}

/** Valores numéricos seleccionados por una máscara. */
function picked(values: Matrix, mask: boolean[], rows: number, cols: number): number[] {
  const out: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      if (!mask[r * cols + k]) continue;
      const v = values[r]?.[k] ?? null;
      if (v instanceof CellError) throw v;
      if (typeof v === 'number') out.push(v);
    }
  }
  return out;
}

const countIfs = (a: EvalValue[], c: Ctx): number => matchMask(c, a).mask.filter(Boolean).length;
d('COUNTIF', 'rango, criterio', 'Cuenta celdas que cumplen un criterio.', countIfs);
d('COUNTIFS', 'rango1, criterio1, ...', 'Cuenta celdas que cumplen varios criterios.', (a, c) => { if (a.length % 2) throw ERR.VALUE; return countIfs(a, c); });

const single = (fn: (v: number[]) => number) => (a: EvalValue[], c: Ctx): number => {
  const { mask, rows, cols } = matchMask(c, [a[0], a[1]]);
  return fn(picked(valueRange(a[2], a[0], c, rows, cols), mask, rows, cols));
};
const multi = (fn: (v: number[]) => number) => (a: EvalValue[], c: Ctx): number => {
  if (a.length % 2 === 0) throw ERR.VALUE;
  const { mask, rows, cols } = matchMask(c, a.slice(1));
  return fn(picked(matrix(a[0], c), mask, rows, cols));
};
const total = (v: number[]): number => v.reduce((s, x) => s + x, 0);
d('SUMIF', 'rango, criterio, [rango_suma]', 'Suma según un criterio.', single(total));
d('AVERAGEIF', 'rango, criterio, [rango_promedio]', 'Promedio según un criterio.', single(mean));
d('SUMIFS', 'rango_suma, rango1, criterio1, ...', 'Suma según varios criterios.', multi(total));
d('AVERAGEIFS', 'rango_promedio, rango1, criterio1, ...', 'Promedio según varios criterios.', multi(mean));
d('MAXIFS', 'rango_max, rango1, criterio1, ...', 'Máximo según varios criterios.', multi((v) => (v.length ? Math.max(...v) : 0)));
d('MINIFS', 'rango_min, rango1, criterio1, ...', 'Mínimo según varios criterios.', multi((v) => (v.length ? Math.min(...v) : 0)));

// ---- Distribuciones ----

/** ln Γ(x) (Lanczos). */
export function gammaln(x: number): number {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  const t = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (const c of g) ser += c / ++y;
  return -t + Math.log((2.5066282746310005 * ser) / x);
}

/** Función gamma incompleta regularizada P(a, x). */
function gammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let sum = 1 / a;
    let term = sum;
    let n = a;
    for (let i = 0; i < 500; i++) {
      term *= x / ++n;
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - gammaln(a));
  }
  let b = x + 1 - a;
  let c = 1e300;
  let e = 1 / b;
  let h = e;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    e = an * e + b;
    if (Math.abs(e) < 1e-300) e = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    e = 1 / e;
    const del = e * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return 1 - h * Math.exp(-x + a * Math.log(x) - gammaln(a));
}

/** Beta incompleta regularizada I_x(a, b). */
function betaI(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(gammaln(a + b) - gammaln(a) - gammaln(b) + a * Math.log(x) + b * Math.log(1 - x));
  const cf = (p: number, q: number, y: number): number => {
    let c = 1;
    let e = 1 - ((p + q) * y) / (p + 1);
    if (Math.abs(e) < 1e-300) e = 1e-300;
    e = 1 / e;
    let h = e;
    for (let m = 1; m < 300; m++) {
      const m2 = 2 * m;
      let aa = (m * (q - m) * y) / ((p + m2 - 1) * (p + m2));
      e = 1 + aa * e;
      if (Math.abs(e) < 1e-300) e = 1e-300;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-300) c = 1e-300;
      e = 1 / e;
      h *= e * c;
      aa = (-(p + m) * (p + q + m) * y) / ((p + m2) * (p + m2 + 1));
      e = 1 + aa * e;
      if (Math.abs(e) < 1e-300) e = 1e-300;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-300) c = 1e-300;
      e = 1 / e;
      const del = e * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-15) break;
    }
    return h;
  };
  return x < (a + 1) / (a + b + 2) ? (front * cf(a, b, x)) / a : 1 - (front * cf(b, a, 1 - x)) / b;
}

/** Función de error. */
export function erf(x: number): number {
  const v = gammaP(0.5, x * x);
  return x >= 0 ? v : -v;
}

const normCdf = (z: number): number => 0.5 * (1 + erf(z / Math.SQRT2));

/** Inversa de la normal estándar (Acklam). */
function normInv(p: number): number {
  if (p <= 0 || p >= 1) throw ERR.NUM;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const e = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  let x: number;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((e[0] * q + e[1]) * q + e[2]) * q + e[3]) * q + 1);
  } else if (p <= 1 - lo) {
    const q = p - 0.5;
    const r = q * q;
    x = ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((e[0] * q + e[1]) * q + e[2]) * q + e[3]) * q + 1);
  }
  const err = normCdf(x) - p;
  const u = err * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
  return x - u / (1 + (x * u) / 2);
}

/** Inversa por bisección de una acumulada creciente. */
function invert(cdf: (x: number) => number, p: number, lo: number, hi: number): number {
  let a = lo;
  let b = hi;
  while (cdf(b) < p && b < 1e12) b *= 2;
  for (let i = 0; i < 200; i++) {
    const m = (a + b) / 2;
    if (cdf(m) < p) a = m;
    else b = m;
    if (b - a < 1e-12 * Math.max(1, Math.abs(m))) break;
  }
  return (a + b) / 2;
}

const tCdf = (t: number, df: number): number => {
  const x = df / (df + t * t);
  const tail = 0.5 * betaI(x, df / 2, 0.5);
  return t >= 0 ? 1 - tail : tail;
};
const chiCdf = (x: number, df: number): number => gammaP(df / 2, x / 2);
const fCdf = (x: number, a: number, b: number): number => (x <= 0 ? 0 : betaI((a * x) / (a * x + b), a / 2, b / 2));

const normDist = lifted(([x, m, s, cum]) => {
  const sd = toNumber(s);
  if (sd <= 0) throw ERR.NUM;
  const z = (toNumber(x) - toNumber(m)) / sd;
  return cum ? normCdf(z) : Math.exp((-z * z) / 2) / (sd * Math.sqrt(2 * Math.PI));
});
d('NORM.DIST', 'x, media, desviacion, acumulada', 'Distribución normal.', normDist);
d('NORMDIST', 'x, media, desviacion, acumulada', 'Distribución normal.', normDist);
d('NORM.S.DIST', 'z, [acumulada]', 'Normal estándar.', lifted(([z, cum]) => {
  const v = toNumber(z);
  return cum === false ? Math.exp((-v * v) / 2) / Math.sqrt(2 * Math.PI) : normCdf(v);
}));
d('NORMSDIST', 'z', 'Normal estándar acumulada.', lifted(([z]) => normCdf(toNumber(z))));
const normInvFn = lifted(([p, m, s]) => {
  if (toNumber(s) <= 0) throw ERR.NUM;
  return toNumber(m) + toNumber(s) * normInv(toNumber(p));
});
d('NORM.INV', 'probabilidad, media, desviacion', 'Inversa de la normal.', normInvFn);
d('NORMINV', 'probabilidad, media, desviacion', 'Inversa de la normal.', normInvFn);
d('NORM.S.INV', 'probabilidad', 'Inversa de la normal estándar.', lifted(([p]) => normInv(toNumber(p))));
d('NORMSINV', 'probabilidad', 'Inversa de la normal estándar.', lifted(([p]) => normInv(toNumber(p))));
d('CONFIDENCE.NORM', 'alfa, desviacion, tamano', 'Intervalo de confianza normal.', lifted(([a, s, n]) => (normInv(1 - toNumber(a) / 2) * toNumber(s)) / Math.sqrt(toNumber(n))));
d('CONFIDENCE', 'alfa, desviacion, tamano', 'Intervalo de confianza normal.', lifted(([a, s, n]) => (normInv(1 - toNumber(a) / 2) * toNumber(s)) / Math.sqrt(toNumber(n))));
d('GAMMA', 'x', 'Función gamma.', lifted(([x]) => {
  const v = toNumber(x);
  if (v <= 0 && Number.isInteger(v)) throw ERR.NUM;
  return finite(v > 0 ? Math.exp(gammaln(v)) : Math.PI / (Math.sin(Math.PI * v) * Math.exp(gammaln(1 - v))));
}));
d('GAMMALN', 'x', 'Logaritmo de gamma.', lifted(([x]) => { if (toNumber(x) <= 0) throw ERR.NUM; return gammaln(toNumber(x)); }));
d('GAMMALN.PRECISE', 'x', 'Logaritmo de gamma.', lifted(([x]) => { if (toNumber(x) <= 0) throw ERR.NUM; return gammaln(toNumber(x)); }));

const binom = (k: number, n: number, p: number): number => Math.exp(gammaln(n + 1) - gammaln(k + 1) - gammaln(n - k + 1) + (k ? k * Math.log(p) : 0) + (n - k ? (n - k) * Math.log(1 - p) : 0));
const binomDist = lifted(([k, n, p, cum]) => {
  const K = Math.trunc(toNumber(k));
  const N = Math.trunc(toNumber(n));
  const P = toNumber(p);
  if (K < 0 || K > N || P < 0 || P > 1) throw ERR.NUM;
  if (P === 0) return cum || K === 0 ? 1 : 0;
  if (P === 1) return K === N ? 1 : cum ? 0 : 0;
  if (!cum) return binom(K, N, P);
  let s = 0;
  for (let i = 0; i <= K; i++) s += binom(i, N, P);
  return Math.min(1, s);
});
d('BINOM.DIST', 'exitos, ensayos, probabilidad, acumulada', 'Distribución binomial.', binomDist);
d('BINOMDIST', 'exitos, ensayos, probabilidad, acumulada', 'Distribución binomial.', binomDist);
const poisson = lifted(([x, m, cum]) => {
  const k = Math.trunc(toNumber(x));
  const l = toNumber(m);
  if (k < 0 || l < 0) throw ERR.NUM;
  const pmf = (i: number): number => (l === 0 ? (i === 0 ? 1 : 0) : Math.exp(i * Math.log(l) - l - gammaln(i + 1)));
  if (!cum) return pmf(k);
  let s = 0;
  for (let i = 0; i <= k; i++) s += pmf(i);
  return Math.min(1, s);
});
d('POISSON.DIST', 'x, media, acumulada', 'Distribución de Poisson.', poisson);
d('POISSON', 'x, media, acumulada', 'Distribución de Poisson.', poisson);
const expon = lifted(([x, l, cum]) => {
  const v = toNumber(x);
  const r = toNumber(l);
  if (v < 0 || r <= 0) throw ERR.NUM;
  return cum ? 1 - Math.exp(-r * v) : r * Math.exp(-r * v);
});
d('EXPON.DIST', 'x, lambda, acumulada', 'Distribución exponencial.', expon);
d('EXPONDIST', 'x, lambda, acumulada', 'Distribución exponencial.', expon);
d('T.DIST', 'x, grados, acumulada', 'Distribución t.', lifted(([t, df, cum]) => {
  const x = toNumber(t);
  const n = toNumber(df);
  if (n < 1) throw ERR.NUM;
  if (cum) return tCdf(x, n);
  return Math.exp(gammaln((n + 1) / 2) - gammaln(n / 2)) / Math.sqrt(n * Math.PI) * (1 + (x * x) / n) ** (-(n + 1) / 2);
}));
d('T.DIST.2T', 'x, grados', 'Distribución t de dos colas.', lifted(([t, df]) => { if (toNumber(t) < 0) throw ERR.NUM; return 2 * (1 - tCdf(toNumber(t), toNumber(df))); }));
d('T.DIST.RT', 'x, grados', 'Distribución t de cola derecha.', lifted(([t, df]) => 1 - tCdf(toNumber(t), toNumber(df))));
d('T.INV', 'probabilidad, grados', 'Inversa de t.', lifted(([p, df]) => {
  const q = toNumber(p);
  if (q <= 0 || q >= 1) throw ERR.NUM;
  const n = toNumber(df);
  return q < 0.5 ? -invert((x) => tCdf(x, n), 1 - q, 0, 10) : invert((x) => tCdf(x, n), q, 0, 10);
}));
const tinv2 = lifted(([p, df]) => {
  const q = toNumber(p);
  if (q <= 0 || q > 1) throw ERR.NUM;
  const n = toNumber(df);
  return invert((x) => tCdf(x, n), 1 - q / 2, 0, 10);
});
d('T.INV.2T', 'probabilidad, grados', 'Inversa de t de dos colas.', tinv2);
d('TINV', 'probabilidad, grados', 'Inversa de t de dos colas.', tinv2);
d('CHISQ.DIST', 'x, grados, acumulada', 'Ji cuadrado.', lifted(([x, df, cum]) => {
  const v = toNumber(x);
  const n = toNumber(df);
  if (v < 0 || n < 1) throw ERR.NUM;
  if (cum) return chiCdf(v, n);
  return Math.exp((n / 2 - 1) * Math.log(v) - v / 2 - (n / 2) * Math.LN2 - gammaln(n / 2));
}));
const chiRt = lifted(([x, df]) => 1 - chiCdf(toNumber(x), toNumber(df)));
d('CHISQ.DIST.RT', 'x, grados', 'Ji cuadrado de cola derecha.', chiRt);
d('CHIDIST', 'x, grados', 'Ji cuadrado de cola derecha.', chiRt);
d('CHISQ.INV', 'probabilidad, grados', 'Inversa de ji cuadrado.', lifted(([p, df]) => invert((x) => chiCdf(x, toNumber(df)), toNumber(p), 0, 10)));
d('CHISQ.INV.RT', 'probabilidad, grados', 'Inversa de ji cuadrado de cola derecha.', lifted(([p, df]) => invert((x) => chiCdf(x, toNumber(df)), 1 - toNumber(p), 0, 10)));
d('F.DIST', 'x, gl1, gl2, acumulada', 'Distribución F.', lifted(([x, a, b, cum]) => {
  const v = toNumber(x);
  const n = toNumber(a);
  const m = toNumber(b);
  if (cum) return fCdf(v, n, m);
  const bt = Math.exp(gammaln(n / 2) + gammaln(m / 2) - gammaln((n + m) / 2));
  return (Math.sqrt(((n * v) ** n * m ** m) / (n * v + m) ** (n + m)) / (v * bt));
}));
const fRt = lifted(([x, a, b]) => 1 - fCdf(toNumber(x), toNumber(a), toNumber(b)));
d('F.DIST.RT', 'x, gl1, gl2', 'Distribución F de cola derecha.', fRt);
d('FDIST', 'x, gl1, gl2', 'Distribución F de cola derecha.', fRt);
d('F.INV', 'probabilidad, gl1, gl2', 'Inversa de F.', lifted(([p, a, b]) => invert((x) => fCdf(x, toNumber(a), toNumber(b)), toNumber(p), 0, 10)));
d('BETA.DIST', 'x, alfa, beta, acumulada, [a], [b]', 'Distribución beta.', lifted(([x, al, be, cum, lo, hi]) => {
  const a = lo === undefined || lo === null ? 0 : toNumber(lo);
  const b = hi === undefined || hi === null ? 1 : toNumber(hi);
  const t = (toNumber(x) - a) / (b - a);
  const p = toNumber(al);
  const q = toNumber(be);
  if (cum) return betaI(t, p, q);
  return Math.exp((p - 1) * Math.log(t) + (q - 1) * Math.log(1 - t) + gammaln(p + q) - gammaln(p) - gammaln(q)) / (b - a);
}));
const tTest = (a: EvalValue[], c: Ctx): number => {
  const x = numbers([a[0]], c);
  const y = numbers([a[1]], c);
  const tails = num(a[2], c);
  const type = num(a[3], c);
  let t: number;
  let df: number;
  if (type === 1) {
    if (x.length !== y.length) throw ERR.NA;
    const dv = x.map((v, i) => v - y[i]);
    t = mean(dv) / Math.sqrt(variance(dv, true) / dv.length);
    df = dv.length - 1;
  } else {
    const vx = variance(x, true);
    const vy = variance(y, true);
    if (type === 2) {
      df = x.length + y.length - 2;
      const sp = ((x.length - 1) * vx + (y.length - 1) * vy) / df;
      t = (mean(x) - mean(y)) / Math.sqrt(sp * (1 / x.length + 1 / y.length));
    } else {
      const u = vx / x.length;
      const w = vy / y.length;
      t = (mean(x) - mean(y)) / Math.sqrt(u + w);
      df = (u + w) ** 2 / (u * u / (x.length - 1) + w * w / (y.length - 1));
    }
  }
  const tail = 1 - tCdf(Math.abs(t), df);
  return tails === 1 ? tail : 2 * tail;
};
d('T.TEST', 'matriz1, matriz2, colas, tipo', 'Prueba t de Student.', tTest);
d('TTEST', 'matriz1, matriz2, colas, tipo', 'Prueba t de Student.', tTest);
d('CHISQ.TEST', 'observado, esperado', 'Prueba de ji cuadrado.', (a, c) => {
  const o = numericMatrix(a[0], c);
  const e = numericMatrix(a[1], c);
  let x = 0;
  o.forEach((row, i) => row.forEach((v, j) => { x += (v - e[i][j]) ** 2 / e[i][j]; }));
  const df = o.length > 1 && o[0].length > 1 ? (o.length - 1) * (o[0].length - 1) : Math.max(o.length, o[0].length) - 1;
  return 1 - chiCdf(x, df);
});
d('Z.TEST', 'matriz, x, [desviacion]', 'Prueba z de una cola.', (a, c) => {
  const v = numbers([a[0]], c);
  const s = a[2] === undefined ? Math.sqrt(variance(v, true)) : num(a[2], c);
  return 1 - normCdf((mean(v) - num(a[1], c)) / (s / Math.sqrt(v.length)));
});

