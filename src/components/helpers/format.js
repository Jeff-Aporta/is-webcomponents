import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { ElementBase } from '../_shared/element-base.js';

/**
 * <is-format type="…" value="…"> — Web Component genérico de formateo.
 *
 * Sustituye a los 4 wrappers individuales que existían antes
 * (is-format-date, is-format-number, is-format-bytes, is-relative-time)
 * con un único elemento cuya rama cambia por `type`. Los 4 nombres
 * históricos quedan registrados como alias que resuelven a la misma
 * clase (con `type` prefijado en el constructor) para no romper
 * consumidores existentes.
 *
 *   <is-format type="date"      value="2026-08-01" year="numeric" month="long"></is-format>
 *   <is-format type="number"    value="1234.5"   format="currency" currency="EUR"></is-format>
 *   <is-format type="bytes"     value="2048"     display="long"></is-format>
 *   <is-format type="relative"  date="2026-08-01T00:00:00Z" sync></is-format>
 *
 * Atributos comunes
 *   type     date | number | bytes | relative         (required si usas <is-format>)
 *   value    string | number — el dato a formatear.
 *            En `relative`, también `date` (ISO o timestamp).
 *   locale   BCP 47; si falta, lang del documento.
 *
 * Atributos por tipo
 *   date      weekday era year month day hour minute second time-zone time-zone-name hour-format
 *   number    format decimal|currency|percent|unit  currency  minimum-fraction-digits  maximum-fraction-digits
 *   bytes     unit byte..petabyte  display short|long  autofit
 *   relative  style long|short|narrow  numeric always|auto  sync
 *
 * Slots: ninguno. Es self-contained.
 * Parts: ::part(date) ::part(number) ::part(bytes) ::part(time) según type.
 *
 * Esta clase se reutiliza desde format-date.js, format-number.js,
 * format-bytes.js y relative-time.js vía `createFormatElement(tipo)`.
 * Esos archivos son ahora alias de 5–10 líneas que solo registran el
 * nombre histórico sobre esta misma clase con `type` ya prefijado.
 */

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `<span part="value" class="value"></span>`;

