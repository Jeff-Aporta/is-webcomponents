// fill.ts — tirador de relleno: detecta series (números, fechas, días, meses, trimestres, texto
// con número) y las prolonga. Sin patrón, repite. Puro: no toca el libro.
import { daysInMonth, DAYS_EN, DAYS_ES, fromSerial, MONTHS_EN, MONTHS_ES, serial } from './dates.js';
import type { FillSource, FillStep, Series } from './fill.schemas.js';



const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);
const short = (s: string): string => s.slice(0, 3);

/** Listas cíclicas integradas. */
const LISTS: string[][] = [
  DAYS_ES.map(cap), DAYS_ES, DAYS_ES.map((d) => cap(short(d))), DAYS_ES.map(short),
  DAYS_EN, DAYS_EN.map(short),
  MONTHS_ES.map(cap), MONTHS_ES, MONTHS_ES.map((m) => cap(short(m))), MONTHS_ES.map(short),
  MONTHS_EN, MONTHS_EN.map(short),
  ['Q1', 'Q2', 'Q3', 'Q4'], ['T1', 'T2', 'T3', 'T4'], ['Trim 1', 'Trim 2', 'Trim 3', 'Trim 4'],
];

/** Texto con número al final: `Item 3`. */
const NUMBERED = /^(.*?)(\d+)$/;


/** Serie lineal por mínimos cuadrados, como Excel con dos o más números. */
function linear(values: number[]): Series {
  const n = values.length;
  const mx = (n - 1) / 2;
  const my = values.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((v, i) => { num += (i - mx) * (v - my); den += (i - mx) ** 2; });
  const step = num / den;
  const start = my - step * mx;
  const exact = values.every((v, i) => Math.abs(start + step * i - v) < 1e-9);
  const last = values[n - 1];
  return (k) => {
    const r = exact ? last + step * k : start + step * (n - 1 + k);
    return Number(r.toPrecision(15));
  };
}

/** Serie de fechas: mes a mes si conservan el día; si no, por días. */
function dateSeries(values: number[]): Series {
  if (values.length === 1) return (k) => values[0] + k;
  const parts = values.map(fromSerial);
  const monthly = parts.every((p) => p.d === parts[0].d) && (parts[1].y !== parts[0].y || parts[1].m !== parts[0].m);
  if (!monthly) return linear(values);
  const delta = (parts[1].y - parts[0].y) * 12 + parts[1].m - parts[0].m;
  const base = parts[parts.length - 1];
  return (k) => {
    const total = base.y * 12 + base.m - 1 + delta * k;
    const y = Math.floor(total / 12);
    const m = (total % 12 + 12) % 12 + 1;
    return serial(y, m, Math.min(base.d, daysInMonth(y, m)));
  };
}

/** Busca la lista que contiene todos los textos con paso constante. */
function listSeries(values: string[]): Series | null {
  for (const list of LISTS) {
    const idx = values.map((v) => list.indexOf(v));
    if (idx.some((i) => i < 0)) continue;
    const step = values.length > 1 ? (idx[1] - idx[0] + list.length) % list.length : 1;
    if (idx.some((v, i) => i > 0 && (v - idx[i - 1] + list.length) % list.length !== step)) continue;
    const last = idx[idx.length - 1];
    return (k) => list[((last + step * k) % list.length + list.length) % list.length];
  }
  return null;
}

/** Serie de texto numerado. */
function numberedSeries(values: string[]): Series | null {
  const parts = values.map((v) => NUMBERED.exec(v));
  if (parts.some((p) => !p) || parts.some((p) => p![1] !== parts[0]![1])) return null;
  const nums = parts.map((p) => Number(p![2]));
  const width = parts[0]![2].startsWith('0') ? parts[0]![2].length : 0;
  const next = nums.length > 1 ? linear(nums) : (k: number): number => nums[0] + k;
  return (k) => `${parts[0]![1]}${String(Math.abs(Number(next(k)))).padStart(width, '0')}`;
}

/** Detecta la serie de una lista de celdas, o null si solo se repite. */
function detect(src: FillSource[], alternate: boolean): Series | null {
  if (src.some((s) => s.f !== undefined || s.v === undefined)) return null;
  const vals = src.map((s) => s.v);
  if (vals.every((v) => typeof v === 'number')) {
    const nums = vals as number[];
    if (src.every((s) => s.isDate)) return alternate ? null : dateSeries(nums);
    if (nums.length === 1) return alternate ? (k) => nums[0] + k : null;
    return alternate ? null : linear(nums);
  }
  if (vals.every((v) => typeof v === 'string')) {
    if (alternate) return null;
    const texts = vals as string[];
    return listSeries(texts) ?? numberedSeries(texts);
  }
  return null;
}

/**
 * Pasos para extender `src` en `count` celdas. `backward` rellena hacia arriba o la izquierda;
 * `alternate` es el Ctrl+arrastre: invierte copiar y serie.
 */
export function planFill(src: FillSource[], count: number, backward = false, alternate = false): FillStep[] {
  const n = src.length;
  const out: FillStep[] = [];
  const cycle = (i: number): number => (backward ? (n - 1 - (i % n)) : i % n);
  const whole = detect(src, alternate);
  if (whole) {
    const series: Series = backward ? (() => {
      const rev = detect([...src].reverse(), alternate);
      return rev ?? whole;
    })() : whole;
    for (let i = 0; i < count; i++) out.push({ from: cycle(i), v: series(i + 1) });
    return out;
  }
  // Fuente sin patrón común: cada celda continúa su propia serie, un paso por vuelta.
  const own = n > 1 && !alternate ? src.map((s) => detect([s], false)) : src.map(() => null);
  const textOwn = n > 1 && !alternate ? src.map((s, i) => own[i] ?? (typeof s.v === 'string' ? listSeries([s.v]) ?? numberedSeries([s.v]) : null)) : own;
  for (let i = 0; i < count; i++) {
    const from = cycle(i);
    const series = textOwn[from];
    const round = Math.floor(i / n) + 1;
    out.push(series ? { from, v: series(backward ? -round : round) } : { from });
  }
  return out;
}

/** Relleno rápido: aprende de ejemplos (origen, resultado) una transformación de texto. */
export function flashFill(examples: { source: string; result: string }[], inputs: string[]): (string | null)[] | null {
  const rules: ((s: string) => string | null)[] = [
    (s) => s.toUpperCase(),
    (s) => s.toLowerCase(),
    (s) => s.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase()),
    (s) => s.trim(),
  ];
  for (const sep of [' ', ',', ';', '-', '_', '/', '.', '@']) {
    for (let i = 0; i < 6; i++) {
      rules.push((s) => {
        const p = s.split(sep);
        return i < p.length ? p[i].trim() : null;
      });
      rules.push((s) => {
        const p = s.split(sep);
        return i < p.length ? p[p.length - 1 - i].trim() : null;
      });
    }
  }
  rules.push((s) => s.split(/\s+/).map((w) => w[0] ?? '').join(''));
  rules.push((s) => s.split(/\s+/).map((w) => (w[0] ?? '').toUpperCase()).join(''));
  rules.push((s) => s.replace(/\D/g, ''));
  rules.push((s) => s.replace(/\d/g, ''));
  for (const rule of rules) {
    if (examples.every((e) => rule(e.source) === e.result)) return inputs.map(rule);
  }
  return null;
}
