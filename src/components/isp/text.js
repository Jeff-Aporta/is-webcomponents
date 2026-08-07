import { ElementBase } from '../_shared/element-base.js';
import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';

/**
 * <is-text> — port de ISP `typography/Text.svelte`.
 *
 * Dos responsabilidades, ambas heredadas del original:
 *   1. `color` semántico. ISP lo resolvía con `colorVar()` a `var(--is-<color>)`;
 *      aquí se mapea a los tokens del kit desde el CSS (`:host([color=…])`).
 *   2. Line-clamp. ISP usaba `--mx-lns: attr(data-clamp-lines type(<integer>))`,
 *      que hoy solo soporta Chrome. Aquí el JS escribe `--mx-lns` directamente,
 *      así funciona en todos los navegadores.
 *
 * Atributos
 *   color   brand | neutral | info | success | warning | danger  (sin default:
 *           si no se pasa, hereda el color del contexto)
 *   lines   number >= 1 → recorta a N líneas con ellipsis. 0 / ausente = sin clamp.
 *
 * No hay atributo `size`: la escala sale del `font-size` heredado.
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `<slot part="content"></slot>`;

  class IsText extends ElementBase {
    static TEMPLATE = TEMPLATE;
    static get observedAttributes() { return ['color', 'lines']; }
    // El attributeChangedCallback lo aporta ElementBase; aquí va el hook.

    constructor() {
      super();
      this.initShadow();
      adoptCss(this.shadowRoot, import.meta.url);
    }

    onConnected() { this.#syncLines(); }

    onAttributeChanged(name) { if (name === 'lines') this.#syncLines(); }

    #syncLines() {
      // ISP: fit = max(0, floor(Number(lines))) y el clamp solo si lines >= 1.
      const raw = this.getAttribute('lines');
      const n = raw == null || raw === '' ? 0 : Math.max(0, Math.floor(Number(raw)));
      if (Number.isFinite(n) && n >= 1) this.style.setProperty('--mx-lns', String(n));
      else this.style.removeProperty('--mx-lns');
    }

    get color() { return this.getAttribute('color'); }
    set color(v) { v ? this.setAttribute('color', v) : this.removeAttribute('color'); }

    get lines() { return Number(this.getAttribute('lines') ?? 0) || 0; }
    set lines(v) {
      const n = Math.max(0, Math.floor(Number(v) || 0));
      if (n >= 1) this.setAttribute('lines', String(n));
      else this.removeAttribute('lines');
    }
  }

  defineElement('is-text', IsText, 'IsText');
})();
