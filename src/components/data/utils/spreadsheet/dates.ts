// dates.ts — fechas seriales del sistema 1900, incluido el 29-feb-1900 ficticio de Excel.

import type { DateParts } from './dates.schemas.ts';
const BASE = Date.UTC(1899, 11, 30);
const DAY = 86400000;


/** Serial de una fecha; acepta meses y días fuera de rango como DATE. */
export function serial(y: number, m: number, d: number): number {
  const utc = new Date(Date.UTC(2000, 0, 1));
  utc.setUTCFullYear(y, m - 1, d);
  const days = (utc.getTime() - BASE) / DAY;
  return days < 61 ? days - 1 : days;
}

/** Partes de un serial. */
export function fromSerial(n: number): DateParts {
  const whole = Math.floor(n);
  const fraction = n - whole;
  const secs = Math.round(fraction * 86400000) / 1000;
  const total = Math.floor(secs);
  const hh = Math.floor(total / 3600) % 24;
  const mm = Math.floor(total / 60) % 60;
  const ss = total % 60;
  const ms = Math.round((secs - total) * 1000);
  if (whole === 60) return { y: 1900, m: 2, d: 29, hh, mm, ss, ms, wd: 3 };
  const t = new Date(BASE + (whole < 60 ? whole + 1 : whole) * DAY);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), hh, mm, ss, ms, wd: t.getUTCDay() };
}

/** Serial del instante actual en hora local. */
export function nowSerial(): number {
  const n = new Date();
  return serial(n.getFullYear(), n.getMonth() + 1, n.getDate()) + (n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds()) / 86400;
}

/** Días del mes. */
export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Interpreta texto de fecha u hora. `dmy` decide el orden de `3/4/2024`. Null si no es fecha. */
export function parseDateText(text: string, dmy = true): { value: number; kind: 'date' | 'time' | 'datetime' } | null {
  const s = text.trim();
  const time = /(?:^|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?$/i.exec(s);
  let t = 0;
  let rest = s;
  if (time) {
    let h = Number(time[1]);
    const mer = time[4]?.toLowerCase();
    if (mer?.startsWith('p') && h < 12) h += 12;
    if (mer?.startsWith('a') && h === 12) h = 0;
    if (h > 23 || Number(time[2]) > 59 || Number(time[3] ?? 0) > 59) return null;
    t = (h * 3600 + Number(time[2]) * 60 + Number(time[3] ?? 0)) / 86400;
    rest = s.slice(0, time.index).trim();
    if (!rest) return { value: t, kind: 'time' };
  }
  let y = 0;
  let m = 0;
  let d = 0;
  const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(rest);
  const slash = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/.exec(rest);
  if (iso) {
    y = Number(iso[1]);
    m = Number(iso[2]);
    d = Number(iso[3]);
  } else if (slash) {
    y = Number(slash[3]);
    if (y < 100) y += y < 30 ? 2000 : 1900;
    m = Number(dmy ? slash[2] : slash[1]);
    d = Number(dmy ? slash[1] : slash[2]);
  } else return null;
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return { value: serial(y, m, d) + t, kind: time ? 'datetime' : 'date' };
}