const OBSERVED = [
  'type', 'value', 'date', 'locale', 'format',
  // date
  'weekday', 'era', 'year', 'month', 'day',
  'hour', 'minute', 'second', 'time-zone', 'time-zone-name', 'hour-format',
  // number
  'currency', 'minimum-fraction-digits', 'maximum-fraction-digits',
  // bytes
  'unit', 'display', 'autofit',
  // relative
  'style', 'numeric', 'sync',
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
const BYTE_UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte', 'petabyte'];
const BYTE_MULT = {
  byte: 1,
  kilobyte: 1024,
  megabyte: 1048576,
  gigabyte: 1073741824,
  terabyte: 1099511627776,
  petabyte: 1125899906842624,
};
const NUMBER_VALID_FORMAT = ['decimal', 'currency', 'percent', 'unit'];
const RELATIVE_VALID_STYLE = ['long', 'short', 'narrow'];
const RELATIVE_VALID_NUMERIC = ['always', 'auto'];
const TYPE_PARTS = { date: 'date', number: 'number', bytes: 'bytes', relative: 'time' };

class FormatElement extends ElementBase {
  static get observedAttributes() { return OBSERVED; }

  #el;
  #timer = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    adoptCss(shadow, import.meta.url);
    shadow.appendChild(TEMPLATE.content.cloneNode(true));
    this.#el = shadow.querySelector('.value');
  }

  onConnected() {
    this.#syncPart();
    this.#render();
    this.#setupSync();
  }

  onDisconnected() {
    this.#clearSync();
  }

  onAttributeChanged(name, oldVal, newVal) {
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

  // ---- type / value ----
  get type() {
    const v = this.getAttribute('type');
    return ['date', 'number', 'bytes', 'relative'].includes(v) ? v : 'date';
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
    return this.getAttribute('locale') || document.documentElement.lang || undefined;
  }
  set locale(v) {
    if (v == null || v === '') this.removeAttribute('locale');
    else this.setAttribute('locale', String(v));
  }

  // ---- privados ----
  #syncPart() {
    const part = TYPE_PARTS[this.type] || 'value';
    this.#el.setAttribute('part', part);
    this.dataset.type = this.type;
  }

  #parseDate(raw) {
    const s = String(raw || '').trim();
    if (!s) return null;
    if (/^-?\d+(\.\d+)?$/.test(s)) {
      const d = new Date(Number(s));
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const only = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (only) {
      const d = new Date(+only[1], +only[2] - 1, +only[3]);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  #renderDate() {
    const d = this.#parseDate(this.value);
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
    // El subtipo de NumberFormat se llama `format` para no chocar con el
    // `type` de primer nivel (que ya eligió "number").
    const fmtAttr = this.getAttribute('format');
    const style = NUMBER_VALID_FORMAT.includes(fmtAttr) ? fmtAttr : 'decimal';
    const opts = { style };
    if (style === 'currency') opts.currency = this.getAttribute('currency') || 'USD';
    const min = this.getAttribute('minimum-fraction-digits');
    const max = this.getAttribute('maximum-fraction-digits');
    const minN = min != null && min !== '' ? parseInt(min, 10) : NaN;
    const maxN = max != null && max !== '' ? parseInt(max, 10) : NaN;
    if (Number.isFinite(minN)) opts.minimumFractionDigits = minN;
    if (Number.isFinite(maxN)) opts.maximumFractionDigits = maxN;
    try {
      this.#el.textContent = new Intl.NumberFormat(this.locale, opts).format(n);
    } catch {
      this.#el.textContent = String(n);
    }
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
    const unit = this.getAttribute('unit') || 'byte';
    const mult = BYTE_MULT[BYTE_UNITS.includes(unit) ? unit : 'byte'];
    const bytes = n * mult;
    const display = this.getAttribute('display') === 'long' ? 'long' : 'short';
    const autofit = this.hasAttribute('autofit');
    let i = 0;
    let abs = Math.abs(bytes);
    // Autofit: unidad más alta con valor ≥ 1 (200 KB, no 0.2 MB).
    while (i < BYTE_UNITS.length - 1 && abs / 1024 >= 1) {
      abs /= 1024;
      i += 1;
    }
    const sign = bytes < 0 ? -1 : 1;
    const scaled = sign * abs;
    const unitShort = BYTE_UNITS[i];
    let maxFrac;
    if (autofit) {
      maxFrac = (i === 0 || Number.isInteger(abs) || abs >= 10) ? 0 : 1;
    } else {
      maxFrac = abs < 10 && i > 0 ? 1 : 2;
    }
    try {
      const fmt = new Intl.NumberFormat(this.locale, {
        style: 'unit',
        unit: unitShort,
        unitDisplay: display,
        maximumFractionDigits: maxFrac,
      });
      this.#el.textContent = fmt.format(scaled);
    } catch {
      const sizes = display === 'long'
        ? ['bytes', 'kilobytes', 'megabytes', 'gigabytes', 'terabytes', 'petabytes']
        : ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
      this.#el.textContent = `${bytes < 0 ? '-' : ''}${abs.toFixed(maxFrac)} ${sizes[i]}`;
    }
  }

  #renderRelative() {
    const d = this.#parseDate(this.date || this.value);
    if (!d) {
      this.#el.textContent = '';
      this.#el.removeAttribute('datetime');
      return;
    }
    const style = RELATIVE_VALID_STYLE.includes(this.getAttribute('style'))
      ? this.getAttribute('style')
      : 'long';
    const numeric = RELATIVE_VALID_NUMERIC.includes(this.getAttribute('numeric'))
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

  #render() {
    switch (this.type) {
      case 'number': this.#renderNumber(); break;
      case 'bytes': this.#renderBytes(); break;
      case 'relative': this.#renderRelative(); break;
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
 * Crea una subclase de FormatElement que prefija el `type` en el
 * constructor. Se usa desde format-date.js / format-number.js /
 * format-bytes.js / relative-time.js para registrar alias históricos
 * con el mínimo código.
 *
 * @param {'date'|'number'|'bytes'|'relative'} defaultType
 */
export function createFormatElement(defaultType) {
  class PrefixedFormat extends FormatElement {
    constructor() {
      super();
      // Forzar el type por defecto. El padre lo observa como atributo,
      // pero al setearlo aquí connectedCallback ya lo lee bien.
      this.setAttribute('type', defaultType);
    }
  }
  return PrefixedFormat;
}
