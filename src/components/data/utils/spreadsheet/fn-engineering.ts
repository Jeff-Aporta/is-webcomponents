// engineering.ts — ingeniería (bases, bits, conversión) y funciones de base de datos (D*).
import { criterion } from './criteria.js';
import type { Ctx } from './evaluator.schemas.js';
import { compare, ERR, toNumber, toText } from './values.js';
import type { EvalValue, Matrix, Scalar } from './values.schemas.js';
import { lifted, matrix, scalar } from './fn-helpers.js';
import { def, lookupFn } from './fn-registry.js';
import { erf } from './fn-stats.js';

const CAT = 'Ingeniería';
const DB = 'Base de datos';
const d = (name: string, sig: string, desc: string, fn: (a: EvalValue[], c: Ctx) => EvalValue): void => def(CAT, name, sig, desc, fn);

/** Convierte entre bases con el complemento a dos de 10 dígitos de Excel. */
function fromBase(text: string, radix: number): number {
  const s = text.trim().toUpperCase();
  if (s.length > 10 || !/^[0-9A-F]*$/.test(s)) throw ERR.NUM;
  const n = parseInt(s || '0', radix);
  if (Number.isNaN(n)) throw ERR.NUM;
  const bits = radix === 2 ? 10 : radix === 8 ? 30 : 40;
  return s.length === 10 && n >= 2 ** (bits - 1) ? n - 2 ** bits : n;
}

function toBase(n: number, radix: number, places: Scalar): string {
  const bits = radix === 2 ? 10 : radix === 8 ? 30 : 40;
  if (n < -(2 ** (bits - 1)) || n >= 2 ** (bits - 1)) throw ERR.NUM;
  if (n < 0) return (2 ** bits + n).toString(radix).toUpperCase();
  const s = Math.trunc(n).toString(radix).toUpperCase();
  if (places === undefined || places === null) return s;
  if (toNumber(places) < s.length) throw ERR.NUM;
  return s.padStart(toNumber(places), '0');
}

const BASES: [string, number][] = [['BIN', 2], ['OCT', 8], ['DEC', 10], ['HEX', 16]];
for (const [a, ra] of BASES) {
  for (const [b, rb] of BASES) {
    if (a === b) continue;
    const name = `${a}2${b}`;
    const read = (x: Scalar): number => (ra === 10 ? toNumber(x) : fromBase(toText(x), ra));
    if (rb === 10) d(name, 'numero', `De base ${ra} a decimal.`, lifted(([x]) => read(x)));
    else d(name, 'numero, [digitos]', `De base ${ra} a base ${rb}.`, lifted(([x, p]) => toBase(read(x), rb, p)));
  }
}

const bits = (name: string, desc: string, fn: (a: bigint, b: bigint) => bigint): void => d(name, 'numero1, numero2', desc, lifted(([x, y]) => {
  if (toNumber(x) < 0 || toNumber(y) < 0) throw ERR.NUM;
  return Number(fn(BigInt(Math.trunc(toNumber(x))), BigInt(Math.trunc(toNumber(y)))));
}));
bits('BITAND', 'Y bit a bit.', (a, b) => a & b);
bits('BITOR', 'O bit a bit.', (a, b) => a | b);
bits('BITXOR', 'O exclusivo bit a bit.', (a, b) => a ^ b);
d('BITLSHIFT', 'numero, desplazamiento', 'Desplaza bits a la izquierda.', lifted(([x, s]) => Math.trunc(toNumber(x)) * 2 ** toNumber(s)));
d('BITRSHIFT', 'numero, desplazamiento', 'Desplaza bits a la derecha.', lifted(([x, s]) => Math.floor(Math.trunc(toNumber(x)) / 2 ** toNumber(s))));
d('DELTA', 'numero1, [numero2]', '1 si son iguales.', lifted(([x, y]) => (toNumber(x) === (y === undefined || y === null ? 0 : toNumber(y)) ? 1 : 0)));
d('GESTEP', 'numero, [umbral]', '1 si el número alcanza el umbral.', lifted(([x, y]) => (toNumber(x) >= (y === undefined || y === null ? 0 : toNumber(y)) ? 1 : 0)));
d('ERF', 'inferior, [superior]', 'Función de error.', lifted(([x, y]) => (y === undefined || y === null ? erf(toNumber(x)) : erf(toNumber(y)) - erf(toNumber(x)))));
d('ERF.PRECISE', 'x', 'Función de error.', lifted(([x]) => erf(toNumber(x))));
d('ERFC', 'x', 'Función de error complementaria.', lifted(([x]) => 1 - erf(toNumber(x))));
d('ERFC.PRECISE', 'x', 'Función de error complementaria.', lifted(([x]) => 1 - erf(toNumber(x))));

