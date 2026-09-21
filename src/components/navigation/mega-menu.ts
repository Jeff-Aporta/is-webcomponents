import { adoptCss, defineElement, emit } from '../../core/element.js';
import '../actions/button.js';
import '../media/icon.js';

/**
 * <is-mega-menu> — Mega-menú para e-commerce/portal masivo. Abre un panel
 * ancho con varias columnas, cada una con un encabezado, links y,
 * opcionalmente, un bloque destacado.
 *
 *   <is-mega-menu label="Catálogo" placement="bottom-start">
 *     <div slot="column" title="Muebles" icon="mdi:sofa">
 *       <a href="/sillas">Sillas</a>
 *       <a href="/mesas">Mesas</a>
 *       ...
 *     </div>
 *     <div slot="feature">
 *       Imagen + título de producto destacado.
 *     </div>
 *   </is-mega-menu>
 *
 * Accesibilidad (g13 proposals 1–25):
 *   - Trigger: aria-haspopup="menu", aria-expanded sincronizado, aria-controls.
 *   - Panel: role="menu", aria-label dinámico (atributo `label`).
 *   - Columnas slotted: role="group", aria-labelledby al título.
 *   - Items focuseables: role="menuitem", aria-disabled, tabindex=-1 salvo el activo.
 *   - Roving tabindex + ArrowDown/Up/Right/Left + Home/End + Enter/Space.
 *   - Escape cierra y devuelve foco al trigger; click fuera cierra.
 *   - Tab desde el último item cierra y mueve foco fuera (patrón no-modal).
 *   - Shift+Tab desde el primer item cierra y devuelve foco al trigger.
 *   - Reduced-motion: animation/transition: none.
 *   - Estado vacío / items disabled / overflow: no rompe el componente.
 *
 * Atributos
 *   label        texto del trigger y aria-label del panel
 *   icon         icono del trigger
 *   placement    bottom-start (default) | bottom | bottom-end | ...
 *   width        ancho del panel (default min(60rem, 92vw))
 *   hover        boolean — abre al hover, no al click
 *   disabled     boolean — bloquea apertura por trigger
 *
 * Slots
 *   column    elementos con atributo "title" e "icon" para columnas
 *   feature   bloque destacado (imagen, CTA, lo que sea)
 *
 * Eventos
 *   is-show / is-after-show   al abrir el panel
 *   is-hide / is-after-hide   al cerrarlo
 *   is-select                 detail: { href, text }
 *
 * El panel sigue siendo un <dialog> nativo en modo `show()` (no modal):
 * es un popover anclado al trigger, no un diálogo. Migrarlo a <is-dialog>
 * (ModalBase: focus-trap, backdrop, centrado) cambiaría la semántica y el
 * posicionamiento fijo que calcula #positionPanel, así que se deja como está.
 */
