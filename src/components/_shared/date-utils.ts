/**
 * Utilidades de fecha y hora para los componentes de calendario y reloj.
 *
 * Todo se mueve en ISO local (`yyyy-mm-dd`, `HH:mm[:ss]`): son cadenas
 * ordenables con `<`, comparables sin parsear y sin sorpresas de zona horaria.
 * Los `Date` solo se usan como aritmética intermedia.
 */

import { resolveLocale } from './resolve-locale.js';

export const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
export const ISO_TIME = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

/** Hora descompuesta en horas / minutos / segundos. */
export type ClockTime = { h: number; m: number; s: number };

/** ISO válido → Date local. Rechaza 2026-02-31 y compañía. */
export function parseISO(s: string | null | undefined): Date | null {
  if (!s || !ISO_DATE.test(s)) return null;
  const m = ISO_DATE.exec(s);
  if (!m) return null;
  const [, y, mo, d] = m;
  const yi = +y!;
  const moi = +mo! - 1;
  const di = +d!;
  const dt = new Date(yi, moi, di);
  if (dt.getFullYear() !== yi || dt.getMonth() !== moi || dt.getDate() !== di) return null;
  return dt;
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isoOf(year: string | number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export function pad(n: string | number, len = 2): string {
  return String(n).padStart(len, '0');
}

export function todayISO(): string {
  return toISO(new Date());
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function addDaysISO(iso: string, n: number): string {
  const d = parseISO(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** Recorta un ISO al intervalo [min, max]; cadenas vacías = sin límite. */
export function clampISO(iso: string, min: string, max: string): string {
  if (min && iso < min) return min;
  if (max && iso > max) return max;
  return iso;
}

export function inRangeISO(iso: string, min: string, max: string): boolean {
  if (min && iso < min) return false;
  if (max && iso > max) return false;
  return true;
}

/**
 * Primer día de la semana del locale (0 = domingo … 6 = sábado).
 * `Intl.Locale.weekInfo` usa 1 = lunes … 7 = domingo; Firefox aún no lo trae,
 * de ahí el lunes por defecto (mayoría de locales, incluido es-CO).
 */
export function firstDayOfWeek(locale: string | null | undefined): number {
  try {
    const loc = new Intl.Locale(resolveLocale(locale));
    const info: { firstDay?: number } | undefined = (loc as { weekInfo?: { firstDay?: number }; getWeekInfo?: () => { firstDay?: number } }).weekInfo ?? (loc as { getWeekInfo?: () => { firstDay?: number } }).getWeekInfo?.();
    const first = info?.firstDay;
    if (first) return first === 7 ? 0 : first;
  } catch { /* locale inválido o sin weekInfo */ }
  return 1;
}

export type WeekdayLabelsOpts = {
  width?: 'short' | 'long' | 'narrow';
  firstDay?: number;
};

/** Etiquetas de los 7 días empezando en `firstDay`. */
export function weekdayLabels(locale: string, opts: WeekdayLabelsOpts = {}): string[] {
  const { width = 'short', firstDay = 1 } = opts;
  const fmt = new Intl.DateTimeFormat(locale, { weekday: width });
  const out: string[] = [];
  // 2024-01-07 fue domingo: sumar el índice del día da cada nombre.
  const base = new Date(2024, 0, 7);
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + ((firstDay + i) % 7));
    out.push(fmt.format(d));
  }
  return out;
}

export type MonthLabelsOpts = {
  width?: 'short' | 'long' | 'narrow';
  year?: number;
};

export function monthLabels(locale: string, opts: MonthLabelsOpts = {}): string[] {
  const { width = 'long', year = 2026 } = opts;
  const fmt = new Intl.DateTimeFormat(locale, { month: width });
  return Array.from({ length: 12 }, (_, m) => fmt.format(new Date(year, m, 1)));
}

export type FormatDateOpts = Intl.DateTimeFormatOptions & { dateStyle?: 'full' | 'long' | 'medium' | 'short'; timeStyle?: 'full' | 'long' | 'medium' | 'short' };

export function formatDate(iso: string | null | undefined, locale: string, opts: FormatDateOpts = { dateStyle: 'medium' }): string {
  const d = parseISO(iso ?? '');
  return d ? new Intl.DateTimeFormat(locale, opts).format(d) : '';
}

/** Semana ISO 8601 (lunes como primer día, semana 1 = la del primer jueves). */
export function isoWeek(iso: string | null | undefined): number | null {
  const d = parseISO(iso);
  if (!d) return null;
  const thursday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const jan4 = new Date(thursday.getFullYear(), 0, 4);
  const week = 1 + Math.round((thursday.getTime() - jan4.getTime()) / 604800000);
  return week;
}

/* ── Hora ────────────────────────────────────────────────────────────────── */

export function parseTime(s: string | null | undefined): ClockTime | null {
  if (!s || !ISO_TIME.test(s)) return null;
  const m = ISO_TIME.exec(s);
  if (!m) return null;
  const [, h, mn, sec] = m;
  const t: ClockTime = { h: +h!, m: +mn!, s: sec == null ? 0 : +sec };
  if (t.h > 23 || t.m > 59 || t.s > 59) return null;
  return t;
}

export function toTime({ h, m, s = 0 }: ClockTime, withSeconds: boolean = false): string {
  return withSeconds ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}`;
}

/** ¿El locale escribe la hora con AM/PM? */
export function uses12Hour(locale: string | null | undefined): boolean {
  try {
    const resolved = resolveLocale(locale);
    const loc = new Intl.Locale(resolved) as Intl.Locale & { hourCycles?: string[]; getHourCycles?: () => string[] };
    const cycles: string[] | undefined = loc.hourCycles ?? loc.getHourCycles?.();
    if (cycles?.length) return cycles[0] === 'h11' || cycles[0] === 'h12';
    return new Intl.DateTimeFormat(resolved, { hour: 'numeric' }).resolvedOptions().hour12 ?? false;
  } catch {
    return false;
  }
}

export type FormatTimeOpts = {
  seconds?: boolean;
  hour12?: boolean;
};

export function formatTime(time: string | ClockTime | null | undefined, locale: string, opts: FormatTimeOpts = {}): string {
  const { seconds = false, hour12 } = opts;
  const t = typeof time === 'string' ? parseTime(time) : time;
  if (!t) return '';
  const d = new Date(2026, 0, 1, t.h, t.m, t.s || 0);
  const intlOpts: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...(seconds ? { second: '2-digit' as const } : {}),
    ...(hour12 == null ? {} : { hour12 }),
  };
  return new Intl.DateTimeFormat(locale, intlOpts).format(d);
}

/** 0 → 12 AM, 13 → 1 PM. Devuelve { hour, meridiem }. */
export function to12Hour(h: number): { hour: number; meridiem: 'AM' | 'PM' } {
  const meridiem: 'AM' | 'PM' = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return { hour, meridiem };
}

export function from12Hour(hour: number, meridiem: 'AM' | 'PM'): number {
  const h = hour % 12;
  return meridiem === 'PM' ? h + 12 : h;
}

/** Une fecha y hora en el valor compuesto que usan los campos date-time. */
export function joinDateTime(iso: string, time: string): string {
  if (!iso) return '';
  return time ? `${iso}T${time}` : iso;
}

export function splitDateTime(value: string | null | undefined): { date: string; time: string } {
  const [date = '', time = ''] = String(value || '').split('T');
  return { date, time };
}
