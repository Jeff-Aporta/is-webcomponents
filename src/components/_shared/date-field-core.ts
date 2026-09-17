/**
 * Motor de campos de fecha/hora editables por secciones (MUI Fields).
 *
 * Cada sección (día, mes, año, hora…) es un `role="spinbutton"`: flechas para
 * subir/bajar, dígitos para teclear, izquierda/derecha para saltar. Es el patrón
 * accesible habitual para fechas y evita depender de `<input type=date>`.
 */

import { daysInMonth, pad, parseISO, splitDateTime } from './date-utils.js';

/* ──────────────────────────── Tipos locales ───────────────────────────── */

/** Tipos de sección que conoce el motor. */
type SectionType =
  | 'year'
  | 'month'
  | 'day'
  | 'hour'
  | 'hour12'
  | 'minute'
  | 'second'
  | 'meridiem';

/** Item del layout devuelto por `Intl.DateTimeFormat.formatToParts`. */
type LayoutItem =
  | { kind: 'section'; type: SectionType }
  | { kind: 'literal'; text: string };

/** Metadatos por sección (dígitos que caben, rango, etiqueta accesible). */
interface SectionMeta {
  len: number;
  min: number;
  max: number;
  label: string;
  /** meridiem tiene `values` en lugar de rango numérico. */
  values?: readonly string[];
}

/** Pieza del valor: `year`, `month`, `day`, `hour`, `minute`, `second`, `meridiem`. */
interface Parts {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  second?: number;
  meridiem?: 'AM' | 'PM';
}

/** Modos del campo: solo fecha, solo hora, o ambos. */
type FieldKind = 'date' | 'time' | 'datetime';

/** Argumentos del constructor y de `configure()`. */
interface SectionFieldOptions {
  /** Contenedor donde se pintan los `<span class='sec' role='spinbutton'>`. */
  container: HTMLElement;
  kind?: FieldKind;
  locale?: string;
  ampm?: boolean;
  seconds?: boolean;
  onChange?: (value: string) => void;
}

/* ──────────────────────────── Constantes ──────────────────────────────── */

const META: Record<SectionType, SectionMeta> = {
  year:     { len: 4, min: 1, max: 9999, label: 'año' },
  month:    { len: 2, min: 1, max: 12,   label: 'mes' },
  day:      { len: 2, min: 1, max: 31,   label: 'día' },
  hour:     { len: 2, min: 0, max: 23,   label: 'hora' },
  hour12:   { len: 2, min: 1, max: 12,   label: 'hora' },
  minute:   { len: 2, min: 0, max: 59,   label: 'minuto' },
  second:   { len: 2, min: 0, max: 59,   label: 'segundo' },
  meridiem: { len: 0, min: 0, max: 0,    label: 'AM/PM', values: ['AM', 'PM'] },
};

const PART_TO_TYPE: Record<string, SectionType> = {
  year: 'year',
  month: 'month',
  day: 'day',
  hour: 'hour',
  minute: 'minute',
  second: 'second',
  dayPeriod: 'meridiem',
};

/* ────────────────────────────── Helpers ────────────────────────────────── */

/**
 * Orden y separadores reales del locale: se los preguntamos a Intl en vez de
 * inventar un formato.
 */
