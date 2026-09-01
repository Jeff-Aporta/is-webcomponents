import '../actions/button.js';
import { adoptCss, defineElement, emit } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { createPopupDismiss } from '../_shared/popup-dismiss.js';

/**
 * <is-window> — Ventana flotante dockable (estilo escritorio).
 *
 * Atributos
 *   title       encabezado de la ventana
 *   x, y        posición inicial (px). Si faltan, se centra en el host.
 *   width, height
 *   maximizable, minimizable, closable  boolean
 *   default     maximized | minimized | normal  (default normal)
 *   resizable   boolean — drag de la esquina inferior derecha
 *   dock        bottom-right (default) | bottom | top | none  — destino al minimizar
 *
 * Slots
 *   default     contenido principal
 *   title       slot opcional que reemplaza el atributo title
 *
 * Eventos (vocabulario de ModalBase)
 *   is-show / is-after-show     al conectarse la ventana
 *   is-hide  / is-after-hide    al cerrarse
 *   is-minimize, is-restore
 *   is-maximize
 *
 * Accesibilidad
 *   role="dialog" + aria-label del título. Escape cierra (si `closable`) y
 *   Tab queda contenido dentro de la ventana mientras tiene el foco dentro.
 *
 * API
 *   win.minimize() / .restore() / .maximize() / .unmaximize() / .close()
 */
