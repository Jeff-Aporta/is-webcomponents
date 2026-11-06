// financial.ts — anualidades, flujos de caja y depreciación.
import { parseDateText } from './dates.js';
import type { Ctx } from './evaluator.schemas.js';
import { ERR, toNumber } from './values.js';
import type { EvalValue, Scalar } from './values.schemas.js';
import { finite, flat, lifted, matrix, num, numbers, optNum } from './fn-helpers.js';
import { def } from './fn-registry.js';

const CAT = 'Financieras';
const d = (name: string, sig: string, desc: string, fn: (a: EvalValue[], c: Ctx) => EvalValue): void => def(CAT, name, sig, desc, fn);
const opt = (x: Scalar | undefined, dflt: number): number => (x === undefined || x === null ? dflt : toNumber(x));

/** Pago periódico. */
function pmt(r: number, n: number, pv: number, fv: number, type: number): number {
  if (r === 0) return -(pv + fv) / n;
  const f = (1 + r) ** n;
  return (-r * (pv * f + fv)) / ((1 + r * type) * (f - 1));
}

/** Valor futuro. */
function fvOf(r: number, n: number, p: number, pv: number, type: number): number {
  if (r === 0) return -(pv + p * n);
  const f = (1 + r) ** n;
  return -(pv * f + (p * (1 + r * type) * (f - 1)) / r);
}

/** Intereses del período `per`. */
function ipmt(r: number, per: number, n: number, pv: number, fv: number, type: number): number {
  if (per < 1 || per > n) throw ERR.NUM;
  const p = pmt(r, n, pv, fv, type);
  if (per === 1 && type === 1) return 0;
  const balance = fvOf(r, type === 1 ? per - 2 : per - 1, p, pv, type);
  const i = balance * r;
  return type === 1 ? i / (1 + r) : i;
}

/** Newton con reserva de bisección. */
function solve(f: (x: number) => number, guess: number): number {
  let x = guess;
  for (let i = 0; i < 200; i++) {
    const y = f(x);
    if (Math.abs(y) < 1e-9) return x;
    const h = Math.max(1e-7, Math.abs(x) * 1e-7);
    const slope = (f(x + h) - y) / h;
    if (!Number.isFinite(slope) || slope === 0) break;
    const nx = x - y / slope;
    if (!Number.isFinite(nx) || nx <= -1) break;
    if (Math.abs(nx - x) < 1e-11) return nx;
    x = nx;
  }
  let lo = -0.999999;
  let hi = 10;
  let flo = f(lo);
  const fhi = f(hi);
  if (!Number.isFinite(flo) || flo * fhi > 0) throw ERR.NUM;
  for (let i = 0; i < 300; i++) {
    const m = (lo + hi) / 2;
    const fm = f(m);
    if (Math.abs(fm) < 1e-9) return m;
    if (flo * fm < 0) hi = m;
    else { lo = m; flo = fm; }
  }
  return (lo + hi) / 2;
}

