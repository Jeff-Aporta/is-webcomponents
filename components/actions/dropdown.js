import { adoptCss } from '../_shared/adopt-css.js';
import '../helpers/popup.js';
import './dropdown-item.js';
import '../layout/divider.js';

/**
 * <is-dropdown> — menú anclado a un trigger.
 *
 * Slots: trigger | default (items / dividers / headings)
 * Attrs: open, placement (default bottom-start), distance, skidding
 * Events: is-show, is-after-show, is-hide, is-after-hide, is-select { item }
 * Parts: ::part(menu)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <is-popup
      class="popup"
      strategy="fixed"
      flip
      shift
      placement="bottom-start"
      distance="0"
    >
      <span slot="anchor" class="trigger-wrap">
        <slot name="trigger"></slot>
      </span>
      <div part="menu" class="menu" role="menu" tabindex="-1" hidden>
        <slot></slot>
      </div>
    </is-popup>
  `;

  const OBSERVED = ['open', 'placement', 'distance', 'skidding'];

  class IsDropdown extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #popup;
    #menu;
    #triggerSlot;
    #defaultSlot;
    #mounted = false;
    #triggerEl = null;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#popup = shadow.querySelector('is-popup');
      this.#menu = shadow.querySelector('.menu');
      this.#triggerSlot = shadow.querySelector('slot[name="trigger"]');
      this.#defaultSlot = shadow.querySelector('slot:not([name])');

      this.#triggerSlot.addEventListener('slotchange', () => this.#bindTrigger());
      this.#defaultSlot.addEventListener('slotchange', () => this.#syncCheckboxPad());
      this.addEventListener('is-dropdown-item-select', this.#onItemSelect);
    }

    connectedCallback() {
      this.#mounted = true;
      this.#syncPopup();
      this.#bindTrigger();
      this.#syncCheckboxPad();
      if (this.open) this.#doShow(true);
    }

    disconnectedCallback() {
      this.#mounted = false;
      this.#unbindTrigger();
      document.removeEventListener('pointerdown', this.#onDocPointer, true);
      document.removeEventListener('keydown', this.#onDocKey, true);
    }

    attributeChangedCallback(name) {
      if (!this.#mounted) return;
      if (name === 'open') {
        if (this.open) this.#doShow();
        else this.#doHide();
      } else this.#syncPopup();
    }

    get open() { return this.hasAttribute('open'); }
    set open(v) { this.toggleAttribute('open', !!v); }

    get placement() { return this.getAttribute('placement') || 'bottom-start'; }
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

    #syncPopup() {
      this.#popup.placement = this.placement;
      this.#popup.distance = this.distance;
      this.#popup.skidding = this.skidding;
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

    #onDocPointer = (e) => {
      if (!this.open) return;
      const path = e.composedPath();
      if (path.includes(this)) return;
      this.hide();
    };

    #onDocKey = (e) => {
      if (!this.open) return;
      if (e.key === 'Escape') {
        this.hide();
        this.#triggerEl?.focus?.();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.#focusItem(e.key === 'ArrowDown' ? 1 : -1);
      }
    };

    #focusItem(delta) {
      const list = this.items;
      if (!list.length) return;
      const i = list.findIndex((el) => el === document.activeElement || el.contains(document.activeElement));
      const next = list[(Math.max(0, i) + delta + list.length) % list.length];
      next?.focus?.();
    }

    #doShow(silent) {
      if (!silent) {
        const ev = new CustomEvent('is-show', { bubbles: true, composed: true, cancelable: true });
        if (!this.dispatchEvent(ev)) {
          this.removeAttribute('open');
          return;
        }
      }
      this.#menu.hidden = false;
      this.#popup.active = true;
      this.#popup.reposition();
      this.#triggerEl?.setAttribute('aria-expanded', 'true');
      document.addEventListener('pointerdown', this.#onDocPointer, true);
      document.addEventListener('keydown', this.#onDocKey, true);
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
      this.#menu.hidden = true;
      this.#popup.active = false;
      this.#triggerEl?.setAttribute('aria-expanded', 'false');
      this.querySelectorAll('is-dropdown-item').forEach((el) => el.closeSubmenu?.());
      document.removeEventListener('pointerdown', this.#onDocPointer, true);
      document.removeEventListener('keydown', this.#onDocKey, true);
      this.dispatchEvent(new CustomEvent('is-after-hide', { bubbles: true, composed: true }));
    }
  }

  if (!customElements.get('is-dropdown')) {
    customElements.define('is-dropdown', IsDropdown);
  }
  if (typeof window !== 'undefined') window.IsDropdown = IsDropdown;
})();
