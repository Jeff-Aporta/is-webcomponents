// datetime.ts — fecha y hora sobre seriales.
import { daysInMonth, fromSerial, nowSerial, parseDateText, serial } from '@jeff-aporta/iswc-base/components/data/utils/spreadsheet/dates.js';
import type { Ctx } from '@jeff-aporta/iswc-base/components/data/utils/spreadsheet/evaluator.schemas.js';
import { ERR, toNumber, toText } from '@jeff-aporta/iswc-base/components/data/utils/spreadsheet/values.js';
import type { EvalValue, Scalar } from '@jeff-aporta/iswc-base/components/data/utils/spreadsheet/values.schemas.js';
import { flat, lifted, matrix, num, scalar } from './fn-helpers.js';
import { def } from './registry.js';

const CAT = 'Fecha y hora';
const d = (name: string, sig: string, desc: string, fn: (a: EvalValue[], c: Ctx) => EvalValue, opts?: { volatile?: boolean }): void => def(CAT, name, sig, desc, fn, opts);
const WEEKENDS: Record<number, number[]> = { 1: [6, 0], 2: [0, 1], 3: [1, 2], 4: [2, 3], 5: [3, 4], 6: [4, 5], 7: [5, 6], 11: [0], 12: [1], 13: [2], 14: [3], 15: [4], 16: [5], 17: [6] };

/** Serial desde número o texto de fecha. */
function dateOf(v: Scalar): number {
  if (typeof v === 'string') {
    const p = parseDateText(v);
    if (!p) throw ERR.VALUE;
    return p.value;
  }
  const n = toNumber(v);
  if (n < 0) throw ERR.NUM;
  return n;
}

const part = (name: string, desc: string, fn: (s: number) => number): void => d(name, 'fecha', desc, lifted(([x]) => fn(dateOf(x))));
part('YEAR', 'Año.', (s) => fromSerial(s).y);
part('MONTH', 'Mes.', (s) => fromSerial(s).m);
part('DAY', 'Día del mes.', (s) => fromSerial(s).d);
part('HOUR', 'Hora.', (s) => fromSerial(s).hh);
part('MINUTE', 'Minuto.', (s) => fromSerial(s).mm);
part('SECOND', 'Segundo.', (s) => fromSerial(s).ss);

d('DATE', 'anio, mes, dia', 'Serial de una fecha.', lifted(([y, m, dd]) => {
  let a = Math.trunc(toNumber(y));
  if (a < 0 || a > 9999) throw ERR.NUM;
  if (a < 1900) a += 1900;
  return serial(a, Math.trunc(toNumber(m)), Math.trunc(toNumber(dd)));
}));
d('TIME', 'hora, minuto, segundo', 'Fracción de día de una hora.', lifted(([h, m, s]) => {
  const t = (toNumber(h) * 3600 + toNumber(m) * 60 + toNumber(s)) / 86400;
  if (t < 0) throw ERR.NUM;
  return t - Math.floor(t);
}));
d('DATEVALUE', 'texto', 'Texto a serial de fecha.', lifted(([t]) => Math.floor(dateOf(toText(t)))));
d('TIMEVALUE', 'texto', 'Texto a fracción de día.', lifted(([t]) => { const v = dateOf(toText(t)); return v - Math.floor(v); }));
d('NOW', '', 'Fecha y hora actuales.', () => nowSerial(), { volatile: true });
d('TODAY', '', 'Fecha actual.', () => Math.floor(nowSerial()), { volatile: true });
d('WEEKDAY', 'fecha, [tipo]', 'Día de la semana.', lifted(([x, t]) => {
  const wd = fromSerial(dateOf(x)).wd;
  const kind = t === undefined || t === null ? 1 : toNumber(t);
  if (kind === 1 || kind === 17) return wd + 1;
  if (kind === 2 || kind === 11) return ((wd + 6) % 7) + 1;
  if (kind === 3) return (wd + 6) % 7;
  if (kind >= 12 && kind <= 16) return ((wd + 7 - (kind - 10)) % 7) + 1;
  throw ERR.NUM;
}));
d('WEEKNUM', 'fecha, [tipo]', 'Número de semana.', lifted(([x, t]) => {
  const s = Math.floor(dateOf(x));
  const kind = t === undefined || t === null ? 1 : toNumber(t);
  if (kind === 21) return isoWeek(s);
  const start = kind === 2 || kind === 11 ? 1 : kind >= 12 && kind <= 17 ? (kind - 10) % 7 : 0;
  const jan1 = serial(fromSerial(s).y, 1, 1);
  const offset = (fromSerial(jan1).wd - start + 7) % 7;
  return Math.floor((s - jan1 + offset) / 7) + 1;
}));
d('ISOWEEKNUM', 'fecha', 'Semana ISO.', lifted(([x]) => isoWeek(Math.floor(dateOf(x)))));

