import { adoptCss, defineElement } from '@jeff-aporta/iswc-base/core/element.js';
import { withStyleAttrs } from '@jeff-aporta/iswc-base/core/attrs.js';


/**
 * <iswc-spinner> — Web Component (vanilla).
 *
 * Indicador de carga animado (anillo via border).
 * role=status en el host; respeta prefers-reduced-motion.
 *
 * CSS Parts: ::part(spinner)
 * CSS vars: --iswc-spinner-track-width, --iswc-spinner-track-color, --iswc-spinner-color, --iswc-spinner-speed
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
      if (!this.hasAttribute('role')) this.setAttribute('role', 'status');
      if (!this.hasAttribute('aria-live')) this.setAttribute('aria-live', 'polite');
      if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', 'Cargando');
    }
  }

  defineElement('iswc-spinner', IswcSpinner, 'IswcSpinner');
})();
