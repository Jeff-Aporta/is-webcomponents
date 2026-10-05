import { adoptCss, defineElement } from '../../core/element.js';
import { withStyleAttrs } from '../../core/attrs.js';


/**
 * <iswc-spinner> — Web Component (vanilla).
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

  class IswcSpinner extends withStyleAttrs(HTMLElement) {

    static get observedAttributes(): string[] { return []; }

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
    }

    connectedCallback(): void {
      super.connectedCallback();
      this.setAttribute('role', 'status');
      this.setAttribute('aria-live', 'polite');
      if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', 'Cargando');
    }
  }

  defineElement('iswc-spinner', IswcSpinner, 'IswcSpinner');
})();
