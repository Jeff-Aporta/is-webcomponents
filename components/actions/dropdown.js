import { adoptCss } from '../_shared/adopt-css.js';
import { computePosition, PLACEMENTS } from '../_shared/position.js';
import './dropdown-item.js';
import '../layout/divider.js';

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

  const OBSERVED = ['open', 'placement', 'distance', 'skidding'];

  class IsDropdown extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #dialog;
    #menu;
    #triggerSlot;
    #defaultSlot;
    #mounted = false;
    #triggerEl = null;
    #raf = 0;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#dialog = shadow.querySelector('dialog');
      this.#menu = shadow.querySelector('.menu');
      this.#triggerSlot = shadow.querySelector('slot[name="trigger"]');
      this.#defaultSlot = shadow.querySelector('slot:not([name])');

      this.#triggerSlot.addEventListener('slotchange', () => this.#bindTrigger());
      this.#defaultSlot.addEventListener('slotchange', () => this.#syncCheckboxPad());
      this.addEventListener('is-dropdown-item-select', this.#onItemSelect);

      this.#dialog.addEventListener('click', this.#onDialogClick);
      this.#dialog.addEventListener('cancel', this.#onDialogCancel);
      this.#dialog.addEventListener('close', this.#onDialogClose);
    }

    connectedCallback() {
      this.#mounted = true;
      this.#bindTrigger();
      this.#syncCheckboxPad();
      if (this.open) this.#doShow(true);
    }

    disconnectedCallback() {
      this.#mounted = false;
      this.#unbindTrigger();
      this.#teardownListeners();
      if (this.#dialog.open) this.#dialog.close();
    }

    attributeChangedCallback(name) {
      if (!this.#mounted) return;
      if (name === 'open') {
        if (this.open) this.#doShow();
        else this.#doHide();
      } else if (this.open) {
        this.#reposition();
      }
    }

    get open() { return this.hasAttribute('open'); }
    set open(v) { this.toggleAttribute('open', !!v); }

    get placement() {
      const v = this.getAttribute('placement') || 'bottom-start';
      return PLACEMENTS.includes(v) ? v : 'bottom-start';
    }
    set placement(v) { this.setAttribute('placement', v); }

    get distance() { return Number(this.getAttribute('distance')) || 0; }
    set distance(v) { this.setAttribute('distance', String(v)); }

    get skidding() { return Number(this.getAttribute('skidding')) || 0; }
    set skidding(v) { this.setAttribute('skidding', String(v)); }

    show() { this.open = true; }
    hide() { this.open = false; }

    get items() {
      return this.#defaultSlot.assignedElements({ flatten: true }).filter(
        (el) => el.localName === 'is-dropdown-item' && !el.disabled,
      );
    }

    #bindTrigger() {
      this.#unbindTrigger();
      const els = this.#triggerSlot.assignedElements({ flatten: true });
      this.#triggerEl = els[0] || null;
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

    #onTriggerClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.open = !this.open;
    };

    #syncCheckboxPad() {
      const has = this.#defaultSlot.assignedElements({ flatten: true }).some(
        (el) => el.localName === 'is-dropdown-item' && el.type === 'checkbox',
      );
      this.toggleAttribute('data-has-checkbox', has);
    }

    #onItemSelect = (e) => {
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
    #onDialogClick = (e) => {
      if (e.target !== this.#dialog) return;
      this.hide();
    };

    #onDialogCancel = (e) => {
      e.preventDefault();
      this.hide();
      this.#triggerEl?.focus?.();
    };

    /** Si el dialog se cierra por otro medio, sincronizar open. */
    #onDialogClose = () => {
      if (this.open) this.removeAttribute('open');
    };

    #onDocKey = (e) => {
      if (!this.open) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.#focusItem(e.key === 'ArrowDown' ? 1 : -1);
      }
    };

    #onReposition = () => {
      if (!this.open) return;
      cancelAnimationFrame(this.#raf);
      this.#raf = requestAnimationFrame(() => this.#reposition());
    };

    #focusItem(delta) {
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

    #setupListeners() {
      document.addEventListener('keydown', this.#onDocKey, true);
      window.addEventListener('resize', this.#onReposition, { passive: true });
      window.addEventListener('scroll', this.#onReposition, true);
    }

    #teardownListeners() {
      document.removeEventListener('keydown', this.#onDocKey, true);
      window.removeEventListener('resize', this.#onReposition);
      window.removeEventListener('scroll', this.#onReposition, true);
      cancelAnimationFrame(this.#raf);
    }

    #doShow(silent) {
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
      this.#setupListeners();
      requestAnimationFrame(() => this.items[0]?.focus?.());
      this.dispatchEvent(new CustomEvent('is-after-show', { bubbles: true, composed: true }));
    }

    #doHide(silent) {
      if (!silent) {
        const ev = new CustomEvent('is-hide', { bubbles: true, composed: true, cancelable: true });
        if (!this.dispatchEvent(ev)) {
          this.setAttribute('open', '');
          return;
        }
      }

      this.#triggerEl?.setAttribute('aria-expanded', 'false');
      this.querySelectorAll('is-dropdown-item').forEach((el) => el.closeSubmenu?.());
      this.#teardownListeners();
      if (this.#dialog.open) this.#dialog.close();
      this.dispatchEvent(new CustomEvent('is-after-hide', { bubbles: true, composed: true }));
    }
  }

  if (!customElements.get('is-dropdown')) {
    customElements.define('is-dropdown', IsDropdown);
  }
  if (typeof window !== 'undefined') window.IsDropdown = IsDropdown;
})();
