import { adoptCss } from '../_shared/adopt-css.js';
import '../media/icon.js';

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
 *   is-open       dialog abierto
 *   is-close      dialog cerrado
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

class IsLightbox extends HTMLElement {
  static get observedAttributes() {
    return ['open', 'zoomable', 'close-on-backdrop', 'toolbar', 'no-default-actions'];
  }

  #dialog;
  #stage;
  #host;
  #toolbarSlot;
  #defaultToolbar;
  #defaultLead;
  #defaultTrail;
  #drag = null;
  #dragged = false;
  #view = { scale: 1, x: 0, y: 0 };

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
    this.#dialog = shadow.querySelector('.lb');
    this.#stage = shadow.querySelector('.lb-stage');
    this.#host = shadow.querySelector('.lb-host');
    this.#toolbarSlot = shadow.querySelector('slot[name="toolbar"]');
    this.#defaultToolbar = shadow.querySelector('.lb-bar');
    this.#defaultLead = shadow.querySelector('.lb-bar__lead');
    this.#defaultTrail = shadow.querySelector('.lb-bar__trail');

    shadow.addEventListener('click', this.#onClick);
    shadow.addEventListener('slotchange', this.#onSlotChange);
    this.#dialog.addEventListener('close', this.#onDialogClose);
    this.#dialog.addEventListener('cancel', this.#onDialogCancel);
    this.#dialog.addEventListener('click', this.#onDialogClick);
    this.#stage.addEventListener('wheel', this.#onWheel, { passive: false });
    this.#stage.addEventListener('pointerdown', this.#onPointerDown);
    this.#stage.addEventListener('click', this.#onStageClick, true);
  }

  connectedCallback() {
    if (this.open) this.#syncOpen();
    this.#syncDefaultActions();
  }

  disconnectedCallback() {
    window.removeEventListener('pointermove', this.#onPointerMove);
    window.removeEventListener('pointerup', this.#onPointerUp, { once: true });
    if (this.#dialog.open) this.#dialog.close();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if (name === 'open') this.#syncOpen();
    else if (name === 'no-default-actions') this.#syncDefaultActions();
  }

  // ── API pública ─────────────────────────────────────────────────────────
  get open() { return this.hasAttribute('open'); }
  set open(v) { v ? this.setAttribute('open', '') : this.removeAttribute('open'); }

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

  get view() { return { ...this.#view }; }
  set view(v) {
    this.#view = { scale: 1, x: 0, y: 0, ...v };
    this.#applyView();
  }

  show() { this.open = true; }
  hide() { this.open = false; }
  resetView() { this.view = { scale: 1, x: 0, y: 0 }; }
  recenter() { this.resetView(); }
  zoomIn(factor = 1.2) { this.#zoomBy(factor); }
  zoomOut(factor = 1.2) { this.#zoomBy(1 / factor); }

  // ── Privados ────────────────────────────────────────────────────────────
  #syncOpen() {
    if (this.open) {
      if (!this.#dialog.open) {
        this.#dialog.showModal();
        this.dispatchEvent(new CustomEvent('is-open', { bubbles: true, composed: true }));
      }
    } else if (this.#dialog.open) {
      this.#dialog.close();
    }
  }

  #syncDefaultActions() {
    const hideAll = this.noDefaultActions;
    const actions = ['zoom-in', 'zoom-out', 'zoom-reset', 'share', 'close'];
    for (const a of actions) {
      const btn = this.#defaultToolbar.querySelector(`[data-act="${a}"]`);
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
    this.dispatchEvent(new CustomEvent('is-close', { bubbles: true, composed: true }));
  };

  #onDialogCancel = (e) => {
    if (!this.closeOnBackdrop) e.preventDefault();
  };

  #onDialogClick = (e) => {
    // Click sobre el backdrop (fuera del stage) cierra si está permitido.
    if (!this.closeOnBackdrop) return;
    if (e.target === this.#dialog) this.open = false;
  };

  #onClick = (e) => {
    const btn = e.composedPath().find((n) => n?.dataset?.act);
    if (!btn) return;
    switch (btn.dataset.act) {
      case 'zoom-in': this.zoomIn(); break;
      case 'zoom-out': this.zoomOut(); break;
      case 'zoom-reset': this.resetView(); break;
      case 'share': this.#share(); break;
      case 'close': this.open = false; break;
      default: break;
    }
  };

  async #share() {
    const url = window.location.href;
    const done = () => {
      const t = this.shadowRoot.querySelector('.lb-toast');
      if (!t) return;
      t.hidden = false;
      setTimeout(() => { t.hidden = true; }, 1800);
    };
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
    } catch { /* noop */ }
    done();
    this.dispatchEvent(new CustomEvent('is-share', {
      bubbles: true, composed: true, detail: { url },
    }));
  }

  /* ── zoom / pan ── */

  #zoomBy(factor) {
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

  #applyView() {
    const { scale, x, y } = this.#view;
    this.#host.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    this.dispatchEvent(new CustomEvent('is-reposition', {
      bubbles: true, composed: true, detail: { ...this.#view },
    }));
  }

  /** Zoom anclado al cursor: el punto bajo el puntero no se mueve. */
  #onWheel = (e) => {
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

  #onPointerDown = (e) => {
    if (!this.zoomable || e.button !== 0) return;
    this.#drag = {
      sx: e.clientX, sy: e.clientY, ox: this.#view.x, oy: this.#view.y, moved: false,
    };
    window.addEventListener('pointermove', this.#onPointerMove);
    window.addEventListener('pointerup', this.#onPointerUp, { once: true });
  };

  #onPointerMove = (e) => {
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

  #onPointerUp = () => {
    this.#dragged = !!this.#drag?.moved;
    this.#drag = null;
    delete this.#stage.dataset.panning;
    window.removeEventListener('pointermove', this.#onPointerMove);
  };

  /** Tras un pan, el clic de cierre del gesto no debe activar nada del contenido. */
  #onStageClick = (e) => {
    if (!this.#dragged) return;
    this.#dragged = false;
    e.stopPropagation();
    e.preventDefault();
  };
}

if (!customElements.get('is-lightbox')) {
  customElements.define('is-lightbox', IsLightbox);
}
if (typeof window !== 'undefined') window.IsLightbox = IsLightbox;

export { IsLightbox };
