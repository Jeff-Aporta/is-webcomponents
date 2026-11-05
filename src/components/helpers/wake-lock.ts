import { emit, IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import css from 'iswc:css';

/**
 * <iswc-wake-lock> — Screen Wake Lock. Host display:contents.
 *
 * Atributos: active (boolean). Si está, pide el lock; si se quita, lo suelta.
 * Eventos: iswc-change { held }
 */
(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = '<slot></slot>';

  class IswcWakeLock extends IswcElement {
    static tag = 'iswc-wake-lock';
    static css = css;
    static observed = ['active'];

    #lock: WakeLockSentinel | null = null;
    #onVis: () => void;

    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#onVis = () => { if (document.visibilityState === 'visible' && this.active) this.#acquire(); };
    }

    connectedCallback(): void {
      document.addEventListener('visibilitychange', this.#onVis);
      if (this.active) this.#acquire();
    }

    disconnectedCallback(): void {
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
        const sentinel: WakeLockSentinel = await navigator.wakeLock.request('screen');
        this.#lock = sentinel;
        sentinel.addEventListener('release', () => {
          this.#lock = null;
          emit(this, 'iswc-change', { held: false });
        });
        emit(this, 'iswc-change', { held: true });
      } catch {
        emit(this, 'iswc-change', { held: false });
      }
    }

    async #release() {
      const lock = this.#lock;
      if (!lock) return;
      try { await lock.release(); } catch { /* noop */ }
      this.#lock = null;
    }
  }

  define(IswcWakeLock, 'IswcWakeLock');
})();