/** Factores a la unidad base por familia. */
const UNITS: Record<string, Record<string, number>> = {
  length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254, Nmi: 1852 },
  mass: { kg: 1, g: 0.001, mg: 1e-6, ton: 907.18474, lbm: 0.45359237, ozm: 0.028349523125 },
  time: { sec: 1, s: 1, mn: 60, min: 60, hr: 3600, day: 86400, d: 86400, yr: 31557600 },
  volume: { l: 0.001, L: 0.001, ml: 1e-6, gal: 0.003785411784, qt: 0.000946352946, pt: 0.000473176473, cup: 0.0002365882365, m3: 1 },
  area: { m2: 1, km2: 1e6, ha: 10000, ft2: 0.09290304, in2: 0.00064516, acre: 4046.8564224 },
  energy: { J: 1, kJ: 1000, cal: 4.1868, kcal: 4186.8, Wh: 3600, kWh: 3600000, BTU: 1055.05585262 },
  speed: { 'm/s': 1, 'km/h': 1 / 3.6, mph: 0.44704, kn: 0.514444 },
};

/** Temperatura a kelvin. */
function toKelvin(v: number, u: string): number {
  if (u === 'C' || u === 'cel') return v + 273.15;
  if (u === 'F' || u === 'fah') return ((v - 32) * 5) / 9 + 273.15;
  if (u === 'K' || u === 'kel') return v;
  return NaN;
}

d('CONVERT', 'numero, desde, hacia', 'Convierte entre unidades.', lifted(([x, a, b]) => {
  const v = toNumber(x);
  const from = toText(a);
  const to = toText(b);
  for (const fam of Object.values(UNITS)) {
    if (fam[from] !== undefined && fam[to] !== undefined) return (v * fam[from]) / fam[to];
  }
  const k = toKelvin(v, from);
  if (!Number.isNaN(k)) {
    if (to === 'C' || to === 'cel') return k - 273.15;
    if (to === 'F' || to === 'fah') return ((k - 273.15) * 9) / 5 + 32;
    if (to === 'K' || to === 'kel') return k;
  }
  throw ERR.NA;
}));

// ---- Base de datos ----

/** Filas que cumplen la tabla de criterios (OR entre filas, AND entre columnas). */
function dbRows(a: EvalValue[], c: Ctx): { header: Scalar[]; rows: Matrix; field: number } {
  const m = matrix(a[0], c);
  const crit = matrix(a[2], c);
  const header = m[0];
  const rows = m.slice(1);
  const f = scalar(a[1], c);
  let field = -1;
  if (typeof f === 'number') field = f - 1;
  else if (f !== null) field = header.findIndex((h) => compare(h, f) === 0);
  const tests = crit.slice(1).map((line) => crit[0].flatMap((h, i) => {
    if (line[i] === null) return [];
    const k = header.findIndex((x) => compare(x, h) === 0);
    return k < 0 ? [] : [{ k, t: criterion(line[i]) }];
  }));
  return { header, field, rows: rows.filter((row) => tests.some((all) => all.every(({ k, t }) => t(row[k])))) };
}

/** Define una función D* delegando en su agregado. */
const dfn = (name: string, target: string, desc: string): void => def(DB, name, 'base, campo, criterios', desc, (a, c) => {
  const { rows, field } = dbRows(a, c);
  if (field < 0) throw ERR.VALUE;
  return lookupFn(target)!.fn!([rows.length ? rows.map((row) => [row[field]]) : [[null]]], c);
});
dfn('DSUM', 'SUM', 'Suma de la base según criterios.');
dfn('DAVERAGE', 'AVERAGE', 'Promedio de la base según criterios.');
dfn('DCOUNT', 'COUNT', 'Cuenta números según criterios.');
dfn('DCOUNTA', 'COUNTA', 'Cuenta no vacíos según criterios.');
dfn('DMAX', 'MAX', 'Máximo según criterios.');
dfn('DMIN', 'MIN', 'Mínimo según criterios.');
dfn('DPRODUCT', 'PRODUCT', 'Producto según criterios.');
dfn('DSTDEV', 'STDEV.S', 'Desviación de muestra según criterios.');
dfn('DSTDEVP', 'STDEV.P', 'Desviación poblacional según criterios.');
dfn('DVAR', 'VAR.S', 'Varianza de muestra según criterios.');
dfn('DVARP', 'VAR.P', 'Varianza poblacional según criterios.');
def(DB, 'DGET', 'base, campo, criterios', 'Un único valor según criterios.', (a, c) => {
  const { rows, field } = dbRows(a, c);
  if (rows.length === 0) throw ERR.VALUE;
  if (rows.length > 1) throw ERR.NUM;
  return rows[0][field];
});
