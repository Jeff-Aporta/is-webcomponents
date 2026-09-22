import { ModalBase } from '../_shared/modal-base.js';
import { adoptCss } from '../_shared/adopt-css.js';
import '../media/icon.js';

/**
 * <is-dialog> — Modal accesible sobre la página.
 *
 * Hereda TODO el ciclo de vida de ModalBase:
 *   - open/close con animación cancelable
 *   - focus trap (Escape, Tab cycling)
 *   - backdrop light-dismiss
 *   - data-dialog="close" en hijos
 *   - slot detection header/footer/label
 *
 * Este componente solo aporta:
 *   - El template con la clase `.dialog` como contenedor modal.
 *   - Las keyframes de animación (fade + scale).
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
 *   is-show, is-after-show, is-hide (cancelable, detail.source), is-after-hide
 *
 * CSS Parts: dialog, header, title, close-button, header-actions, body, footer
 *
 * CSS custom properties
 *   --width          ancho preferido (default 500px)
 *   --spacing        padding interno (default var(--is-space-l, 1rem))
 *   --show-duration  duración de la animación de apertura
 *   --hide-duration  duración de la animación de cierre
 *   --backdrop-color color del backdrop
 */

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
        <button type="button" class="close-btn" part="close-button"
                aria-label="Cerrar">
          <is-icon icon="mdi:close" aria-hidden="true"></is-icon>
        </button>
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
  static get observedAttributes() { return super.observedAttributes; }

  constructor() {
    super();
    adoptCss(this.shadowRoot, import.meta.url);
  }

  get modalClass() { return '.dialog'; }
  get closeAttr()  { return 'data-dialog'; }

  animateOpen() {
    const dur = this.#readDur('--show-duration', 200);
    this.shadowRoot.querySelector(this.modalClass).animate(
      [
        { opacity: 0, transform: 'translateY(8px) scale(0.98)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
      ],
      { duration: dur, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'forwards' },
    );
    this.shadowRoot.querySelector('.backdrop').animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: dur, easing: 'ease-out', fill: 'forwards' },
    );
    return new Promise((resolve) => setTimeout(resolve, dur));
  }

  animateClose() {
    const dur = this.#readDur('--hide-duration', 160);
    this.shadowRoot.querySelector(this.modalClass).animate(
      [
        { opacity: 1, transform: 'translateY(0) scale(1)' },
        { opacity: 0, transform: 'translateY(8px) scale(0.98)' },
      ],
      { duration: dur, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'forwards' },
    );
    this.shadowRoot.querySelector('.backdrop').animate(
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

if (!customElements.get('is-dialog')) {
  customElements.define('is-dialog', IsDialog);
}
if (typeof window !== 'undefined') {
  window.IsDialog = IsDialog;
}
