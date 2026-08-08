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
 *   dialog, header, title, close-button, header-actions, body, footer
 *
 * CSS custom properties
 *   --width          ancho preferido (default 500px)
 *   --spacing        padding interno (default var(--is-space-l, 1rem))
 *   --show-duration  duración de la animación de apertura
 *   --hide-duration  duración de la animación de cierre
 *   --backdrop-color color del backdrop
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

  class IsDialog extends ModalBase {
    static __TEMPLATE = TEMPLATE;

    get modalClass() { return '.dialog'; }
    get closeAttr() { return 'data-dialog'; }

    constructor() {
      super();
      adoptCss(this.shadowRoot, import.meta.url);
    }

    animateOpen() {
      const dur = this.#readDur('--show-duration', 200);
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
      const dur = this.#readDur('--hide-duration', 160);
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
