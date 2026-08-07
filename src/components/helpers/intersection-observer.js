import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';

/**
 * <is-intersection-observer> — Web Component (vanilla).
 *
 * display:contents — observa hijos directos con IntersectionObserver.
 *
 * Atributos
 *   disabled         boolean
 *   intersect-class  string — clase a togglear en el hijo
 *   once             boolean — deja de observar tras primera intersección
 *   root             string — selector del root (default viewport)
 *   root-margin      string
 *   threshold        number 0–1
 *
 * Eventos
 *   is-intersect  detail: { entry }
 */

(() => {
  class IsIntersectionObserver extends HTMLElement {
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

    static get observedAttributes() {
      return ['disabled', 'intersect-class', 'once', 'root', 'root-margin', 'threshold'];
    }

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

    get disabled() { return this.hasAttribute('disabled'); }

    #teardown() {
      this.#observer?.disconnect();
      this.#observer = null;
    }

    #setup() {
      this.#teardown();
      if (this.disabled) return;

      const rootSel = this.getAttribute('root');
      const root = rootSel ? document.querySelector(rootSel) : null;
      const margin = this.getAttribute('root-margin') || '0px';
      const threshRaw = this.getAttribute('threshold');
      const threshold = threshRaw != null && threshRaw !== '' ? parseFloat(threshRaw) : 0;
      const once = this.hasAttribute('once');
      const cls = this.getAttribute('intersect-class') || '';

      this.#observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (cls && entry.target instanceof Element) {
            entry.target.classList.toggle(cls, entry.isIntersecting);
          }
          emit(this, 'is-intersect', { entry });
          if (once && entry.isIntersecting) {
            this.#observer?.unobserve(entry.target);
          }
        }
      }, { root, rootMargin: margin, threshold });

      for (const child of this.children) {
        this.#observer.observe(child);
      }
    }
  }

  defineElement('is-intersection-observer', IsIntersectionObserver, 'IsIntersectionObserver');
})();
