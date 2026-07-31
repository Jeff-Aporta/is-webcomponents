import { adoptCss } from '../_shared/adopt-css.js';
import '../helpers/popup.js';

/**
 * <is-popover> — panel flotante con contenido interactivo, anclado vía `for`.
 *
 * Attrs: for, open, placement, distance, skidding, without-arrow
 * Methods: show(), hide()
 * Events: is-show, is-after-show, is-hide, is-after-hide (cancelables show/hide)
 * Parts: ::part(body) ::part(dialog) ::part(popup) ::part(popup__arrow) ::part(popup__popup)
 * CSS: --max-width --arrow-size --show-duration --hide-duration
 * data-popover="close" en hijos cierra el popover.
 */

(() => {
  let openPopover = null;

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <is-popup
      part="popup"
      class="popup"
      exportparts="popup:popup__popup, arrow:popup__arrow"
      strategy="fixed"
      flip
      shift
      arrow
      placement="top"
      distance="8"
    >
      <div part="dialog" class="dialog" role="dialog" hidden>
        <div part="body" class="body"><slot></slot></div>
      </div>
    </is-popup>
  `;

  const OBSERVED = ['for', 'open', 'placement', 'distance', 'skidding', 'without-arrow'];

  class IsPopover extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #popup;
    #dialog;
    #anchor = null;
    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#popup = shadow.querySelector('is-popup');
      this.#dialog = shadow.querySelector('.dialog');

      this.#dialog.addEventListener('click', (e) => {
        const closer = e.target.closest?.('[data-popover="close"]');
        if (closer) this.hide();
      });
    }

    connectedCallback() {
      this.#mounted = true;
      this.#syncPopup();
      this.#bindAnchor();
      if (this.open) this.#doShow(true);
    }

    disconnectedCallback() {
      this.#mounted = false;
      this.#unbindAnchor();
      if (openPopover === this) openPopover = null;
      document.removeEventListener('pointerdown', this.#onDocPointer, true);
      document.removeEventListener('keydown', this.#onDocKey, true);
    }

    attributeChangedCallback(name) {
      if (!this.#mounted) return;
      if (name === 'for') this.#bindAnchor();
      else if (name === 'open') {
        if (this.open) this.#doShow();
        else this.#doHide();
      } else this.#syncPopup();
    }

    get open() { return this.hasAttribute('open'); }
    set open(v) { this.toggleAttribute('open', !!v); }

    get for() { return this.getAttribute('for') || ''; }
    set for(v) { v ? this.setAttribute('for', v) : this.removeAttribute('for'); }

    get placement() { return this.getAttribute('placement') || 'top'; }
    set placement(v) { this.setAttribute('placement', v); }

    get distance() { return Number(this.getAttribute('distance') ?? 8); }
    set distance(v) { this.setAttribute('distance', String(v)); }

    get skidding() { return Number(this.getAttribute('skidding')) || 0; }
    set skidding(v) { this.setAttribute('skidding', String(v)); }

    get withoutArrow() { return this.hasAttribute('without-arrow'); }
    set withoutArrow(v) { this.toggleAttribute('without-arrow', !!v); }

    show() { this.open = true; }
    hide() { this.open = false; }

    #syncPopup() {
      this.#popup.placement = this.placement;
      this.#popup.distance = this.distance;
      this.#popup.skidding = this.skidding;
      this.#popup.arrow = !this.withoutArrow;
      this.#popup.style.setProperty('--arrow-color', 'var(--is-bg-elev, #1c2128)');
    }

    #bindAnchor() {
      this.#unbindAnchor();
      if (!this.for) return;
      const root = this.getRootNode();
      const el = root.getElementById?.(this.for) || document.getElementById(this.for);
      if (!el) {
        console.warn(`[is-popover] El ancla #${this.for} debe existir en el DOM antes de conectar.`);
        return;
      }
      this.#anchor = el;
      this.#popup.anchor = el;
      el.addEventListener('click', this.#onAnchorClick);
      el.setAttribute('aria-haspopup', 'dialog');
      el.setAttribute('aria-expanded', String(this.open));
    }

    #unbindAnchor() {
      if (!this.#anchor) return;
      this.#anchor.removeEventListener('click', this.#onAnchorClick);
      this.#anchor = null;
    }

    #onAnchorClick = (e) => {
      e.preventDefault();
      this.open = !this.open;
    };

    #onDocPointer = (e) => {
      if (!this.open) return;
      const path = e.composedPath();
      if (path.includes(this) || (this.#anchor && path.includes(this.#anchor))) return;
      this.hide();
    };

    #onDocKey = (e) => {
      if (e.key === 'Escape' && this.open) this.hide();
    };

    #setOpenState(on) {
      try {
        if (on) this.internals?.states?.add?.('open');
        else this.internals?.states?.delete?.('open');
      } catch { /* noop */ }
      if (this.#anchor) this.#anchor.setAttribute('aria-expanded', String(on));
    }

    #doShow(silent) {
      if (!silent) {
        const ev = new CustomEvent('is-show', { bubbles: true, composed: true, cancelable: true });
        if (!this.dispatchEvent(ev)) {
          this.removeAttribute('open');
          return;
        }
      }
      if (openPopover && openPopover !== this) openPopover.hide();
      openPopover = this;

      this.#popup.active = true;
      this.#dialog.hidden = false;
      this.#setOpenState(true);
      this.#popup.reposition();

      const autofocus = this.querySelector('[autofocus]');
      autofocus?.focus?.();

      document.addEventListener('pointerdown', this.#onDocPointer, true);
      document.addEventListener('keydown', this.#onDocKey, true);
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
      this.#popup.active = false;
      this.#dialog.hidden = true;
      this.#setOpenState(false);
      if (openPopover === this) openPopover = null;
      document.removeEventListener('pointerdown', this.#onDocPointer, true);
      document.removeEventListener('keydown', this.#onDocKey, true);
      this.#anchor?.focus?.();
      this.dispatchEvent(new CustomEvent('is-after-hide', { bubbles: true, composed: true }));
    }
  }

  if (!customElements.get('is-popover')) {
    customElements.define('is-popover', IsPopover);
  }
  if (typeof window !== 'undefined') window.IsPopover = IsPopover;
})();
