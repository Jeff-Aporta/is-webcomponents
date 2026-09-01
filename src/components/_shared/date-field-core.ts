/**
 * Motor de campos de fecha/hora editables por secciones (MUI Fields).
 *
 * Cada sección (día, mes, año, hora…) es un `role="spinbutton"`: flechas para
 * subir/bajar, dígitos para teclear, izquierda/derecha para saltar. Es el patrón
 * accesible habitual para fechas y evita depender de `<input type=date>`.
 */

import { daysInMonth, pad, parseISO, splitDateTime } from './date-utils.js';

/** Metadatos por tipo de sección. `len` = dígitos que caben. */
const META = {
  year: { len: 4, min: 1, max: 9999, label: 'año' },
  month: { len: 2, min: 1, max: 12, label: 'mes' },
  day: { len: 2, min: 1, max: 31, label: 'día' },
  hour: { len: 2, min: 0, max: 23, label: 'hora' },
  hour12: { len: 2, min: 1, max: 12, label: 'hora' },
  minute: { len: 2, min: 0, max: 59, label: 'minuto' },
  second: { len: 2, min: 0, max: 59, label: 'segundo' },
  meridiem: { len: 0, values: ['AM', 'PM'], label: 'AM/PM' },
};

const PART_TO_TYPE = {
  year: 'year',
  month: 'month',
  day: 'day',
  hour: 'hour',
  minute: 'minute',
  second: 'second',
  dayPeriod: 'meridiem',
};

/**
 * Orden y separadores reales del locale: se los preguntamos a Intl en vez de
 * inventar un formato.
 */
