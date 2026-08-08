import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { ElementBase } from '../_shared/element-base.js';
import { resolveLocale } from '../_shared/resolve-locale.js';

/**
 * <is-format-number> — Web Component (vanilla).
 *
 * Formatea números con Intl.NumberFormat.
 *
 * Atributos
 *   value                    number
 *   type                     decimal | currency | percent | unit (default decimal)
 *   currency                 ISO 4217 (p.ej. USD, COP)
 *   locale                   BCP 47 (default: html lang → sistema → es)
 *   minimum-fraction-digits  number
 *   maximum-fraction-digits  number
 *   minimum-integer-digits   number — ceros a la izquierda vía Intl (1–21)
 *   pad-start                carácter de relleno (default "0" si hay pad-length)
 *   pad-length               longitud mínima del texto ya formateado (padStart)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `<span part="number" class="number"></span>`;

  const OBSERVED = [
    'value', 'type', 'currency', 'locale',
    'minimum-fraction-digits', 'maximum-fraction-digits', 'minimum-integer-digits',
    'pad-start', 'pad-length',
  ];
  const VALID_TYPE = ['decimal', 'currency', 'percent', 'unit'];

  class IsFormatNumber extends ElementBase {
    static get observedAttributes() { return OBSERVED; }

    #el;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#el = shadow.querySelector('.number');
    }

    onConnected() {
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
      const minInt = this.getAttribute('minimum-integer-digits');
      const minN = min != null && min !== '' ? parseInt(min, 10) : NaN;
      const maxN = max != null && max !== '' ? parseInt(max, 10) : NaN;
      const minIntN = minInt != null && minInt !== '' ? parseInt(minInt, 10) : NaN;
      if (Number.isFinite(minN)) opts.minimumFractionDigits = minN;
      if (Number.isFinite(maxN)) opts.maximumFractionDigits = maxN;
      if (Number.isFinite(minIntN) && minIntN >= 1) {
        opts.minimumIntegerDigits = Math.min(21, minIntN);
      }
      return opts;
    }

    #applyPad(text) {
      const padLen = this.getAttribute('pad-length');
      const padN = padLen != null && padLen !== '' ? parseInt(padLen, 10) : NaN;
      if (!Number.isFinite(padN) || padN <= 0) return text;
      const fill = this.hasAttribute('pad-start')
        ? (this.getAttribute('pad-start') || '0')
        : '0';
      return text.padStart(padN, fill);
    }

    #render() {
      const val = this.value;
      if (val == null) {
        this.#el.textContent = '';
        return;
      }
      const locale = resolveLocale(this.getAttribute('locale'));
      let text;
      try {
        const fmt = new Intl.NumberFormat(locale, this.#buildOptions());
        text = fmt.format(val);
      } catch {
        text = String(val);
      }
      this.#el.textContent = this.#applyPad(text);
    }
  }

  defineElement('is-format-number', IsFormatNumber, 'IsFormatNumber');
})();
