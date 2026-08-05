import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-format-number> — Web Component (vanilla).
 *
 * Formatea números con Intl.NumberFormat.
 *
 * Atributos
 *   value                    number
 *   type                     decimal | currency | percent | unit (default decimal)
 *   currency                 ISO 4217 (p.ej. USD, COP)
 *   minimum-fraction-digits  number
 *   maximum-fraction-digits  number
 *
 * Locale vía lang del documento.
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `<span part="number" class="number"></span>`;

  const OBSERVED = ['value', 'type', 'currency', 'minimum-fraction-digits', 'maximum-fraction-digits'];
  const VALID_TYPE = ['decimal', 'currency', 'percent', 'unit'];

  class IsFormatNumber extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #el;
    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#el = shadow.querySelector('.number');
    }

    connectedCallback() {
      this.#mounted = true;
      this.#render();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      this.#render();
    }

    get value() {
      if (!this.hasAttribute('value') || this.getAttribute('value') === '') return null;
      const n = parseFloat(this.getAttribute('value'));
      return Number.isFinite(n) ? n : null;
    }
    set value(v) {
      if (v == null || v === '') this.removeAttribute('value');
      else this.setAttribute('value', String(v));
    }

    #buildOptions() {
      const type = this.getAttribute('type');
      const style = VALID_TYPE.includes(type) ? type : 'decimal';
      const opts = { style };
      const cur = this.getAttribute('currency');
      if (style === 'currency') opts.currency = cur || 'USD';
      const min = this.getAttribute('minimum-fraction-digits');
      const max = this.getAttribute('maximum-fraction-digits');
      const minN = min != null && min !== '' ? parseInt(min, 10) : NaN;
      const maxN = max != null && max !== '' ? parseInt(max, 10) : NaN;
      if (Number.isFinite(minN)) opts.minimumFractionDigits = minN;
      if (Number.isFinite(maxN)) opts.maximumFractionDigits = maxN;
      return opts;
    }

    #render() {
      const val = this.value;
      if (val == null) {
        this.#el.textContent = '';
        return;
      }
      const locale = document.documentElement.lang || undefined;
      try {
        const fmt = new Intl.NumberFormat(locale, this.#buildOptions());
        this.#el.textContent = fmt.format(val);
      } catch {
        this.#el.textContent = String(val);
      }
    }
  }

  if (!customElements.get('is-format-number')) {
    customElements.define('is-format-number', IsFormatNumber);
  }
  if (typeof window !== 'undefined') {
    window.IsFormatNumber = IsFormatNumber;
  }
})();
