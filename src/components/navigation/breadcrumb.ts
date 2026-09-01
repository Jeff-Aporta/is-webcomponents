import { adoptCss, defineElement } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';

/**
 * <is-breadcrumb> — contenedor de una ruta de migas de pan.
 *
 * Recibe N `<is-breadcrumb-item>` en el slot default y los muestra
 * separados por el slot `separator`.
 *
 * Atributos
 *   label    string  — aria-label del nav (anunciado por screen readers).
 *
 * Slots
 *   (default)  breadcrumb-items.
 *   separator  icono o texto entre items (default: chevron-right).
 *
 * CSS Parts: ::part(breadcrumb)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <nav class="bc" part="breadcrumb" aria-label="Ruta">
      <slot></slot>
    </nav>
  `;

  class IsBreadcrumb extends ElementBase {
    static get observedAttributes(): string[] { return ['label']; }


    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
    }

    onConnected() {
      this.#syncLabel();
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      if (name === 'label') this.#syncLabel();
    }

    get label() { return this.getAttribute('label') || 'Ruta'; }
    set label(v) {
      if (v == null || v === '') this.removeAttribute('label');
      else this.setAttribute('label', v);
    }

    #syncLabel() {
      const nav = this.shadowRoot!.querySelector<HTMLElement>('nav');
      nav.setAttribute('aria-label', this.label);
    }
  }

  defineElement('is-breadcrumb', IsBreadcrumb, 'IsBreadcrumb');
})();
