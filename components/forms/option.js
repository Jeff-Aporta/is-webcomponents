import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-option> — Opción para is-combobox (y listboxes similares).
 *
 * Atributos: value, disabled, selected
 * Slot: default (etiqueta)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="base" class="option" role="option">
      <slot></slot>
    </div>
  `;

  const OBSERVED = ['value', 'disabled', 'selected'];

  class IsOption extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #root;
    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#root = shadow.querySelector('.option');
    }

    connectedCallback() {
      this.#mounted = true;
      this.#sync();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      this.#sync();
    }

    get value() {
      return this.hasAttribute('value') ? this.getAttribute('value') : (this.textContent || '').trim();
    }
    set value(v) {
      if (v == null) this.removeAttribute('value');
      else this.setAttribute('value', String(v));
    }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get selected() { return this.hasAttribute('selected'); }
    set selected(v) { this.toggleAttribute('selected', !!v); }

    get label() { return (this.textContent || '').trim(); }

    #sync() {
      this.#root.setAttribute('aria-selected', String(this.selected));
      this.#root.setAttribute('aria-disabled', String(this.disabled));
      this.#root.toggleAttribute('data-disabled', this.disabled);
      this.#root.toggleAttribute('data-selected', this.selected);
    }
  }

  if (!customElements.get('is-option')) {
    customElements.define('is-option', IsOption);
  }
  if (typeof window !== 'undefined') window.IsOption = IsOption;
})();
