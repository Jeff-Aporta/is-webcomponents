import { adoptCss, defineElement, emit } from '../../core/element.js';
import { attrBool, attrEnum, attrNum, atributosDeclarados, withStyleAttrs } from '../../core/attrs.js';
import { computePosition, PLACEMENTS } from '../_shared/position.js';
import './dropdown-item.js';
import '../layout/divider.js';
import { createPopupDismiss } from '../_shared/popup-dismiss.js';

/** Colocacion del panel respecto al trigger. `position.js` es la fuente. */
type Placement = (typeof PLACEMENTS)[number];

/**
 * Forma minima de `<is-dropdown-item>` que este componente consume.
 *
 * No se importa su clase: crearia una dependencia circular (el item ya importa
 * cosas de aqui) y el bundle los trata como modulos externos. Declarar solo lo
 * que se usa es ademas lo que documenta el acoplamiento real entre los dos.
 */
type DropdownItemEl = HTMLElement & { disabled?: boolean; type?: string; closeSubmenu?: () => void; };

/**
 * <is-dropdown> — menú anclado a un trigger.
 *
 * El panel usa <dialog showModal()> (top layer) para no quedar debajo de
 * headings/secciones/overflow de ancestros — mismo patrón que is-combobox.
 *
 * Slots: trigger | default (items / dividers / headings)
 * Attrs: open, placement (default bottom-start), distance, skidding
 * Events: is-show, is-after-show, is-hide, is-after-hide, is-select { item }
 * Parts: ::part(dialog) ::part(menu)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <span class="trigger-wrap" part="trigger-wrap">
      <slot name="trigger"></slot>
    </span>
    <dialog part="dialog" class="popup" tabindex="-1">
      <div part="menu" class="menu" role="menu" tabindex="-1">
        <slot></slot>
      </div>
    </dialog>
  `;

  // Los cuatro atributos ya no se listan aqui: los declara cada campo con su
  // decorador y `atributosDeclarados` los recoge. Una sola fuente.

  /** Personalización por atributo (ver `core/attrs.ts`). */
  const STYLE_ATTRS = {
    'show-duration': '--is-dropdown-show-duration',
    'hide-duration': '--is-dropdown-hide-duration',
  };

  class IsDropdown extends withStyleAttrs(HTMLElement) {
    static styleAttrs = STYLE_ATTRS;

    static get observedAttributes(): string[] {
      return [...atributosDeclarados(this), ...Object.keys(STYLE_ATTRS)];
    }

    // El `!` en las cuatro referencias del shadow: el template es una constante
    // de este modulo, asi que los cuatro nodos existen siempre. Comprobarlos en
    // cada uso seria ruido sobre una invariante que no puede fallar.
    #dialog!: HTMLDialogElement;
    #menu!: HTMLElement;
    #triggerSlot!: HTMLSlotElement;
    #defaultSlot!: HTMLSlotElement;
    #mounted = false;
    #triggerEl: HTMLElement | null = null;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#dialog = shadow.querySelector<HTMLDialogElement>('dialog')!;
      this.#menu = shadow.querySelector<HTMLElement>('.menu')!;
      this.#triggerSlot = shadow.querySelector<HTMLSlotElement>('slot[name="trigger"]')!;
      this.#defaultSlot = shadow.querySelector<HTMLSlotElement>('slot:not([name])')!;

      this.#triggerSlot.addEventListener('slotchange', () => this.#bindTrigger());
      this.#defaultSlot.addEventListener('slotchange', () => this.#syncCheckboxPad());
      this.addEventListener('is-dropdown-item-select', this.#onItemSelect as EventListener);

      this.#dialog.addEventListener('click', this.#onDialogClick);
      this.#dialog.addEventListener('cancel', this.#onDialogCancel);
      this.#dialog.addEventListener('close', this.#onDialogClose);
    }

    connectedCallback(): void {
      super.connectedCallback();
      this.#mounted = true;
      this.#bindTrigger();
      this.#syncCheckboxPad();
      if (this.open) this.#doShow(true);
    }

    disconnectedCallback(): void {
      this.#mounted = false;
      this.#unbindTrigger();
      this.#dismiss.detach();
      if (this.#dialog.open) this.#dialog.close();
    }

    attributeChangedCallback(name: string): void {
      super.attributeChangedCallback(name, null, null);
      if (!this.#mounted) return;
      if (name === 'open') {
        if (this.open) this.#doShow(false);
        else this.#doHide(false);
      } else if (this.open) {
        this.#reposition();
      }
    }

    @attrBool accessor open!: boolean;
    @attrEnum(PLACEMENTS, 'bottom-start') accessor placement!: Placement;
    @attrNum(0) accessor distance!: number;
    @attrNum(0) accessor skidding!: number;

    show() { this.open = true; }
    hide() { this.open = false; }

    get items() {
      return this.#defaultSlot.assignedElements({ flatten: true })
        .filter((el): el is DropdownItemEl =>
          el.localName === 'is-dropdown-item' && !(el as DropdownItemEl).disabled);
    }

    #bindTrigger() {
      this.#unbindTrigger();
      const els = this.#triggerSlot.assignedElements({ flatten: true });
      this.#triggerEl = (els[0] as HTMLElement | undefined) ?? null;
      if (!this.#triggerEl) return;
      this.#triggerEl.addEventListener('click', this.#onTriggerClick);
      this.#triggerEl.setAttribute('aria-haspopup', 'menu');
      this.#triggerEl.setAttribute('aria-expanded', String(this.open));
    }

    #unbindTrigger() {
      if (!this.#triggerEl) return;
      this.#triggerEl.removeEventListener('click', this.#onTriggerClick);
      this.#triggerEl = null;
    }

    #onTriggerClick = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this.open = !this.open;
    };

    #syncCheckboxPad() {
      const has = this.#defaultSlot.assignedElements({ flatten: true }).some(
        (el) => el.localName === 'is-dropdown-item' && (el as DropdownItemEl).type === 'checkbox',
      );
      this.toggleAttribute('data-has-checkbox', has);
    }

    #onItemSelect = (e: CustomEvent<{ item?: DropdownItemEl }>) => {
      const item = e.detail?.item;
      if (!item) return;
      const selectEv = new CustomEvent('is-select', {
        bubbles: true,
        composed: true,
        cancelable: true,
        detail: { item },
      });
      const ok = this.dispatchEvent(selectEv);
      if (ok) this.hide();
    };

    /** Clic en la superficie del dialog (fuera del menú) → cerrar. */
    #onDialogClick = (e: PointerEvent) => {
      if (e.target !== this.#dialog) return;
      this.hide();
    };

    #onDialogCancel = (e: Event) => {
      e.preventDefault();
      this.hide();
      this.#triggerEl?.focus?.();
    };

    /** Si el dialog se cierra por otro medio, sincronizar open. */
    #onDialogClose = () => {
      if (this.open) this.removeAttribute('open');
    };

    #onDocKey = (e: KeyboardEvent) => {
      if (!this.open) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.#focusItem(e.key === 'ArrowDown' ? 1 : -1);
      }
    };

    /**
     * Escuchas mientras el menú está abierto. El ciclo (poner/quitar los
     * listeners de document y window, agrupar el reposicionado por frame) lo
     * lleva _shared/popup-dismiss.js, que es el mismo que usa
     * is-context-menu; aquí solo queda QUÉ hacer.
     *
     * No declara `onEscape`: el panel es un <dialog showModal()>, así que
     * Escape llega como evento `cancel` y se atiende en #onDialogCancel, que
     * además devuelve el foco al trigger. Y tampoco `onOutside`: el clic
     * fuera cae en el backdrop del propio dialog (#onDialogClick).
     */
    #dismiss = createPopupDismiss(this, {
      onKeydown: (e: KeyboardEvent) => this.#onDocKey(e),
      onReposition: () => { if (this.open) this.#reposition(); },
    });

    #focusItem(delta: number): void {
      const list = this.items;
      if (!list.length) return;
      const i = list.findIndex((el) => el === document.activeElement || el.contains(document.activeElement));
      const next = list[(Math.max(0, i) + delta + list.length) % list.length];
      next?.focus?.();
    }

    #reposition() {
      const anchor = this.#triggerEl;
      if (!anchor || !this.#dialog.open) return;

      const result = computePosition({
        anchor,
        popupEl: this.#menu,
        placement: this.placement,
        distance: this.distance,
        skidding: this.skidding,
        flip: true,
        shift: true,
        strategy: 'fixed',
        boundary: 'viewport',
      });
      if (!result) return;

      Object.assign(this.#menu.style, {
        position: 'fixed',
        top: `${result.top}px`,
        left: `${result.left}px`,
        right: 'auto',
        bottom: 'auto',
      });
      this.#menu.dataset.currentPlacement = result.placement;
    }

    #doShow(silent?: boolean): void {
      if (!silent) {
        const ev = new CustomEvent('is-show', { bubbles: true, composed: true, cancelable: true });
        if (!this.dispatchEvent(ev)) {
          this.removeAttribute('open');
          return;
        }
      }

      if (!this.#dialog.open) {
        this.#dialog.showModal();
      }
      this.#reposition();
      // Segunda pasada tras layout del menú (medidas reales)
      requestAnimationFrame(() => this.#reposition());

      this.#triggerEl?.setAttribute('aria-expanded', 'true');
      this.#dismiss.attach();
      requestAnimationFrame(() => this.items[0]?.focus?.());
      emit(this, 'is-after-show');
    }

    #doHide(silent?: boolean): void {
      if (!silent) {
        const ev = new CustomEvent('is-hide', { bubbles: true, composed: true, cancelable: true });
        if (!this.dispatchEvent(ev)) {
          this.setAttribute('open', '');
          return;
        }
      }

      this.#triggerEl?.setAttribute('aria-expanded', 'false');
      this.querySelectorAll<DropdownItemEl>('is-dropdown-item').forEach((el) => el.closeSubmenu?.());
      this.#dismiss.detach();
      if (this.#dialog.open) this.#dialog.close();
      emit(this, 'is-after-hide');
    }
  }

  defineElement('is-dropdown', IsDropdown, 'IsDropdown');
})();
