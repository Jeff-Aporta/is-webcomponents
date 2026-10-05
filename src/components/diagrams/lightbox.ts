import { adoptCss, defineElement, emit } from '../../core/element.js';
import { withStyleAttrs } from '../../core/attrs.js';

import '../media/icon.js';
import '../actions/share-button.js';
import { createPanZoom, type PanZoomController } from '../_shared/pan-zoom.js';

/**
 * <iswc-lightbox> — visor a pantalla completa para cualquier contenido.
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
 *   iswc-after-show   dialog abierto
 *   iswc-after-hide   dialog cerrado
 *   iswc-reposition detail: { scale, x, y }
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

const VALID_VARIANT = ['backdrop', 'solid'];

/** Estado de la transformación (zoom + pan) que se aplica al `.lb-host`. */
interface ViewTransform { scale: number; x: number; y: number; }

/** Botón de la barra del lightbox (lleva `data-act`). */
function isActionable(n: EventTarget | null): n is HTMLElement {
  return n instanceof HTMLElement && !!n.dataset.act;
}

class IswcLightbox extends withStyleAttrs(HTMLElement) {

  static get observedAttributes(): string[] {
    return ['open', 'variant', 'zoomable', 'close-on-backdrop', 'toolbar', 'no-default-actions'];
  }

  #dialog!: HTMLDialogElement;
  #stage!: HTMLElement;
  #host!: HTMLElement;
  #toolbarSlot!: HTMLSlotElement;
  #defaultToolbar!: HTMLElement;
  #defaultLead!: HTMLElement;
  #defaultTrail!: HTMLElement;
  #pz: PanZoomController | null = null;
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
            <button type="button" class="lb-btn" data-act="zoom-out" title="Zoom −" aria-label="Reducir zoom">
              <iswc-icon icon="${ICON.zoomOut}"></iswc-icon>
            </button>
            <button type="button" class="lb-btn" data-act="zoom-reset" title="Restablecer zoom" aria-label="Restablecer zoom">
              <iswc-icon icon="${ICON.fit}"></iswc-icon>
            </button>
            <button type="button" class="lb-btn" data-act="zoom-in" title="Zoom +" aria-label="Aumentar zoom">
              <iswc-icon icon="${ICON.zoomIn}"></iswc-icon>
            </button>
            <iswc-share-button class="lb-share" data-act="share" share-title="" text="" url="" title="Compartir" aria-label="Compartir">
              <iswc-icon icon="${ICON.share}"></iswc-icon>
            </iswc-share-button>
            <button type="button" class="lb-btn" data-act="close" title="Cerrar" aria-label="Cerrar">
              <iswc-icon icon="${ICON.close}"></iswc-icon>
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

    // Pan/zoom: helper compartido. Rueda = pan; Ctrl+rueda = zoom; drag = pan.
    this.#pz = createPanZoom(this.#stage, this.#host, {
      onChange: (v) => {
        this.#view = { ...v };
        emit(this, 'iswc-reposition', { ...v });
      },
    });
  }

  connectedCallback(): void {

    super.connectedCallback();
    if (this.open) this.#syncOpen();
    this.#syncDefaultActions();
  }

  disconnectedCallback(): void {
    this.#pz?.destroy();
    this.#pz = null;
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
    if (!this.#pz) {
      this.#view = { scale: 1, x: 0, y: 0, ...v };
      return;
    }
    this.#pz.setView(v);
    this.#view = { ...this.#pz.view };
  }

  /** Actualiza la URL del share kit (diagram-lightbox / apps). */
  setShareUrl(url: string, title = document.title, text = ''): void {
    const share = this.shadowRoot?.querySelector<HTMLElement & { url: string; shareTitle: string; text: string }>('iswc-share-button');
    if (!share) return;
    share.url = url;
    share.shareTitle = title;
    share.text = text || title;
  }

  show() { this.open = true; }
  hide() { this.open = false; }
  resetView() {
    if (!this.#pz) {
      this.#view = { scale: 1, x: 0, y: 0 };
      return;
    }
    this.#pz.reset();
    this.#view = { ...this.#pz.view };
  }
  recenter() { this.resetView(); }
  zoomIn(factor = 1.2) { this.#pz?.zoomBy(factor); }
  zoomOut(factor: number = 1.2) { this.#pz?.zoomBy(1 / factor); }

  // ── Privados ────────────────────────────────────────────────────────────
  #syncOpen(): void {
    if (this.open) {
      this.setShareUrl(window.location.href, document.title, window.location.href);
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
        emit(this, 'iswc-after-show');
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
    // Controles estándar de editor SVG: zoom ± / fit / share / close.
    const actions = ['zoom-in', 'zoom-out', 'zoom-reset', 'share', 'close'];
    for (const a of actions) {
      const btn = this.#defaultToolbar.querySelector<HTMLElement>(`[data-act="${a}"]`);
      if (!btn) continue;
      btn.hidden = hideAll;
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
    emit(this, 'iswc-after-hide');
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
      case 'share': break; // iswc-share-button maneja el click
      case 'close': this.open = false; break;
      default: break;
    }
  };

  /* ── zoom / pan (delegado a createPanZoom) ── */

  #zoomBy(factor: number): void {
    if (!this.zoomable) return;
    this.#pz?.zoomBy(factor);
  }

  #applyView(): void {
    this.#pz?.setView(this.#view);
  }

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

defineElement('iswc-lightbox', IswcLightbox, 'IswcLightbox');

export { IswcLightbox };
