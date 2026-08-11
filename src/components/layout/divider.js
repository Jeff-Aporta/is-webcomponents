import { adoptCss } from '../_shared/adopt-css.js';
import { withStyleAttrs } from '../_shared/style-attrs.js';
import { defineElement } from '../_shared/define.js';

/**
 * <is-divider> — Web Component (vanilla).
 *
 * Separador visual horizontal o vertical.
 *
 * Atributos
 *   orientation  horizontal | vertical (default horizontal)
 *   opacity      0–100 (default 20)
 *   color        text | text-soft | text-dim | border | control | brand | accent |
 *                success | warning | danger (default text)
 *
 * role=separator + aria-orientation en el host
 * CSS vars: --color, --opacity, --width, --spacing
 */

(() => {
  const OBSERVED = ['orientation', 'opacity', 'color'];
  const VALID_ORIENTATION = ['horizontal', 'vertical'];
  const VALID_COLOR = [
    'text', 'text-soft', 'text-dim', 'border', 'control',
    'brand', 'accent', 'success', 'warning', 'danger',
  ];

  class IsDivider extends withStyleAttrs(HTMLElement) {
    /** Personalización por atributo (ver `_shared/style-attrs.js`). */
    static styleAttrs = {
    color: { prop: '--is-divider-color', onlyColorValues: true },
    spacing: '--is-divider-spacing',
    width: '--is-divider-width',
    };

    static get observedAttributes() { return [...OBSERVED, 'color', 'spacing', 'width']; }

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<span part="divider" class="divider" aria-hidden="true"></span>';
      adoptCss(shadow, import.meta.url);
    }

    connectedCallback() {
      super.connectedCallback();
      if (!this.hasAttribute('orientation')) this.setAttribute('orientation', 'horizontal');
      if (!this.hasAttribute('opacity')) this.setAttribute('opacity', '20');
      if (!this.hasAttribute('color')) this.setAttribute('color', 'text');
      this.setAttribute('role', 'separator');
      this.#syncA11y();
      this.#syncOpacity();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      super.attributeChangedCallback(name, oldVal, newVal);
      if (oldVal === newVal) return;
      if (name === 'orientation') {
        if (newVal && !VALID_ORIENTATION.includes(newVal)) this.setAttribute('orientation', 'horizontal');
        this.#syncA11y();
      }
      if (name === 'opacity') this.#syncOpacity();
      if (name === 'color' && newVal && !VALID_COLOR.includes(newVal)) {
        this.setAttribute('color', 'text');
      }
    }

    get orientation() {
      const v = this.getAttribute('orientation');
      return VALID_ORIENTATION.includes(v) ? v : 'horizontal';
    }
    set orientation(v) {
      if (v == null || v === '') this.removeAttribute('orientation');
      else if (VALID_ORIENTATION.includes(v)) this.setAttribute('orientation', v);
    }

    get opacity() {
      const n = parseFloat(this.getAttribute('opacity'));
      return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 20;
    }
    set opacity(v) {
      if (v == null || v === '') this.removeAttribute('opacity');
      else this.setAttribute('opacity', String(v));
    }

    get color() {
      const v = this.getAttribute('color');
      return VALID_COLOR.includes(v) ? v : 'text';
    }
    set color(v) {
      if (v == null || v === '') this.removeAttribute('color');
      else if (VALID_COLOR.includes(v)) this.setAttribute('color', v);
    }

    #syncA11y() {
      this.setAttribute('aria-orientation', this.orientation);
    }

    #syncOpacity() {
      this.style.setProperty('--opacity', String(this.opacity / 100));
    }
  }

  defineElement('is-divider', IsDivider, 'IsDivider');
})();
