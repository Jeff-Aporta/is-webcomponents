import { withStyleAttrs } from '@jeff-aporta/iswc-base/core/attrs.js';
import { IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import css from 'iswc:css';


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

  class IswcSpinner extends withStyleAttrs(IswcElement) {
    static tag = 'iswc-spinner';
    static css = css;

    static observed = [];

    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
    }

    connectedCallback(): void {
      super.connectedCallback();
      if (!this.hasAttribute('role')) this.setAttribute('role', 'status');
      if (!this.hasAttribute('aria-live')) this.setAttribute('aria-live', 'polite');
      if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', 'Cargando');
    }
  }

  define(IswcSpinner, 'IswcSpinner');
})();
