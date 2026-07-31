import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-format-date> — Web Component (vanilla).
 *
 * Formatea fechas con Intl.DateTimeFormat.
 *
 * Atributos: date, weekday, era, year, month, day, hour, minute, second,
 *            time-zone, time-zone-name, hour-format (auto|12|24),
 *            locale (BCP 47; default = lang del documento)
 */

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

  class IsFormatDate extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #el;
    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#el = shadow.querySelector('.date');
    }

    connectedCallback() {
      this.#mounted = true;
      this.#render();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      this.#render();
    }

    get date() { return this.getAttribute('date') ?? ''; }
    set date(v) { v == null || v === '' ? this.removeAttribute('date') : this.setAttribute('date', v); }

    get locale() {
      return this.getAttribute('locale') || document.documentElement.lang || undefined;
    }
    set locale(v) {
      if (v == null || v === '') this.removeAttribute('locale');
      else this.setAttribute('locale', String(v));
    }

    #parseDate() {
      const raw = this.date.trim();
      if (!raw) return null;
      if (/^-?\d+(\.\d+)?$/.test(raw)) {
        const d = new Date(Number(raw));
        return Number.isNaN(d.getTime()) ? null : d;
      }
      const only = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
      if (only) {
        const d = new Date(+only[1], +only[2] - 1, +only[3]);
        return Number.isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(raw);
      return Number.isNaN(d.getTime()) ? null : d;
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
      const d = this.#parseDate();
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

  if (!customElements.get('is-format-date')) {
    customElements.define('is-format-date', IsFormatDate);
  }
  if (typeof window !== 'undefined') {
    window.IsFormatDate = IsFormatDate;
  }
})();
