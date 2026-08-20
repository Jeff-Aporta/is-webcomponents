import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';

/**
 * <is-wake-lock> — Screen Wake Lock. Host display:contents.
 *
 * Atributos: active (boolean). Si está, pide el lock; si se quita, lo suelta.
 * Eventos: is-change { held }
 */
(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = '<slot></slot>';

  class IsWakeLock extends HTMLElement {
    static get observedAttributes() { return ['active']; }

    #lock = null;
    #onVis;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#onVis = () => { if (document.visibilityState === 'visible' && this.active) this.#acquire(); };
    }

    connectedCallback() {
      document.addEventListener('visibilitychange', this.#onVis);
      if (this.active) this.#acquire();
    }

    disconnectedCallback() {
      document.removeEventListener('visibilitychange', this.#onVis);
      this.#release();
    }

    attributeChangedCallback() {
      if (this.active) this.#acquire();
      else this.#release();
    }

    get active() { return this.hasAttribute('active'); }
    set active(v) { this.toggleAttribute('active', !!v); }
    get held() { return Boolean(this.#lock); }

    async #acquire() {
      if (!('wakeLock' in navigator) || this.#lock) return;
      try {
        this.#lock = await navigator.wakeLock.request('screen');
        this.#lock.addEventListener('release', () => {
          this.#lock = null;
          emit(this, 'is-change', { held: false });
        });
        emit(this, 'is-change', { held: true });
      } catch {
        emit(this, 'is-change', { held: false });
      }
    }

    async #release() {
      try { await this.#lock?.release(); } catch { /* noop */ }
      this.#lock = null;
    }
  }

  defineElement('is-wake-lock', IsWakeLock, 'IsWakeLock');
})();