d('PMT', 'tasa, periodos, valor_actual, [valor_futuro], [tipo]', 'Pago periódico de un préstamo.', lifted(([r, n, pv, fv, t]) => {
  if (toNumber(n) === 0) throw ERR.NUM;
  return pmt(toNumber(r), toNumber(n), toNumber(pv), opt(fv, 0), opt(t, 0));
}));
d('FV', 'tasa, periodos, pago, [valor_actual], [tipo]', 'Valor futuro.', lifted(([r, n, p, pv, t]) => fvOf(toNumber(r), toNumber(n), toNumber(p), opt(pv, 0), opt(t, 0))));
d('PV', 'tasa, periodos, pago, [valor_futuro], [tipo]', 'Valor actual.', lifted(([r, n, p, fv, t]) => {
  const k = toNumber(r);
  const m = toNumber(n);
  const q = toNumber(p);
  if (k === 0) return -(opt(fv, 0) + q * m);
  const f = (1 + k) ** m;
  return -(opt(fv, 0) + (q * (1 + k * opt(t, 0)) * (f - 1)) / k) / f;
}));
d('NPER', 'tasa, pago, valor_actual, [valor_futuro], [tipo]', 'Número de períodos.', lifted(([r, p, pv, fv, t]) => {
  const k = toNumber(r);
  const q = toNumber(p);
  const a = toNumber(pv);
  const b = opt(fv, 0);
  if (k === 0) { if (q === 0) throw ERR.NUM; return -(a + b) / q; }
  const w = q * (1 + k * opt(t, 0));
  const v = (w - b * k) / (w + a * k);
  if (v <= 0) throw ERR.NUM;
  return Math.log(v) / Math.log(1 + k);
}));
d('RATE', 'periodos, pago, valor_actual, [valor_futuro], [tipo], [estimado]', 'Tasa por período.', lifted(([n, p, pv, fv, t, g]) => {
  const m = toNumber(n);
  const q = toNumber(p);
  const a = toNumber(pv);
  const b = opt(fv, 0);
  const k = opt(t, 0);
  return solve((r) => {
    if (Math.abs(r) < 1e-12) return a + q * m + b;
    const f = (1 + r) ** m;
    return a * f + (q * (1 + r * k) * (f - 1)) / r + b;
  }, opt(g, 0.1));
}));
d('IPMT', 'tasa, periodo, periodos, valor_actual, [valor_futuro], [tipo]', 'Intereses de un período.', lifted(([r, per, n, pv, fv, t]) => ipmt(toNumber(r), toNumber(per), toNumber(n), toNumber(pv), opt(fv, 0), opt(t, 0))));
d('PPMT', 'tasa, periodo, periodos, valor_actual, [valor_futuro], [tipo]', 'Capital de un período.', lifted(([r, per, n, pv, fv, t]) => {
  const k = toNumber(r);
  const m = toNumber(n);
  const a = toNumber(pv);
  return pmt(k, m, a, opt(fv, 0), opt(t, 0)) - ipmt(k, toNumber(per), m, a, opt(fv, 0), opt(t, 0));
}));
d('ISPMT', 'tasa, periodo, periodos, valor_actual', 'Interés con amortización constante.', lifted(([r, per, n, pv]) => toNumber(pv) * toNumber(r) * (toNumber(per) / toNumber(n) - 1)));
const cumulative = (capital: boolean) => lifted(([r, n, pv, a, b, t]) => {
  const k = toNumber(r);
  const m = toNumber(n);
  const p = toNumber(pv);
  const type = toNumber(t);
  if (k <= 0 || m <= 0 || p <= 0 || toNumber(a) < 1 || toNumber(b) < toNumber(a)) throw ERR.NUM;
  let s = 0;
  for (let i = toNumber(a); i <= toNumber(b); i++) {
    const it = ipmt(k, i, m, p, 0, type);
    s += capital ? pmt(k, m, p, 0, type) - it : it;
  }
  return s;
});
d('CUMIPMT', 'tasa, periodos, valor_actual, inicio, fin, tipo', 'Interés acumulado.', cumulative(false));
d('CUMPRINC', 'tasa, periodos, valor_actual, inicio, fin, tipo', 'Capital acumulado.', cumulative(true));
d('NPV', 'tasa, flujo1, ...', 'Valor actual neto.', (a, c) => {
  const r = num(a[0], c);
  return numbers(a.slice(1), c).reduce((s, x, i) => s + x / (1 + r) ** (i + 1), 0);
});
d('IRR', 'flujos, [estimado]', 'Tasa interna de retorno.', (a, c) => {
  const v = numbers([a[0]], c);
  if (!v.some((x) => x > 0) || !v.some((x) => x < 0)) throw ERR.NUM;
  return solve((r) => v.reduce((s, x, i) => s + x / (1 + r) ** i, 0), optNum(a[1], c, 0.1));
});

/** Serial de una fecha de flujo. */
const flowDate = (x: Scalar): number => {
  if (typeof x === 'string') {
    const p = parseDateText(x);
    if (!p) throw ERR.VALUE;
    return p.value;
  }
  return toNumber(x);
};

