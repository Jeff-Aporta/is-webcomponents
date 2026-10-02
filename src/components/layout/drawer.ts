import { adoptCss, defineElement } from '../../core/element.js';
import '../media/icon.js';
import '../actions/button.js';
import { ModalBase } from '../_shared/modal-base.js';

/**
 * <iswc-drawer> — Web Component (vanilla, zero dependencies).
 *
 * Panel que se desliza desde un borde del viewport. Ideal para menús, filtros
 * y contenido secundario. Equivalente accesible a wa-drawer (Web Awesome).
 *
 * Comparte con <iswc-dialog> TODO el ciclo de vida (focus-trap, Escape, backdrop
 * light-dismiss, restore de foco, `data-drawer="close"`, eventos) vía
 * `_shared/modal-base.js`. Aquí sólo queda el chrome propio, el `placement` y
 * las animaciones de deslizamiento.
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
 * Eventos: iswc-show, iswc-after-show, iswc-hide (cancelable, detail.source), iswc-after-hide
 *
 * CSS Parts: drawer, header, title, close-button, header-actions, body, footer
 *
 * CSS custom properties
 *   --size            tamaño preferido (ancho o alto según placement)
 *   --spacing         padding interno
 *   --show-duration, --hide-duration
 *   --backdrop-color
 */

(() => {
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
          <iswc-button
            type="button"
            class="close-btn"
            part="close-button"
            variant="text"
            color="neutral"
            aria-label="Cerrar"
          >
            <iswc-icon icon="mdi:close" aria-hidden="true"></iswc-icon>
          </iswc-button>
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
  const HIDDEN_KEYFRAME = {
    start: { transform: 'translateX(-100%)' },
    end: { transform: 'translateX(100%)' },
    top: { transform: 'translateY(-100%)' },
    bottom: { transform: 'translateY(100%)' },
  };

  class IswcDrawer extends ModalBase {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
      size: '--iswc-drawer-size',
      spacing: '--iswc-drawer-spacing',
      'backdrop-color': { prop: '--iswc-drawer-backdrop-color', onlyColorValues: true },
      'show-duration': '--iswc-drawer-show-duration',
      'hide-duration': '--iswc-drawer-hide-duration',
    };

    static __TEMPLATE = TEMPLATE;

    static get observedAttributes(): string[] {
      return [...super.observedAttributes, 'placement', ...IswcDrawer.styleAttrNames];
    }

    get modalClass() { return '.drawer'; }
    get closeAttr() { return 'data-drawer'; }

    constructor() {
      super();
      adoptCss(this.shadowRoot!, import.meta.url);
    }

    onConnected() {
      if (!this.hasAttribute('placement')) this.setAttribute('placement', 'end');
    }

    onAttributeChanged(name: string, _oldVal: string | null, newVal: string | null) {
      if (name === 'placement' && newVal && !VALID_PLACEMENT.includes(newVal)) {
        this.setAttribute('placement', 'end');
      }
    }

    // ---- placement ----

    get placement(): string {
      const v = this.getAttribute('placement');
      return VALID_PLACEMENT.includes(v ?? '') ? (v as string) : 'end';
    }
    set placement(v) {
      if (v == null || v === '') this.removeAttribute('placement');
      else if (VALID_PLACEMENT.includes(v)) this.setAttribute('placement', v);
    }

    // ---- animaciones ----

    animateOpen(): Promise<void> {
      const dur = this.#readDur('--iswc-drawer-show-duration', 220);
      this.$modal.animate(
        [this.#hiddenKeyframe(), this.#visibleKeyframe()],
        { duration: dur, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'forwards' },
      );
      this.$backdrop.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: dur, easing: 'ease-out', fill: 'forwards' },
      );
      return new Promise((resolve) => setTimeout(resolve, dur));
    }

    animateClose(): Promise<void> {
      const dur = this.#readDur('--iswc-drawer-hide-duration', 180);
      this.$modal.animate(
        [this.#visibleKeyframe(), this.#hiddenKeyframe()],
        { duration: dur, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'forwards' },
      );
      this.$backdrop.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: dur, easing: 'ease-in', fill: 'forwards' },
      );
      return new Promise((resolve) => setTimeout(resolve, dur));
    }

    /** Posición fuera de pantalla, del lado del borde que ocupa el drawer. */
    #hiddenKeyframe(): Keyframe { return HIDDEN_KEYFRAME[this.placement as keyof typeof HIDDEN_KEYFRAME]; }

    #visibleKeyframe(): Keyframe { return { transform: 'translate(0,0)' }; }

    #readDur(propName: string, fallback: number): number {
      const v = parseFloat(getComputedStyle(this).getPropertyValue(propName));
      return Number.isFinite(v) ? v : fallback;
    }
  }

  defineElement('iswc-drawer', IswcDrawer, 'IswcDrawer');
})();
