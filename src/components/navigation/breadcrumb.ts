// @contexto INDICE.md · src/components/navigation/breadcrumb.md
import './breadcrumb-item.js';
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { IswcReactive } from '@jeff-aporta/iswc-base/core/iswc-reactive.js';
import { registrarTerminos } from '@jeff-aporta/iswc-base/core/localize.js';
import css from 'iswc:css';

/**
 * <iswc-breadcrumb> — contenedor de una ruta de migas de pan.
 *
 * Recibe N `<iswc-breadcrumb-item>` en el slot default y los muestra
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
  registrarTerminos('es', { ruta: 'Ruta' });

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <nav class="bc" part="breadcrumb">
      <ol role="list" class="bc-list"><slot></slot></ol>
    </nav>
  `;

  class IswcBreadcrumb extends IswcReactive {
    static override tag = 'iswc-breadcrumb';
    static override css = css;
    static override observed = ['label'];

    #itemObserver: MutationObserver | null = null;


    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
    }

    override onConnected() {
      this.#syncLabel();
      this.#syncItemRoles();
      // Re-sincronizar roles si los items se añaden dinámicamente.
      this.#itemObserver = new MutationObserver(() => this.#syncItemRoles());
      this.#itemObserver.observe(this, { childList: true, subtree: true });
    }

    override onDisconnected() {
      this.#itemObserver?.disconnect();
      this.#itemObserver = null;
    }

    override onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      if (name === 'label') this.#syncLabel();
    }

    get label(): string { return this.getAttribute('label') || this.t('ruta'); }
    set label(v: string | null | undefined) {
      if (v == null || v === '') this.removeAttribute('label');
      else this.setAttribute('label', v);
    }

    /** Etiqueta por defecto en el idioma heredado (repinta al cambiar `lang`). */
    override actualizado(): void {
      this.#syncLabel();
    }

    #syncLabel() {
      const nav = this.shadowRoot!.querySelector<HTMLElement>('nav');
      if (!nav) return;
      nav.setAttribute('aria-label', this.label);
    }

    #syncItemRoles() {
      // Cada <iswc-breadcrumb-item> en el slot default lleva role="listitem"
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

  define(IswcBreadcrumb, 'IswcBreadcrumb');
})();