(() => {
  const OBSERVED = ['label', 'icon', 'placement', 'width', 'hover', 'disabled'];

  class IsMegaMenu extends HTMLElement {
    static get observedAttributes(): string[] { return OBSERVED; }
    #openTimer: ReturnType<typeof setTimeout> | null = null;
    #closeTimer: ReturnType<typeof setTimeout> | null = null;
    /** Listener temporal de outside-click; se quita al cerrar. */
    #outsideHandler: ((e: Event) => void) | null = null;
    /** Flag para evitar re-entrancia en click sobre un item (anti-doble-emit). */
    #selecting = false;
    #activeIdx = 0;
    /** Estado previo del trigger antes del focus trap. */
    #lastFocused: HTMLElement | null = null;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot!.innerHTML = /* html */ `
        <div part="root" class="root">
          <is-button part="trigger" class="trigger" variant="text" color="neutral" with-caret
                     aria-haspopup="menu" aria-expanded="false">
            <is-icon slot="start" class="trigger-icon" hidden aria-hidden="true"></is-icon>
            <span class="trigger-label"></span>
          </is-button>
          <dialog part="panel" class="panel" aria-label="Mega menú">
            <slot name="column"></slot>
            <slot name="feature"></slot>
          </dialog>
        </div>
      `;
      adoptCss(this.shadowRoot!, import.meta.url);
      this.#trigger = this.shadowRoot!.querySelector<HTMLElement>('.trigger')!;
      this.#panel = this.shadowRoot!.querySelector<HTMLDialogElement>('.panel')!;
      this.#labelEl = this.shadowRoot!.querySelector<HTMLElement>('.trigger-label')!;
      this.#iconEl = this.shadowRoot!.querySelector<HTMLElement>('.trigger-icon')!;

      this.#trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle();
      });
      this.#trigger.addEventListener('keydown', (e) => this.#onTriggerKeyDown(e));
      this.#trigger.addEventListener('mouseenter', () => this.hasAttribute('hover') && !this.hasAttribute('disabled') && this.#scheduleOpen());
      this.#trigger.addEventListener('mouseleave', () => this.hasAttribute('hover') && this.#scheduleClose());
      this.#panel.addEventListener('mouseenter', () => this.#scheduleOpen());
      this.#panel.addEventListener('mouseleave', () => this.hasAttribute('hover') && this.#scheduleClose());
      this.#panel.addEventListener('keydown', (e) => this.#onPanelKeyDown(e));
      // Capturamos 'click' en capturing para emitir is-select una sola vez.
      this.#panel.addEventListener('click', (e: Event) => this.#onPanelClick(e));
    }

    connectedCallback(): void {
      this.#sync();
      // Asegurar aria-controls en cuanto conocemos el id del panel.
      this.#trigger.setAttribute('aria-controls', this.#panelId());
      this.#panel.addEventListener('click', this.#positionPanel);
    }

    disconnectedCallback(): void {
      // Limpiar timers y listeners residuales.
      this.#clearTimers();
      this.#removeOutsideHandler();
    }

    attributeChangedCallback(name: string) {
      if (!this.isConnected) return;
      if (name === 'label') {
        this.#sync();
        this.#panel.setAttribute('aria-label', this.getAttribute('label') || 'Mega menú');
      }
      if (name === 'disabled' && this.hasAttribute('disabled') && this.isOpen()) {
        this.close();
      }
    }

    #sync() {
      this.#labelEl.textContent = this.getAttribute('label') || '';
      const icon = (this.getAttribute('icon') || '').trim();
      this.#iconEl.hidden = !icon;
      if (icon) this.#iconEl.setAttribute('icon', icon);
      else this.#iconEl.removeAttribute('icon');
      // aria-label del panel sincronizado.
      this.#panel.setAttribute('aria-label', this.getAttribute('label') || 'Mega menú');
      // Trigger deshabilitado visual y ARIA.
      this.#trigger.toggleAttribute('disabled', this.hasAttribute('disabled'));
    }

    // ──────────────────────────── API pública ────────────────────────────

    open() {
      if (this.hasAttribute('disabled')) return;
      if (this.isOpen()) return;
      emit(this, 'is-show');
      this.#clearTimers();
      this.#trigger.setAttribute('aria-expanded', 'true');
      this.#positionPanel();
      this.#panel.show();
      this.setAttribute('open', '');
      // Roles + aria-labelledby sobre columnas slotted + items focuseables.
      this.#syncAriaOnColumns();
      this.#applyRovingTabindex();
      // Situar foco en el primer item del panel.
      const items = this.#collectItems();
      this.#activeIdx = 0;
      const first = items[0];
      this.#lastFocused = this.#trigger;
      // focus al primer item al abrir (si hay items).
      if (first) {
        // requestAnimationFrame: el dialog necesita estar en DOM renderizado.
        requestAnimationFrame(() => first.focus({ preventScroll: false }));
      }
      this.#installOutsideHandler();
      emit(this, 'is-after-show');
    }

    close(returnFocus = true) {
      if (!this.isOpen()) return;
      this.#clearTimers();
      this.#panel.close();
      this.#trigger.setAttribute('aria-expanded', 'false');
      this.removeAttribute('open');
      // Reset tabindex de los items para que el siguiente open re-asigne.
      this.#clearRovingTabindex();
      if (returnFocus && this.#lastFocused && document.contains(this.#lastFocused)) {
        // El trigger debe ser el dueño del foco tras cerrar.
        try { this.#trigger.focus(); } catch { /* */ }
      }
      this.#removeOutsideHandler();
      emit(this, 'is-after-hide');
    }

    toggle() {
      this.isOpen() ? this.close(false) : this.open();
    }

    isOpen(): boolean { return this.#panel.open === true; }

    // ──────────────────────────── helpers ────────────────────────────

    #panelId(): string {
      const id = this.#panel.getAttribute('id');
      if (id) return id;
      const newId = `mega-menu-panel-${Math.random().toString(36).slice(2, 10)}`;
      this.#panel.setAttribute('id', newId);
      return newId;
    }

    /** Items focuseables dentro del panel: <a>, <button>, [tabindex]:not(-1). */
    #collectItems(): HTMLElement[] {
      const out: HTMLElement[] = [];
      const slot = this.#panel.querySelector<HTMLSlotElement>('slot[name="column"]');
      const featureSlot = this.#panel.querySelector<HTMLSlotElement>('slot[name="feature"]');
      const collect = (nodes: Node[]) => {
        for (const n of nodes) {
          if (!(n instanceof HTMLElement)) continue;
          if (n.hasAttribute('disabled') || n.getAttribute('aria-disabled') === 'true') {
            // sigue siendo item (para anunciar) pero sin foco — el skip lo hace
            // #applyRovingTabindex al no incluirlo.
            out.push(n);
            continue;
          }
          // Anclas y botones nativos.
          if (n.tagName === 'A' || n.tagName === 'BUTTON') {
            out.push(n);
            continue;
          }
          // Hijos focuseables (recursivo).
          const inner = n.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
          inner.forEach((el) => {
            if (!el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true') out.push(el);
          });
        }
      };
      if (slot) collect(slot.assignedElements({ flatten: true }));
      if (featureSlot) collect(featureSlot.assignedElements({ flatten: true }));
      // Dedup preservando orden.
      const seen = new Set<HTMLElement>();
      return out.filter((el) => {
        if (seen.has(el)) return false;
        seen.add(el);
        return true;
      });
    }

    /** Items realmente focuseables (excluye disabled/aria-disabled). */
    #focusableItems(): HTMLElement[] {
      return this.#collectItems().filter((el) =>
        !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true',
      );
    }

    #syncAriaOnColumns() {
      const slot = this.#panel.querySelector<HTMLSlotElement>('slot[name="column"]');
      if (!slot) return;
      const cols = slot.assignedElements({ flatten: true });
      cols.forEach((col, i) => {
        if (!(col instanceof HTMLElement)) return;
        if (!col.hasAttribute('role')) col.setAttribute('role', 'group');
        const titleEl = col.hasAttribute('title') ? col : null;
        const title = titleEl?.getAttribute('title')?.trim();
        if (title) {
          // Crea/asegura un heading interno para que aria-labelledby apunte a él.
          let headingId = col.getAttribute('data-col-heading');
          if (!headingId) {
            headingId = `mega-menu-col-heading-${Math.random().toString(36).slice(2, 8)}`;
            col.setAttribute('data-col-heading', headingId);
            const h = document.createElement('span');
            h.id = headingId;
            h.className = 'sr-only';
            h.textContent = title;
            col.prepend(h);
          }
          col.setAttribute('aria-labelledby', headingId);
        }
        // Items focuseables: role="menuitem" + aria-disabled coherente.
        const items = col.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
        items.forEach((it) => {
          if (!it.hasAttribute('role')) it.setAttribute('role', 'menuitem');
        });
        // Asegura un id estable para aria-controls/col-index.
        if (!col.id) col.id = `mega-menu-col-${i}-${Math.random().toString(36).slice(2, 8)}`;
      });
      // Lo mismo para el feature slot.
      const featSlot = this.#panel.querySelector<HTMLSlotElement>('slot[name="feature"]');
      if (featSlot) {
        const feats = featSlot.assignedElements({ flatten: true });
        feats.forEach((fe) => {
          if (!(fe instanceof HTMLElement)) return;
          if (!fe.hasAttribute('role')) fe.setAttribute('role', 'group');
        });
      }
    }

    #applyRovingTabindex() {
      const items = this.#focusableItems();
      items.forEach((it, i) => {
        if (i === this.#activeIdx) it.setAttribute('tabindex', '0');
        else it.setAttribute('tabindex', '-1');
      });
    }

    #clearRovingTabindex() {
      const items = this.#collectItems();
      items.forEach((it) => it.removeAttribute('tabindex'));
    }

    #focusItem(idx: number) {
      const items = this.#focusableItems();
      if (items.length === 0) return;
      // Wrap-around: clamp + wrap.
      const next = ((idx % items.length) + items.length) % items.length;
      this.#activeIdx = next;
      this.#applyRovingTabindex();
      const target = items[next];
      if (target) {
        target.focus({ preventScroll: false });
        // Si el item está fuera del viewport del panel, hacer scrollIntoView.
        try { target.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch { /* */ }
      }
    }

    // ──────────────────────────── teclado ────────────────────────────

    #onTriggerKeyDown(e: KeyboardEvent) {
      if (this.hasAttribute('disabled')) return;
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.open();
      }
    }

    #onPanelKeyDown(e: KeyboardEvent) {
      if (!this.isOpen()) return;
      const items = this.#focusableItems();
      const active = document.activeElement as HTMLElement | null;
      const idx = active ? items.indexOf(active) : -1;
      // Si el foco está en el panel pero no en un item, los atajos deben
      // funcionar igualmente.
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          this.close(true);
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.#focusItem(idx >= 0 ? idx + 1 : 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.#focusItem(idx >= 0 ? Math.max(idx - 1, 0) : 0);
          break;
        case 'Home':
          e.preventDefault();
          this.#focusItem(0);
          break;
        case 'End':
          e.preventDefault();
          this.#focusItem(items.length - 1);
          break;
        case 'ArrowRight': {
          // Salta al primer item del "siguiente grupo". Como las columnas son
          // grupos visuales, recorremos todos los items; semánticamente:
          // avanza al siguiente item focuseable (equivale a ArrowDown si solo
          // hay una columna de items consecutivos). Mantenemos wrap-around.
          e.preventDefault();
          this.#focusItem(idx >= 0 ? idx + 1 : 0);
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          this.#focusItem(idx >= 0 ? idx - 1 : 0);
          break;
        }
        case 'Tab':
          // Patrón no-modal: Tab desde el último item cierra y deja seguir.
          // Shift+Tab desde el primer item cierra y devuelve foco al trigger.
          if (items.length === 0) return;
          const last = items.length - 1;
          if (!e.shiftKey && idx === last) {
            this.close(false); // devuelve el foco al navegador, no al trigger.
          } else if (e.shiftKey && idx === 0) {
            e.preventDefault();
            this.close(true); // cierra + devuelve foco al trigger.
          }
          break;
        case 'Enter':
        case ' ': {
          if (active && items.includes(active)) {
            e.preventDefault();
            // El click ya emite is-select; simularlo.
            active.click();
          }
          break;
        }
      }
    }

    #onPanelClick(e: Event) {
      if (this.#selecting) return;
      if (!(e.target instanceof Element)) return;
      const a = e.target.closest('a[href], button, [role="menuitem"]');
      if (!a) return;
      // Es un item interactivo: emitir is-select con su detalle si lo tiene.
      const href = a.getAttribute('href') || null;
      const text = (a.textContent || '').trim();
      if (href) {
        this.#selecting = true;
        emit(this, 'is-select', { href, text });
        // Cerrar de forma asíncrona para que el consumidor reciba el evento
        // antes del cierre (algunos handlers necesitan leer isOpen).
        queueMicrotask(() => {
          this.#selecting = false;
          this.close(false);
        });
      } else if (a.tagName === 'BUTTON') {
        // Botón sin href: emitir evento genérico y dejar al consumidor decidir.
        emit(this, 'is-select', { href: null, text });
        this.close(false);
      }
    }

    #positionPanel = () => {
      const placement = this.getAttribute('placement') || 'bottom-start';
      const rect = this.#trigger.getBoundingClientRect();
      const maxW = Math.min(960, window.innerWidth - 32);
      const raw = (this.getAttribute('width') || '').trim();
      const parsed = Number.parseFloat(raw);
      const panelWidth = Number.isFinite(parsed) && parsed > 0
        ? Math.min(parsed, maxW)
        : maxW;
      this.#panel.style.width = raw && !Number.isFinite(parsed) ? raw : `${panelWidth}px`;
      this.#panel.style.maxWidth = `${maxW}px`;
      const top = rect.bottom + 8;
      this.#panel.style.top = `${top}px`;
      const left = placement.endsWith('-end')
        ? Math.max(rect.right - panelWidth, 8)
        : Math.max(rect.left, 8);
      this.#panel.style.left = `${Math.min(left, window.innerWidth - panelWidth - 8)}px`;
    };

    #scheduleOpen() {
      if (this.hasAttribute('disabled')) return;
      if (this.isOpen()) return;
      if (this.#closeTimer !== null) clearTimeout(this.#closeTimer);
      this.#openTimer = setTimeout(() => this.open(), 90);
    }
    #scheduleClose() {
      if (!this.isOpen()) return;
      if (this.#openTimer !== null) clearTimeout(this.#openTimer);
      this.#closeTimer = setTimeout(() => this.close(false), 220);
    }

    #clearTimers() {
      if (this.#openTimer !== null) { clearTimeout(this.#openTimer); this.#openTimer = null; }
      if (this.#closeTimer !== null) { clearTimeout(this.#closeTimer); this.#closeTimer = null; }
    }

    // ─────────────────────── outside click ───────────────────────

    #installOutsideHandler() {
      if (this.#outsideHandler) return;
      const handler = (e: Event) => {
        if (!this.isOpen()) return;
        const path = e.composedPath();
        // Si el evento ocurre dentro del subtree del host, ignorar.
        if (path.includes(this)) return;
        // Cerrar sin devolver foco al trigger (patrón no-modal: el navegador
        // ya ha movido el foco al hacer click fuera).
        this.close(false);
      };
      this.#outsideHandler = handler;
      // mousedown en capturing para detectar antes que otros handlers.
      document.addEventListener('mousedown', handler, true);
      // Para entornos táctiles.
      document.addEventListener('touchstart', handler, true);
    }

    #removeOutsideHandler() {
      if (!this.#outsideHandler) return;
      document.removeEventListener('mousedown', this.#outsideHandler, true);
      document.removeEventListener('touchstart', this.#outsideHandler, true);
      this.#outsideHandler = null;
    }

    #trigger!: HTMLElement;
    #panel!: HTMLDialogElement;
    #labelEl!: HTMLElement;
    #iconEl!: HTMLElement;
  }

  defineElement('is-mega-menu', IsMegaMenu);
})();
