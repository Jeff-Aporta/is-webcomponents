import { adoptCss, defineElement, emit } from '../../core/element.js';
import '../layout/details.js';
import { ElementBase } from '../../core/element-base.js';

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

  interface DetailsLike extends HTMLElement {
  open: boolean;
  show(): void;
  hide(): void;
}

class IsAccordionGroup extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }

    #slot!: HTMLSlotElement;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      adoptCss(shadow, import.meta.url);
      this.#slot = shadow.querySelector<HTMLSlotElement>('slot')!;
    }

    onConnected() {
      // `is-show` es composed, así que llega al host desde el shadow del hijo.
      this.addEventListener('is-show', this.#onItemShow);
      this.addEventListener('is-hide', this.#onItemHide);
      this.#slot.addEventListener('slotchange', this.#onSlotChange);
      this.#enforceSingle();
    }

    onDisconnected() {
      this.removeEventListener('is-show', this.#onItemShow);
      this.removeEventListener('is-hide', this.#onItemHide);
      this.#slot.removeEventListener('slotchange', this.#onSlotChange);
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      if (name === 'multiple' && !this.multiple) this.#enforceSingle();
    }

    // ---- propiedades ------------------------------------------------------

    get multiple(): boolean { return this.hasAttribute('multiple'); }
    set multiple(v: boolean) { this.toggleAttribute('multiple', !!v); }

    /** Los <is-details> proyectados, en orden de documento. */
    get items(): DetailsLike[] {
      return this.#slot.assignedElements({ flatten: true })
        .filter((el): el is DetailsLike => el.localName === 'is-details');
    }

    /** Los <is-details> actualmente abiertos. */
    get openItems(): DetailsLike[] { return this.items.filter((el) => el.open); }

    // ---- API pública ------------------------------------------------------

    /** Abre todos (solo tiene sentido con `multiple`). */
    showAll(): void {
      if (!this.multiple) return;
      for (const el of this.items) el.show();
    }

    /** Cierra todos los paneles. */
    hideAll(): void { for (const el of this.items) el.hide(); }

    // ---- privados ---------------------------------------------------------

    #emitChange(opened: DetailsLike | null, closed: DetailsLike | null): void {
      emit(this, 'is-accordion-change', { open: this.openItems, opened: opened ?? null, closed: closed ?? null });
    }

    /** Solo nos interesan los <is-details> que son hijos DIRECTOS del grupo. */
    #ownItem(target: EventTarget | null): DetailsLike | null {
      if (!target) return null;
      const items = this.items;
      const found = items.find((el) => el === target);
      return found ?? null;
    }

    #onItemShow = (e: Event): void => {
      const item = this.#ownItem(e.target);
      if (!item) return;
      if (!this.multiple) {
        for (const other of this.items) {
          if (other !== item && other.open) other.hide();
        }
      }
      this.#emitChange(item, null);
    };

    #onItemHide = (e: Event): void => {
      const item = this.#ownItem(e.target);
      if (!item) return;
      this.#emitChange(null, item);
    };

    #onSlotChange = (): void => { this.#enforceSingle(); };

    /** En modo single solo sobrevive el primer abierto del markup. */
    #enforceSingle(): void {
      if (this.multiple) return;
      let seen = false;
      for (const el of this.items) {
        if (!el.open) continue;
        if (seen) el.hide();
        else seen = true;
      }
    }
  }

  defineElement('is-accordion-group', IsAccordionGroup, 'IsAccordionGroup');
})();
