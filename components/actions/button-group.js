import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-button-group> — Web Component (vanilla, zero dependencies).
 *
 * Agrupa botones relacionados en una unidad visual
 * (bordes compartidos, radios en extremos).
 *
 * Atributos
 *   label          string  (a11y, anunciado por AT; no se muestra)
 *   orientation    horizontal | vertical  (default horizontal, reflected)
 *
 * Slots
 *   (default)  uno o más <is-button> (o <button> nativos)
 *
 * CSS Parts:  ::part(base)
 *
 * Las variables --_button-*-radius y --_button-*-indent se inyectan en los
 * hijos slotted; <is-button> las consume para fusionar bordes.
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `

    <slot part="base" class="button-group" role="group"></slot>
  `;

  class IsButtonGroup extends HTMLElement {
    static get observedAttributes() { return ['label', 'orientation']; }

    #slot;
    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#slot = shadow.querySelector('slot');
    }

    connectedCallback() {
      this.#mounted = true;
      if (!this.hasAttribute('orientation')) this.setAttribute('orientation', 'horizontal');
      this.#syncA11y();
    }

    attributeChangedCallback() {
      if (!this.#mounted) return;
      this.#syncA11y();
    }

    get label() { return this.getAttribute('label') ?? ''; }
    set label(v) { v == null || v === '' ? this.removeAttribute('label') : this.setAttribute('label', v); }

    get orientation() {
      const v = this.getAttribute('orientation');
      return v === 'vertical' ? 'vertical' : 'horizontal';
    }
    set orientation(v) {
      this.setAttribute('orientation', v === 'vertical' ? 'vertical' : 'horizontal');
    }

    #syncA11y() {
      const slot = this.#slot;
      const label = this.label;
      if (label) slot.setAttribute('aria-label', label);
      else slot.removeAttribute('aria-label');
      slot.setAttribute('aria-orientation', this.orientation);
      this.setAttribute('aria-orientation', this.orientation);
    }
  }

  if (!customElements.get('is-button-group')) {
    customElements.define('is-button-group', IsButtonGroup);
  }
  if (typeof window !== 'undefined') window.IsButtonGroup = IsButtonGroup;
})();
