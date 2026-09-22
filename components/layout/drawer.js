import { ModalBase } from '../_shared/modal-base.js';
import { adoptCss } from '../_shared/adopt-css.js';
import '../media/icon.js';

/**
 * <is-drawer> — Panel lateral que se desliza desde un borde.
 *
 * Hereda TODO el ciclo de vida de ModalBase (open/close, focus, light-dismiss,
 * data-drawer="close", slots). Aporta solo:
 *   - Template con la clase `.drawer` como contenedor modal.
 *   - Atributo `placement` (start | end | top | bottom).
 *   - Animaciones de slide (horizontal/vertical según placement).
 *
 * Atributos
 *   open              boolean — si está abierto (reflected).
 *   label             string  — título en el header (a11y).
 *   placement         start | end | top | bottom  (default 'end').
 *   without-header    boolean — oculta el header y el botón de cerrar.
 *   light-dismiss     boolean — cierra al hacer click fuera.
 *
 * Slots
 *   (default)        contenido principal (body).
 *   label            header label propio.
 *   header-actions   acciones adicionales en el header.
 *   footer           pie del drawer.
 *
 * Métodos: show() / hide() / toggle()
 *
 * Eventos: is-show, is-after-show, is-hide (cancelable, detail.source), is-after-hide
 *
 * CSS Parts: drawer, header, title, close-button, header-actions, body, footer
 *
 * CSS custom properties
 *   --size            tamaño preferido (ancho o alto según placement)
 *   --spacing         padding interno
 *   --show-duration, --hide-duration
 *   --backdrop-color
 */

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <div class="backdrop" part="backdrop"></div>
  <div class="drawer" part="drawer" role="dialog" aria-modal="true" tabindex="-1">
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

const VALID_PLACEMENT = ['start', 'end', 'top', 'bottom'];

class IsDrawer extends ModalBase {
  static __TEMPLATE = TEMPLATE;
  static get observedAttributes() {
    return [...super.observedAttributes, 'placement'];
  }

  constructor() {
    super();
    adoptCss(this.shadowRoot, import.meta.url);
  }

  get modalClass() { return '.drawer'; }
  get closeAttr()  { return 'data-drawer'; }

  // ── placement ──
  get placement() {
    const v = this.getAttribute('placement');
    return VALID_PLACEMENT.includes(v) ? v : 'end';
  }
  set placement(v) {
    if (v == null || v === '') this.removeAttribute('placement');
    else if (VALID_PLACEMENT.includes(v)) this.setAttribute('placement', v);
  }

  onConnected() {
    if (!this.hasAttribute('placement')) this.setAttribute('placement', 'end');
  }

  onAttributeChanged(name, _oldVal, newVal) {
    if (name === 'placement' && newVal && !VALID_PLACEMENT.includes(newVal)) {
      this.setAttribute('placement', 'end');
    }
  }

  // ── Animaciones ──
  animateOpen() {
    const dur = this.#readDur('--show-duration', 220);
    const start = this.#keyframe(true);
    const end = this.#keyframe(false);
    this.shadowRoot.querySelector(this.modalClass).animate(
      [start, end],
      { duration: dur, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'forwards' },
    );
    this.shadowRoot.querySelector('.backdrop').animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: dur, easing: 'ease-out', fill: 'forwards' },
    );
    return new Promise((resolve) => setTimeout(resolve, dur));
  }

  animateClose() {
    const dur = this.#readDur('--hide-duration', 180);
    const start = this.#keyframe(false);
    const end = this.#keyframe(true);
    this.shadowRoot.querySelector(this.modalClass).animate(
      [start, end],
      { duration: dur, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'forwards' },
    );
    this.shadowRoot.querySelector('.backdrop').animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: dur, easing: 'ease-in', fill: 'forwards' },
    );
    return new Promise((resolve) => setTimeout(resolve, dur));
  }

  /**
   * Genera el keyframe de inicio/fin según el placement. Si `entering` es
   * true devuelve la posición "fuera de la pantalla"; si es false la
   * posición "dentro".
   */
  #keyframe(entering) {
    const t = entering ? 100 : 0;
    switch (this.placement) {
      case 'start':  return { transform: `translateX(-${t}%)` };
      case 'end':    return { transform: `translateX(${t}%)` };
      case 'top':    return { transform: `translateY(-${t}%)` };
      case 'bottom': return { transform: `translateY(${t}%)` };
    }
    return { transform: 'translate(0,0)' };
  }

  #readDur(propName, fallback) {
    const v = parseFloat(getComputedStyle(this).getPropertyValue(propName));
    return Number.isFinite(v) ? v : fallback;
  }
}

if (!customElements.get('is-drawer')) {
  customElements.define('is-drawer', IsDrawer);
}
if (typeof window !== 'undefined') {
  window.IsDrawer = IsDrawer;
}
