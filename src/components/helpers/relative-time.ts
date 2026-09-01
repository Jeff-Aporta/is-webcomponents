import { adoptCss, defineElement } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setStringAttr } from '../_shared/reflect.js';
import { resolveLocale } from '../_shared/resolve-locale.js';
import { parseLooseDate } from './format-date.js';

/**
 * <is-relative-time> — Web Component (vanilla).
 *
 * Formatea fechas relativas con Intl.RelativeTimeFormat (nativo, multi-locale).
 *
 * Atributos
 *   date      string | number — ISO o timestamp
 *   format    long | short | narrow (default long)
 *   numeric   always | auto (default auto)
 *   locale    BCP 47 — default: lang del documento → sistema → es
 *   sync      boolean — actualiza periódicamente (~30s)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `<time part="time" class="time"></time>`;

  const OBSERVED = ['date', 'format', 'numeric', 'locale', 'sync'];
  const VALID_FORMAT = ['long', 'short', 'narrow'];
  const VALID_NUMERIC = ['always', 'auto'];
  const UNITS = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ];

  class IsRelativeTime extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }

    #el!: HTMLElement;
    #timer = null;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#el = shadow.querySelector<HTMLElement>('.time')!;
    }

    onConnected() {
      this.#render();
      this.#setupSync();
    }

    onDisconnected() {
      this.#clearSync();
    }

    onAttributeChanged(name) {
      this.#render();
      if (name === 'sync') this.#setupSync();
    }

    get date() { return this.getAttribute('date') ?? ''; }
    set date(v) { setStringAttr(this, 'date', v); }

    get format() {
      const v = this.getAttribute('format');
      return VALID_FORMAT.includes(v) ? v : 'long';
    }
    set format(v) { setStringAttr(this, 'format', v); }

    get numeric() {
      const v = this.getAttribute('numeric');
      return VALID_NUMERIC.includes(v) ? v : 'auto';
    }
    set numeric(v) { setStringAttr(this, 'numeric', v); }

    get locale() {
      return resolveLocale(this.getAttribute('locale'));
    }
    set locale(v) { setStringAttr(this, 'locale', v); }

    get sync() { return this.hasAttribute('sync'); }
    set sync(v) { this.toggleAttribute('sync', !!v); }

    #formatRelative(d) {
      const now = Date.now();
      const diffSec = Math.round((d.getTime() - now) / 1000);
      const abs = Math.abs(diffSec);
      const locale = this.locale;
      try {
        const rtf = new Intl.RelativeTimeFormat(locale, {
          numeric: this.numeric,
          style: this.format,
        });
        for (const [unit, secs] of UNITS) {
          if (abs >= secs || unit === 'second') {
            return rtf.format(Math.round(diffSec / secs), unit);
          }
        }
      } catch {
        // Locale raro o motor sin RelativeTimeFormat completo → reintento es/en.
        try {
          const fallback = locale.toLowerCase().startsWith('en') ? 'en' : 'es';
          const rtf = new Intl.RelativeTimeFormat(fallback, {
            numeric: this.numeric,
            style: this.format,
          });
          for (const [unit, secs] of UNITS) {
            if (abs >= secs || unit === 'second') {
              return rtf.format(Math.round(diffSec / secs), unit);
            }
          }
        } catch {
          return d.toLocaleString(locale);
        }
      }
      return '';
    }

    #render() {
      const d = parseLooseDate(this.date);
      this.#el.textContent = d ? this.#formatRelative(d) : '';
      if (d) this.#el.dateTime = d.toISOString();
      else this.#el.removeAttribute('datetime');
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

  defineElement('is-relative-time', IsRelativeTime, 'IsRelativeTime');
})();
