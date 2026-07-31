import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-spinner> — Web Component (vanilla).
 *
 * Indicador de carga animado (anillo via border).
 * role=status en el host; respeta prefers-reduced-motion.
 *
 * CSS Parts: ::part(spinner)
 * CSS vars: --track-width, --track-color, --indicator-color, --speed
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <span part="spinner" class="spinner" aria-hidden="true"></span>
  `;

  class IsSpinner extends HTMLElement {
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
    }

    connectedCallback() {
      this.setAttribute('role', 'status');
      this.setAttribute('aria-live', 'polite');
      if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', 'Cargando');
    }
  }

  if (!customElements.get('is-spinner')) {
    customElements.define('is-spinner', IsSpinner);
  }
  if (typeof window !== 'undefined') {
    window.IsSpinner = IsSpinner;
  }
})();
