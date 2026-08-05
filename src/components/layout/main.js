/**
 * <is-main> — contenedor scrollable tipo <main>.
 *
 * Remember-scroll es OPT-IN estricto: hace falta
 *   remember-scroll  +  storage-key="…"
 * Sin ambos → no lee ni escribe localStorage.
 *
 * Attrs
 *   remember-scroll   boolean — activa persistencia (default: off)
 *   storage-key       string  — id único bajo is-components.is-main
 *   scroll-ttl        number  — ms de validez (default: 3600000 = 1h)
 *
 * Methods: scrollToTop(), clearRememberedScroll(), saveScroll(), restoreScroll()
 *
 * Restore solo en reload / back_forward. Navegación fresca (p. ej. cambio
 * de componente en la galería vía iframe.src) arranca en top.
 */

import { getComponentPrefs, setComponentPrefs } from '../_shared/prefs.js';

(() => {
  const TAG = 'is-main';
  const DEFAULT_TTL = 3_600_000;
  const OBSERVED = ['remember-scroll', 'storage-key', 'scroll-ttl'];

  class IsMain extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #mounted = false;
    #saveTimer = 0;
    #onScroll = null;

    /** Persistencia activa solo con remember-scroll + storage-key no vacío. */
    get #enabled() {
      return this.rememberScroll && !!this.storageKey;
    }

    connectedCallback() {
      this.#mounted = true;
      if (!this.hasAttribute('role')) this.setAttribute('role', 'main');
      if (this.rememberScroll && !this.storageKey) {
        console.warn('[is-main] remember-scroll requiere storage-key; persistencia desactivada');
      }
      this.#bind();
      this.#bootScroll();
    }

    disconnectedCallback() {
      this.#mounted = false;
      this.#unbind();
      clearTimeout(this.#saveTimer);
    }

    attributeChangedCallback(name) {
      if (!this.#mounted) return;
      if (name === 'remember-scroll' || name === 'storage-key') {
        this.#unbind();
        this.#bind();
      }
    }

    get rememberScroll() { return this.hasAttribute('remember-scroll'); }
    set rememberScroll(v) { this.toggleAttribute('remember-scroll', !!v); }

    get storageKey() { return (this.getAttribute('storage-key') || '').trim(); }
    set storageKey(v) {
      if (v == null || v === '') this.removeAttribute('storage-key');
      else this.setAttribute('storage-key', String(v));
    }

    get scrollTtl() {
      const n = Number(this.getAttribute('scroll-ttl'));
      return Number.isFinite(n) && n > 0 ? n : DEFAULT_TTL;
    }
    set scrollTtl(v) {
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) this.removeAttribute('scroll-ttl');
      else this.setAttribute('scroll-ttl', String(Math.round(n)));
    }

    scrollToTop({ behavior = 'auto' } = {}) {
      this.scrollTo({ top: 0, left: 0, behavior });
    }

    clearRememberedScroll() {
      if (!this.storageKey) return;
      setComponentPrefs(TAG, this.storageKey, { top: 0, savedAt: 0 });
    }

    saveScroll() {
      if (!this.#enabled) return;
      setComponentPrefs(TAG, this.storageKey, {
        top: Math.max(0, Math.round(this.scrollTop)),
        savedAt: Date.now(),
      });
    }

    restoreScroll() {
      if (!this.#enabled) return false;
      const saved = getComponentPrefs(TAG, this.storageKey);
      if (!saved) return false;
      const top = Number(saved.top);
      const savedAt = Number(saved.savedAt);
      if (!Number.isFinite(top) || top <= 0) return false;
      if (!Number.isFinite(savedAt) || savedAt <= 0) return false;
      if (Date.now() - savedAt > this.scrollTtl) return false;
      this.scrollTop = top;
      return true;
    }

    #bootScroll() {
      if (!this.#enabled) {
        this.scrollTop = 0;
        return;
      }
      // iframe.src / navegación fresca → top; F5 / atrás → restore si TTL ok
      const nav = performance.getEntriesByType?.('navigation')?.[0];
      const type = nav?.type || 'navigate';
      if (type === 'reload' || type === 'back_forward') {
        requestAnimationFrame(() => this.restoreScroll());
      } else {
        this.scrollTop = 0;
      }
    }

    #bind() {
      if (!this.#enabled) return;
      this.#onScroll = () => {
        clearTimeout(this.#saveTimer);
        this.#saveTimer = setTimeout(() => this.saveScroll(), 120);
      };
      this.addEventListener('scroll', this.#onScroll, { passive: true });
    }

    #unbind() {
      if (this.#onScroll) this.removeEventListener('scroll', this.#onScroll);
      this.#onScroll = null;
      clearTimeout(this.#saveTimer);
    }
  }

  if (!customElements.get(TAG)) customElements.define(TAG, IsMain);
  if (typeof window !== 'undefined') window.IsMain = IsMain;
})();
