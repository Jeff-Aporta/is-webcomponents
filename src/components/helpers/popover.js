import { adoptCss } from '../_shared/adopt-css.js';
import { withStyleAttrs } from '../_shared/style-attrs.js';
import './floating.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';

/**
 * <is-popover> — panel flotante con contenido interactivo, anclado vía `for`.
 *
 * Es el wrapper de alto nivel sobre `<is-floating>` (el building block de
 * posicionamiento). Popover añade: anchor declarativo por id, ciclo de
 * vida (mostrar / ocultar), accesibilidad del ancla (aria-haspopup +
 * aria-expanded), `data-popover="close"` en hijos para cerrar y la marca
 * de "panel activo global" para que sólo haya un popover visible a la vez.
 *
 * API publica: solo `<is-popover>`. El tag `is-popup` ya no existe ni como alias.
 *
 * Attrs: for, open, placement, distance, skidding, without-arrow,
 *        strategy, flip, shift, arrow, auto-size, boundary,
 *        flip-fallback-placements, flip-fallback-strategy,
 *        flip-padding, shift-padding, auto-size-padding
 * Props: anchor (Element | string | VirtualElement)
 * Methods: show(), hide(), reposition()
 * Events: is-show, is-after-show, is-hide, is-after-hide (cancelables),
 *         is-reposition { placement, x, y }, is-hover-bridge { hovering }
 * Parts: ::part(body) ::part(dialog) ::part(popup) ::part(arrow)
 *        ::part(hover-bridge) ::part(anchor)
 * CSS: --is-popover-max-width --is-popover-arrow-size --is-popover-show-duration --is-popover-hide-duration
 *        --auto-size-available-width --auto-size-available-height
 * data-popover="close" en hijos cierra el popover.
 */

