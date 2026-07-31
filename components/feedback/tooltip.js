import { adoptCss } from '../_shared/adopt-css.js';
import '../helpers/popup.js';

/**
 * <is-tooltip> — tip contextual anclado vía `for`.
 *
 * Attrs: for, open, placement, trigger, distance, skidding,
 *        show-delay, hide-delay, disabled, without-arrow
 * Methods: show(), hide()
 * Events: is-show, is-after-show, is-hide, is-after-hide
 * Parts: ::part(tooltip) ::part(body) ::part(base__popup) ::part(base__arrow)
 * CSS: --max-width
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <is-popup
      part="base"
      class="popup"
      exportparts="popup:base__popup, arrow:base__arrow"
      strategy="fixed"
      flip
      shift
      arrow
      placement="top"
      distance="8"
    >
      <div part="tooltip base" class="tooltip" role="tooltip">
        <div part="body" class="body"><slot></slot></div>
      </div>
    </is-popup>
  `;

  const OBSERVED = [
    'for', 'open', 'placement', 'trigger', 'distance', 'skidding',
    'show-delay', 'hide-delay', 'disabled', 'without-arrow',
  ];

  class IsTooltip extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #popup;
    #target = null;
    #mounted = false;
    #showTimer = 0;
    #hideTimer = 0;
    #hovering = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#popup = shadow.querySelector('is-popup');
    }

    connectedCallback() {
      this.#mounted = true;
      this.#syncPopup();
      this.#bindTarget();
      if (this.open) this.#doShow();
    }

    disconnectedCallback() {
      this.#mounted = false;
      this.#unbindTarget();
      clearTimeout(this.#showTimer);
      clearTimeout(this.#hideTimer);
    }

    attributeChangedCallback(name) {
      if (!this.#mounted) return;
      if (name === 'for') this.#bindTarget();
      else if (name === 'open') {
        if (this.open) this.#doShow();
        else this.#doHide();
      } else this.#syncPopup();
    }

    get open() { return this.hasAttribute('open'); }
    set open(v) { this.toggleAttribute('open', !!v); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get for() { return this.getAttribute('for') || ''; }
    set for(v) { v ? this.setAttribute('for', v) : this.removeAttribute('for'); }

    get placement() { return this.getAttribute('placement') || 'top'; }
    set placement(v) { this.setAttribute('placement', v); }

    get trigger() { return this.getAttribute('trigger') || 'hover focus'; }
    set trigger(v) { this.setAttribute('trigger', v); }

    get distance() { return Number(this.getAttribute('distance') ?? 8); }
    set distance(v) { this.setAttribute('distance', String(v)); }

    get skidding() { return Number(this.getAttribute('skidding')) || 0; }
    set skidding(v) { this.setAttribute('skidding', String(v)); }

    get showDelay() { return Number(this.getAttribute('show-delay') ?? 150); }
    set showDelay(v) { this.setAttribute('show-delay', String(v)); }

    get hideDelay() { return Number(this.getAttribute('hide-delay')) || 0; }
    set hideDelay(v) { this.setAttribute('hide-delay', String(v)); }

    get withoutArrow() { return this.hasAttribute('without-arrow'); }
    set withoutArrow(v) { this.toggleAttribute('without-arrow', !!v); }

    show() { this.open = true; }
    hide() { this.open = false; }

    #hasTrigger(name) {
      return this.trigger.split(/\s+/).includes(name);
    }

    #syncPopup() {
      this.#popup.placement = this.placement;
      this.#popup.distance = this.distance;
      this.#popup.skidding = this.skidding;
      this.#popup.arrow = !this.withoutArrow;
      this.#popup.style.setProperty('--arrow-color', 'var(--is-tooltip-bg, #212529)');
    }

    #bindTarget() {
      this.#unbindTarget();
      if (!this.for) return;
      const root = this.getRootNode();
      const el = root.getElementById?.(this.for) || document.getElementById(this.for);
      if (!el) {
        console.warn(`[is-tooltip] No se encontró #${this.for}`);
        return;
      }
      this.#target = el;
      this.#popup.anchor = el;
      el.setAttribute('aria-describedby', this.id || this.#ensureId());

      if (this.#hasTrigger('hover')) {
        el.addEventListener('pointerenter', this.#onEnter);
        el.addEventListener('pointerleave', this.#onLeave);
      }
      if (this.#hasTrigger('focus')) {
        el.addEventListener('focus', this.#onFocus, true);
        el.addEventListener('blur', this.#onBlur, true);
      }
      if (this.#hasTrigger('click')) {
        el.addEventListener('click', this.#onClick);
      }
    }

    #ensureId() {
      if (!this.id) this.id = `is-tooltip-${Math.random().toString(36).slice(2, 9)}`;
      return this.id;
    }

    #unbindTarget() {
      const el = this.#target;
      if (!el) return;
      el.removeEventListener('pointerenter', this.#onEnter);
      el.removeEventListener('pointerleave', this.#onLeave);
      el.removeEventListener('focus', this.#onFocus, true);
      el.removeEventListener('blur', this.#onBlur, true);
      el.removeEventListener('click', this.#onClick);
      this.#target = null;
    }

    #onEnter = () => {
      if (this.disabled || this.#hasTrigger('manual')) return;
      this.#hovering = true;
      clearTimeout(this.#hideTimer);
      clearTimeout(this.#showTimer);
      this.#showTimer = setTimeout(() => this.open = true, this.showDelay);
    };

    #onLeave = () => {
      if (this.disabled || this.#hasTrigger('manual')) return;
      this.#hovering = false;
      clearTimeout(this.#showTimer);
      clearTimeout(this.#hideTimer);
      this.#hideTimer = setTimeout(() => {
        if (!this.#hovering) this.open = false;
      }, this.hideDelay);
    };

    #onFocus = () => {
      if (this.disabled || this.#hasTrigger('manual')) return;
      clearTimeout(this.#hideTimer);
      this.open = true;
    };

    #onBlur = () => {
      if (this.disabled || this.#hasTrigger('manual')) return;
      if (!this.#hovering) this.open = false;
    };

    #onClick = () => {
      if (this.disabled || this.#hasTrigger('manual')) return;
      this.open = !this.open;
    };

    #doShow() {
      if (this.disabled) {
        this.removeAttribute('open');
        return;
      }
      const ev = new CustomEvent('is-show', { bubbles: true, composed: true, cancelable: true });
      if (!this.dispatchEvent(ev)) {
        this.removeAttribute('open');
        return;
      }
      this.#popup.active = true;
      this.#popup.reposition();
      this.dispatchEvent(new CustomEvent('is-after-show', { bubbles: true, composed: true }));
    }

    #doHide() {
      const ev = new CustomEvent('is-hide', { bubbles: true, composed: true, cancelable: true });
      if (!this.dispatchEvent(ev)) {
        this.setAttribute('open', '');
        return;
      }
      this.#popup.active = false;
      this.dispatchEvent(new CustomEvent('is-after-hide', { bubbles: true, composed: true }));
    }
  }

  if (!customElements.get('is-tooltip')) {
    customElements.define('is-tooltip', IsTooltip);
  }
  if (typeof window !== 'undefined') window.IsTooltip = IsTooltip;
})();
