import '../actions/button.js';
import { adoptCss, defineElement, emit } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { createPopupDismiss } from '../_shared/popup-dismiss.js';

/**
 * <iswc-window> — Ventana flotante (estilo escritorio).
 *
 * Atributos
 *   title       encabezado de la ventana
 *   x, y        posición inicial (px). Si faltan, se centra en el host.
 *   width, height
 *   maximizable, minimizable, closable  boolean
 *   default     maximized | minimized | normal  (default normal)
 *   resizable   boolean — drag de la esquina inferior derecha
 *   scope       local (default) | global — local vive en el wrapper; global usa el viewport
 *   position    absolute | fixed — local arranca en absolute; global en fixed si no se declara
 *   dock        se ignora: al minimizar van a la barra de pastillas del contexto
 *
 * Slots
 *   default     contenido principal
 *   title       slot opcional que reemplaza el atributo title
 *
 * Eventos (vocabulario de ModalBase)
 *   iswc-show / iswc-after-show     al conectarse la ventana
 *   iswc-hide  / iswc-after-hide    al cerrarse
 *   iswc-minimize, iswc-restore
 *   iswc-maximize
 *
 * Accesibilidad
 *   role="dialog" + aria-label del título. Escape cierra (si `closable`) y
 *   Tab queda contenido dentro de la ventana mientras tiene el foco dentro.
 *
 * API
 *   win.minimize() / .restore() / .maximize() / .unmaximize() / .close()
 */
