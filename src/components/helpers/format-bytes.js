import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { ElementBase } from '../_shared/element-base.js';

/**
 * <is-format-bytes> — Web Component (vanilla).
 *
 * Formatea tamaños de archivo legibles.
 *
 * Atributos
 *   value    number — bytes (o según unit de entrada)
 *   unit     byte | kilobyte | megabyte | … (default byte) — unidad del `value` de entrada
 *   display  short | long (default short)
 *   locale   override de locale (default document lang)
 *   autofit  boolean — elige la unidad más alta cuyo valor sea ≥ 1
 *            (200 KB, no 0.2 MB; desde 1 MB sí MB). Sin autofit conserva el
 *            escalado clásico con más decimales.
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `<span part="bytes" class="bytes"></span>`;

  const OBSERVED = ['value', 'unit', 'display', 'locale', 'autofit'];
  const UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte', 'petabyte'];
  const MULT = {
    byte: 1,
    kilobyte: 1024,
    megabyte: 1048576,
    gigabyte: 1073741824,
    terabyte: 1099511627776,
    petabyte: 1125899906842624,
  };

  /**
   * Escala bytes a la unidad más alta con magnitud ≥ 1 (salvo fracciones de byte).
   * @param {number} bytes
   * @returns {{ n: number, i: number }}
   */
  function scaleAutofit(bytes) {
    let i = 0;
    let n = Math.abs(bytes);
    // Solo subir de unidad si el cociente sigue siendo ≥ 1.
    while (i < UNITS.length - 1 && n / 1024 >= 1) {
      n /= 1024;
      i += 1;
    }
    return { n, i };
  }

  class IsFormatBytes extends ElementBase {
    static get observedAttributes() { return OBSERVED; }

    #el;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#el = shadow.querySelector('.bytes');
    }

    onConnected() {
      if (!this.hasAttribute('unit')) this.setAttribute('unit', 'byte');
      this.#render();
    }

    onAttributeChanged() {
      this.#render();
    }

    get value() {
      if (!this.hasAttribute('value') || this.getAttribute('value') === '') return null;
      const n = parseFloat(this.getAttribute('value'));
      return Number.isFinite(n) ? n : null;
    }

    get autofit() { return this.hasAttribute('autofit'); }
    set autofit(v) { this.toggleAttribute('autofit', !!v); }

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
      const autofit = this.autofit;

      let i = 0;
      let n = Math.abs(bytes);
      if (autofit) {
        ({ n, i } = scaleAutofit(bytes));
      } else {
        while (n >= 1024 && i < UNITS.length - 1) { n /= 1024; i += 1; }
      }
      const sign = bytes < 0 ? -1 : 1;
      const scaled = sign * n;
      const unit = UNITS[i];

      // Autofit: evita 0.2 MB; prioriza enteros cuando n ≥ 10 o es entero.
      let maxFrac;
      if (autofit) {
        maxFrac = (i === 0 || Number.isInteger(n) || n >= 10) ? 0 : 1;
      } else {
        maxFrac = n < 10 && i > 0 ? 1 : 2;
      }

      try {
        const fmt = new Intl.NumberFormat(locale, {
          style: 'unit',
          unit,
          unitDisplay: display,
          maximumFractionDigits: maxFrac,
        });
        this.#el.textContent = fmt.format(scaled);
      } catch {
        const sizes = display === 'long'
          ? ['bytes', 'kilobytes', 'megabytes', 'gigabytes', 'terabytes', 'petabytes']
          : ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        this.#el.textContent = `${bytes < 0 ? '-' : ''}${n.toFixed(maxFrac)} ${sizes[i]}`;
      }
    }
  }

  defineElement('is-format-bytes', IsFormatBytes, 'IsFormatBytes');
})();
