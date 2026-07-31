import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-relative-time> — Web Component (vanilla).
 *
 * Formatea fechas relativas con Intl.RelativeTimeFormat.
 *
 * Atributos
 *   date      string | number — ISO o timestamp
 *   format    long | short | narrow (default long)
 *   numeric   always | auto (default auto)
 *   sync      boolean — actualiza periódicamente
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `<span part="time" class="time"></span>`;

  const OBSERVED = ['date', 'format', 'numeric', 'sync'];
  const VALID_FORMAT = ['long', 'short', 'narrow'];
  const VALID_NUMERIC = ['always', 'auto'];
  const UNITS = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1]
  ];

  class IsRelativeTime extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #el;
    #timer = null;
    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#el = shadow.querySelector('.time');
    }

    connectedCallback() {
      this.#mounted = true;
      this.#render();
      this.#setupSync();
    }

    disconnectedCallback() {
      this.#clearSync();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      this.#render();
      if (name === 'sync') this.#setupSync();
    }

    get date() { return this.getAttribute('date') ?? ''; }
    set date(v) { v == null || v === '' ? this.removeAttribute('date') : this.setAttribute('date', v); }

    get format() {
      const v = this.getAttribute('format');
      return VALID_FORMAT.includes(v) ? v : 'long';
    }

    get numeric() {
      const v = this.getAttribute('numeric');
      return VALID_NUMERIC.includes(v) ? v : 'auto';
    }

    get sync() { return this.hasAttribute('sync'); }

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

    #formatRelative(d) {
      const now = Date.now();
      const diffSec = Math.round((d.getTime() - now) / 1000);
      const abs = Math.abs(diffSec);
      const locale = document.documentElement.lang || undefined;
      const rtf = new Intl.RelativeTimeFormat(locale, {
        numeric: this.numeric,
        style: this.format
      });

      for (const [unit, secs] of UNITS) {
        if (abs >= secs || unit === 'second') {
          const val = Math.round(diffSec / secs);
          return rtf.format(val, unit);
        }
      }
      return '';
    }

    #render() {
      const d = this.#parseDate();
      this.#el.textContent = d ? this.#formatRelative(d) : '';
      this.#el.dateTime = d ? d.toISOString() : '';
    }

    #clearSync() {
      if (this.#timer != null) {
        clearInterval(this.#timer);
        this.#timer = null;
      }
    }

    #setupSync() {
      this.#clearSync();
      if (this.sync) {
        this.#timer = setInterval(() => this.#render(), 30000);
      }
    }
  }

  if (!customElements.get('is-relative-time')) {
    customElements.define('is-relative-time', IsRelativeTime);
  }
  if (typeof window !== 'undefined') {
    window.IsRelativeTime = IsRelativeTime;
  }
})();
