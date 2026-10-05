import { adoptCss, defineElement } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { resolveLocale } from '../_shared/resolve-locale.js';
import type { ByteUnit, FormatBytesOptions } from "./format-bytes.schemas.js";

/**
 * <iswc-format-bytes> — Web Component (vanilla).
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

/** Unidades y multiplicadores compartidos por iswc-format-bytes e iswc-format. */
export const BYTE_UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte', 'petabyte'] as const;
export const BYTE_MULT: Record<ByteUnit, number> = {
  byte: 1,
  kilobyte: 1024,
  megabyte: 1048576,
  gigabyte: 1073741824,
  terabyte: 1099511627776,
  petabyte: 1125899906842624,
};

/** Convierte `value` expresado en `unit` a bytes. */
export function toBytes(value: number, unit: string): number {
  return value * BYTE_MULT[BYTE_UNITS.includes(unit as ByteUnit) ? (unit as ByteUnit) : 'byte'];
}

/** Opciones de `formatBytes`. */

/**
 * Escala bytes a unidad legible y la formatea con Intl.
 */
export function formatBytes(bytes: number, { locale, display = 'short', autofit = false }: FormatBytesOptions = {}) {
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

  class IswcFormatBytes extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }

    #el!: HTMLElement;
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#el = shadow.querySelector<HTMLElement>('.bytes')!;
    }

    onConnected() {
      if (!this.hasAttribute('unit')) this.setAttribute('unit', 'byte');
      this.#render();
    }

    onAttributeChanged() {
      this.#render();
    }

    get value(): number | null {
      const raw = this.getAttribute('value');
      if (raw == null || raw === '') return null;
      const n = parseFloat(raw);
      return Number.isFinite(n) ? n : null;
    }

    get autofit(): boolean { return this.hasAttribute('autofit'); }
    set autofit(v: boolean) { this.toggleAttribute('autofit', !!v); }

    #render() {
      if (this.value == null) {
        this.#el.textContent = '';
        return;
      }
      const bytes = toBytes(this.value, this.getAttribute('unit') || 'byte');
      const unitDisplay: 'short' | 'long' = this.getAttribute('display') === 'long' ? 'long' : 'short';
      this.#el.textContent = formatBytes(bytes, {
        locale: resolveLocale(this.getAttribute('locale')),
        display: unitDisplay,
        autofit: this.autofit,
      });
    }
  }

  defineElement('iswc-format-bytes', IswcFormatBytes, 'IswcFormatBytes');
})();
