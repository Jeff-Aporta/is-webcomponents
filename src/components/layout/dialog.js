import { adoptCss } from '../_shared/adopt-css.js';
import '../media/icon.js';
import '../actions/button.js';
import { defineElement } from '../_shared/define.js';
import { ModalBase } from '../_shared/modal-base.js';

/**
 * <is-dialog> — Web Component (vanilla, zero dependencies).
 *
 * Modal sobre la página que requiere atención inmediata del usuario. Equivalente
 * accesible a <dialog> nativo + wa-dialog (Web Awesome).
 *
 * Todo el ciclo de vida (focus-trap, Escape, backdrop light-dismiss, restore de
 * foco, `data-dialog="close"`, eventos) vive en `_shared/modal-base.js`. Aquí
 * sólo queda el chrome propio y las animaciones.
 *
 * Atributos
 *   open              boolean — si está abierto (reflected).
 *   label             string  — título en el header (a11y).
 *   without-header    boolean — oculta el header y el botón de cerrar.
 *   light-dismiss     boolean — cierra al hacer click fuera del diálogo.
 *   backdrop-variant  none | basic — tratamiento del fondo (default: none).
 *                     none  → sin oscuridad ni blur (sigue capturando clics si light-dismiss).
 *                     basic → oscuridad + blur. Otros looks: style/class del consumidor.
 *
 * Slots
 *   (default)        contenido principal (body).
 *   label            header label propio (gana sobre el atributo label).
 *   header-actions   acciones adicionales en el header.
 *   footer           pie, normalmente con botones.
 *
 * Métodos
 *   show() / hide() / toggle()
 *
 * Eventos
 *   is-show        detail: {} — antes de abrir.
 *   is-after-show  detail: {} — tras la animación de apertura.
 *   is-hide        detail: { source } — antes de cerrar (cancelable).
 *                  source = null (Escape) | elemento que disparó el cierre.
 *   is-after-hide  detail: {} — tras la animación de cierre.
 *
 * CSS Parts
 *   dialog, header, title, close-button, header-actions, body, footer, backdrop
 *
 * CSS custom properties
 *   --width          ancho preferido (default 500px)
 *   --spacing        padding interno (default var(--is-space-l, 1rem))
 *   --show-duration  duración de la animación de apertura
 *   --hide-duration  duración de la animación de cierre
 *   --backdrop-color color del backdrop (override fino; basic ya trae uno)
 *   --backdrop-blur  radio de blur cuando variant=basic (default 8px)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="backdrop" part="backdrop"></div>
    <div class="dialog" part="dialog" role="dialog" aria-modal="true" tabindex="-1">
      <header class="header" part="header">
        <h2 class="title" part="title">
          <slot name="label"></slot>
        </h2>
        <div class="header-actions" part="header-actions">
          <slot name="header-actions"></slot>
          <is-button
            type="button"
            class="close-btn"
            part="close-button"
            variant="text"
            color="neutral"
            aria-label="Cerrar"
          >
            <is-icon icon="mdi:close" aria-hidden="true"></is-icon>
          </is-button>
        </div>
      </header>
      <div class="body" part="body">
        <slot></slot>
      </div>
      <footer class="footer" part="footer">
        <slot name="footer"></slot>
      </footer>
    </div>
  `;

  /** Valores oficiales del componente. Cualquier otro → se trata como none. */
  const BACKDROP_VARIANTS = new Set(['none', 'basic']);

  class IsDialog extends ModalBase {
    /** Personalización por atributo (ver `_shared/style-attrs.js`). */
    static styleAttrs = {
      spacing: '--is-dialog-spacing',
      width: '--is-dialog-width',
      'backdrop-color': { prop: '--is-dialog-backdrop-color', onlyColorValues: true },
      'show-duration': '--is-dialog-show-duration',
      'hide-duration': '--is-dialog-hide-duration',
    };

    static get observedAttributes() {
      return [...super.observedAttributes, 'backdrop-variant', ...IsDialog.styleAttrNames];
    }

    static __TEMPLATE = TEMPLATE;

    get modalClass() { return '.dialog'; }
    get closeAttr() { return 'data-dialog'; }

    constructor() {
      super();
      adoptCss(this.shadowRoot, import.meta.url);
    }

    /** none | basic. Ausente o inválido → none. */
    get backdropVariant() {
      const v = (this.getAttribute('backdrop-variant') || 'none').trim().toLowerCase();
      return BACKDROP_VARIANTS.has(v) ? v : 'none';
    }
    set backdropVariant(v) {
      const next = String(v ?? 'none').trim().toLowerCase();
      if (!next || next === 'none') this.removeAttribute('backdrop-variant');
      else this.setAttribute('backdrop-variant', BACKDROP_VARIANTS.has(next) ? next : 'none');
    }

    /** Serializa attrs públicos (útil en demos / JSON de preview). */
    toJSON() {
      return {
        open: this.open,
        label: this.label,
        withoutHeader: this.withoutHeader,
        lightDismiss: this.lightDismiss,
        backdropVariant: this.backdropVariant,
      };
    }

    /** Aplica un plain object (mismo shape que toJSON / demos JSON). */
    fromJSON(json) {
      if (!json || typeof json !== 'object') return this;
      if (json.open != null) this.open = !!json.open;
      if (json.label != null) this.label = String(json.label);
      if (json.withoutHeader != null) this.withoutHeader = !!json.withoutHeader;
      if (json.lightDismiss != null) this.lightDismiss = !!json.lightDismiss;
      if (json.backdropVariant != null) this.backdropVariant = json.backdropVariant;
      return this;
    }

    animateOpen() {
      const dur = this.#readDur('--is-dialog-show-duration', 200);
      this.$modal.animate(
        [
          { opacity: 0, transform: 'translateY(8px) scale(0.98)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: dur, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'forwards' },
      );
      this.$backdrop.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: dur, easing: 'ease-out', fill: 'forwards' },
      );
      return new Promise((resolve) => setTimeout(resolve, dur));
    }

    animateClose() {
      const dur = this.#readDur('--is-dialog-hide-duration', 160);
      this.$modal.animate(
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: 'translateY(8px) scale(0.98)' },
        ],
        { duration: dur, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'forwards' },
      );
      this.$backdrop.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: dur, easing: 'ease-in', fill: 'forwards' },
      );
      return new Promise((resolve) => setTimeout(resolve, dur));
    }

    #readDur(propName, fallback) {
      const v = parseFloat(getComputedStyle(this).getPropertyValue(propName));
      return Number.isFinite(v) ? v : fallback;
    }
  }

  defineElement('is-dialog', IsDialog, 'IsDialog');
})();
