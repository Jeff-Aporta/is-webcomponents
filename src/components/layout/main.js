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
 *
 * storage-key identifica el contenido: cambiarlo en caliente equivale a
 * cambiar de vista, así que resetea a top en vez de restaurar.
 */

import { getComponentPrefs, setComponentPrefs } from '../_shared/prefs.js';
import { defineElement } from '../_shared/define.js';

(() => {
  const TAG = 'is-main';
  const DEFAULT_TTL = 3_600_000;
  const OBSERVED = ['remember-scroll', 'storage-key', 'scroll-ttl'];
  const RESTORE_WINDOW = 4_500;
  const RESTORE_STEP = 60;
  const USER_INTENT = ['wheel', 'touchstart', 'pointerdown', 'keydown'];

  class IsMain extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #mounted = false;
    #saveTimer = 0;
    #onScroll = null;
    #bootedKey = null;
    #restoring = false;
    #restoreTimer = 0;
    #restoreUntil = 0;
    #onUserScrollIntent = null;

    /** Persistencia activa solo con remember-scroll + storage-key no vacío. */
    get #enabled() {
      return this.rememberScroll && !!this.storageKey;
    }

    connectedCallback() {
      this.#mounted = true;
      if (!this.hasAttribute('role')) this.setAttribute('role', 'main');
      // El host puede fijar storage-key justo después de montar (preview-component
      // lo hace al conocer el componente), así que se avisa en el siguiente tick.
      if (this.rememberScroll && !this.storageKey) {
        setTimeout(() => {
          if (this.#mounted && this.rememberScroll && !this.storageKey) {
            console.warn('[is-main] remember-scroll requiere storage-key; persistencia desactivada');
          }
        }, 0);
      }
      this.#bind();
      this.#bootScroll();
    }

    disconnectedCallback() {
      this.#mounted = false;
      this.#unbind();
      this.#cancelRestore();
      clearTimeout(this.#saveTimer);
    }

    attributeChangedCallback(name, prev, next) {
      if (!this.#mounted) return;
      if (name === 'remember-scroll' || name === 'storage-key') {
        this.#unbind();
        this.#bind();
      }
      if (name !== 'storage-key') return;
      const key = (next || '').trim();
      if (!key || key === (prev || '').trim()) return;
      // Primera clave del ciclo de vida → decide boot (F5 restaura, fresh top).
      // Clave distinta a la ya arrancada → es otra vista: siempre top.
      if (this.#bootedKey === null) this.#bootScroll();
      else if (key !== this.#bootedKey) {
        this.#bootedKey = key;
        this.#cancelRestore();
        this.scrollToTop();
        // La memoria acompaña a lo que el usuario ve: un F5 inmediato tras
        // entrar a la vista no debe saltar a una lectura anterior.
        this.clearRememberedScroll();
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
      if (!this.#enabled || this.#restoring) return;
      setComponentPrefs(TAG, this.storageKey, {
        top: Math.max(0, Math.round(this.scrollTop)),
        savedAt: Date.now(),
      });
    }

    restoreScroll() {
      if (!this.#enabled) return false;
      const top = this.#savedTop();
      if (top <= 0) return false;
      this.scrollTop = top;
      return true;
    }

    #bootScroll() {
      if (!this.#enabled) {
        this.scrollTop = 0;
        return;
      }
      this.#bootedKey = this.storageKey;
      // iframe.src / navegación fresca → top; F5 / atrás → restore si TTL ok
      const nav = performance.getEntriesByType?.('navigation')?.[0];
      const type = nav?.type || 'navigate';
      if (type === 'reload' || type === 'back_forward') this.#scheduleRestore();
      else this.scrollTop = 0;
    }

    /**
     * El contenido se pinta (y crece) después del boot, así que reintenta la
     * restauración hasta alcanzar el top guardado o agotar RESTORE_WINDOW.
     * Con timers, no rAF: en pestañas en segundo plano rAF no corre.
     */
    #scheduleRestore() {
      this.#cancelRestore();
      this.#restoring = true;
      this.#restoreUntil = Date.now() + RESTORE_WINDOW;
      this.#onUserScrollIntent = () => this.#cancelRestore();
      for (const evt of USER_INTENT) {
        this.addEventListener(evt, this.#onUserScrollIntent, { passive: true });
      }
      const tick = () => {
        this.#restoreTimer = 0;
        if (!this.#restoring) return;
        const target = this.#savedTop();
        if (target <= 0) return this.#cancelRestore();
        this.scrollTop = target;
        if (Math.round(this.scrollTop) >= target || Date.now() > this.#restoreUntil) {
          this.#cancelRestore();
          return;
        }
        this.#restoreTimer = setTimeout(tick, RESTORE_STEP);
      };
      tick();
    }

    #cancelRestore() {
      clearTimeout(this.#restoreTimer);
      this.#restoreTimer = 0;
      this.#restoring = false;
      if (this.#onUserScrollIntent) {
        for (const evt of USER_INTENT) {
          this.removeEventListener(evt, this.#onUserScrollIntent);
        }
        this.#onUserScrollIntent = null;
      }
    }

    /** Top guardado válido (TTL vigente) o 0. */
    #savedTop() {
      const saved = getComponentPrefs(TAG, this.storageKey);
      if (!saved) return 0;
      const top = Number(saved.top);
      const savedAt = Number(saved.savedAt);
      if (!Number.isFinite(top) || top <= 0) return 0;
      if (!Number.isFinite(savedAt) || savedAt <= 0) return 0;
      if (Date.now() - savedAt > this.scrollTtl) return 0;
      return top;
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

  defineElement(TAG, IsMain, 'IsMain');
})();
