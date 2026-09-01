import { adoptCss, defineElement } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { resolveLocale } from '../_shared/resolve-locale.js';
import { formatBytes, toBytes } from './format-bytes.js';
import { parseLooseDate } from './format-date.js';

/**
 * <is-format type="…" value="…"> — Formateo con Intl + presets estilo Excel.
 *
 *   <is-format type="date"   value="2026-08-01" pattern="yyyy-mm-dd"></is-format>
 *   <is-format type="number" value="1234.5"     pattern="#,##0.00"></is-format>
 *   <is-format type="number" value="0.42"       format="percent"></is-format>
 *   <is-format type="text"   value="hola mundo" case="title"></is-format>
 *   <is-format type="bytes"  value="2048"       display="long"></is-format>
 *   <is-format type="relative" date="2026-08-01T00:00:00Z" sync></is-format>
 *
 * Atributos comunes
 *   type     date | number | bytes | relative | text
 *   value    dato a formatear (en relative también `date`)
 *   locale   BCP 47
 *   pattern  código Excel-like (ver EXCEL_PATTERNS) — tiene prioridad sobre
 *            format/atributos sueltos cuando coincide
 *
 * number: format = decimal|currency|percent|unit|scientific|compact|integer|accounting
 * text:   case = upper|lower|title|capitalize ; truncate ; pad-start/pad-end + pad-length
 */

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `<span part="value" class="value"></span>`;

const OBSERVED = [
  'type', 'value', 'date', 'locale', 'format', 'pattern',
  // date
  'weekday', 'era', 'year', 'month', 'day',
  'hour', 'minute', 'second', 'time-zone', 'time-zone-name', 'hour-format',
  // number
  'currency', 'minimum-fraction-digits', 'maximum-fraction-digits',
  // bytes
  'unit', 'display', 'autofit',
  // relative
  'style', 'numeric', 'sync',
  // text
  'case', 'truncate', 'pad-start', 'pad-end', 'pad-length',
];

const DATE_ATTR_TO_OPT = {
  weekday: 'weekday',
  era: 'era',
  year: 'year',
  month: 'month',
  day: 'day',
  hour: 'hour',
  minute: 'minute',
  second: 'second',
  'time-zone': 'timeZone',
  'time-zone-name': 'timeZoneName',
};

const RELATIVE_UNITS = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1],
];
const NUMBER_VALID_FORMAT = [
  'decimal', 'currency', 'percent', 'unit', 'scientific', 'compact', 'integer', 'accounting',
];
const RELATIVE_VALID_STYLE = ['long', 'short', 'narrow'];
const RELATIVE_VALID_NUMERIC = ['always', 'auto'];
const TEXT_CASES = ['upper', 'lower', 'title', 'capitalize'];
const TYPE_PARTS = {
  date: 'date', number: 'number', bytes: 'bytes', relative: 'time', text: 'text',
};
const VALID_TYPES = ['date', 'number', 'bytes', 'relative', 'text'];

/** Presets inspirados en categorías de formato de Excel. Claves normalizadas en minúsculas. */
const EXCEL_PATTERNS = {
  // General / Number
  general: { kind: 'number', opts: {} },
  '0': { kind: 'number', opts: { maximumFractionDigits: 0, minimumFractionDigits: 0, useGrouping: false } },
  '0.00': { kind: 'number', opts: { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false } },
  '0.000': { kind: 'number', opts: { minimumFractionDigits: 3, maximumFractionDigits: 3, useGrouping: false } },
  '#,##0': { kind: 'number', opts: { maximumFractionDigits: 0, useGrouping: true } },
  '#,##0.00': { kind: 'number', opts: { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true } },
  // Percent
  '0%': { kind: 'number', opts: { style: 'percent', maximumFractionDigits: 0 } },
  '0.00%': { kind: 'number', opts: { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 } },
  // Scientific
  '0.00e+00': { kind: 'number', opts: { notation: 'scientific', minimumFractionDigits: 2, maximumFractionDigits: 2 } },
  '##0.0e+0': { kind: 'number', opts: { notation: 'scientific', minimumFractionDigits: 1, maximumFractionDigits: 1 } },
  // Currency (símbolo vía locale / currency attr)
  '$#,##0': { kind: 'currency', digits: 0 },
  '$#,##0.00': { kind: 'currency', digits: 2 },
  '€#,##0.00': { kind: 'currency', digits: 2, currency: 'EUR' },
  // Accounting
  accounting: { kind: 'accounting', digits: 2 },
  // Fraction
  '# ?/?': { kind: 'fraction', maxDen: 9 },
  '# ??/??': { kind: 'fraction', maxDen: 99 },
  // Text
  '@': { kind: 'text' },
  // Date / Time
  'yyyy-mm-dd': { kind: 'date', opts: { year: 'numeric', month: '2-digit', day: '2-digit' } },
  'dd/mm/yyyy': { kind: 'date', opts: { day: '2-digit', month: '2-digit', year: 'numeric' } },
  'mm/dd/yyyy': { kind: 'date', opts: { month: '2-digit', day: '2-digit', year: 'numeric' } },
  'd/m/yyyy': { kind: 'date', opts: { day: 'numeric', month: 'numeric', year: 'numeric' } },
  'd-mmm-yy': { kind: 'date', opts: { day: 'numeric', month: 'short', year: '2-digit' } },
  'd-mmm-yyyy': { kind: 'date', opts: { day: 'numeric', month: 'short', year: 'numeric' } },
  'mmm-yy': { kind: 'date', opts: { month: 'short', year: '2-digit' } },
  'mmmm yyyy': { kind: 'date', opts: { month: 'long', year: 'numeric' } },
  'dddd, mmmm d, yyyy': {
    kind: 'date',
    opts: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  },
  'h:mm': { kind: 'date', opts: { hour: 'numeric', minute: '2-digit', hour12: false } },
  'hh:mm': { kind: 'date', opts: { hour: '2-digit', minute: '2-digit', hour12: false } },
  'h:mm am/pm': { kind: 'date', opts: { hour: 'numeric', minute: '2-digit', hour12: true } },
  'h:mm:ss': { kind: 'date', opts: { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: false } },
  'h:mm:ss am/pm': {
    kind: 'date',
    opts: { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true },
  },
  'yyyy-mm-dd h:mm': {
    kind: 'date',
    opts: {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: 'numeric', minute: '2-digit', hour12: false,
    },
  },
  'yyyy-mm-dd hh:mm:ss': {
    kind: 'date',
    opts: {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    },
  },
};

