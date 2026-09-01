/**
 * <is-main> — contenedor scrollable tipo <main>.
 *
 * Remember-scroll es OPT-IN estricto: hace falta
 *   remember-scroll  +  storage-key="…"
 * Sin ambos → no lee ni escribe localStorage.
 *
 * Attrs
 *   remember-scroll   boolean — activa persistencia (default: off)
 *   storage-key       string  — id único bajo is-webcomponents.is-main
 *   scroll-ttl        number  — ms de validez (default: 3600000 = 1h)
 *
 * Methods: scrollToTop(), clearRememberedScroll(), saveScroll(), restoreScroll()
 *
 * Restore solo en reload / back_forward. Navegación fresca (p. ej. cambio
 * de componente en la galería vía iframe.src) arranca en top.
 */

import { defineElement } from '../../core/element.js';
import {
  SCROLL_MEMORY_ATTRS,
  ScrollMemory,
  bindScrollMemoryApi,
} from '../_shared/scroll-memory.js';

(() => {
  const TAG = 'is-main';

  class IsMain extends HTMLElement {
    static get observedAttributes(): string[] { return [...SCROLL_MEMORY_ATTRS]; }

    #memory = null;
    #mounted = false;

    constructor() {
      super();
      this.#memory = new ScrollMemory(this, { tag: TAG, restorePolicy: 'reload' });
      bindScrollMemoryApi(this, this.#memory);
    }

    connectedCallback(): void {
      this.#mounted = true;
      if (!this.hasAttribute('role')) this.setAttribute('role', 'main');
      this.#memory.connect();
    }

    disconnectedCallback(): void {
      this.#mounted = false;
      this.#memory.disconnect();
    }

    attributeChangedCallback(name: string, prev: string | null, next: string | null): void {
      if (!this.#mounted) return;
      this.#memory.onAttributeChanged(name, prev, next);
    }
  }

  defineElement(TAG, IsMain, 'IsMain');
})();