(() => {
  const OBSERVED = ['title', 'x', 'y', 'width', 'height', 'maximizable', 'minimizable', 'closable', 'default', 'resizable', 'dock'];

  /** Igual que el de _shared/modal-base.js, que no lo exporta. */
  const FOCUSABLE =
    'a[href], area[href], input:not([disabled]):not([type=hidden]),'
    + ' select:not([disabled]), textarea:not([disabled]),'
    + ' button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

  class IsWindow extends ElementBase {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    shadow: '--is-popover-shadow',
    'bar-gap': '--is-surface-bar-gap',
    'bar-padding': '--is-surface-bar-padding',
    };

    static get observedAttributes(): string[] { return [...OBSERVED, 'shadow', 'bar-gap', 'bar-padding']; }
    #onWinMove;
    #onWinUp;
    #state = 'normal';
    #z = 100;
    #drag = null;
    #resize = null;
    #lastRect = null;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot!.innerHTML = /* html */ `
        <div part="root" class="root is-popover-panel" data-state="normal">
          <header part="header" class="header is-surface-bar">
            <span class="title-wrap"><slot name="title"></slot><span class="title" id="ttl"></span></span>
            <span class="controls">
              <is-button variant="plain" class="ctrl" data-act="min" title="Minimizar" aria-label="Minimizar" hidden><span aria-hidden="true">▁</span></is-button>
              <is-button variant="plain" class="ctrl" data-act="max" title="Maximizar" aria-label="Maximizar" hidden><span aria-hidden="true">▢</span></is-button>
              <is-button variant="plain" color="danger" class="ctrl" data-act="close" title="Cerrar" aria-label="Cerrar" hidden><span aria-hidden="true">✕</span></is-button>
            </span>
          </header>
          <div part="body" class="body" tabindex="0">
            <slot></slot>
          </div>
          <span class="resizer" part="resizer" hidden></span>
        </div>
      `;
      adoptCss(this.shadowRoot!, import.meta.url);
      this.#root = this.shadowRoot!.querySelector<HTMLElement>('.root')!;
      this.#title = this.shadowRoot!.getElementById('ttl')!;
      this.#body = this.shadowRoot!.querySelector<HTMLElement>('.body')!;
      this.#resizer = this.shadowRoot!.querySelector<HTMLElement>('.resizer')!;
      this.#header = this.shadowRoot!.querySelector<HTMLElement>('.header')!;
      this.#titleSlot = this.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!;

      this.addEventListener('pointerdown', () => this.#raise());
      this.#header.addEventListener('pointerdown', (e) => this.#onHeaderDown(e));
      this.#onWinMove = (e) => this.#onPointerMove(e);
      this.#onWinUp = () => this.#endAny();
      this.#resizer.addEventListener('pointerdown', (e) => this.#onResizeDown(e));
      this.#root.addEventListener('click', (e) => this.#onClick(e));
    }

    onConnected() {
      emit(this, 'is-show');
      if (!this.hasAttribute('role')) this.setAttribute('role', 'dialog');
      window.addEventListener('pointermove', this.#onWinMove);
      window.addEventListener('pointerup', this.#onWinUp);
      this.#dismiss.attach();
      this.#sync();
      const x = this.getAttribute('x');
      const y = this.getAttribute('y');
      if (x != null) {
        this.style.left = this.#cssSize(x);
        this.style.transform = 'none';
      }
      if (y != null) {
        this.style.top = this.#cssSize(y);
        this.style.transform = 'none';
      }
      const w = this.getAttribute('width');
      const h = this.getAttribute('height');
      if (w) this.style.setProperty('--_w', this.#cssSize(w));
      if (h) this.style.setProperty('--_h', this.#cssSize(h));
      const def = this.getAttribute('default') || 'normal';
      if (def === 'maximized') this.maximize();
      if (def === 'minimized') this.minimize();
      emit(this, 'is-after-show');
    }

    onDisconnected() {
      window.removeEventListener('pointermove', this.#onWinMove);
      window.removeEventListener('pointerup', this.#onWinUp);
      this.#dismiss.detach();
    }

    onAttributeChanged() {
      this.#sync();
    }

    /** Escape cierra; Tab se queda dentro mientras el foco esté en la ventana.
     *  El foco NO se atrapa si el usuario está fuera: is-window no es modal,
     *  conviven varias en pantalla y secuestrar el Tab global las rompería. */
    #dismiss = createPopupDismiss(this, {
      onKeydown: (e) => {
        if (!this.contains(document.activeElement)
          && !this.shadowRoot!.contains(this.shadowRoot!.activeElement)) return;
        if (e.key === 'Escape') {
          if (!this.hasAttribute('closable')) return;
          e.stopPropagation();
          this.close();
          return;
        }
        if (e.key !== 'Tab') return;
        const items = [
          ...this.shadowRoot!.querySelectorAll<HTMLElement>(FOCUSABLE),
          ...this.querySelectorAll<HTMLElement>(FOCUSABLE),
        ].filter((el) => !el.hidden && el.offsetParent !== null);
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = this.shadowRoot!.activeElement || document.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      },
    });

    minimize() {
      if (this.#state === 'minimized') return;
      this.#lastRect = this.#rect();
      this.#state = 'minimized';
      this.#root.dataset.state = 'minimized';
      const dock = this.getAttribute('dock') || 'bottom-right';
      if (dock !== 'none') {
        this.style.left = '';
        this.style.top = '';
        this.style.right = '0';
        this.style.bottom = '0';
        this.style.transform = 'none';
        this.#root.classList.add('is-minimized');
      }
      emit(this, 'is-minimize');
    }

    maximize() {
      if (this.#state === 'maximized') return;
      if (this.#state !== 'maximized') this.#lastRect = this.#rect();
      this.#state = 'maximized';
      this.#root.dataset.state = 'maximized';
      this.style.left = '0';
      this.style.top = '0';
      this.style.right = '0';
      this.style.bottom = '0';
      this.style.width = '100%';
      this.style.height = '100%';
      this.style.transform = 'none';
      emit(this, 'is-maximize');
    }

    restore() {
      const target = this.#state;
      this.#state = 'normal';
      this.#root.dataset.state = 'normal';
      this.#root.classList.remove('is-minimized');
      this.style.right = '';
      this.style.bottom = '';
      this.style.width = '';
      this.style.height = '';
      if (this.#lastRect) {
        this.style.left = `${this.#lastRect.x}px`;
        this.style.top = `${this.#lastRect.y}px`;
        this.style.transform = 'none';
        this.style.setProperty('--_w', `${this.#lastRect.w}px`);
        this.style.setProperty('--_h', `${this.#lastRect.h}px`);
      }
      emit(this, 'is-restore', { was: target });
    }

    unmaximize() {
      if (this.#state !== 'maximized') return;
      this.restore();
    }

    close() {
      emit(this, 'is-hide');
      this.remove();
      emit(this, 'is-after-hide');
    }

    #raise() {
      const all = document.querySelectorAll<HTMLElement>('is-window');
      let max = 0;
      all.forEach((w: HTMLElement) => { const z = Number(w.style.zIndex) || 100; if (z > max) max = z; });
      this.style.zIndex = String(max + 1);
    }

    #onHeaderDown(e) {
      if (this.#state === 'maximized') return;
      if (e.target.closest('.ctrl')) return;
      this.#drag = { x: e.clientX, y: e.clientY, rect: this.#rect() };
      this.#header.setPointerCapture(e.pointerId);
    }

    #onResizeDown(e) {
      if (this.#state === 'maximized') return;
      this.#resize = { x: e.clientX, y: e.clientY, rect: this.#rect() };
      this.#resizer.setPointerCapture(e.pointerId);
    }

    #onPointerMove(e) {
      if (this.#drag) {
        const dx = e.clientX - this.#drag.x;
        const dy = e.clientY - this.#drag.y;
        const r = this.#drag.rect;
        this.style.left = `${Math.max(0, r.x + dx)}px`;
        this.style.top = `${Math.max(0, r.y + dy)}px`;
        this.style.transform = 'none';
      }
      if (this.#resize) {
        const dx = e.clientX - this.#resize.x;
        const dy = e.clientY - this.#resize.y;
        const r = this.#resize.rect;
        const w = Math.max(180, r.w + dx);
        const h = Math.max(120, r.h + dy);
        this.style.setProperty('--_w', `${w}px`);
        this.style.setProperty('--_h', `${h}px`);
      }
    }

    #endAny() { this.#drag = null; this.#resize = null; }

    #onClick(e) {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      if (btn.dataset.act === 'min') this.#state === 'minimized' ? this.restore() : this.minimize();
      if (btn.dataset.act === 'max') this.#state === 'maximized' ? this.restore() : this.maximize();
      if (btn.dataset.act === 'close') this.close();
    }

    #rect() {
      const r = this.getBoundingClientRect();
      const offsetParent = this.offsetParent;
      if (offsetParent) {
        const pr = offsetParent.getBoundingClientRect();
        return { x: r.left - pr.left, y: r.top - pr.top, w: r.width, h: r.height };
      }
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }

    /** Acepta "22rem", "380" o "380px" sin duplicar la unidad. */
    #cssSize(v: string) {
      const s = String(v).trim();
      return /[a-z%]/i.test(s) ? s : `${s}px`;
    }

    #sync() {
      const title = this.getAttribute('title') || '';
      this.#title.textContent = title;
      if (title) this.setAttribute('aria-label', title);
      else this.removeAttribute('aria-label');
      this.#root.querySelector<HTMLElement>('[data-act="min"]').hidden = !this.hasAttribute('minimizable');
      this.#root.querySelector<HTMLElement>('[data-act="max"]').hidden = !this.hasAttribute('maximizable');
      this.#root.querySelector<HTMLElement>('[data-act="close"]').hidden = !this.hasAttribute('closable');
      this.#resizer.hidden = !this.hasAttribute('resizable') || this.#state === 'maximized';
    }

    #root!: HTMLElement;
    #title!: HTMLElement;
    #body!: HTMLElement;
    #resizer!: HTMLElement;
    #header!: HTMLElement;
    #titleSlot!: HTMLSlotElement;
  }

  defineElement('is-window', IsWindow);
})();
