import { adoptCss, defineElement } from '../../core/element.js';
import { withStyleAttrs } from '../../core/attrs.js';

import { INTENT } from '../_shared/intent.js';
import { TONE } from '../_shared/tone.js';

/**
 * <is-badge> — Web Component (vanilla).
 *
 * Etiqueta compacta con colores semánticas.
 *
 * Atributos
 *   color      brand | neutral | success | warning | danger (default brand)
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
      <span part="start" class="prefix"><slot name="start"></slot></span>
      <span part="label" class="label"><slot></slot></span>
      <span part="end" class="suffix"><slot name="end"></slot></span>
    </span>
  `;

  const OBSERVED = ['color', 'variant', 'pill', 'attention'];
  const VALID_COLOR = INTENT;
  const VALID_VARIANT = TONE.filter((t) => t !== 'plain');
  const VALID_ATTENTION = ['none', 'pulse', 'bounce'];

  class IsBadge extends withStyleAttrs(HTMLElement) {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    'pulse-color': { prop: '--is-badge-pulse-color', onlyColorValues: true },
    };

    static get observedAttributes(): string[] { return [...OBSERVED, 'pulse-color']; }

    #mo: MutationObserver | null = null;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
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
      if (this.hasAttribute('aria-label')) return;
      const slotDefault = this.querySelector('[slot]:not([slot="start"]):not([slot="end"])');
      const text = this.textContent?.trim() ?? '';
      if (text) return; // hay texto visible, no necesita label
      if (!slotDefault) {
        const color = this.getAttribute('color') || 'brand';
        this.setAttribute('aria-label', `Insignia ${color}`);
      }
    }

    #watchA11y() {
      this.#mo?.disconnect();
      this.#mo = new MutationObserver(() => this.#syncAria());
      this.#mo.observe(this, { childList: true, subtree: true, characterData: true });
    }
  }

  defineElement('is-badge', IsBadge, 'IsBadge');
})();
