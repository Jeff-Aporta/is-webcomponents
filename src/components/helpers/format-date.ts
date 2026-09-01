import { adoptCss, defineElement } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setStringAttr } from '../_shared/reflect.js';
import { resolveLocale } from '../_shared/resolve-locale.js';

/**
 * <is-format-date> — Web Component (vanilla).
 *
 * Formatea fechas con Intl.DateTimeFormat.
 *
 * Atributos: date, weekday, era, year, month, day, hour, minute, second,
 *            time-zone, time-zone-name, hour-format (auto|12|24),
 *            locale (BCP 47; default = html lang → sistema → es)
 */

/**
 * Parseo laxo de fecha compartido por los helpers de formato
 * (is-format-date, is-relative-time, is-format).
 * Acepta timestamp numérico, `YYYY-MM-DD` (interpretado en hora local) o
 * cualquier cosa que `new Date()` entienda. Devuelve null si no es válida.
 * @param {string|number|null|undefined} raw
 * @returns {Date|null}
 */
export function parseLooseDate(raw: string|number|null|undefined) {
  const s = String(raw ?? '').trim();
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

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `<time part="date" class="date"></time>`;

  const OBSERVED = [
    'date', 'weekday', 'era', 'year', 'month', 'day',
    'hour', 'minute', 'second', 'time-zone', 'time-zone-name',
    'hour-format', 'locale'
  ];

  const OPT_ATTRS = {
    weekday: 'weekday',
    era: 'era',
    year: 'year',
    month: 'month',
    day: 'day',
    hour: 'hour',
    minute: 'minute',
    second: 'second',
    'time-zone': 'timeZone',
    'time-zone-name': 'timeZoneName'
  };

  class IsFormatDate extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }

    #el!: HTMLElement;
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#el = shadow.querySelector<HTMLElement>('.date')!;
    }

    onConnected() {
      this.#render();
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      this.#render();
    }

    get date() { return this.getAttribute('date') ?? ''; }
    set date(v) { setStringAttr(this, 'date', v); }

    get locale() {
      return resolveLocale(this.getAttribute('locale'));
    }
    set locale(v) {
      if (v == null || v === '') this.removeAttribute('locale');
      else this.setAttribute('locale', String(v));
    }

    #buildOptions() {
      const opts = {};
      for (const [attr, key] of Object.entries(OPT_ATTRS)) {
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
      return opts;
    }

    #render() {
      const d = parseLooseDate(this.date);
      if (!d) {
        this.#el.textContent = '';
        this.#el.removeAttribute('datetime');
        return;
      }
      try {
        const fmt = new Intl.DateTimeFormat(this.locale, this.#buildOptions());
        this.#el.textContent = fmt.format(d);
      } catch {
        this.#el.textContent = d.toLocaleString(this.locale);
      }
      this.#el.dateTime = d.toISOString();
    }
  }

  defineElement('is-format-date', IsFormatDate, 'IsFormatDate');
})();
