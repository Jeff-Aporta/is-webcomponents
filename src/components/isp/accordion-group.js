import { adoptCss } from '../_shared/adopt-css.js';
import '../layout/details.js';

/**
 * <is-accordion-group> — Coordinador de varios <is-details>.
 *
 * Port de `src/lib/navigation/accordion/Accordion.svelte` + `AccordionItem.svelte`
 * (ISP-SvelteComponents). Allí el contenedor guardaba la lista de abiertos en un
 * store y el item se limitaba a consultarlo; aquí el disclosure YA existe
 * (`<is-details>`), así que este componente solo coordina: NO reimplementa la
 * apertura, el foco ni la animación.
 *
 * Atributos
 *   multiple   boolean — permite varios paneles abiertos a la vez.
 *              Sin él, abrir uno cierra los demás (comportamiento por defecto,
 *              igual que ISP).
 *
 * Slots
 *   (default)  uno o más <is-details>
 *
 * Eventos (bubbles + composed)
 *   is-accordion-change  detail: { open: is-details[], opened, closed }
 *
 * CSS Parts: ::part(base)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="base" class="accordion"><slot></slot></div>
  `;

  const OBSERVED = ['multiple'];

  class IsAccordionGroup extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #mounted = false;
    #slot;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      adoptCss(shadow, import.meta.url);
      this.#slot = shadow.querySelector('slot');
    }

    connectedCallback() {
      this.#mounted = true;
      if (Object.prototype.hasOwnProperty.call(this, 'multiple')) {
        const v = this.multiple;
        delete this.multiple;
        this.multiple = v;
      }
      // `is-show` es composed, así que llega al host desde el shadow del hijo.
      this.addEventListener('is-show', this.#onItemShow);
      this.addEventListener('is-hide', this.#onItemHide);
      this.#slot.addEventListener('slotchange', this.#onSlotChange);
      this.#enforceSingle();
    }

    disconnectedCallback() {
      this.removeEventListener('is-show', this.#onItemShow);
      this.removeEventListener('is-hide', this.#onItemHide);
      this.#slot.removeEventListener('slotchange', this.#onSlotChange);
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'multiple' && !this.multiple) this.#enforceSingle();
    }

    // ---- propiedades ------------------------------------------------------

    get multiple() { return this.hasAttribute('multiple'); }
    set multiple(v) { this.toggleAttribute('multiple', !!v); }

    /** Los <is-details> proyectados, en orden de documento. */
    get items() {
      return this.#slot.assignedElements({ flatten: true })
        .filter((el) => el.localName === 'is-details');
    }

    /** Los <is-details> actualmente abiertos. */
    get openItems() { return this.items.filter((el) => el.open); }

    // ---- API pública ------------------------------------------------------

    /** Abre todos (solo tiene sentido con `multiple`). */
    showAll() {
      if (!this.multiple) return;
      for (const el of this.items) el.show();
    }

    /** Cierra todos los paneles. */
    hideAll() { for (const el of this.items) el.hide(); }

    // ---- privados ---------------------------------------------------------

    #emitChange(opened, closed) {
      this.dispatchEvent(new CustomEvent('is-accordion-change', {
        detail: { open: this.openItems, opened: opened ?? null, closed: closed ?? null },
        bubbles: true,
        composed: true,
      }));
    }

    /** Solo nos interesan los <is-details> que son hijos DIRECTOS del grupo. */
    #ownItem(target) {
      const items = this.items;
      return items.includes(target) ? target : null;
    }

    #onItemShow = (e) => {
      const item = this.#ownItem(e.target);
      if (!item) return;
      if (!this.multiple) {
        for (const other of this.items) {
          if (other !== item && other.open) other.hide();
        }
      }
      this.#emitChange(item, null);
    };

    #onItemHide = (e) => {
      const item = this.#ownItem(e.target);
      if (!item) return;
      this.#emitChange(null, item);
    };

    #onSlotChange = () => { this.#enforceSingle(); };

    /** En modo single solo sobrevive el primer abierto del markup. */
    #enforceSingle() {
      if (this.multiple) return;
      let seen = false;
      for (const el of this.items) {
        if (!el.open) continue;
        if (seen) el.hide();
        else seen = true;
      }
    }
  }

  if (!customElements.get('is-accordion-group')) {
    customElements.define('is-accordion-group', IsAccordionGroup);
  }
  if (typeof window !== 'undefined') window.IsAccordionGroup = IsAccordionGroup;
})();