/** Semana ISO 8601 de un serial. */
function isoWeek(s: number): number {
  const wd = (fromSerial(s).wd + 6) % 7;
  const thu = s - wd + 3;
  const jan1 = serial(fromSerial(thu).y, 1, 1);
  return Math.floor((thu - jan1) / 7) + 1;
}

d('EDATE', 'fecha, meses', 'Fecha desplazada en meses.', lifted(([x, m]) => {
  const p = fromSerial(dateOf(x));
  const total = p.y * 12 + p.m - 1 + Math.trunc(toNumber(m));
  const y = Math.floor(total / 12);
  const mo = (total % 12 + 12) % 12 + 1;
  return serial(y, mo, Math.min(p.d, daysInMonth(y, mo)));
}));
d('EOMONTH', 'fecha, meses', 'Último día del mes desplazado.', lifted(([x, m]) => {
  const p = fromSerial(dateOf(x));
  const total = p.y * 12 + p.m - 1 + Math.trunc(toNumber(m));
  const y = Math.floor(total / 12);
  const mo = (total % 12 + 12) % 12 + 1;
  return serial(y, mo, daysInMonth(y, mo));
}));
d('DAYS', 'fin, inicio', 'Días entre fechas.', lifted(([e, s]) => Math.floor(dateOf(e)) - Math.floor(dateOf(s))));
d('DAYS360', 'inicio, fin, [metodo]', 'Días con año de 360.', lifted(([s, e, m]) => days360(dateOf(s), dateOf(e), !!m)));

/** Días 30/360. */
function days360(a: number, b: number, european: boolean): number {
  const p = fromSerial(a);
  const q = fromSerial(b);
  let d1 = p.d;
  let d2 = q.d;
  if (european) {
    d1 = Math.min(d1, 30);
    d2 = Math.min(d2, 30);
  } else {
    if (d1 === daysInMonth(p.y, p.m) && p.m === 2) d1 = 30;
    if (d1 === 31) d1 = 30;
    if (d2 === 31 && d1 === 30) d2 = 30;
  }
  return (q.y - p.y) * 360 + (q.m - p.m) * 30 + d2 - d1;
}

