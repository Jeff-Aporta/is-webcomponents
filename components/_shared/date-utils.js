/**
 * Utilidades de fecha y hora para los componentes de calendario y reloj.
 *
 * Todo se mueve en ISO local (`yyyy-mm-dd`, `HH:mm[:ss]`): son cadenas
 * ordenables con `<`, comparables sin parsear y sin sorpresas de zona horaria.
 * Los `Date` solo se usan como aritmética intermedia.
 */

export const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
export const ISO_TIME = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

/** ISO válido → Date local. Rechaza 2026-02-31 y compañía. */
export function parseISO(s) {
  if (!s || !ISO_DATE.test(s)) return null;
  const [, y, m, d] = ISO_DATE.exec(s);
  const dt = new Date(+y, +m - 1, +d);
  if (dt.getFullYear() !== +y || dt.getMonth() !== +m - 1 || dt.getDate() !== +d) return null;
  return dt;
}

export function toISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isoOf(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export function pad(n, len = 2) {
  return String(n).padStart(len, '0');
}

export function todayISO() {
  return toISO(new Date());
}

export function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function addDaysISO(iso, n) {
  const d = parseISO(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function monthKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** Recorta un ISO al intervalo [min, max]; cadenas vacías = sin límite. */
export function clampISO(iso, min, max) {
  if (min && iso < min) return min;
  if (max && iso > max) return max;
  return iso;
}

export function inRangeISO(iso, min, max) {
  if (min && iso < min) return false;
  if (max && iso > max) return false;
  return true;
}

/**
 * Primer día de la semana del locale (0 = domingo … 6 = sábado).
 * `Intl.Locale.weekInfo` usa 1 = lunes … 7 = domingo; Firefox aún no lo trae,
 * de ahí el lunes por defecto (mayoría de locales, incluido es-CO).
 */
export function firstDayOfWeek(locale) {
  try {
    const loc = new Intl.Locale(locale || document.documentElement.lang || 'es');
    const info = loc.weekInfo ?? loc.getWeekInfo?.();
    const first = info?.firstDay;
    if (first) return first === 7 ? 0 : first;
  } catch { /* locale inválido o sin weekInfo */ }
  return 1;
}

/** Etiquetas de los 7 días empezando en `firstDay`. */
export function weekdayLabels(locale, { width = 'short', firstDay = 1 } = {}) {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: width });
  const out = [];
  // 2024-01-07 fue domingo: sumar el índice del día da cada nombre.
  const base = new Date(2024, 0, 7);
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + ((firstDay + i) % 7));
    out.push(fmt.format(d));
  }
  return out;
}

export function monthLabels(locale, { width = 'long', year = 2026 } = {}) {
  const fmt = new Intl.DateTimeFormat(locale, { month: width });
  return Array.from({ length: 12 }, (_, m) => fmt.format(new Date(year, m, 1)));
}

export function formatDate(iso, locale, opts = { dateStyle: 'medium' }) {
  const d = parseISO(iso);
  return d ? new Intl.DateTimeFormat(locale, opts).format(d) : '';
}

/** Semana ISO 8601 (lunes como primer día, semana 1 = la del primer jueves). */
export function isoWeek(iso) {
  const d = parseISO(iso);
  if (!d) return null;
  const thursday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const jan4 = new Date(thursday.getFullYear(), 0, 4);
  const week = 1 + Math.round((thursday - jan4) / 604800000);
  return week;
}

/* ── Hora ────────────────────────────────────────────────────────────────── */

export function parseTime(s) {
  if (!s || !ISO_TIME.test(s)) return null;
  const [, h, m, sec] = ISO_TIME.exec(s);
  const t = { h: +h, m: +m, s: sec == null ? 0 : +sec };
  if (t.h > 23 || t.m > 59 || t.s > 59) return null;
  return t;
}

export function toTime({ h, m, s = 0 }, withSeconds = false) {
  return withSeconds ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}`;
}

/** ¿El locale escribe la hora con AM/PM? */
export function uses12Hour(locale) {
  try {
    const loc = new Intl.Locale(locale || document.documentElement.lang || 'es');
    const cycles = loc.hourCycles ?? loc.getHourCycles?.();
    if (cycles?.length) return cycles[0] === 'h11' || cycles[0] === 'h12';
    return new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12 ?? false;
  } catch {
    return false;
  }
}

export function formatTime(time, locale, { seconds = false, hour12 } = {}) {
  const t = typeof time === 'string' ? parseTime(time) : time;
  if (!t) return '';
  const d = new Date(2026, 0, 1, t.h, t.m, t.s || 0);
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    ...(seconds ? { second: '2-digit' } : {}),
    ...(hour12 == null ? {} : { hour12 }),
  }).format(d);
}

/** 0 → 12 AM, 13 → 1 PM. Devuelve { hour, meridiem }. */
export function to12Hour(h) {
  const meridiem = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return { hour, meridiem };
}

export function from12Hour(hour, meridiem) {
  const h = hour % 12;
  return meridiem === 'PM' ? h + 12 : h;
}

/** Une fecha y hora en el valor compuesto que usan los campos date-time. */
export function joinDateTime(iso, time) {
  if (!iso) return '';
  return time ? `${iso}T${time}` : iso;
}

export function splitDateTime(value) {
  const [date = '', time = ''] = String(value || '').split('T');
  return { date, time };
}