export function sectionLayout({ kind = 'date', locale, ampm = false, seconds = false } = {}) {
  const opts = {};
  if (kind === 'date' || kind === 'datetime') {
    Object.assign(opts, { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  if (kind === 'time' || kind === 'datetime') {
    Object.assign(opts, { hour: '2-digit', minute: '2-digit', hour12: ampm });
    if (seconds) opts.second = '2-digit';
  }
  const sample = new Date(2026, 10, 5, 15, 4, 9);
  const parts = new Intl.DateTimeFormat(locale, opts).formatToParts(sample);
  const out = [];
  for (const part of parts) {
    const type = PART_TO_TYPE[part.type];
    if (type) {
      out.push({ kind: 'section', type: type === 'hour' && ampm ? 'hour12' : type });
    } else if (part.type === 'literal') {
      out.push({ kind: 'literal', text: part.value.replace(/\u202f|\u00a0/g, ' ') });
    }
  }
  return out;
}

/** Placeholder de una sección vacía: aaaa, mm, dd… */
function placeholderFor(type, locale) {
  const es = String(locale || 'es').startsWith('es');
  const map = es
    ? { year: 'aaaa', month: 'mm', day: 'dd', hour: 'hh', hour12: 'hh', minute: 'mm', second: 'ss', meridiem: '--' }
    : { year: 'yyyy', month: 'mm', day: 'dd', hour: 'hh', hour12: 'hh', minute: 'mm', second: 'ss', meridiem: '--' };
  return map[type];
}

export class SectionField {
  #container;
  #onChange;
  #sections: HTMLSpanElement[] = [];
  #parts = {};
  #typing = '';
  #kind;
  #locale;
  #ampm;
  #seconds;

  constructor({ container, kind = 'date', locale, ampm = false, seconds = false, onChange = () => {} }) {
    this.#container = container;
    this.#kind = kind;
    this.#locale = locale;
    this.#ampm = ampm;
    this.#seconds = seconds;
    this.#onChange = onChange;
    container.addEventListener('keydown', this.#onKey);
    container.addEventListener('focusin', this.#onFocusIn);
    container.addEventListener('pointerdown', this.#onPointerDown);
    container.addEventListener('wheel', this.#onWheel, { passive: false });
  }

  configure({ kind, locale, ampm, seconds }) {
    if (kind !== undefined) this.#kind = kind;
    if (locale !== undefined) this.#locale = locale;
    if (ampm !== undefined) this.#ampm = ampm;
    if (seconds !== undefined) this.#seconds = seconds;
    this.render();
  }

  get kind() { return this.#kind; }

  /** Valor compuesto: ISO de fecha, hora, o `fecha`T`hora`. */
  get value() {
    const p = this.#parts;
    const dateReady = p.year != null && p.month != null && p.day != null;
    const hour = this.#hour24();
    const timeReady = hour != null && p.minute != null && (!this.#seconds || p.second != null);
    const date = dateReady ? `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}` : '';
    const time = timeReady
      ? (this.#seconds ? `${pad(hour)}:${pad(p.minute)}:${pad(p.second)}` : `${pad(hour)}:${pad(p.minute)}`)
      : '';
    if (this.#kind === 'date') return date;
    if (this.#kind === 'time') return time;
    return date && time ? `${date}T${time}` : '';
  }

  set value(raw) {
    const { date, time } = splitDateTime(raw);
    const p = {};
    const d = parseISO(date);
    if (d) {
      p.year = d.getFullYear();
      p.month = d.getMonth() + 1;
      p.day = d.getDate();
    }
    const t = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(this.#kind === 'time' ? (date || time) : time);
    if (t) {
      p.hour = +t[1];
      p.minute = +t[2];
      p.second = t[3] == null ? 0 : +t[3];
    }
    this.#parts = p;
    this.#typing = '';
    this.render();
  }

  /** ¿Hay algo escrito pero incompleto? Sirve para marcar badInput. */
  get incomplete() {
    const filled = Object.values(this.#parts).some((v) => v != null);
    return filled && !this.value;
  }

  get empty() {
    return !Object.values(this.#parts).some((v) => v != null);
  }

  clear() {
    this.#parts = {};
    this.#typing = '';
    this.render();
    this.#onChange(this.value);
  }

  focusFirst() {
    this.#sections[0]?.focus();
  }

  render() {
    const layout = sectionLayout({
      kind: this.#kind, locale: this.#locale, ampm: this.#ampm, seconds: this.#seconds,
    });
    const nodes = [];
    this.#sections = [];

    for (const item of layout) {
      if (item.kind === 'literal') {
        const sep = document.createElement('span');
        sep.className = 'sep';
        sep.setAttribute('aria-hidden', 'true');
        sep.textContent = item.text;
        nodes.push(sep);
        continue;
      }
      const el = document.createElement('span');
      el.className = 'sec';
      el.setAttribute('part', 'section');
      el.dataset.type = item.type;
      el.tabIndex = 0;
      el.setAttribute('role', 'spinbutton');
      el.setAttribute('aria-label', META[item.type].label);
      this.#paint(el);
      nodes.push(el);
      this.#sections.push(el);
    }
    this.#container.replaceChildren(...nodes);
  }

  /* ── Interno ──────────────────────────────────────────────────────── */

  #hour24() {
    const p = this.#parts;
    if (p.hour == null) return null;
    if (!this.#ampm) return p.hour;
    const h = p.hour % 12;
    return p.meridiem === 'PM' ? h + 12 : h;
  }

  /** Valor mostrado en la sección (12 h se deriva de la hora real). */
  #displayValue(type) {
    const p = this.#parts;
    if (type === 'meridiem') {
      if (p.hour == null) return p.meridiem ?? null;
      return p.meridiem ?? (p.hour >= 12 ? 'PM' : 'AM');
    }
    if (type === 'hour12') {
      if (p.hour == null) return null;
      const h = p.hour % 12;
      return h === 0 ? 12 : h;
    }
    return p[type] ?? null;
  }

  #paint(el: HTMLElement) {
    const type = el.dataset.type;
    const value = this.#displayValue(type);
    const meta = META[type];
    const empty = value == null;
    el.textContent = empty
      ? placeholderFor(type, this.#locale)
      : type === 'meridiem' ? value : pad(value, meta.len);
    el.toggleAttribute('data-empty', empty);
    if (type === 'meridiem') {
      el.setAttribute('aria-valuetext', empty ? 'vacío' : String(value));
      el.removeAttribute('aria-valuenow');
    } else {
      el.setAttribute('aria-valuemin', String(meta.min));
      el.setAttribute('aria-valuemax', String(type === 'day' ? this.#maxDay() : meta.max));
      if (empty) {
        el.removeAttribute('aria-valuenow');
        el.setAttribute('aria-valuetext', 'vacío');
      } else {
        el.setAttribute('aria-valuenow', String(value));
        el.removeAttribute('aria-valuetext');
      }
    }
  }

  /** Días del mes en curso: febrero no llega a 31. */
  #maxDay() {
    const { year, month } = this.#parts;
    if (month == null) return 31;
    return daysInMonth(year ?? 2024, month - 1);
  }

  #repaintAll() {
    for (const el of this.#sections) this.#paint(el);
  }

  #setPart(type, value: number) {
    if (type === 'meridiem') {
      this.#parts.meridiem = value;
      if (this.#parts.hour != null) {
        const h = this.#parts.hour % 12;
        this.#parts.hour = value === 'PM' ? h + 12 : h;
      }
      return;
    }
    if (type === 'hour12') {
      const mer = this.#parts.meridiem ?? (this.#parts.hour >= 12 ? 'PM' : 'AM');
      const h = value % 12;
      this.#parts.hour = mer === 'PM' ? h + 12 : h;
      this.#parts.meridiem = mer;
      return;
    }
    this.#parts[type] = value;
    // Cambiar de mes o año puede dejar el día fuera (31 de febrero).
    if ((type === 'month' || type === 'year') && this.#parts.day != null) {
      this.#parts.day = Math.min(this.#parts.day, this.#maxDay());
    }
  }

  #step(el: HTMLElement, delta: number) {
    const type = el.dataset.type;
    if (type === 'meridiem') {
      const cur = this.#displayValue(type) ?? 'AM';
      this.#setPart(type, cur === 'AM' ? 'PM' : 'AM');
    } else {
      const meta = META[type];
      const max = type === 'day' ? this.#maxDay() : meta.max;
      const cur = this.#displayValue(type);
      let next;
      if (cur == null) next = delta > 0 ? meta.min : max;
      else {
        next = cur + delta;
        if (next > max) next = meta.min;
        if (next < meta.min) next = max;
      }
      this.#setPart(type, next);
    }
    this.#typing = '';
    this.#repaintAll();
    this.#onChange(this.value);
  }

  #typeDigit(el: HTMLElement, digit: string) {
    const type = el.dataset.type;
    if (type === 'meridiem') {
      this.#setPart(type, digit === '0' ? 'AM' : 'PM');
      this.#repaintAll();
      this.#onChange(this.value);
      return;
    }
    const meta = META[type];
    const max = type === 'day' ? this.#maxDay() : meta.max;
    const buffer = `${this.#typing}${digit}`.slice(-meta.len);
    let n = Number(buffer);

    if (n > max) n = Number(digit);
    this.#typing = String(n);
    this.#setPart(type, Math.max(type === 'year' ? 0 : meta.min, n));
    this.#repaintAll();
    this.#onChange(this.value);

    // Sección completa (o ya no cabe más sin pasarse): salta a la siguiente.
    const full = this.#typing.length >= meta.len || n * 10 > max;
    if (full) {
      this.#typing = '';
      this.#move(el, 1);
    }
  }

  #move(el, delta) {
    const at = this.#sections.indexOf(el);
    const next = this.#sections[at + delta];
    if (next) next.focus();
  }

  #clearSection(el: HTMLElement) {
    const type = el.dataset.type;
    if (type === 'hour12') delete this.#parts.hour;
    else delete this.#parts[type];
    this.#typing = '';
    this.#repaintAll();
    this.#onChange(this.value);
  }

  #onKey = (e) => {
    const el = e.target.closest?.('.sec');
    if (!el) return;
    if (this.#container.hasAttribute('data-readonly')) {
      if (e.key.length === 1 || e.key === 'Backspace') e.preventDefault();
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      this.#step(el, e.key === 'ArrowUp' ? 1 : -1);
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      this.#move(el, e.key === 'ArrowRight' ? 1 : -1);
      return;
    }
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      (e.key === 'Home' ? this.#sections[0] : this.#sections.at(-1))?.focus();
      return;
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      this.#clearSection(el);
      return;
    }
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      this.#typeDigit(el, e.key);
      return;
    }
    if (/^[apAP]$/.test(e.key) && el.dataset.type === 'meridiem') {
      e.preventDefault();
      this.#setPart('meridiem', e.key.toLowerCase() === 'a' ? 'AM' : 'PM');
      this.#repaintAll();
      this.#onChange(this.value);
    }
  };

  #onFocusIn = () => {
    // Cada sección empieza su propio buffer de dígitos.
    this.#typing = '';
  };

  #onPointerDown = (e: PointerEvent) => {
    const el = e.target.closest?.('.sec');
    if (el) return;
    // Clic en un separador o en el hueco: al primer hueco por rellenar.
    e.preventDefault();
    const pending = this.#sections.find((s: HTMLElement) => s.hasAttribute('data-empty'));
    (pending || this.#sections[0])?.focus();
  };

  #onWheel = (e) => {
    const el = e.target.closest?.('.sec');
    if (!el || el.getRootNode().activeElement !== el) return;
    e.preventDefault();
    this.#step(el, e.deltaY < 0 ? 1 : -1);
  };
}