d('DATEDIF', 'inicio, fin, unidad', 'Diferencia en Y, M, D, YM, MD o YD.', lifted(([s, e, u]) => {
  const a = fromSerial(dateOf(s));
  const b = fromSerial(dateOf(e));
  if (dateOf(s) > dateOf(e)) throw ERR.NUM;
  const unit = toText(u).toUpperCase();
  const months = (b.y - a.y) * 12 + b.m - a.m - (b.d < a.d ? 1 : 0);
  if (unit === 'Y') return Math.floor(months / 12);
  if (unit === 'M') return months;
  if (unit === 'D') return Math.floor(dateOf(e)) - Math.floor(dateOf(s));
  if (unit === 'YM') return months % 12;
  if (unit === 'MD') return b.d >= a.d ? b.d - a.d : b.d + daysInMonth(b.m === 1 ? b.y - 1 : b.y, b.m === 1 ? 12 : b.m - 1) - a.d;
  if (unit === 'YD') {
    const anchor = serial(b.y, a.m, a.d);
    const start = anchor > Math.floor(dateOf(e)) ? serial(b.y - 1, a.m, a.d) : anchor;
    return Math.floor(dateOf(e)) - start;
  }
  throw ERR.NUM;
}));
d('YEARFRAC', 'inicio, fin, [base]', 'Fracción de año.', lifted(([s, e, b]) => {
  const a = Math.min(dateOf(s), dateOf(e));
  const z = Math.max(dateOf(s), dateOf(e));
  const k = b === undefined || b === null ? 0 : toNumber(b);
  if (k === 0) return days360(a, z, false) / 360;
  if (k === 2) return (z - a) / 360;
  if (k === 3) return (z - a) / 365;
  if (k === 4) return days360(a, z, true) / 360;
  if (k === 1) {
    const y1 = fromSerial(a).y;
    const y2 = fromSerial(z).y;
    let days = 0;
    for (let y = y1; y <= y2; y++) days += serial(y + 1, 1, 1) - serial(y, 1, 1);
    return (z - a) / (days / (y2 - y1 + 1));
  }
  throw ERR.NUM;
}));

/** Días de fin de semana de un argumento (número o máscara de 7 ceros y unos). */
function weekendSet(v: EvalValue | undefined, c: Ctx): Set<number> {
  if (v === undefined) return new Set([6, 0]);
  const s = scalar(v, c);
  if (typeof s === 'string') {
    if (!/^[01]{7}$/.test(s)) throw ERR.VALUE;
    return new Set([...s].flatMap((ch, i) => (ch === '1' ? [(i + 1) % 7] : [])));
  }
  const list = WEEKENDS[toNumber(s)];
  if (!list) throw ERR.NUM;
  return new Set(list);
}

/** Conjunto de festivos. */
function holidaySet(v: EvalValue | undefined, c: Ctx): Set<number> {
  if (v === undefined) return new Set();
  return new Set(flat(matrix(v, c)).filter((x) => x !== null).map((x) => Math.floor(dateOf(x))));
}

/** Días laborables entre dos seriales, inclusive. */
function workdays(a: number, b: number, wk: Set<number>, hol: Set<number>): number {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  let n = 0;
  for (let s = lo; s <= hi; s++) if (!wk.has(fromSerial(s).wd) && !hol.has(s)) n++;
  return a <= b ? n : -n;
}

/** Avanza días laborables. */
function addWorkdays(a: number, n: number, wk: Set<number>, hol: Set<number>): number {
  if (wk.size >= 7) throw ERR.VALUE;
  let s = a;
  let left = Math.abs(n);
  const step = Math.sign(n);
  while (left > 0) {
    s += step;
    if (!wk.has(fromSerial(s).wd) && !hol.has(s)) left--;
  }
  return s;
}

d('NETWORKDAYS', 'inicio, fin, [festivos]', 'Días laborables entre fechas.', (a, c) => workdays(Math.floor(dateOf(scalar(a[0], c))), Math.floor(dateOf(scalar(a[1], c))), new Set([6, 0]), holidaySet(a[2], c)));
d('NETWORKDAYS.INTL', 'inicio, fin, [fin_de_semana], [festivos]', 'Días laborables con fin de semana a medida.', (a, c) => workdays(Math.floor(dateOf(scalar(a[0], c))), Math.floor(dateOf(scalar(a[1], c))), weekendSet(a[2], c), holidaySet(a[3], c)));
d('WORKDAY', 'inicio, dias, [festivos]', 'Fecha tras n días laborables.', (a, c) => addWorkdays(Math.floor(dateOf(scalar(a[0], c))), num(a[1], c), new Set([6, 0]), holidaySet(a[2], c)));
d('WORKDAY.INTL', 'inicio, dias, [fin_de_semana], [festivos]', 'Fecha tras n días laborables, fin de semana a medida.', (a, c) => addWorkdays(Math.floor(dateOf(scalar(a[0], c))), num(a[1], c), weekendSet(a[2], c), holidaySet(a[3], c)));

