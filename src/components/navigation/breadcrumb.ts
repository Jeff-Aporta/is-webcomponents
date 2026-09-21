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
      <ol role="list" class="bc-list"><slot></slot></ol>
    </nav>
  `;

  class IsBreadcrumb extends ElementBase {
    static get observedAttributes(): string[] { return ['label']; }

    #itemObserver: MutationObserver | null = null;


    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
    }

    onConnected() {
      this.#syncLabel();
      this.#syncItemRoles();
      // Re-sincronizar roles si los items se añaden dinámicamente.
      this.#itemObserver = new MutationObserver(() => this.#syncItemRoles());
      this.#itemObserver.observe(this, { childList: true, subtree: true });
    }

    onDisconnected() {
      this.#itemObserver?.disconnect();
      this.#itemObserver = null;
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      if (name === 'label') this.#syncLabel();
    }

    get label(): string { return this.getAttribute('label') || 'Ruta'; }
    set label(v: string | null | undefined) {
      if (v == null || v === '') this.removeAttribute('label');
      else this.setAttribute('label', v);
    }

    #syncLabel() {
      const nav = this.shadowRoot!.querySelector<HTMLElement>('nav');
      if (!nav) return;
      nav.setAttribute('aria-label', this.label);
    }

    #syncItemRoles() {
      // Cada <is-breadcrumb-item> en el slot default lleva role="listitem"
      // para una semántica de lista coherente (propuesta g13 breadcrumb).
      const slot = this.shadowRoot!.querySelector<HTMLSlotElement>('slot');
      if (!slot) return;
      const items = slot.assignedElements({ flatten: true });
      items.forEach((it) => {
        if (!(it instanceof HTMLElement)) return;
        if (!it.hasAttribute('role')) it.setAttribute('role', 'listitem');
      });
    }
  }

  defineElement('is-breadcrumb', IsBreadcrumb, 'IsBreadcrumb');
})();
