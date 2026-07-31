import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-skeleton> — Web Component (vanilla).
 *
 * Placeholder de carga.
 *
 * Atributos
 *   effect  none | sheen | pulse (default sheen)
 *
 * CSS Parts: ::part(indicator)
 * CSS vars: --color, --sheen-color
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <span part="indicator" class="indicator" aria-hidden="true"></span>
  `;

  const OBSERVED = ['effect'];
  const VALID_EFFECT = ['none', 'sheen', 'pulse'];

  class IsSkeleton extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
    }

    connectedCallback() {
      if (!this.hasAttribute('effect')) this.setAttribute('effect', 'sheen');
      this.setAttribute('aria-hidden', 'true');
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (oldVal === newVal) return;
      if (name === 'effect' && newVal && !VALID_EFFECT.includes(newVal)) {
        this.setAttribute('effect', 'sheen');
      }
    }
  }

  if (!customElements.get('is-skeleton')) {
    customElements.define('is-skeleton', IsSkeleton);
  }
  if (typeof window !== 'undefined') {
    window.IsSkeleton = IsSkeleton;
  }
})();
