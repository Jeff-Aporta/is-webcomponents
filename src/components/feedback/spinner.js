import { adoptCss } from '../_shared/adopt-css.js';
import { withStyleAttrs } from '../_shared/style-attrs.js';
import { defineElement } from '../_shared/define.js';

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

  class IsSpinner extends withStyleAttrs(HTMLElement) {
    /** Personalización por atributo (ver `_shared/style-attrs.js`). */
    static styleAttrs = {
      'track-width': '--is-spinner-track-width',
      'track-color': { prop: '--is-spinner-track-color', onlyColorValues: true },
      color: { prop: '--is-spinner-color', onlyColorValues: true },
      speed: '--is-spinner-speed',
    };

    static get observedAttributes() { return IsSpinner.styleAttrNames; }

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
    }

    connectedCallback() {
      super.connectedCallback();
      this.setAttribute('role', 'status');
      this.setAttribute('aria-live', 'polite');
      if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', 'Cargando');
    }
  }

  defineElement('is-spinner', IsSpinner, 'IsSpinner');
})();
