import { adoptCss, defineElement, emit } from '../../core/element.js';
import { createPopupDismiss } from '../_shared/popup-dismiss.js';

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
 *   scroll-lock        boolean — si está, bloquea el scroll del documento
 *                      mientras el menú está abierto. Sin él (default),
 *                      cualquier scroll fuera del panel cierra el menú
 *                      (no “persigue” el scroll del viewport/contenedor).
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
  const OBSERVED = ['for', 'placement', 'distance', 'disabled', 'scroll-lock'];

  class IsContextMenu extends HTMLElement {
    static get observedAttributes(): string[] { return OBSERVED; }

    #host: HTMLElement = this;
    #target: HTMLElement | null = null;
    #listener: ((e: Event) => void) | null = null;
    #panel!: HTMLDialogElement;
    #onScroll;
    /** Ciclo de escucha mientras el menú está abierto (ver _shared/popup-dismiss.js). */
    #dismiss: ReturnType<typeof createPopupDismiss> | null = null;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot!.innerHTML = /* html */ `
        <dialog part="panel" class="panel">
          <div part="items" class="items">
            <slot></slot>
          </div>
        </dialog>
      `;
      adoptCss(this.shadowRoot!, import.meta.url);
      this.#panel = this.shadowRoot!.querySelector<HTMLDialogElement>('dialog')!;
      this.#panel.addEventListener('click', (e: Event) => this.#onPanelClick(e));
      this.#panel.addEventListener('contextmenu', (e: Event) => e.preventDefault());
      this.#onScroll = (e: Event) => {
        if (!this.isOpen || this.scrollLock) return;
        // Scroll interno del panel (lista larga) no debe cerrar.
        const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
        if (path.includes(this.#panel) || e.target === this.#panel) return;
        this.close();
      };
    }

    connectedCallback(): void {
      this.#host = this;
      this.#bindTarget();
    }

    disconnectedCallback(): void {
      this.#unbindTarget();
      this.#teardownScrollBehavior();
    }

    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
      // #bindTarget usa #host, que se asigna en connectedCallback: sin este
      // guard un atributo puesto en el markup se procesa demasiado pronto.
      if (oldVal === newVal || !this.#host) return;
      if (name === 'for' || name === 'disabled') this.#bindTarget();
      if (name === 'scroll-lock' && this.isOpen) {
        // Cambiar el modo en caliente: rearmar listeners / lock.
        this.#teardownScrollBehavior();
        this.#setupScrollBehavior();
      }
    }

    get isOpen() { return this.#panel.open; }

    get scrollLock() { return this.hasAttribute('scroll-lock'); }
    set scrollLock(v) { this.toggleAttribute('scroll-lock', !!v); }

    /**
     * Abre el menú anclado a un punto del viewport. Se muestra primero para
     * poder medirlo y despues se coloca: si no cabe hacia la derecha/abajo se
     * voltea sobre el punto, y en ultimo caso se pega al borde.
     */
    openAt(x: number, y: number): void {
      if (this.hasAttribute('disabled')) return;
      const panel = this.#panel;
      // Medir fuera de vista para que no haya un frame en la esquina.
      panel.style.visibility = 'hidden';
      panel.style.left = '0px';
      panel.style.top = '0px';
      if (!panel.open) panel.show();

      const margin = 8;
      const rect = panel.getBoundingClientRect();
      // `position: fixed` se resuelve contra el viewport SALVO que un ancestro
      // cree containing block (transform, filter, contain, will-change...).
      // Con left/top en 0 el panel deberia estar en el origen del viewport: lo
      // que se desvie es justo el offset del containing block, y se compensa.
      const originX = rect.left;
      const originY = rect.top;
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;

      let left = x;
      let top = y;
      // Voltear sobre el punto si se sale; si tampoco cabe, pegar al borde.
      if (left + rect.width + margin > vw) left = x - rect.width;
      if (left < margin) left = Math.max(margin, vw - rect.width - margin);
      if (top + rect.height + margin > vh) top = y - rect.height;
      if (top < margin) top = Math.max(margin, vh - rect.height - margin);

      panel.style.left = `${Math.round(left - originX)}px`;
      panel.style.top = `${Math.round(top - originY)}px`;
      panel.style.visibility = '';

      this.setAttribute('open', '');
      this.#setupScrollBehavior();
      emit(this, 'is-open', { x, y });
    }

    /** Abre el menú anclado a un elemento (esquina inferior izquierda). */
    openAtElement(el?: HTMLElement | null): void {
      const r = (el || this.#target || this).getBoundingClientRect();
      this.openAt(r.left, r.bottom + 4);
    }

    close() {
      if (!this.#panel.open && !this.hasAttribute('open')) {
        this.#teardownScrollBehavior();
        return;
      }
      if (this.#panel.open) this.#panel.close();
      this.removeAttribute('open');
      this.#teardownScrollBehavior();
      emit(this, 'is-close');
    }

    #onPanelClick(e: Event): void {
      const item = (e.target as HTMLElement | null)?.closest<HTMLElement>('[role="menuitem"], .item, button, a');
      if (!item) return;
      e.preventDefault();
      e.stopPropagation();
      emit(this, 'is-select', { item, value: item.dataset.value ?? item.textContent.trim() });
      this.close();
    }

    #bindTarget() {
      this.#unbindTarget();
      if (this.hasAttribute('disabled')) return;
      const root = this.getRootNode();
      const sel = this.getAttribute('for');
      const raiz = root as ParentNode & { querySelector?: (s: string) => Element | null };
      const target = (sel
        ? (raiz.querySelector?.(sel) ?? document.querySelector<HTMLElement>(sel))
        : this.#host) as HTMLElement | null;
      if (!target) return;
      this.#target = target;
      this.#listener = (e: Event) => this.#onContextMenu(e as MouseEvent);
      target.addEventListener('contextmenu', this.#listener);
    }

    #unbindTarget() {
      if (this.#target && this.#listener) {
        this.#target.removeEventListener('contextmenu', this.#listener);
      }
      this.#target = null;
      this.#listener = null;
    }

    #onContextMenu(e: MouseEvent): void {
      e.preventDefault();
      e.stopPropagation();
      this.openAt(e.clientX, e.clientY);
    }

    /**
     * Engancha el ciclo de "menú abierto": Escape, click fuera y, según el
     * modo, cerrar al hacer scroll (default) o congelar el documento
     * (`scroll-lock`). Todo eso vive en _shared/popup-dismiss.js, que es lo
     * mismo que necesita is-dropdown.
     *
     * Se crea en cada apertura porque `scroll-lock` puede cambiar entre una y
     * otra, y el modo se decide al enganchar.
     */
    #setupScrollBehavior() {
      this.#teardownScrollBehavior();
      this.#dismiss = createPopupDismiss(this, {
        onEscape: () => this.close(),
        onOutside: () => { if (this.isOpen) this.close(); },
        onScroll: this.#onScroll,
        scrollLock: this.scrollLock,
      });
      this.#dismiss.attach();
    }

    #teardownScrollBehavior() {
      this.#dismiss?.detach();
      this.#dismiss = null;
    }
  }

  defineElement('is-context-menu', IsContextMenu);
})();