(() => {
  const OBSERVED = ['title', 'x', 'y', 'width', 'height', 'maximizable', 'minimizable', 'closable', 'default', 'resizable', 'dock', 'scope', 'position'];

  /** Igual que el de _shared/modal-base.js, que no lo exporta. */
  const FOCUSABLE =
    'a[href], area[href], input:not([disabled]):not([type=hidden]),'
    + ' select:not([disabled]), textarea:not([disabled]),'
    + ' button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

  type WindowState = 'normal' | 'minimized' | 'maximized';
  const boxIds = new WeakMap<Element, number>();
  let boxSeq = 0;
  interface Rect { x: number; y: number; w: number; h: number; }
  interface DragState { x: number; y: number; rect: Rect; }
  interface ResizeState { x: number; y: number; rect: Rect; }

  class IswcWindow extends ElementBase {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    shadow: '--iswc-popover-shadow',
    'bar-gap': '--iswc-surface-bar-gap',
    'bar-padding': '--iswc-surface-bar-padding',
    };

    static get observedAttributes(): string[] { return [...OBSERVED, 'shadow', 'bar-gap', 'bar-padding']; }
    #onWinMove!: (e: PointerEvent) => void;
    #onWinUp!: () => void;
    #state: WindowState = 'normal';
    #z = 100;
    #drag: DragState | null = null;
    #resize: ResizeState | null = null;
    #lastRect: Rect | null = null;
    /** Elemento que tenia el foco antes de abrir la ventana; se restaura al close. */
    #previouslyFocused: HTMLElement | null = null;
    /** Evita teardown al mudar el nodo a body por scope=global. */
    #moving = false;
    /** Padre original para devolver la ventana cuando scope vuelve a local. */
    #slot: { parent: ParentNode; next: ChildNode | null } | null = null;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot!.innerHTML = /* html */ `
        <div part="root" class="root iswc-popover-panel" data-state="normal">
          <header part="header" class="header iswc-surface-bar">
            <span class="title-wrap"><slot name="title"></slot><span class="title" id="ttl"></span></span>
            <span class="controls">
              <iswc-button variant="plain" class="ctrl" data-act="min" title="Minimizar" aria-label="Minimizar" hidden><span aria-hidden="true">▁</span></iswc-button>
              <iswc-button variant="plain" class="ctrl" data-act="max" title="Maximizar" aria-label="Maximizar" hidden><span aria-hidden="true">▢</span></iswc-button>
              <iswc-button variant="plain" color="danger" class="ctrl" data-act="close" title="Cerrar" aria-label="Cerrar" hidden><span aria-hidden="true">✕</span></iswc-button>
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
      this.#header.addEventListener('pointerdown', (e: PointerEvent) => this.#onHeaderDown(e));
      this.#onWinMove = (e: PointerEvent) => this.#onPointerMove(e);
      this.#onWinUp = () => this.#endAny();
      this.#resizer.addEventListener('pointerdown', (e: PointerEvent) => this.#onResizeDown(e));
      this.#root.addEventListener('click', (e: MouseEvent) => this.#onClick(e));
    }

    onConnected() {
      if (this.#moving) return;
      emit(this, 'iswc-show');
      if (!this.hasAttribute('role')) this.setAttribute('role', 'dialog');
      // aria-modal="true" indica a lectores de pantalla que el contenido
      // fuera del dialog esta inerte (mantiene focus trap / sin Tab).
      // Se puede apagar con aria-modal="false" en el HTML para casos donde
      // la ventana convive con otros controles del usuario.
      if (!this.hasAttribute('aria-modal')) this.setAttribute('aria-modal', 'true');
      // Capturar el elemento con foco antes de abrir para restaurarlo al close.
      this.#previouslyFocused = (document.activeElement as HTMLElement | null) ?? null;
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
      this.#placeScope();
      const def = this.getAttribute('default') || 'normal';
      if (def === 'maximized') this.maximize();
      else if (def === 'minimized') this.minimize();
      else this.dataset.state = 'normal';
      // Mover foco al body de la ventana (focuseable via tabindex=0) para que
      // aria-modal="true" tenga sentido y el foco no se quede en el documento.
      // Se difiere al siguiente tick para evitar robar el foco durante el
      // connect (ej. cuando el usuario acaba de pulsar el trigger).
      queueMicrotask(() => {
        if (this.isConnected && this.#body) this.#body.focus({ preventScroll: true });
      });
      emit(this, 'iswc-after-show');
    }

    onDisconnected() {
      if (this.#moving) return;
      window.removeEventListener('pointermove', this.#onWinMove);
      window.removeEventListener('pointerup', this.#onWinUp);
      this.#dismiss.detach();
      // Restaurar foco al elemento que lo tenia antes de abrir la ventana.
      // Si ya no esta en el DOM, el browser cae al body, que es aceptable.
      if (this.#previouslyFocused && this.#previouslyFocused.isConnected) {
        try { this.#previouslyFocused.focus({ preventScroll: true }); } catch { /* noop */ }
      }
      this.#previouslyFocused = null;
      this.#reflowBars();
    }

    onAttributeChanged(name: string) {
      this.#sync();
      if (name === 'scope') this.#placeScope();
      if (name === 'scope' || name === 'position') this.#reflowBars();
    }

    /** Escape cierra; Tab se queda dentro mientras el foco esté en la ventana.
     *  El foco NO se atrapa si el usuario está fuera: iswc-window no es modal,
     *  conviven varias en pantalla y secuestrar el Tab global las rompería.
     *  Si aria-modal="true" esta activo, si se aplica el focus trap tambien
     *  con el foco en el light DOM del componente (slotted children). */
    #dismiss = createPopupDismiss(this, {
      onKeydown: (e) => {
        const insideShadow = !!this.shadowRoot!.contains(this.shadowRoot!.activeElement);
        const insideLight = this.contains(document.activeElement);
        const isModal = this.getAttribute('aria-modal') !== 'false';
        const inside = insideShadow || insideLight || (isModal && this.#isTopMostWindow());
        if (!inside) return;
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

    /** ¿Esta ventana es la de mayor zIndex entre las iswc-window visibles? Para
     *  aria-modal=true: si el usuario clico otra ventana, esta deja de ser
     *  la "top" y deberia dejar de atrapar el foco. */
    #isTopMostWindow(): boolean {
      const all = [...document.querySelectorAll<HTMLElement>('iswc-window')]
        .filter((w) => w !== this && !w.hasAttribute('hidden'));
      const myZ = Number(this.style.zIndex) || 100;
      for (const w of all) {
        const z = Number(w.style.zIndex) || 100;
        if (z > myZ) return false;
      }
      return true;
    }

    minimize() {
      if (this.#state === 'minimized') return;
      this.#lastRect = this.#rect();
      this.#state = 'minimized';
      this.#root.dataset.state = 'minimized';
      this.dataset.state = 'minimized';
      this.style.width = '';
      this.style.height = '';
      this.#raise();
      this.#reflowBars();
      emit(this, 'iswc-minimize');
    }

    maximize() {
      if (this.#state === 'maximized') return;
      if (this.#state !== 'minimized') this.#lastRect = this.#rect();
      this.#state = 'maximized';
      this.#root.dataset.state = 'maximized';
      this.dataset.state = 'maximized';
      this.style.left = '0';
      this.style.top = '0';
      this.style.right = '0';
      this.style.bottom = '0';
      this.style.width = '100%';
      this.style.height = '100%';
      this.style.transform = 'none';
      this.#reflowBars();
      emit(this, 'iswc-maximize');
    }

    restore() {
      const target = this.#state;
      this.#state = 'normal';
      this.#root.dataset.state = 'normal';
      this.dataset.state = 'normal';
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
      emit(this, 'iswc-restore', { was: target });
      this.#reflowBars();
    }

    unmaximize() {
      if (this.#state !== 'maximized') return;
      this.restore();
    }

    close() {
      emit(this, 'iswc-hide');
      this.remove();
      emit(this, 'iswc-after-hide');
    }

    #raise() {
      const all = document.querySelectorAll<HTMLElement>('iswc-window');
      let max = 0;
      all.forEach((w: HTMLElement) => { const z = Number(w.style.zIndex) || 100; if (z > max) max = z; });
      this.style.zIndex = String(max + 1);
    }

    #onHeaderDown(e: PointerEvent) {
      if (this.#state === 'maximized' || this.#state === 'minimized') return;
      if (e.target instanceof Element && e.target.closest('.ctrl')) return;
      this.#drag = { x: e.clientX, y: e.clientY, rect: this.#rect() };
      this.#header.setPointerCapture(e.pointerId);
    }

    #onResizeDown(e: PointerEvent) {
      if (this.#state === 'maximized') return;
      this.#resize = { x: e.clientX, y: e.clientY, rect: this.#rect() };
      this.#resizer.setPointerCapture(e.pointerId);
    }

    #onPointerMove(e: PointerEvent) {
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

    #onClick(e: MouseEvent) {
      const target = e.target as Element | null;
      const btn = target?.closest('[data-act]') as HTMLElement | null;
      if (this.#state === 'minimized' && !btn) { this.restore(); return; }
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

    /** Global sale del wrapper (un transform del padre atrapa al fixed) y usa el viewport. */
    #placeScope() {
      const global = this.getAttribute('scope') === 'global';
      if (global) {
        if (this.parentNode === document.body) return;
        this.#slot = { parent: this.parentNode!, next: this.nextSibling };
        this.#moving = true;
        document.body.append(this);
        this.#moving = false;
        return;
      }
      if (!this.#slot || this.parentNode !== document.body) return;
      const { parent, next } = this.#slot;
      this.#slot = null;
      this.#moving = true;
      if (next && next.parentNode === parent) parent.insertBefore(this, next);
      else parent.append(this);
      this.#moving = false;
    }

    /** Pastillas minimizadas, de izquierda a derecha, abajo del mismo contexto. */
    #reflowBars() {
      const wins = [...document.querySelectorAll('iswc-window')] as IswcWindow[];
      const groups = new Map<string, IswcWindow[]>();
      for (const w of wins) {
        if (w.#state !== 'minimized' || !w.isConnected) continue;
        const key = w.#barKey();
        const list = groups.get(key) ?? [];
        list.push(w);
        groups.set(key, list);
      }
      for (const list of groups.values()) {
        list.forEach((w, i) => {
          w.style.left = `${8 + i * 106}px`;
          w.style.top = 'auto';
          w.style.right = 'auto';
          w.style.bottom = '8px';
          w.style.transform = 'none';
          w.style.width = '';
          w.style.height = '';
        });
      }
    }

    #barKey(): string {
      if (this.getAttribute('scope') === 'global') return 'global';
      const box = this.offsetParent || this.parentElement;
      if (!box) return 'local';
      let id = boxIds.get(box);
      if (id == null) { id = ++boxSeq; boxIds.set(box, id); }
      return `local:${id}`;
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
      const minBtn = this.#root.querySelector<HTMLElement>('[data-act="min"]');
      const maxBtn = this.#root.querySelector<HTMLElement>('[data-act="max"]');
      const closeBtn = this.#root.querySelector<HTMLElement>('[data-act="close"]');
      if (minBtn) minBtn.hidden = !this.hasAttribute('minimizable');
      if (maxBtn) maxBtn.hidden = !this.hasAttribute('maximizable');
      if (closeBtn) closeBtn.hidden = !this.hasAttribute('closable');
      this.#resizer.hidden = !this.hasAttribute('resizable') || this.#state === 'maximized';
    }

    #root!: HTMLElement;
    #title!: HTMLElement;
    #body!: HTMLElement;
    #resizer!: HTMLElement;
    #header!: HTMLElement;
    #titleSlot!: HTMLSlotElement;
  }

  defineElement('iswc-window', IswcWindow);
})();
