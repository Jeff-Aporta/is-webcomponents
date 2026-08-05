import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-format-bytes> — Web Component (vanilla).
 *
 * Formatea tamaños de archivo legibles.
 *
 * Atributos
 *   value    number — bytes (o según unit)
 *   unit     byte | kilobyte | megabyte | … (default byte)
 *   display  short | long (default short)
 *   locale   override de locale (default document lang)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `<span part="bytes" class="bytes"></span>`;

  const OBSERVED = ['value', 'unit', 'display', 'locale'];
  const UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte', 'petabyte'];
  const MULT = { byte: 1, kilobyte: 1024, megabyte: 1048576, gigabyte: 1073741824, terabyte: 1099511627776, petabyte: 1125899906842624 };

  class IsFormatBytes extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #el;
    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#el = shadow.querySelector('.bytes');
    }

    connectedCallback() {
      this.#mounted = true;
      if (!this.hasAttribute('unit')) this.setAttribute('unit', 'byte');
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

    #toBytes() {
      const unit = this.getAttribute('unit') || 'byte';
      const mult = MULT[UNITS.includes(unit) ? unit : 'byte'];
      return this.value * mult;
    }

    #render() {
      if (this.value == null) {
        this.#el.textContent = '';
        return;
      }
      const bytes = this.#toBytes();
      const locale = this.getAttribute('locale') || document.documentElement.lang || undefined;
      const display = this.getAttribute('display') === 'long' ? 'long' : 'short';

      // Escala a la unidad legible (B → PB); Intl solo etiqueta la unidad elegida
      const unitsShort = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte', 'petabyte'];
      let i = 0;
      let n = Math.abs(bytes);
      while (n >= 1024 && i < unitsShort.length - 1) { n /= 1024; i++; }
      const sign = bytes < 0 ? -1 : 1;
      const scaled = sign * n;
      const unit = unitsShort[i];

      try {
        const fmt = new Intl.NumberFormat(locale, {
          style: 'unit',
          unit,
          unitDisplay: display,
          maximumFractionDigits: n < 10 && i > 0 ? 1 : 2,
        });
        this.#el.textContent = fmt.format(scaled);
      } catch {
        const sizes = display === 'long'
          ? ['bytes', 'kilobytes', 'megabytes', 'gigabytes', 'terabytes', 'petabytes']
          : ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        const digits = n < 10 && i > 0 ? 1 : 0;
        this.#el.textContent = `${bytes < 0 ? '-' : ''}${n.toFixed(digits)} ${sizes[i]}`;
      }
    }
  }

  if (!customElements.get('is-format-bytes')) {
    customElements.define('is-format-bytes', IsFormatBytes);
  }
  if (typeof window !== 'undefined') {
    window.IsFormatBytes = IsFormatBytes;
  }
})();
