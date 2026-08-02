import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-context-menu> — Menú emergente anclado al clic derecho del ratón sobre
 * un `target` externo (o sobre el propio host si no se da `for`).
 *
 * Atributos
 *   for                CSS selector — selector del elemento que recibe el
 *                      contextmenu. Si falta, el host mismo.
 *   placement          bottom-start (default) | bottom-end | top-start |
 *                      top-end  (alias CSS-ish del placement del popup)
 *   distance           píxeles desde el cursor (default 2)
 *   disabled           boolean — desactiva el menú
 *
 * Slots
 *   default — hijos renderizados dentro del panel; usar <button class="item">
 *             o <a class="item"> para tener acciones. Cada item emite
 *             `is-select` y se cierra el menú.
 *
 * Eventos
 *   is-select       detalle: { item, value }  — al elegir un item
 *   is-open, is-close
 *
 * Custom states: open, closed
 */
(() => {
  const OBSERVED = ['for', 'placement', 'distance', 'disabled'];

  class IsContextMenu extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #host;
    #target;
    #listener;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = /* html */ `
        <dialog part="panel" class="panel">
          <div part="items" class="items">
            <slot></slot>
          </div>
        </dialog>
      `;
      adoptCss(this.shadowRoot, import.meta.url);
      this.#panel = this.shadowRoot.querySelector('dialog');
      this.#panel.addEventListener('click', (e) => this.#onPanelClick(e));
      this.#panel.addEventListener('contextmenu', (e) => e.preventDefault());
      this.#onDocPointerDown = (e) => {
        if (!this.isOpen) return;
        if (e.composedPath().includes(this)) return;
        this.close();
      };
      this.#onDocKeydown = (e) => {
        if (e.key === 'Escape' && this.isOpen) this.close();
      };
    }

    connectedCallback() {
      this.#host = this;
      this.#bindTarget();
      // cerrar al clic fuera / Escape — vivos solo mientras está conectado
      document.addEventListener('pointerdown', this.#onDocPointerDown, true);
      document.addEventListener('keydown', this.#onDocKeydown);
    }

    disconnectedCallback() {
      this.#unbindTarget();
      document.removeEventListener('pointerdown', this.#onDocPointerDown, true);
      document.removeEventListener('keydown', this.#onDocKeydown);
    }

    attributeChangedCallback(name, oldVal, newVal) {
      // #bindTarget usa #host, que se asigna en connectedCallback: sin este
      // guard un atributo puesto en el markup se procesa demasiado pronto.
      if (oldVal === newVal || !this.#host) return;
      if (name === 'for' || name === 'disabled') this.#bindTarget();
    }

    get isOpen() { return this.#panel.open; }

    /**
     * Abre el menú anclado a un punto del viewport. Se muestra primero para
     * poder medirlo y despues se coloca: si no cabe hacia la derecha/abajo se
     * voltea sobre el punto, y en ultimo caso se pega al borde.
     */
    openAt(x, y) {
      if (this.hasAttribute('disabled')) return;
      const panel = this.#panel;
      // Medir fuera de vista para que no haya un frame en la esquina.
      panel.style.visibility = 'hidden';
      panel.style.left = '0px';
      panel.style.top = '0px';
      if (!panel.open) panel.show();

      const margin = 8;
      const rect = panel.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;

      let left = x;
      let top = y;
      // Voltear sobre el punto si se sale; si tampoco cabe, pegar al borde.
      if (left + rect.width + margin > vw) left = x - rect.width;
      if (left < margin) left = Math.max(margin, vw - rect.width - margin);
      if (top + rect.height + margin > vh) top = y - rect.height;
      if (top < margin) top = Math.max(margin, vh - rect.height - margin);

      panel.style.left = `${Math.round(left)}px`;
      panel.style.top = `${Math.round(top)}px`;
      panel.style.visibility = '';

      this.setAttribute('open', '');
      this.dispatchEvent(new CustomEvent('is-open', { bubbles: true, composed: true, detail: { x, y } }));
    }

    /** Abre el menú anclado a un elemento (esquina inferior izquierda). */
    openAtElement(el) {
      const r = (el || this.#target || this).getBoundingClientRect();
      this.openAt(r.left, r.bottom + 4);
    }

    close() {
      if (this.#panel.open) this.#panel.close();
      this.removeAttribute('open');
      this.dispatchEvent(new CustomEvent('is-close', { bubbles: true, composed: true }));
    }

    #onPanelClick(e) {
      const item = e.target.closest('[role="menuitem"], .item, button, a');
      if (!item) return;
      e.preventDefault();
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('is-select', {
        bubbles: true, composed: true,
        detail: { item, value: item.dataset.value ?? item.textContent.trim() },
      }));
      this.close();
    }

    #bindTarget() {
      this.#unbindTarget();
      if (this.hasAttribute('disabled')) return;
      const root = this.getRootNode();
      const sel = this.getAttribute('for');
      const target = sel ? (root.querySelector?.(sel) || document.querySelector(sel)) : this.#host;
      if (!target) return;
      this.#target = target;
      this.#listener = (e) => this.#onContextMenu(e);
      target.addEventListener('contextmenu', this.#listener);
    }

    #unbindTarget() {
      if (this.#target && this.#listener) {
        this.#target.removeEventListener('contextmenu', this.#listener);
      }
      this.#target = null;
      this.#listener = null;
    }

    #onContextMenu(e) {
      e.preventDefault();
      e.stopPropagation();
      this.openAt(e.clientX, e.clientY);
    }

    #panel;
    #onDocPointerDown;
    #onDocKeydown;
  }

  if (!customElements.get('is-context-menu')) customElements.define('is-context-menu', IsContextMenu);
})();
