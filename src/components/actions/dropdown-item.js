import { adoptCss } from '../_shared/adopt-css.js';
import { withStyleAttrs } from '../_shared/style-attrs.js';
import { computePosition } from '../_shared/position.js';
import '../media/icon.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { setStringAttr } from '../_shared/reflect.js';

/**
 * <is-dropdown-item> — ítem de menú para is-dropdown.
 *
 * El submenú va en un popover (top layer) y se posiciona con computePosition: el
 * menú padre scrollea (`overflow: auto`), así que un panel `absolute` quedaría
 * recortado y le abriría scroll horizontal.
 *
 * Attrs: value, type (normal|checkbox), checked, disabled, color (default|danger)
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

  const SUPPORTS_POPOVER = typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype;

  /** Personalización por atributo (ver `_shared/style-attrs.js`). */
  const STYLE_ATTRS = {
    radius: '--is-dropdown-item-radius',
    padding: '--is-dropdown-item-padding',
    gap: '--is-dropdown-item-gap',
    'text-color': { prop: '--is-dropdown-item-text', onlyColorValues: true },
    'bg-hover': { prop: '--is-dropdown-item-bg-hover', onlyColorValues: true },
    'danger-color': { prop: '--is-dropdown-item-danger', onlyColorValues: true },
  };

  const OBSERVED = [
    'value', 'type', 'checked', 'disabled', 'color', 'submenu-open',
    ...Object.keys(STYLE_ATTRS),
  ];

  class IsDropdownItem extends withStyleAttrs(HTMLElement) {
    static styleAttrs = STYLE_ATTRS;

    static get observedAttributes() { return OBSERVED; }

    #row;
    #check;
    #submenuIcon;
    #submenu;
    #submenuSlot;
    #mounted = false;
    #raf = 0;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#row = shadow.querySelector('.item');
      this.#check = shadow.querySelector('.checkmark');
      this.#submenuIcon = shadow.querySelector('.submenu-icon');
      this.#submenu = shadow.querySelector('.submenu');
      if (SUPPORTS_POPOVER) this.#submenu.popover = 'manual';
      this.#submenuSlot = shadow.querySelector('slot[name="submenu"]');
      this.#submenuSlot.addEventListener('slotchange', () => this.#syncSubmenu());
      this.#row.addEventListener('click', this.#onClick);
      this.#row.addEventListener('keydown', this.#onKey);
    }

    connectedCallback() {
      super.connectedCallback();
      this.#mounted = true;
      if (!this.hasAttribute('tabindex')) this.tabIndex = this.disabled ? -1 : 0;
      this.#render();
      this.#syncSubmenu();
    }

    disconnectedCallback() {
      this.#mounted = false;
      this.#teardownReposition();
      this.#hideSubmenuPanel();
    }

    attributeChangedCallback(...args) {
      super.attributeChangedCallback(...args);
      if (this.#mounted) this.#render();
    }

    get value() { return this.getAttribute('value') ?? ''; }
    set value(v) { setStringAttr(this, 'value', v); }

    get type() {
      return this.getAttribute('type') === 'checkbox' ? 'checkbox' : 'normal';
    }
    set type(v) { this.setAttribute('type', v === 'checkbox' ? 'checkbox' : 'normal'); }

    get checked() { return this.hasAttribute('checked'); }
    set checked(v) { this.toggleAttribute('checked', !!v); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get color() {
      return this.getAttribute('color') === 'danger' ? 'danger' : 'default';
    }
    set color(v) {
      this.setAttribute('color', v === 'danger' ? 'danger' : 'default');
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
      this.#syncSubmenuPanel();
      this.#row.classList.toggle('danger', this.color === 'danger');
      this.#row.classList.toggle('checked', this.checked);
      this.#row.classList.toggle('disabled', this.disabled);
    }

    #syncSubmenuPanel() {
      if (this.submenuOpen && this.hasSubmenu) this.#showSubmenuPanel();
      else this.#hideSubmenuPanel();
    }

    #showSubmenuPanel() {
      const el = this.#submenu;
      el.hidden = false;
      if (SUPPORTS_POPOVER && !el.matches(':popover-open')) {
        try { el.showPopover(); } catch { /* ya abierto o sin soporte */ }
      }
      this.#positionSubmenu();
      this.#setupReposition();
    }

    #hideSubmenuPanel() {
      const el = this.#submenu;
      this.#teardownReposition();
      if (SUPPORTS_POPOVER && el.matches(':popover-open')) {
        try { el.hidePopover(); } catch { /* noop */ }
      }
      el.hidden = true;
    }

    #positionSubmenu() {
      const result = computePosition({
        anchor: this.#row,
        popupEl: this.#submenu,
        placement: 'right-start',
        distance: 2,
        flip: true,
        shift: true,
        strategy: 'fixed',
        boundary: 'viewport',
      });
      if (!result) return;
      Object.assign(this.#submenu.style, {
        top: `${result.top}px`,
        left: `${result.left}px`,
      });
      this.#submenu.dataset.currentPlacement = result.placement;
    }

    #onReposition = () => {
      if (!this.submenuOpen) return;
      cancelAnimationFrame(this.#raf);
      this.#raf = requestAnimationFrame(() => this.#positionSubmenu());
    };

    #setupReposition() {
      window.addEventListener('resize', this.#onReposition, { passive: true });
      window.addEventListener('scroll', this.#onReposition, true);
    }

    #teardownReposition() {
      cancelAnimationFrame(this.#raf);
      window.removeEventListener('resize', this.#onReposition);
      window.removeEventListener('scroll', this.#onReposition, true);
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
      emit(this, 'is-dropdown-item-select', { item: this });
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

  defineElement('is-dropdown-item', IsDropdownItem, 'IsDropdownItem');
})();
