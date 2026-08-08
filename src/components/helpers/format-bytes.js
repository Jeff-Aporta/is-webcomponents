import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { ElementBase } from '../_shared/element-base.js';
import { resolveLocale } from '../_shared/resolve-locale.js';

/**
 * <is-format-bytes> — Web Component (vanilla).
 *
 * Formatea tamaños de archivo legibles.
 *
 * Atributos
 *   value    number — bytes (o según unit de entrada)
 *   unit     byte | kilobyte | megabyte | … (default byte) — unidad del `value` de entrada
 *   display  short | long (default short)
 *   locale   override de locale (default: html lang → sistema → es)
 *   autofit  boolean — elige la unidad más alta cuyo valor sea ≥ 1
 *            (200 KB, no 0.2 MB; desde 1 MB sí MB). Sin autofit conserva el
 *            escalado clásico con más decimales.
 */

/** Unidades y multiplicadores compartidos por is-format-bytes e is-format. */
export const BYTE_UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte', 'petabyte'];
export const BYTE_MULT = {
  byte: 1,
  kilobyte: 1024,
  megabyte: 1048576,
  gigabyte: 1073741824,
  terabyte: 1099511627776,
  petabyte: 1125899906842624,
};

/** Convierte `value` expresado en `unit` a bytes. */
export function toBytes(value, unit) {
  return value * BYTE_MULT[BYTE_UNITS.includes(unit) ? unit : 'byte'];
}

/**
 * Escala bytes a unidad legible y la formatea con Intl.
 * @param {number} bytes
 * @param {{ locale?: string, display?: 'short'|'long', autofit?: boolean }} [opts]
 * @returns {string}
 */
export function formatBytes(bytes, { locale, display = 'short', autofit = false } = {}) {
  let i = 0;
  let n = Math.abs(bytes);
  while (i < BYTE_UNITS.length - 1 && n / 1024 >= 1) {
    n /= 1024;
    i += 1;
  }
  const scaled = (bytes < 0 ? -1 : 1) * n;
  // Autofit: evita 0.2 MB; prioriza enteros cuando n ≥ 10 o es entero.
  const maxFrac = autofit
    ? ((i === 0 || Number.isInteger(n) || n >= 10) ? 0 : 1)
    : (n < 10 && i > 0 ? 1 : 2);

  try {
    return new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: BYTE_UNITS[i],
      unitDisplay: display,
      maximumFractionDigits: maxFrac,
    }).format(scaled);
  } catch {
    const sizes = display === 'long'
      ? ['bytes', 'kilobytes', 'megabytes', 'gigabytes', 'terabytes', 'petabytes']
      : ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    return `${bytes < 0 ? '-' : ''}${n.toFixed(maxFrac)} ${sizes[i]}`;
  }
}

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `<span part="bytes" class="bytes"></span>`;

  const OBSERVED = ['value', 'unit', 'display', 'locale', 'autofit'];

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

    #render() {
      if (this.value == null) {
        this.#el.textContent = '';
        return;
      }
      const bytes = toBytes(this.value, this.getAttribute('unit') || 'byte');
      this.#el.textContent = formatBytes(bytes, {
        locale: resolveLocale(this.getAttribute('locale')),
        display: this.getAttribute('display') === 'long' ? 'long' : 'short',
        autofit: this.autofit,
      });
    }
  }

  defineElement('is-format-bytes', IsFormatBytes, 'IsFormatBytes');
})();
