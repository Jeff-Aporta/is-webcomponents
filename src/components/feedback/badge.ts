import { adoptCss, defineElement } from '@jeff-aporta/iswc-base/core/element.js';
import { withStyleAttrs } from '@jeff-aporta/iswc-base/core/attrs.js';
import { ocultarSlotsVacios } from '@jeff-aporta/iswc-base/core/dom-utils.js';

import { INTENT } from '@jeff-aporta/iswc-base/core/intent.js';
import { TONE } from '@jeff-aporta/iswc-base/core/tone.js';

/**
 * <iswc-badge> — Web Component (vanilla).
 *
 * Etiqueta compacta con colores semánticas.
 *
 * Atributos
 *   color      brand | neutral | text | info | success | warning | danger | error (default brand)
 *   variant   accent | filled | outlined | filled-outlined (default accent)
 *   pill         boolean
 *   attention    none | pulse | bounce (default none)
 *
 * Slots: default, start, end
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <span part="badge" class="badge">
      <span part="start" class="prefix" hidden><slot name="start"></slot></span>
      <span part="label" class="label"><slot></slot></span>
      <span part="end" class="suffix" hidden><slot name="end"></slot></span>
    </span>
  `;

  const OBSERVED = ['color', 'variant', 'pill', 'attention'];
  const VALID_COLOR = INTENT;
  const VALID_VARIANT = TONE.filter((t) => t !== 'plain');
  const VALID_ATTENTION = ['none', 'pulse', 'bounce'];

  class IswcBadge extends withStyleAttrs(HTMLElement) {

    static get observedAttributes(): string[] { return [...OBSERVED, 'pulse-color']; }

    #mo: MutationObserver | null = null;
    /** Etiqueta que puso #syncAria: se retira en cuanto llega texto, sin tocar la del consumidor. */
    #labelAuto = '';

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      ocultarSlotsVacios(shadow, '.prefix slot, .suffix slot');
    }

    connectedCallback(): void {
      super.connectedCallback();
      if (!this.hasAttribute('color')) this.setAttribute('color', 'brand');
      if (!this.hasAttribute('variant')) this.setAttribute('variant', 'accent');
      if (!this.hasAttribute('attention')) this.setAttribute('attention', 'none');
      // g07 (Cat 29): observar el slot por si la app lo rellena tras mount.
      this.#watchA11y();
      // Una primera pasada sincronizada.
      this.#syncAria();
    }

    disconnectedCallback(): void {
      this.#mo?.disconnect();
      this.#mo = null;
    }

    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
      super.attributeChangedCallback(name, oldVal, newVal);
      if (oldVal === newVal) return;
      if (name === 'color' && newVal && !VALID_COLOR.includes(newVal)) {
        this.setAttribute('color', 'brand');
      }
      if (name === 'variant' && newVal && !VALID_VARIANT.includes(newVal)) {
        this.setAttribute('variant', 'accent');
      }
      if (name === 'attention' && newVal && !VALID_ATTENTION.includes(newVal)) {
        this.setAttribute('attention', 'none');
      }
      if (name === 'color') this.#syncAria();
    }

    /** g07 (Cat 29): etiqueta accesible automática cuando el slot principal
     *  está vacío (ej: badge con sólo icono). Solo se aplica si el consumer
     *  no fijó su propio aria-label. */
    #syncAria() {
      const actual = this.getAttribute('aria-label');
      if (actual !== null && actual !== this.#labelAuto) return; // la puso el consumidor
      const vacio = !this.textContent?.trim() && !this.querySelector('[slot]:not([slot="start"]):not([slot="end"])');
      this.#labelAuto = vacio ? `Insignia ${this.getAttribute('color') || 'brand'}` : '';
      if (vacio) this.setAttribute('aria-label', this.#labelAuto);
      else this.removeAttribute('aria-label');
    }

    #watchA11y() {
      this.#mo?.disconnect();
      this.#mo = new MutationObserver(() => this.#syncAria());
      this.#mo.observe(this, { childList: true, subtree: true, characterData: true });
    }
  }

  defineElement('iswc-badge', IswcBadge, 'IswcBadge');
})();