function normalizePattern(raw) {
  return String(raw ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Aproxima un decimal a fracción a/b con denominador ≤ maxDen (estilo Excel). */
function toFraction(n: number, maxDen) {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const whole = Math.floor(abs);
  const frac = abs - whole;
  if (frac < 1e-9) return `${sign}${whole}`;
  let bestN = 1;
  let bestD = 1;
  let bestErr = Math.abs(frac - 1);
  for (let d = 1; d <= maxDen; d += 1) {
    const num = Math.round(frac * d);
    const err = Math.abs(frac - num / d);
    if (err < bestErr - 1e-12 || (Math.abs(err - bestErr) < 1e-12 && d < bestD)) {
      bestErr = err;
      bestN = num;
      bestD = d;
    }
  }
  if (bestN === 0) return `${sign}${whole}`;
  if (bestN === bestD) return `${sign}${whole + 1}`;
  return whole > 0 ? `${sign}${whole} ${bestN}/${bestD}` : `${sign}${bestN}/${bestD}`;
}

function titleCase(s: string) {
  return s.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

class FormatElement extends ElementBase {
  static get observedAttributes(): string[] { return OBSERVED; }

  #el!: HTMLElement;
  #timer = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    adoptCss(shadow, import.meta.url);
    shadow.appendChild(TEMPLATE.content.cloneNode(true));
    this.#el = shadow.querySelector<HTMLElement>('.value')!;
  }

  onConnected() {
    this.#syncPart();
    this.#render();
    this.#setupSync();
  }

  onDisconnected() {
    this.#clearSync();
  }

  onAttributeChanged(name) {
    if (name === 'type') {
      this.#syncPart();
      this.#clearSync();
      this.#render();
      this.#setupSync();
    } else if (name === 'sync') {
      this.#clearSync();
      this.#setupSync();
    } else {
      this.#render();
    }
  }

  get type() {
    const v = this.getAttribute('type');
    return VALID_TYPES.includes(v) ? v : 'date';
  }
  set type(v) {
    if (v == null || v === '') this.removeAttribute('type');
    else this.setAttribute('type', v);
  }

  get value() { return this.getAttribute('value') ?? ''; }
  set value(v) {
    if (v == null || v === '') this.removeAttribute('value');
    else this.setAttribute('value', String(v));
  }

  get date() { return this.getAttribute('date') ?? ''; }
  set date(v) {
    if (v == null || v === '') this.removeAttribute('date');
    else this.setAttribute('date', String(v));
  }

  get locale() {
    return resolveLocale(this.getAttribute('locale'));
  }
  set locale(v) {
    if (v == null || v === '') this.removeAttribute('locale');
    else this.setAttribute('locale', String(v));
  }

  get pattern() { return this.getAttribute('pattern') ?? ''; }
  set pattern(v) {
    if (v == null || v === '') this.removeAttribute('pattern');
    else this.setAttribute('pattern', String(v));
  }

  #syncPart() {
    const part = TYPE_PARTS[this.type] || 'value';
    this.#el.setAttribute('part', part);
    this.dataset.type = this.type;
  }

  #resolvePattern() {
    const key = normalizePattern(this.pattern);
    if (!key) return null;
    return EXCEL_PATTERNS[key] || null;
  }

  #formatWithIntlNumber(n: string, opts) {
    try {
      this.#el.textContent = new Intl.NumberFormat(this.locale, opts).format(n);
    } catch {
      this.#el.textContent = String(n);
    }
  }

  #applyExcelPattern(preset) {
    const raw = this.getAttribute('value');
    if (preset.kind === 'text') {
      this.#renderText(raw ?? '');
      return true;
    }
    if (preset.kind === 'date') {
      const d = parseLooseDate(raw);
      if (!d) { this.#el.textContent = ''; return true; }
      try {
        this.#el.textContent = new Intl.DateTimeFormat(this.locale, preset.opts).format(d);
      } catch {
        this.#el.textContent = d.toLocaleString(this.locale);
      }
      this.#el.dateTime = d.toISOString();
      return true;
    }
    if (raw == null || raw === '') { this.#el.textContent = ''; return true; }
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) { this.#el.textContent = ''; return true; }

    if (preset.kind === 'fraction') {
      this.#el.textContent = toFraction(n, preset.maxDen || 9);
      return true;
    }
    if (preset.kind === 'currency' || preset.kind === 'accounting') {
      const currency = preset.currency || this.getAttribute('currency') || 'USD';
      const opts = {
        style: 'currency',
        currency,
        minimumFractionDigits: preset.digits ?? 2,
        maximumFractionDigits: preset.digits ?? 2,
      };
      if (preset.kind === 'accounting') opts.currencySign = 'accounting';
      this.#formatWithIntlNumber(n, opts);
      return true;
    }
    if (preset.kind === 'number') {
      this.#formatWithIntlNumber(n, { ...preset.opts });
      return true;
    }
    return false;
  }

  #renderDate() {
    const preset = this.#resolvePattern();
    if (preset?.kind === 'date' || preset?.kind === 'text') {
      this.#applyExcelPattern(preset);
      return;
    }
    const d = parseLooseDate(this.value);
    if (!d) {
      this.#el.textContent = '';
      this.#el.removeAttribute('datetime');
      return;
    }
    const opts = {};
    for (const [attr, key] of Object.entries(DATE_ATTR_TO_OPT)) {
      const v = this.getAttribute(attr);
      if (v) opts[key] = v;
    }
    const hf = this.getAttribute('hour-format');
    if (hf === '12') opts.hour12 = true;
    else if (hf === '24') opts.hour12 = false;
    if (Object.keys(opts).length === 0) {
      opts.dateStyle = 'medium';
      opts.timeStyle = 'short';
    }
    try {
      this.#el.textContent = new Intl.DateTimeFormat(this.locale, opts).format(d);
    } catch {
      this.#el.textContent = d.toLocaleString(this.locale);
    }
    this.#el.dateTime = d.toISOString();
  }

  #renderNumber() {
    const preset = this.#resolvePattern();
    if (preset) {
      this.#applyExcelPattern(preset);
      return;
    }
    const raw = this.getAttribute('value');
    if (raw == null || raw === '') {
      this.#el.textContent = '';
      return;
    }
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) {
      this.#el.textContent = '';
      return;
    }
    const fmtAttr = this.getAttribute('format');
    const style = NUMBER_VALID_FORMAT.includes(fmtAttr) ? fmtAttr : 'decimal';
    const opts = {};
    switch (style) {
      case 'currency':
        opts.style = 'currency';
        opts.currency = this.getAttribute('currency') || 'USD';
        break;
      case 'accounting':
        opts.style = 'currency';
        opts.currency = this.getAttribute('currency') || 'USD';
        opts.currencySign = 'accounting';
        break;
      case 'percent':
        opts.style = 'percent';
        break;
      case 'unit':
        opts.style = 'unit';
        opts.unit = this.getAttribute('unit') || 'kilobyte';
        break;
      case 'scientific':
        opts.notation = 'scientific';
        break;
      case 'compact':
        opts.notation = 'compact';
        opts.compactDisplay = 'short';
        break;
      case 'integer':
        opts.maximumFractionDigits = 0;
        opts.minimumFractionDigits = 0;
        break;
      case 'decimal':
      default:
        opts.style = 'decimal';
        break;
    }
    const min = this.getAttribute('minimum-fraction-digits');
    const max = this.getAttribute('maximum-fraction-digits');
    const minN = min != null && min !== '' ? parseInt(min, 10) : NaN;
    const maxN = max != null && max !== '' ? parseInt(max, 10) : NaN;
    if (Number.isFinite(minN)) opts.minimumFractionDigits = minN;
    if (Number.isFinite(maxN)) opts.maximumFractionDigits = maxN;
    this.#formatWithIntlNumber(n, opts);
  }

  #renderBytes() {
    const raw = this.getAttribute('value');
    if (raw == null || raw === '') {
      this.#el.textContent = '';
      return;
    }
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) {
      this.#el.textContent = '';
      return;
    }
    this.#el.textContent = formatBytes(toBytes(n, this.getAttribute('unit') || 'byte'), {
      locale: this.locale,
      display: this.getAttribute('display') === 'long' ? 'long' : 'short',
      autofit: this.hasAttribute('autofit'),
    });
  }

  #renderRelative() {
    const d = parseLooseDate(this.date || this.value);
    if (!d) {
      this.#el.textContent = '';
      this.#el.removeAttribute('datetime');
      return;
    }
    const style = RELATIVE_VALID_STYLE.includes(this.getAttribute('style') ?? '')
      ? this.getAttribute('style')
      : 'long';
    const numeric = RELATIVE_VALID_NUMERIC.includes(this.getAttribute('numeric') ?? '')
      ? this.getAttribute('numeric')
      : 'auto';
    const now = Date.now();
    const diffSec = Math.round((d.getTime() - now) / 1000);
    const abs = Math.abs(diffSec);
    try {
      const rtf = new Intl.RelativeTimeFormat(this.locale, { numeric, style });
      for (const [unit, secs] of RELATIVE_UNITS) {
        if (abs >= secs || unit === 'second') {
          this.#el.textContent = rtf.format(Math.round(diffSec / secs), unit);
          break;
        }
      }
    } catch {
      this.#el.textContent = d.toLocaleString(this.locale);
    }
    this.#el.dateTime = d.toISOString();
  }

  #renderText(override: string) {
    let s = override != null ? String(override) : (this.getAttribute('value') ?? '');
    const c = this.getAttribute('case');
    if (TEXT_CASES.includes(c)) {
      if (c === 'upper') s = s.toUpperCase();
      else if (c === 'lower') s = s.toLowerCase();
      else if (c === 'title') s = titleCase(s);
      else if (c === 'capitalize') s = s.charAt(0).toUpperCase() + s.slice(1);
    }
    const trunc = this.getAttribute('truncate');
    const truncN = trunc != null && trunc !== '' ? parseInt(trunc, 10) : NaN;
    if (Number.isFinite(truncN) && truncN >= 0 && s.length > truncN) {
      s = truncN <= 1 ? '…' : `${s.slice(0, truncN - 1)}…`;
    }
    const padLen = this.getAttribute('pad-length');
    const padN = padLen != null && padLen !== '' ? parseInt(padLen, 10) : NaN;
    if (Number.isFinite(padN) && padN > 0) {
      if (this.hasAttribute('pad-start')) {
        const fill = this.getAttribute('pad-start') || ' ';
        s = s.padStart(padN, fill);
      }
      if (this.hasAttribute('pad-end')) {
        const fill = this.getAttribute('pad-end') || ' ';
        s = s.padEnd(padN, fill);
      }
    }
    this.#el.textContent = s;
    this.#el.removeAttribute('datetime');
  }

  #render() {
    const preset = this.#resolvePattern();
    // pattern puede forzar rama (p.ej. type=number + pattern fecha).
    if (preset && (preset.kind === 'date' || preset.kind === 'text' || preset.kind === 'fraction'
      || preset.kind === 'currency' || preset.kind === 'accounting' || preset.kind === 'number')) {
      if (this.type === 'text' && preset.kind === 'text') {
        this.#renderText();
        return;
      }
      if (this.type === 'date' && preset.kind === 'date') {
        this.#applyExcelPattern(preset);
        return;
      }
      if (this.type === 'number' || this.type === 'date' || this.type === 'text') {
        // number+pattern Excel, o pattern que redefine el tipo efectivo
        if (this.#applyExcelPattern(preset)) return;
      }
    }

    switch (this.type) {
      case 'number': this.#renderNumber(); break;
      case 'bytes': this.#renderBytes(); break;
      case 'relative': this.#renderRelative(); break;
      case 'text': this.#renderText(); break;
      case 'date':
      default: this.#renderDate();
    }
  }

  #clearSync() {
    if (this.#timer != null) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
  }

  #setupSync() {
    this.#clearSync();
    if (this.type === 'relative' && this.hasAttribute('sync')) {
      this.#timer = setInterval(() => this.#render(), 30000);
    }
  }
}

defineElement('is-format', FormatElement, 'IsFormat');

/**
 * @param {'date'|'number'|'bytes'|'relative'|'text'} defaultType
 */
export function createFormatElement(defaultType: 'date'|'number'|'bytes'|'relative'|'text') {
  class PrefixedFormat extends FormatElement {
    constructor() {
      super();
      this.setAttribute('type', defaultType);
    }
  }
  return PrefixedFormat;
}

export { EXCEL_PATTERNS, normalizePattern };