export function sectionLayout({
  kind = 'date',
  locale,
  ampm = false,
  seconds = false,
}: {
  kind?: FieldKind;
  locale?: string;
  ampm?: boolean;
  seconds?: boolean;
} = {}): LayoutItem[] {
  const opts: Intl.DateTimeFormatOptions = {};
  if (kind === 'date' || kind === 'datetime') {
    Object.assign(opts, { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  if (kind === 'time' || kind === 'datetime') {
    Object.assign(opts, { hour: '2-digit', minute: '2-digit', hour12: ampm });
    if (seconds) opts.second = '2-digit';
  }
  const sample = new Date(2026, 10, 5, 15, 4, 9);
  const parts = new Intl.DateTimeFormat(locale, opts).formatToParts(sample);
  const out: LayoutItem[] = [];
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
function placeholderFor(type: SectionType, locale: string | undefined): string | undefined {
  const es = String(locale || 'es').startsWith('es');
  const map: Record<SectionType, { es: string; en: string }> = es
    ? {
        year:     { es: 'aaaa', en: 'yyyy' },
        month:    { es: 'mm',   en: 'mm' },
        day:      { es: 'dd',   en: 'dd' },
        hour:     { es: 'hh',   en: 'hh' },
        hour12:   { es: 'hh',   en: 'hh' },
        minute:   { es: 'mm',   en: 'mm' },
        second:   { es: 'ss',   en: 'ss' },
        meridiem: { es: '--',   en: '--' },
      }
    : {
        year:     { es: 'yyyy', en: 'yyyy' },
        month:    { es: 'mm',   en: 'mm' },
        day:      { es: 'dd',   en: 'dd' },
        hour:     { es: 'hh',   en: 'hh' },
        hour12:   { es: 'hh',   en: 'hh' },
        minute:   { es: 'mm',   en: 'mm' },
        second:   { es: 'ss',   en: 'ss' },
        meridiem: { es: '--',   en: '--' },
      };
  return map[type][es ? 'es' : 'en'];
}

/* ──────────────────────────── SectionField ────────────────────────────── */

export class SectionField {
  #container: HTMLElement;
  #onChange: (value: string) => void;
  #sections: HTMLElement[] = [];
  #parts: Parts = {};
  #typing = '';
  #kind: FieldKind;
  #locale: string | undefined;
  #ampm: boolean;
  #seconds: boolean;

  constructor({
    container,
    kind = 'date',
    locale,
    ampm = false,
    seconds = false,
    onChange = () => {},
  }: SectionFieldOptions) {
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

  configure({ kind, locale, ampm, seconds }: {
    kind?: FieldKind; locale?: string; ampm?: boolean; seconds?: boolean;
  }): void {
    if (kind !== undefined) this.#kind = kind;
    if (locale !== undefined) this.#locale = locale;
    if (ampm !== undefined) this.#ampm = ampm;
    if (seconds !== undefined) this.#seconds = seconds;
    this.render();
  }

  get kind(): FieldKind { return this.#kind; }

  /** Valor compuesto: ISO de fecha, hora, o `fecha`T`hora`. */
  get value(): string {
    const p = this.#parts;
    const dateReady = p.year != null && p.month != null && p.day != null;
    const hour = this.#hour24();
    const timeReady = hour != null && p.minute != null && (!this.#seconds || p.second != null);
    const date = dateReady ? `${pad(String(p.year), 4)}-${pad(String(p.month))}-${pad(String(p.day))}` : '';
    const time = timeReady
      ? (this.#seconds ? `${pad(String(hour))}:${pad(String(p.minute))}:${pad(String(p.second))}`
                         : `${pad(String(hour))}:${pad(String(p.minute))}`)
      : '';
    if (this.#kind === 'date') return date;
    if (this.#kind === 'time') return time;
    return date && time ? `${date}T${time}` : '';
  }

  set value(raw: string) {
    const { date, time } = splitDateTime(raw);
    const p: Parts = {};
    const d = parseISO(date);
    if (d) {
      p.year = d.getFullYear();
      p.month = d.getMonth() + 1;
      p.day = d.getDate();
    }
    const t = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(this.#kind === 'time' ? (date || time) : time);
    if (t) {
      p.hour = +t[1]!;
      p.minute = +t[2]!;
      p.second = t[3] == null ? 0 : +t[3];
    }
    this.#parts = p;
    this.#typing = '';
    this.render();
  }

  /** ¿Hay algo escrito pero incompleto? Sirve para marcar badInput. */
  get incomplete(): boolean {
    const filled = Object.values(this.#parts).some((v) => v != null);
    return filled && !this.value;
  }

  get empty(): boolean {
    return !Object.values(this.#parts).some((v) => v != null);
  }

  clear(): void {
    this.#parts = {};
    this.#typing = '';
    this.render();
    this.#onChange(this.value);
  }

  focusFirst(): void {
    this.#sections[0]?.focus();
  }

  render(): void {
    const layout = sectionLayout({
      kind: this.#kind, locale: this.#locale, ampm: this.#ampm, seconds: this.#seconds,
    });
    const nodes: HTMLElement[] = [];
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
      el.dataset['type'] = item.type;
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

  #hour24(): number | null {
    const p = this.#parts;
    if (p.hour == null) return null;
    if (!this.#ampm) return p.hour;
    const h = p.hour % 12;
    return p.meridiem === 'PM' ? h + 12 : h;
  }

  /** Valor mostrado en la sección (12 h se deriva de la hora real). */
  #displayValue(type: SectionType): string | number | null {
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

  #paint(el: HTMLElement): void {
    const type = (el.dataset['type'] ?? '') as SectionType;
    const value = this.#displayValue(type);
    const meta = META[type];
    const empty = value == null;
    el.textContent = empty
      ? placeholderFor(type, this.#locale) ?? ''
      : type === 'meridiem' ? String(value) : pad(String(value), meta.len);
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
  #maxDay(): number {
    const { year, month } = this.#parts;
    if (month == null) return 31;
    return daysInMonth(year ?? 2024, month - 1);
  }

  #repaintAll(): void {
    for (const el of this.#sections) this.#paint(el);
  }

  #setPart(type: SectionType, value: number | 'AM' | 'PM'): void {
    if (type === 'meridiem') {
      const meridiem = value as 'AM' | 'PM';
      this.#parts.meridiem = meridiem;
      if (this.#parts.hour != null) {
        const h = this.#parts.hour % 12;
        this.#parts.hour = meridiem === 'PM' ? h + 12 : h;
      }
      return;
    }
    if (type === 'hour12') {
      const mer = this.#parts.meridiem ?? (this.#parts.hour != null && this.#parts.hour >= 12 ? 'PM' : 'AM');
      const h = (value as number) % 12;
      this.#parts.hour = mer === 'PM' ? h + 12 : h;
      this.#parts.meridiem = mer;
      return;
    }
    this.#parts[type] = value as number;
    // Cambiar de mes o año puede dejar el día fuera (31 de febrero).
    if ((type === 'month' || type === 'year') && this.#parts.day != null) {
      this.#parts.day = Math.min(this.#parts.day, this.#maxDay());
    }
  }

  #step(el: HTMLElement, delta: number): void {
    const type = (el.dataset['type'] ?? '') as SectionType;
    if (type === 'meridiem') {
      const cur = this.#displayValue(type) ?? 'AM';
      this.#setPart(type, cur === 'AM' ? 'PM' : 'AM');
    } else {
      const meta = META[type];
      const max = type === 'day' ? this.#maxDay() : meta.max;
      const cur = this.#displayValue(type);
      let next: number;
      if (cur == null) next = delta > 0 ? meta.min : max;
      else {
        next = (cur as number) + delta;
        if (next > max) next = meta.min;
        if (next < meta.min) next = max;
      }
      this.#setPart(type, next);
    }
    this.#typing = '';
    this.#repaintAll();
    this.#onChange(this.value);
  }

  #typeDigit(el: HTMLElement, digit: string): void {
    const type = (el.dataset['type'] ?? '') as SectionType;
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

  #move(el: HTMLElement, delta: number): void {
    const at = this.#sections.indexOf(el);
    const next = this.#sections[at + delta];
    if (next) next.focus();
  }

  #clearSection(el: HTMLElement): void {
    const type = (el.dataset['type'] ?? '') as SectionType;
    if (type === 'hour12') delete this.#parts.hour;
    else delete this.#parts[type];
    this.#typing = '';
    this.#repaintAll();
    this.#onChange(this.value);
  }

  #onKey = (e: Event): void => {
    const ke = e as KeyboardEvent;
    const el = (ke.target as Element | null)?.closest?.<HTMLElement>('.sec');
    if (!el) return;
    if (this.#container.hasAttribute('data-readonly')) {
      if (ke.key.length === 1 || ke.key === 'Backspace') ke.preventDefault();
      return;
    }

    if (ke.key === 'ArrowUp' || ke.key === 'ArrowDown') {
      ke.preventDefault();
      this.#step(el, ke.key === 'ArrowUp' ? 1 : -1);
      return;
    }
    if (ke.key === 'ArrowLeft' || ke.key === 'ArrowRight') {
      ke.preventDefault();
      this.#move(el, ke.key === 'ArrowRight' ? 1 : -1);
      return;
    }
    if (ke.key === 'Home' || ke.key === 'End') {
      ke.preventDefault();
      (ke.key === 'Home' ? this.#sections[0] : this.#sections.at(-1))?.focus();
      return;
    }
    if (ke.key === 'Backspace' || ke.key === 'Delete') {
      ke.preventDefault();
      this.#clearSection(el);
      return;
    }
    if (/^[0-9]$/.test(ke.key)) {
      ke.preventDefault();
      this.#typeDigit(el, ke.key);
      return;
    }
    if (/^[apAP]$/.test(ke.key) && el.dataset['type'] === 'meridiem') {
      ke.preventDefault();
      this.#setPart('meridiem', ke.key.toLowerCase() === 'a' ? 'AM' : 'PM');
      this.#repaintAll();
      this.#onChange(this.value);
    }
  };

  #onFocusIn = (): void => {
    // Cada sección empieza su propio buffer de dígitos.
    this.#typing = '';
  };

  #onPointerDown = (e: PointerEvent): void => {
    const el = (e.target as Element | null)?.closest?.<HTMLElement>('.sec');
    if (el) return;
    // Clic en un separador o en el hueco: al primer hueco por rellenar.
    e.preventDefault();
    const pending = this.#sections.find((s) => s.hasAttribute('data-empty'));
    (pending || this.#sections[0])?.focus();
  };

  #onWheel = (e: Event): void => {
    const we = e as WheelEvent;
    const el = (we.target as Element | null)?.closest?.<HTMLElement>('.sec');
    if (!el) return;
    const root = el.getRootNode();
    const active = root instanceof ShadowRoot ? root.activeElement : root instanceof Document ? root.activeElement : null;
    if (active !== el) return;
    we.preventDefault();
    this.#step(el, we.deltaY < 0 ? 1 : -1);
  };
}