d('XNPV', 'tasa, flujos, fechas', 'Valor actual neto con fechas.', (a, c) => {
  const r = num(a[0], c);
  const v = flat(matrix(a[1], c)).map(toNumber);
  const t = flat(matrix(a[2], c)).map(flowDate);
  if (v.length !== t.length) throw ERR.NUM;
  return v.reduce((s, x, i) => s + x / (1 + r) ** ((t[i] - t[0]) / 365), 0);
});
d('XIRR', 'flujos, fechas, [estimado]', 'Tasa interna de retorno con fechas.', (a, c) => {
  const v = flat(matrix(a[0], c)).map(toNumber);
  const t = flat(matrix(a[1], c)).map(flowDate);
  if (v.length !== t.length || !v.some((x) => x > 0) || !v.some((x) => x < 0)) throw ERR.NUM;
  return solve((r) => v.reduce((s, x, i) => s + x / (1 + r) ** ((t[i] - t[0]) / 365), 0), optNum(a[2], c, 0.1));
});
d('MIRR', 'flujos, tasa_financiacion, tasa_reinversion', 'TIR modificada.', (a, c) => {
  const v = numbers([a[0]], c);
  const f = num(a[1], c);
  const r = num(a[2], c);
  const n = v.length;
  const neg = v.reduce((s, x, i) => (x < 0 ? s + x / (1 + f) ** i : s), 0);
  const pos = v.reduce((s, x, i) => (x > 0 ? s + x * (1 + r) ** (n - 1 - i) : s), 0);
  if (neg === 0) throw ERR.DIV0;
  if (pos === 0) return -1;
  return (pos / -neg) ** (1 / (n - 1)) - 1;
});
d('SLN', 'costo, residual, vida', 'Depreciación lineal.', lifted(([c, s, l]) => {
  if (toNumber(l) === 0) throw ERR.DIV0;
  return (toNumber(c) - toNumber(s)) / toNumber(l);
}));
d('SYD', 'costo, residual, vida, periodo', 'Depreciación por suma de dígitos.', lifted(([c, s, l, p]) => {
  const n = toNumber(l);
  return ((toNumber(c) - toNumber(s)) * (n - toNumber(p) + 1) * 2) / (n * (n + 1));
}));
d('DDB', 'costo, residual, vida, periodo, [factor]', 'Depreciación por doble saldo.', lifted(([c, s, l, p, f]) => {
  let book = toNumber(c);
  const salv = toNumber(s);
  const life = toNumber(l);
  const k = opt(f, 2) / life;
  let dep = 0;
  for (let i = 1; i <= toNumber(p); i++) {
    dep = Math.min(book * k, Math.max(0, book - salv));
    book -= dep;
  }
  return dep;
}));
d('DB', 'costo, residual, vida, periodo, [meses]', 'Depreciación por saldo fijo.', lifted(([c, s, l, p, m]) => {
  const cost = toNumber(c);
  const life = toNumber(l);
  const months = opt(m, 12);
  const rate = Math.round((1 - (toNumber(s) / cost) ** (1 / life)) * 1000) / 1000;
  let total = 0;
  let dep = (cost * rate * months) / 12;
  if (toNumber(p) === 1) return dep;
  total = dep;
  for (let i = 2; i <= toNumber(p); i++) {
    dep = i === life + 1 ? ((cost - total) * rate * (12 - months)) / 12 : (cost - total) * rate;
    total += dep;
  }
  return dep;
}));
d('EFFECT', 'tasa_nominal, periodos', 'Tasa efectiva anual.', lifted(([r, n]) => finite((1 + toNumber(r) / Math.trunc(toNumber(n))) ** Math.trunc(toNumber(n)) - 1)));
d('NOMINAL', 'tasa_efectiva, periodos', 'Tasa nominal anual.', lifted(([r, n]) => {
  const k = Math.trunc(toNumber(n));
  return k * ((1 + toNumber(r)) ** (1 / k) - 1);
}));
d('RRI', 'periodos, valor_actual, valor_futuro', 'Tasa equivalente de crecimiento.', lifted(([n, a, b]) => (toNumber(b) / toNumber(a)) ** (1 / toNumber(n)) - 1));
d('PDURATION', 'tasa, valor_actual, valor_futuro', 'Períodos para alcanzar un valor.', lifted(([r, a, b]) => (Math.log(toNumber(b)) - Math.log(toNumber(a))) / Math.log(1 + toNumber(r))));
d('DOLLARDE', 'fraccional, fraccion', 'Precio fraccional a decimal.', lifted(([x, f]) => {
  const n = toNumber(x);
  const k = Math.trunc(toNumber(f));
  const i = Math.trunc(n);
  return i + ((n - i) * 10 ** Math.ceil(Math.log10(k))) / k;
}));
d('DOLLARFR', 'decimal, fraccion', 'Precio decimal a fraccional.', lifted(([x, f]) => {
  const n = toNumber(x);
  const k = Math.trunc(toNumber(f));
  const i = Math.trunc(n);
  return i + ((n - i) * k) / 10 ** Math.ceil(Math.log10(k));
}));
