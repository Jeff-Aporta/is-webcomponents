import { emit, IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import '@jeff-aporta/iswc-base/components/layout/details.js';
import css from 'iswc:css';

/**
 * <iswc-accordion-group> — Coordinador de varios <iswc-details>.
 *
 * Port de `src/lib/navigation/accordion/Accordion.svelte` + `AccordionItem.svelte`
 * (ISP-SvelteComponents). Allí el contenedor guardaba la lista de abiertos en un
 * store y el item se limitaba a consultarlo; aquí el disclosure YA existe
 * (`<iswc-details>`), así que este componente solo coordina: NO reimplementa la
 * apertura, el foco ni la animación.
 *
 * Atributos
 *   multiple   boolean — permite varios paneles abiertos a la vez.
 *              Sin él, abrir uno cierra los demás (comportamiento por defecto,
 *              igual que ISP).
 *
 * Slots
 *   (default)  uno o más <iswc-details>
 *
 * Eventos (bubbles + composed)
 *   iswc-accordion-change  detail: { open: iswc-details[], opened, closed }
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

class IswcAccordionGroup extends IswcElement {
  static tag = 'iswc-accordion-group';
  static css = css;
    static observed = OBSERVED;

    #slot!: HTMLSlotElement;

    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#slot = shadow.querySelector<HTMLSlotElement>('slot')!;
    }

    onConnected() {
      // `iswc-show` es composed, así que llega al host desde el shadow del hijo.
      this.addEventListener('iswc-show', this.#onItemShow);
      this.addEventListener('iswc-hide', this.#onItemHide);
      this.#slot.addEventListener('slotchange', this.#onSlotChange);
      this.#enforceSingle();
    }

    onDisconnected() {
      this.removeEventListener('iswc-show', this.#onItemShow);
      this.removeEventListener('iswc-hide', this.#onItemHide);
      this.#slot.removeEventListener('slotchange', this.#onSlotChange);
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      if (name === 'multiple' && !this.multiple) this.#enforceSingle();
    }

    // ---- propiedades ------------------------------------------------------

    get multiple(): boolean { return this.hasAttribute('multiple'); }
    set multiple(v: boolean) { this.toggleAttribute('multiple', !!v); }

    /** Los <iswc-details> proyectados, en orden de documento. */
    get items(): DetailsLike[] {
      return this.#slot.assignedElements({ flatten: true })
        .filter((el): el is DetailsLike => el.localName === 'iswc-details');
    }

    /** Los <iswc-details> actualmente abiertos. */
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
      emit(this, 'iswc-accordion-change', { open: this.openItems, opened: opened ?? null, closed: closed ?? null });
    }

    /** Solo nos interesan los <iswc-details> que son hijos DIRECTOS del grupo. */
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

  define(IswcAccordionGroup, 'IswcAccordionGroup');
})();
