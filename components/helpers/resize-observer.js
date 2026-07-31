import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-resize-observer> — Web Component (vanilla).
 *
 * display:contents — observa hijos directos con ResizeObserver.
 *
 * Atributos
 *   disabled  boolean
 *
 * Eventos
 *   is-resize  detail: { entries }
 */

(() => {
  class IsResizeObserver extends HTMLElement {
    #observer = null;
    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<slot></slot>';
      adoptCss(shadow, import.meta.url);
      shadow.querySelector('slot').addEventListener('slotchange', () => {
        if (this.#mounted) this.#setup();
      });
    }

    static get observedAttributes() { return ['disabled']; }

    connectedCallback() {
      this.#mounted = true;
      this.#setup();
    }

    disconnectedCallback() {
      this.#teardown();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      this.#setup();
    }

    #teardown() {
      this.#observer?.disconnect();
      this.#observer = null;
    }

    #setup() {
      this.#teardown();
      if (this.hasAttribute('disabled')) return;
      if (typeof ResizeObserver === 'undefined') return;

      this.#observer = new ResizeObserver((entries) => {
        this.dispatchEvent(new CustomEvent('is-resize', {
          bubbles: true,
          composed: true,
          detail: { entries }
        }));
      });

      for (const child of this.children) {
        this.#observer.observe(child);
      }
    }
  }

  if (!customElements.get('is-resize-observer')) {
    customElements.define('is-resize-observer', IsResizeObserver);
  }
  if (typeof window !== 'undefined') {
    window.IsResizeObserver = IsResizeObserver;
  }
})();