(() => {
  let openPopover = null;

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <is-floating
      part="popup"
      class="popup"
      exportparts="popup:popup__popup, arrow:popup__arrow, hover-bridge:popup__hover-bridge"
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
    </is-floating>
  `;

  // Atributos que se delegan literalmente al `<is-floating>` interno. Cualquiera
  // que el building block entienda y que `is-popover` no reinterpretó.
  const POPUP_DELEGATED = [
    'placement', 'distance', 'skidding', 'without-arrow', 'strategy',
    'flip', 'shift', 'auto-size', 'boundary',
    'flip-fallback-placements', 'flip-fallback-strategy',
    'flip-padding', 'shift-padding', 'auto-size-padding',
  ];

  const OBSERVED = ['for', 'open', ...POPUP_DELEGATED];

  class IsPopover extends withStyleAttrs(HTMLElement) {
    /** Personalización por atributo (ver `_shared/style-attrs.js`). */
    static styleAttrs = {
    'max-width': '--is-popover-max-width',
    'arrow-size': '--is-popover-arrow-size',
    'show-duration': '--is-popover-show-duration',
    'hide-duration': '--is-popover-hide-duration',
    };

    static get observedAttributes() { return [...OBSERVED, 'max-width', 'arrow-size', 'show-duration', 'hide-duration']; }

    #popup;
    #dialog;
    #anchor = null;
    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#popup = shadow.querySelector('is-floating');
      this.#dialog = shadow.querySelector('.dialog');

      this.#dialog.addEventListener('click', (e) => {
        const closer = e.target.closest?.('[data-popover="close"]');
        if (closer) this.hide();
      });
    }

    connectedCallback() {
      super.connectedCallback();
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
      super.attributeChangedCallback(name);
      if (!this.#mounted) return;
      if (name === 'for') this.#bindAnchor();
      else if (name === 'open') {
        if (this.open) this.#doShow();
        else this.#doHide();
      } else this.#syncPopup();
    }

    // ── API pública ───────────────────────────────────────────────────────
    get open() { return this.hasAttribute('open'); }
    set open(v) { this.toggleAttribute('open', !!v); }

    get for() { return this.getAttribute('for') || ''; }
    set for(v) { v ? this.setAttribute('for', v) : this.removeAttribute('for'); }

    get anchor() { return this.#popup.anchor; }
    set anchor(v) { this.#popup.anchor = v; }

    show() { this.open = true; }
    hide() { this.open = false; }
    reposition() { this.#popup.reposition(); }

    // ── Delegados al popup interno ───────────────────────────────────────
    get placement() { return this.#popup.placement; }
    set placement(v) { this.#popup.placement = v; }

    get distance() { return this.#popup.distance; }
    set distance(v) { this.#popup.distance = v; }

    get skidding() { return this.#popup.skidding; }
    set skidding(v) { this.#popup.skidding = v; }

    get withoutArrow() { return !this.#popup.arrow; }
    set withoutArrow(v) { this.#popup.arrow = !v; }

    get strategy() { return this.#popup.strategy; }
    set strategy(v) { this.#popup.strategy = v; }

    get flip() { return this.#popup.flip; }
    set flip(v) { this.#popup.flip = v; }

    get shift() { return this.#popup.shift; }
    set shift(v) { this.#popup.shift = v; }

    get arrow() { return this.#popup.arrow; }
    set arrow(v) { this.#popup.arrow = v; }

    get autoSize() { return this.#popup.autoSize; }
    set autoSize(v) { this.#popup.autoSize = v; }

    get boundary() { return this.#popup.boundary; }
    set boundary(v) { this.#popup.boundary = v; }

    get flipFallbackPlacements() { return this.#popup.flipFallbackPlacements; }
    set flipFallbackPlacements(v) { this.#popup.flipFallbackPlacements = v; }

    get flipFallbackStrategy() { return this.#popup.flipFallbackStrategy; }
    set flipFallbackStrategy(v) { this.#popup.flipFallbackStrategy = v; }

    get flipPadding() { return this.#popup.flipPadding; }
    set flipPadding(v) { this.#popup.flipPadding = v; }

    get shiftPadding() { return this.#popup.shiftPadding; }
    set shiftPadding(v) { this.#popup.shiftPadding = v; }

    get autoSizePadding() { return this.#popup.autoSizePadding; }
    set autoSizePadding(v) { this.#popup.autoSizePadding = v; }

    get hoverBridge() { return this.#popup.hoverBridge; }
    set hoverBridge(v) { this.#popup.hoverBridge = v; }

    // ── Privados ──────────────────────────────────────────────────────────
    #syncPopup() {
      this.#popup.placement = this.getAttribute('placement') || 'top';
      this.#popup.distance = this.hasAttribute('distance')
        ? (Number(this.getAttribute('distance')) || 0)
        : 8;
      this.#popup.skidding = Number(this.getAttribute('skidding')) || 0;
      this.#popup.arrow = !this.hasAttribute('without-arrow');
      this.#popup.strategy = this.getAttribute('strategy') || 'fixed';
      this.#popup.flip = this.hasAttribute('flip');
      this.#popup.shift = this.hasAttribute('shift');
      this.#popup.boundary = this.getAttribute('boundary') === 'scroll' ? 'scroll' : 'viewport';
      const auto = this.getAttribute('auto-size');
      if (auto) this.#popup.autoSize = auto; else this.#popup.removeAttribute('auto-size');
      const fallbacks = this.getAttribute('flip-fallback-placements');
      if (fallbacks) this.#popup.flipFallbackPlacements = fallbacks;
      else this.#popup.removeAttribute('flip-fallback-placements');
      const fbStrategy = this.getAttribute('flip-fallback-strategy');
      if (fbStrategy) this.#popup.flipFallbackStrategy = fbStrategy;
      else this.#popup.removeAttribute('flip-fallback-strategy');
      for (const [attr, prop] of [
        ['flip-padding', 'flipPadding'],
        ['shift-padding', 'shiftPadding'],
        ['auto-size-padding', 'autoSizePadding'],
      ]) {
        const v = this.getAttribute(attr);
        if (v != null) this.#popup[prop] = v; else this.#popup.removeAttribute(attr);
      }
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
      emit(this, 'is-after-show');
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
      emit(this, 'is-after-hide');
    }
  }

  defineElement('is-popover', IsPopover, 'IsPopover');


})();
