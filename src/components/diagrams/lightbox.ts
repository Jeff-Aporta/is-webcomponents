import { adoptCss, defineElement, emit } from '../../core/element.js';
import { withStyleAttrs } from '../../core/attrs.js';

import '../media/icon.js';
import { sharePayload } from '../_shared/web-share.js';

/**
 * <is-lightbox> — visor a pantalla completa para cualquier contenido.
 *
 * Es el building block que ya usaba el visor de diagramas, pero ahora
 * pensado como componente genérico: lo que metas en el slot default se
 * muestra dentro de un <dialog> top-layer, con zoom + pan anclado al
 * cursor y una barra de herramientas personalizable.
 *
 * Slots:
 *   default    Contenido a mostrar (cualquier elemento). El host aplica
 *              transform translate/scale sobre un envoltorio interno
 *              (.lb-host) que recibe el contenido vía slot.
 *   toolbar    Si está presente, sustituye la barra por defecto.
 *   code-panel Si está presente, sustituye el panel de código built-in.
 *
 * Atributos:
 *   open               bool   Muestra/oculta el visor
 *   variant            "backdrop" | "solid"  (default backdrop)
 *                          backdrop = ::backdrop 20% oscuro + blur 2px, dialog transparente
 *                          solid    = lienzo opaco a pantalla completa
 *   zoomable           bool   Habilita zoom + pan (default true)
 *   close-on-backdrop  bool   Click fuera cierra (default true)
 *   toolbar            "auto" | "none" | "default"   "auto" = usa la barra
 *                          por defecto si el slot está vacío, "none" = oculta
 *                          la barra por completo aunque haya slot
 *   no-default-actions bool   Oculta los botones por defecto (close, share,
 *                          fit) sin tocar los slots
 *
 * Propiedades:
 *   view  { scale, x, y }   Zoom/pan actual (lectura/escritura)
 *
 * Métodos:
 *   show()               Abre el dialog
 *   hide()               Cierra el dialog
 *   recenter()           Ajusta el contenido al área visible
 *   zoomIn(factor=1.2)   Zoom +
 *   zoomOut(factor=1.2)  Zoom −
 *   resetView()          scale=1, x=0, y=0
 *
 * Eventos:
 *   is-after-show   dialog abierto
 *   is-after-hide   dialog cerrado
 *   is-reposition detail: { scale, x, y }
 *
 * CSS parts: dialog, toolbar, toolbar__lead, toolbar__trail, stage,
 *            host, code-panel, code-panel__area, code-panel__actions,
 *            toast
 * CSS vars:  --lb-radius, --lb-bg, --lb-fg, --lb-border, --lb-shadow,
 *            --lb-toolbar-bg, --lb-backdrop
 */

const ICON = {
  close: 'mdi:close',
  share: 'mdi:share-variant-outline',
  fit: 'mdi:fit-to-screen-outline',
  zoomIn: 'mdi:magnify-plus-outline',
  zoomOut: 'mdi:magnify-minus-outline',
};

/** Holgura antes de tratar un pointerdown como pan y no como clic. */
const PAN_THRESHOLD_PX = 4;

const VALID_VARIANT = ['backdrop', 'solid'];

/** Estado de la transformación (zoom + pan) que se aplica al `.lb-host`. */
interface ViewTransform { scale: number; x: number; y: number; }

/** Estado del gesto de pan en curso (entre pointerdown y pointerup). */
interface DragState {
  sx: number;
  sy: number;
  ox: number;
  oy: number;
  moved: boolean;
}

/** Botón de la barra del lightbox (lleva `data-act`). */
function isActionable(n: EventTarget | null): n is HTMLElement {
  return n instanceof HTMLElement && !!n.dataset.act;
}

