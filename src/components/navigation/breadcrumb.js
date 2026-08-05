import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-breadcrumb> — contenedor de una ruta de migas de pan.
 *
 * Recibe N `<is-breadcrumb-item>` en el slot default y los muestra
 * separados por el slot `separator`.
 *
 * Atributos
 *   label    string  — aria-label del nav (anunciado por screen readers).
 *
 * Slots
 *   (default)  breadcrumb-items.
 *   separator  icono o texto entre items (default: chevron-right).
 *
 * CSS Parts: ::part(breadcrumb)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <nav class="bc" part="breadcrumb" aria-label="Ruta">
      <slot></slot>
    </nav>
  `;

  class IsBreadcrumb extends HTMLElement {
    static get observedAttributes() { return ['label']; }

    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
    }

    connectedCallback() {
      this.#mounted = true;
      this.#syncLabel();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'label') this.#syncLabel();
    }

    get label() { return this.getAttribute('label') || 'Ruta'; }
    set label(v) {
      if (v == null || v === '') this.removeAttribute('label');
      else this.setAttribute('label', v);
    }

    #syncLabel() {
      const nav = this.shadowRoot.querySelector('nav');
      nav.setAttribute('aria-label', this.label);
    }
  }

  if (!customElements.get('is-breadcrumb')) customElements.define('is-breadcrumb', IsBreadcrumb);
  if (typeof window !== 'undefined') window.IsBreadcrumb = IsBreadcrumb;
})();
