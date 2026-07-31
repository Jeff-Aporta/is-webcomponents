import { adoptCss } from '../_shared/adopt-css.js';
import '../media/icon.js';

/**
 * <is-dropdown-item> — ítem de menú para is-dropdown.
 *
 * Attrs: value, type (normal|checkbox), checked, disabled, variant (default|danger)
 * Slots: default (label), icon, details, submenu
 * Methods: openSubmenu(), closeSubmenu()
 * Parts: checkmark, icon, label, details, submenu, submenu-icon
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="base" class="item" role="menuitem">
      <span part="checkmark" class="checkmark" aria-hidden="true" hidden>
        <is-icon icon="mdi:check"></is-icon>
      </span>
      <span part="icon" class="icon"><slot name="icon"></slot></span>
      <span part="label" class="label"><slot></slot></span>
      <span part="details" class="details"><slot name="details"></slot></span>
      <span part="submenu-icon" class="submenu-icon" hidden aria-hidden="true">
        <is-icon icon="mdi:chevron-right"></is-icon>
      </span>
    </div>
    <div part="submenu" class="submenu" hidden role="menu">
      <slot name="submenu"></slot>
    </div>
  `;

  const OBSERVED = ['value', 'type', 'checked', 'disabled', 'variant', 'submenu-open'];

  class IsDropdownItem extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #row;
    #check;
    #submenuIcon;
    #submenu;
    #submenuSlot;
    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#row = shadow.querySelector('.item');
      this.#check = shadow.querySelector('.checkmark');
      this.#submenuIcon = shadow.querySelector('.submenu-icon');
      this.#submenu = shadow.querySelector('.submenu');
      this.#submenuSlot = shadow.querySelector('slot[name="submenu"]');
      this.#submenuSlot.addEventListener('slotchange', () => this.#syncSubmenu());
      this.#row.addEventListener('click', this.#onClick);
      this.#row.addEventListener('keydown', this.#onKey);
    }

    connectedCallback() {
      this.#mounted = true;
      if (!this.hasAttribute('tabindex')) this.tabIndex = this.disabled ? -1 : 0;
      this.#render();
      this.#syncSubmenu();
    }

    attributeChangedCallback() {
      if (this.#mounted) this.#render();
    }

    get value() { return this.getAttribute('value') ?? ''; }
    set value(v) { v == null || v === '' ? this.removeAttribute('value') : this.setAttribute('value', v); }

    get type() {
      return this.getAttribute('type') === 'checkbox' ? 'checkbox' : 'normal';
    }
    set type(v) { this.setAttribute('type', v === 'checkbox' ? 'checkbox' : 'normal'); }

    get checked() { return this.hasAttribute('checked'); }
    set checked(v) { this.toggleAttribute('checked', !!v); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get variant() {
      return this.getAttribute('variant') === 'danger' ? 'danger' : 'default';
    }
    set variant(v) {
      this.setAttribute('variant', v === 'danger' ? 'danger' : 'default');
    }

    get submenuOpen() { return this.hasAttribute('submenu-open'); }
    set submenuOpen(v) { this.toggleAttribute('submenu-open', !!v); }

    get hasSubmenu() {
      return this.#submenuSlot.assignedElements({ flatten: true }).length > 0;
    }

    openSubmenu() {
      if (!this.hasSubmenu || this.disabled) return;
      this.submenuOpen = true;
    }

    closeSubmenu() {
      this.submenuOpen = false;
      this.#submenuSlot.assignedElements({ flatten: true }).forEach((el) => {
        if (el.closeSubmenu) el.closeSubmenu();
      });
    }

    #syncSubmenu() {
      const has = this.hasSubmenu;
      this.#submenuIcon.hidden = !has;
      this.#row.setAttribute('aria-haspopup', has ? 'menu' : 'false');
      if (!has) this.submenuOpen = false;
      this.#render();
    }

    #render() {
      const checkbox = this.type === 'checkbox';
      this.#check.hidden = !checkbox;
      this.#row.setAttribute('role', checkbox ? 'menuitemcheckbox' : 'menuitem');
      if (checkbox) this.#row.setAttribute('aria-checked', String(this.checked));
      else this.#row.removeAttribute('aria-checked');
      this.#row.setAttribute('aria-disabled', String(this.disabled));
      this.tabIndex = this.disabled ? -1 : 0;
      this.toggleAttribute('data-has-submenu', this.hasSubmenu);
      this.#submenu.hidden = !this.submenuOpen;
      this.#row.classList.toggle('danger', this.variant === 'danger');
      this.#row.classList.toggle('checked', this.checked);
      this.#row.classList.toggle('disabled', this.disabled);
    }

    #onClick = (e) => {
      if (this.disabled) {
        e.stopPropagation();
        return;
      }
      if (this.hasSubmenu) {
        e.stopPropagation();
        this.submenuOpen = !this.submenuOpen;
        return;
      }
      if (this.type === 'checkbox') this.checked = !this.checked;
      this.dispatchEvent(new CustomEvent('is-dropdown-item-select', {
        bubbles: true,
        composed: true,
        detail: { item: this },
      }));
    };

    #onKey = (e) => {
      if (this.disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.#row.click();
      } else if (e.key === 'ArrowRight' && this.hasSubmenu) {
        e.preventDefault();
        this.openSubmenu();
      } else if (e.key === 'ArrowLeft' && this.submenuOpen) {
        e.preventDefault();
        this.closeSubmenu();
      }
    };
  }

  if (!customElements.get('is-dropdown-item')) {
    customElements.define('is-dropdown-item', IsDropdownItem);
  }
  if (typeof window !== 'undefined') window.IsDropdownItem = IsDropdownItem;
})();