class IsLightbox extends withStyleAttrs(HTMLElement) {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    bg: { prop: '--is-lightbox-bg', onlyColorValues: true },
    'text-color': { prop: '--is-lightbox-text', onlyColorValues: true },
    'border-color': { prop: '--is-lightbox-border', onlyColorValues: true },
    'backdrop-color': { prop: '--is-lightbox-backdrop', onlyColorValues: true },
    'backdrop-blur': '--is-lightbox-backdrop-blur',
    };

  static get observedAttributes(): string[] {
    return ['open', 'variant', 'zoomable', 'close-on-backdrop', 'toolbar', 'no-default-actions',
      ...IsLightbox.styleAttrNames];
  }

  #dialog!: HTMLDialogElement;
  #stage!: HTMLElement;
  #host!: HTMLElement;
  #toolbarSlot!: HTMLSlotElement;
  #defaultToolbar!: HTMLElement;
  #defaultLead!: HTMLElement;
  #defaultTrail!: HTMLElement;
  #drag: DragState | null = null;
  #dragged = false;
  #view: ViewTransform = { scale: 1, x: 0, y: 0 };
  /** Foco que tenía el elemento antes de abrir el lightbox: se restaura al
   *  cerrar (g06 #13). El <dialog> top-layer ya da role=dialog + aria-modal
   *  nativos; lo que añadimos es la pieza de focus restoration + cycling. */
  #prevFocus: Element | null = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = /* html */ `
      <dialog part="dialog" class="lb">
        <div class="lb-bar" part="toolbar">
          <div class="lb-bar__group lb-bar__lead" part="toolbar__lead">
            <slot name="toolbar-lead"></slot>
          </div>
          <div class="lb-bar__group lb-bar__trail" part="toolbar__trail">
            <slot name="toolbar"></slot>
            <button type="button" class="lb-btn" data-act="zoom-out" title="Zoom −" aria-label="Reducir zoom" hidden>
              <is-icon icon="${ICON.zoomOut}"></is-icon>
            </button>
            <button type="button" class="lb-btn" data-act="zoom-reset" title="Restablecer zoom" aria-label="Restablecer zoom" hidden>
              <is-icon icon="${ICON.fit}"></is-icon>
            </button>
            <button type="button" class="lb-btn" data-act="zoom-in" title="Zoom +" aria-label="Aumentar zoom" hidden>
              <is-icon icon="${ICON.zoomIn}"></is-icon>
            </button>
            <button type="button" class="lb-btn" data-act="share" title="Copiar enlace" aria-label="Copiar enlace" hidden>
              <is-icon icon="${ICON.share}"></is-icon>
            </button>
            <button type="button" class="lb-btn" data-act="close" title="Cerrar" aria-label="Cerrar">
              <is-icon icon="${ICON.close}"></is-icon>
            </button>
          </div>
        </div>

        <div class="lb-stage" part="stage">
          <div class="lb-host" part="host"><slot></slot></div>
        </div>

        <div class="lb-code" part="code-panel" hidden>
          <slot name="code-panel"></slot>
        </div>

        <div class="lb-toast" part="toast" hidden>Enlace copiado al portapapeles</div>
      </dialog>
    `;
    adoptCss(shadow, import.meta.url);
    this.#dialog = shadow.querySelector<HTMLDialogElement>('.lb')!;
    this.#stage = shadow.querySelector<HTMLElement>('.lb-stage')!;
    this.#host = shadow.querySelector<HTMLElement>('.lb-host')!;
    this.#toolbarSlot = shadow.querySelector<HTMLSlotElement>('slot[name="toolbar"]')!;
    this.#defaultToolbar = shadow.querySelector<HTMLElement>('.lb-bar')!;
    this.#defaultLead = shadow.querySelector<HTMLElement>('.lb-bar__lead')!;
    this.#defaultTrail = shadow.querySelector<HTMLElement>('.lb-bar__trail')!;

    // Los listeners con firmas específicas (PointerEvent) no encajan en la
    // sobrecarga por defecto de `addEventListener` (`(evt: Event) => any`);
    // casteamos a `EventListener` para preservar la precisión interna.
    shadow.addEventListener('click', this.#onClick as EventListener);
    shadow.addEventListener('slotchange', this.#onSlotChange as EventListener);
    this.#dialog.addEventListener('close', this.#onDialogClose as EventListener);
    this.#dialog.addEventListener('cancel', this.#onDialogCancel as EventListener);
    this.#dialog.addEventListener('click', this.#onDialogClick as EventListener);
    // Focus trap: cycling Tab/Shift+Tab dentro del dialog (g06 #13).
    this.#dialog.addEventListener('keydown', this.#onDialogKeydown as EventListener);
    this.#stage.addEventListener('wheel', this.#onWheel as EventListener, { passive: false });
    this.#stage.addEventListener('pointerdown', this.#onPointerDown as EventListener);
    this.#stage.addEventListener('click', this.#onStageClick as EventListener, true);
  }

  connectedCallback(): void {

    super.connectedCallback();
    if (this.open) this.#syncOpen();
    this.#syncDefaultActions();
  }

  disconnectedCallback(): void {
    window.removeEventListener('pointermove', this.#onPointerMove as EventListener);
    // `once` vive en `AddEventListenerOptions`, no en `EventListenerOptions`:
    // casteamos el objeto a la forma completa para silenciar la sobrecarga
    // estricta de la firma de Window.
    window.removeEventListener('pointerup', this.#onPointerUp as EventListener, { once: true } as AddEventListenerOptions);
    if (this.#dialog.open) this.#dialog.close();
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {

    super.attributeChangedCallback(name, oldVal, newVal);
    if (oldVal === newVal) return;
    if (name === 'open') this.#syncOpen();
    else if (name === 'no-default-actions') this.#syncDefaultActions();
  }

  // ── API pública ─────────────────────────────────────────────────────────
  get open() { return this.hasAttribute('open'); }
  set open(v) { v ? this.setAttribute('open', '') : this.removeAttribute('open'); }

  get variant() {
    const v = this.getAttribute('variant');
    return v != null && VALID_VARIANT.includes(v) ? v : 'backdrop';
  }
  set variant(v) {
    if (v == null || v === '' || v === 'backdrop') this.removeAttribute('variant');
    else this.setAttribute('variant', VALID_VARIANT.includes(v) ? v : 'backdrop');
  }

  get zoomable() { return this.hasAttribute('zoomable') ? this.getAttribute('zoomable') !== 'false' : true; }
  set zoomable(v) { this.toggleAttribute('zoomable', !!v); }

  get closeOnBackdrop() { return !this.hasAttribute('close-on-backdrop') || this.getAttribute('close-on-backdrop') !== 'false'; }
  set closeOnBackdrop(v) { this.toggleAttribute('close-on-backdrop', !!v); }

  get toolbar() { return this.getAttribute('toolbar') || 'auto'; }
  set toolbar(v) {
    if (!v) this.removeAttribute('toolbar'); else this.setAttribute('toolbar', v);
  }

  get noDefaultActions() { return this.hasAttribute('no-default-actions'); }
  set noDefaultActions(v) { this.toggleAttribute('no-default-actions', !!v); }

  get view(): ViewTransform { return { ...this.#view }; }
  set view(v: Partial<ViewTransform>) {
    // `Object.assign` evita la trampa de spread (TS marca `scale`/`x`/`y`
    // como "specified more than once" cuando se hace `{...defaults, ...v}`).
    this.#view = Object.assign({ scale: 1, x: 0, y: 0 }, v);
    this.#applyView();
  }

  show() { this.open = true; }
  hide() { this.open = false; }
  resetView() { this.view = { scale: 1, x: 0, y: 0 }; }
  recenter() { this.resetView(); }
  zoomIn(factor = 1.2) { this.#zoomBy(factor); }
  zoomOut(factor: number = 1.2) { this.#zoomBy(1 / factor); }

  // ── Privados ────────────────────────────────────────────────────────────
  #syncOpen(): void {
    if (this.open) {
      if (!this.#dialog.open) {
        // Antes de abrir, recuerda el foco activo para restaurarlo al cerrar.
        this.#prevFocus = document.activeElement;
        this.#dialog.showModal();
        // ARIA: el <dialog> top-layer ya expone role=dialog + aria-modal=true
        // cuando se abre con showModal(); añadimos aria-label si el consumidor
        // no lo puso (g06 #13).
        if (!this.#dialog.getAttribute('aria-label')) {
          this.#dialog.setAttribute('aria-label', 'Visor a pantalla completa');
        }
        // Mueve el foco al primer control lógico del toolbar (close por
        // defecto) para que el usuario de teclado tenga un ancla clara.
        const first = this.#defaultToolbar.querySelector<HTMLElement>('[data-act="close"]');
        (first ?? this.#dialog).focus();
        emit(this, 'is-after-show');
      }
    } else if (this.#dialog.open) {
      this.#dialog.close();
    }
  }

  #restoreFocus(): void {
    // Restaura el foco al elemento que lo tenía antes de abrir. Solo si aún
    // es focuseable (puede haber sido desmontado); si no, lo deja en el body.
    const prev = this.#prevFocus as HTMLElement | null;
    this.#prevFocus = null;
    if (prev && typeof prev.focus === 'function' && prev.isConnected) {
      try { prev.focus(); } catch { /* no-op */ }
    }
  }

  #syncDefaultActions() {
    const hideAll = this.noDefaultActions;
    const actions = ['zoom-in', 'zoom-out', 'zoom-reset', 'share', 'close'];
    for (const a of actions) {
      const btn = this.#defaultToolbar.querySelector<HTMLElement>(`[data-act="${a}"]`);
      if (!btn) continue;
      // close siempre visible a menos que el usuario la oculte vía slot/override.
      const forceHide = hideAll || (a !== 'close' && a !== 'zoom-reset');
      btn.hidden = forceHide;
    }
  }

  #onSlotChange = () => {
    // Si el slot tiene contenido, ocultamos los botones por defecto que ya no aportan.
    const hasUserToolbar = this.#toolbarSlot.assignedElements({ flatten: true }).length > 0;
    if (hasUserToolbar) {
      this.#defaultToolbar.classList.add('lb-bar--has-user-toolbar');
    } else {
      this.#defaultToolbar.classList.remove('lb-bar--has-user-toolbar');
    }
  };

  #onDialogClose = () => {
    if (this.open) this.removeAttribute('open');
    this.#restoreFocus();
    emit(this, 'is-after-hide');
  };

  #onDialogCancel = (e: Event): void => {
    if (!this.closeOnBackdrop) e.preventDefault();
  };

  #onDialogClick = (e: MouseEvent): void => {
    // Click sobre el backdrop (fuera del stage) cierra si está permitido.
    if (!this.closeOnBackdrop) return;
    if (e.target === this.#dialog) this.open = false;
  };

  #onClick = (e: MouseEvent): void => {
    const btn = e.composedPath().find(isActionable);
    if (!btn) return;
    const act = btn.dataset.act;
    switch (act) {
      case 'zoom-in': this.zoomIn(); break;
      case 'zoom-out': this.zoomOut(); break;
      case 'zoom-reset': this.resetView(); break;
      case 'share': this.#share(); break;
      case 'close': this.open = false; break;
      default: break;
    }
  };

  async #share(): Promise<void> {
    const url = window.location.href;
    const how = await sharePayload({ title: document.title, url, text: url });
    if (how === 'abort') return;
    const t = this.shadowRoot!.querySelector<HTMLElement>('.lb-toast');
    if (t) {
      t.hidden = false;
      setTimeout(() => { t.hidden = true; }, 1800);
    }
    emit(this, 'is-share', { url, how });
  }

  /* ── zoom / pan ── */

  #zoomBy(factor: number): void {
    if (!this.zoomable) return;
    const next = Math.max(0.3, Math.min(6, this.#view.scale * factor));
    const k = next / this.#view.scale;
    if (k === 1) return;
    const rect = this.#stage.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    this.#view.x = (cx - cx) * (1 - k) + this.#view.x * k;
    this.#view.y = (cy - cy) * (1 - k) + this.#view.y * k;
    this.#view.scale = next;
    this.#applyView();
  }

  #applyView(): void {
    const { scale, x, y } = this.#view;
    this.#host.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    emit(this, 'is-reposition', { ...this.#view });
  }

  /** Zoom anclado al cursor: el punto bajo el puntero no se mueve. */
  #onWheel = (e: WheelEvent): void => {
    if (!this.zoomable) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const next = Math.max(0.3, Math.min(6, this.#view.scale * factor));
    const k = next / this.#view.scale;
    if (k === 1) return;
    const rect = this.#stage.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    this.#view.x = (e.clientX - cx) * (1 - k) + this.#view.x * k;
    this.#view.y = (e.clientY - cy) * (1 - k) + this.#view.y * k;
    this.#view.scale = next;
    this.#applyView();
  };

  #onPointerDown = (e: PointerEvent): void => {
    if (!this.zoomable || e.button !== 0) return;
    this.#drag = {
      sx: e.clientX, sy: e.clientY, ox: this.#view.x, oy: this.#view.y, moved: false,
    };
    window.addEventListener('pointermove', this.#onPointerMove as EventListener);
    window.addEventListener('pointerup', this.#onPointerUp as EventListener, { once: true });
  };

  #onPointerMove = (e: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag) return;
    const dx = e.clientX - drag.sx;
    const dy = e.clientY - drag.sy;
    if (!drag.moved && Math.abs(dx) < PAN_THRESHOLD_PX && Math.abs(dy) < PAN_THRESHOLD_PX) return;
    drag.moved = true;
    this.#stage.dataset.panning = '';
    this.#view.x = drag.ox + dx;
    this.#view.y = drag.oy + dy;
    this.#applyView();
  };

  #onPointerUp = (): void => {
    this.#dragged = !!this.#drag?.moved;
    this.#drag = null;
    delete this.#stage.dataset.panning;
    window.removeEventListener('pointermove', this.#onPointerMove as EventListener);
  };

  /** Tras un pan, el clic de cierre del gesto no debe activar nada del contenido. */
  #onStageClick = (e: MouseEvent): void => {
    if (!this.#dragged) return;
    this.#dragged = false;
    e.stopPropagation();
    e.preventDefault();
  };

  /** Focus trap básico: si Tab/Shift+Tab sale del dialog, lo cicla al
   *  otro extremo (g06 #13). El `<dialog>` top-layer ya aísla el foco del
   *  resto del documento, pero el cycling interno no lo da por defecto. */
  #onDialogKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab') return;
    const ae = this.shadowRoot?.activeElement;
    if (!ae || !this.#dialog.contains(ae)) return;
    const focusables = this.#collectFocusables();
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const activeIdx = focusables.indexOf(ae as HTMLElement);
    if (e.shiftKey && activeIdx <= 0) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && activeIdx === focusables.length - 1) {
      e.preventDefault();
      first.focus();
    }
  };

  #collectFocusables(): HTMLElement[] {
    const sel = 'button:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"]), textarea:not([disabled]), input:not([disabled])';
    const inDialog = Array.from(this.#dialog.querySelectorAll<HTMLElement>(sel))
      .filter((el) => el.tagName === 'BUTTON' || el.offsetParent !== null);
    return inDialog;
  }
}

defineElement('is-lightbox', IsLightbox, 'IsLightbox');

export { IsLightbox };
