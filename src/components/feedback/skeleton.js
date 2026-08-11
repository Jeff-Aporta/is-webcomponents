import { adoptCss } from '../_shared/adopt-css.js';
import { withStyleAttrs } from '../_shared/style-attrs.js';
import { defineElement } from '../_shared/define.js';

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

  class IsSkeleton extends withStyleAttrs(HTMLElement) {
    /** Personalización por atributo (ver `_shared/style-attrs.js`). */
    static styleAttrs = {
    color: { prop: '--is-skeleton-color', onlyColorValues: true },
    'sheen-color': { prop: '--is-skeleton-sheen', onlyColorValues: true },
    };

    static get observedAttributes() { return [...OBSERVED, 'color', 'sheen-color']; }

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
    }

    connectedCallback() {
      super.connectedCallback();
      if (!this.hasAttribute('effect')) this.setAttribute('effect', 'sheen');
      this.setAttribute('aria-hidden', 'true');
    }

    attributeChangedCallback(name, oldVal, newVal) {
      super.attributeChangedCallback(name, oldVal, newVal);
      if (oldVal === newVal) return;
      if (name === 'effect' && newVal && !VALID_EFFECT.includes(newVal)) {
        this.setAttribute('effect', 'sheen');
      }
    }
  }

  defineElement('is-skeleton', IsSkeleton, 'IsSkeleton');
})();
