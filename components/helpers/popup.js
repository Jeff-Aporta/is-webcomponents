import { adoptCss } from '../_shared/adopt-css.js';
import { computePosition, PLACEMENTS, isVirtualElement } from '../_shared/position.js';

/**
 * <is-popup> — ancla un panel flotante a un elemento (building block).
 *
 * Slots: anchor | default (contenido)
 * Attrs: active, placement, distance, skidding, strategy, flip, shift,
 *        arrow, arrow-placement, arrow-padding, auto-size, boundary,
 *        hover-bridge, flip-fallback-placements, flip-fallback-strategy,
 *        flip-padding, shift-padding, auto-size-padding, anchor (id externo)
 *
 * Props: anchor (Element | string | VirtualElement)
 * Methods: reposition()
 * Events: is-reposition  { placement, x, y }
 * Parts: ::part(popup) ::part(arrow) ::part(hover-bridge) ::part(anchor)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="base" part="base">
      <slot name="anchor" class="anchor-slot" part="anchor"></slot>
      <div class="popup" part="popup" hidden>
        <slot></slot>
        <div class="arrow" part="arrow" hidden></div>
      </div>
      <div class="hover-bridge" part="hover-bridge" hidden></div>
    </div>
  `;

  const OBSERVED = [
    'active', 'placement', 'distance', 'skidding', 'strategy',
    'flip', 'shift', 'arrow', 'arrow-placement', 'arrow-padding',
    'auto-size', 'boundary', 'hover-bridge',
    'flip-fallback-placements', 'flip-fallback-strategy',
    'flip-padding', 'shift-padding', 'auto-size-padding', 'anchor',
  ];

  class IsPopup extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #popup;
    #arrow;
    #bridge;
    #anchorSlot;
    #anchorEl = null;
    #anchorRef = null;
    #mounted = false;
    #ro = null;
    #raf = 0;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#popup = shadow.querySelector('.popup');
      this.#arrow = shadow.querySelector('.arrow');
      this.#bridge = shadow.querySelector('.hover-bridge');
      this.#anchorSlot = shadow.querySelector('.anchor-slot');
      this.#anchorSlot.addEventListener('slotchange', () => this.#resolveAnchor());
    }

    connectedCallback() {
      this.#mounted = true;
      this.#resolveAnchor();
      this.#syncActive();
    }

    disconnectedCallback() {
      this.#mounted = false;
      this.#teardown();
    }

    attributeChangedCallback(name) {
      if (!this.#mounted) return;
      if (name === 'active') this.#syncActive();
      else if (name === 'anchor') this.#resolveAnchor();
      else if (this.active) this.reposition();
    }

    get active() { return this.hasAttribute('active'); }
    set active(v) { this.toggleAttribute('active', !!v); }

    get placement() {
      const v = this.getAttribute('placement') || 'top';
      return PLACEMENTS.includes(v) ? v : 'top';
    }
    set placement(v) { this.setAttribute('placement', v); }

    get distance() { return Number(this.getAttribute('distance')) || 0; }
    set distance(v) { this.setAttribute('distance', String(v)); }

    get skidding() { return Number(this.getAttribute('skidding')) || 0; }
    set skidding(v) { this.setAttribute('skidding', String(v)); }

    get strategy() {
      const v = this.getAttribute('strategy');
      return v === 'fixed' ? 'fixed' : 'absolute';
    }
    set strategy(v) { this.setAttribute('strategy', v === 'fixed' ? 'fixed' : 'absolute'); }

    get flip() { return this.hasAttribute('flip'); }
    set flip(v) { this.toggleAttribute('flip', !!v); }

    get shift() { return this.hasAttribute('shift'); }
    set shift(v) { this.toggleAttribute('shift', !!v); }

    get arrow() { return this.hasAttribute('arrow'); }
    set arrow(v) { this.toggleAttribute('arrow', !!v); }

    get arrowPlacement() { return this.getAttribute('arrow-placement') || 'anchor'; }
    set arrowPlacement(v) { this.setAttribute('arrow-placement', v); }

    get arrowPadding() { return Number(this.getAttribute('arrow-padding')) || 10; }
    set arrowPadding(v) { this.setAttribute('arrow-padding', String(v)); }

    get autoSize() {
      const v = this.getAttribute('auto-size');
      return ['horizontal', 'vertical', 'both'].includes(v) ? v : '';
    }
    set autoSize(v) {
      if (!v) this.removeAttribute('auto-size');
      else this.setAttribute('auto-size', v);
    }

    get boundary() {
      return this.getAttribute('boundary') === 'scroll' ? 'scroll' : 'viewport';
    }
    set boundary(v) { this.setAttribute('boundary', v === 'scroll' ? 'scroll' : 'viewport'); }

    get hoverBridge() { return this.hasAttribute('hover-bridge'); }
    set hoverBridge(v) { this.toggleAttribute('hover-bridge', !!v); }

    get flipFallbackPlacements() { return this.getAttribute('flip-fallback-placements') || ''; }
    set flipFallbackPlacements(v) { this.setAttribute('flip-fallback-placements', v || ''); }

    get flipFallbackStrategy() {
      return this.getAttribute('flip-fallback-strategy') === 'initial' ? 'initial' : 'best-fit';
    }
    set flipFallbackStrategy(v) {
      this.setAttribute('flip-fallback-strategy', v === 'initial' ? 'initial' : 'best-fit');
    }

    get flipPadding() { return Number(this.getAttribute('flip-padding')) || 0; }
    set flipPadding(v) { this.setAttribute('flip-padding', String(v)); }

    get shiftPadding() { return Number(this.getAttribute('shift-padding')) || 0; }
    set shiftPadding(v) { this.setAttribute('shift-padding', String(v)); }

    get autoSizePadding() { return Number(this.getAttribute('auto-size-padding')) || 0; }
    set autoSizePadding(v) { this.setAttribute('auto-size-padding', String(v)); }

    /** Element | id string | VirtualElement */
    get anchor() {
      if (this.#anchorRef) return this.#anchorRef;
      return this.#anchorEl;
    }
    set anchor(v) {
      this.#anchorRef = v ?? null;
      if (typeof v === 'string') this.setAttribute('anchor', v);
      else if (v instanceof Element || isVirtualElement(v)) this.removeAttribute('anchor');
      this.#resolveAnchor();
      if (this.active) this.reposition();
    }

    reposition() {
      if (!this.active || !this.#mounted) return;
      const anchor = this.#getAnchorTarget();
      if (!anchor) return;

      const arrowSize = parseFloat(getComputedStyle(this).getPropertyValue('--arrow-size')) || 8;
      const result = computePosition({
        anchor,
        popupEl: this.#popup,
        placement: this.placement,
        distance: this.distance,
        skidding: this.skidding,
        flip: this.flip,
        flipFallbackPlacements: this.flipFallbackPlacements,
        flipFallbackStrategy: this.flipFallbackStrategy,
        flipPadding: this.flipPadding,
        shift: this.shift,
        shiftPadding: this.shiftPadding,
        autoSize: this.autoSize,
        autoSizePadding: this.autoSizePadding,
        boundary: this.boundary,
        strategy: this.strategy,
        arrow: this.arrow,
        arrowSize,
        arrowPadding: this.arrowPadding,
        arrowPlacement: this.arrowPlacement,
      });
      if (!result) return;

      this.#popup.style.position = result.strategy;
      this.#popup.style.top = `${result.top}px`;
      this.#popup.style.left = `${result.left}px`;
      this.#popup.dataset.currentPlacement = result.placement;
      this.dataset.currentPlacement = result.placement;

      if (result.availableWidth != null) {
        this.style.setProperty('--auto-size-available-width', `${result.availableWidth}px`);
      } else {
        this.style.removeProperty('--auto-size-available-width');
      }
      if (result.availableHeight != null) {
        this.style.setProperty('--auto-size-available-height', `${result.availableHeight}px`);
      } else {
        this.style.removeProperty('--auto-size-available-height');
      }

      if (this.arrow && result.arrow) {
        this.#arrow.hidden = false;
        Object.assign(this.#arrow.style, {
          top: result.arrow.top,
          left: result.arrow.left,
          right: result.arrow.right,
          bottom: result.arrow.bottom,
        });
      } else {
        this.#arrow.hidden = true;
      }

      this.#updateBridge(result, anchor);

      this.dispatchEvent(new CustomEvent('is-reposition', {
        bubbles: true,
        composed: true,
        detail: { placement: result.placement, x: result.left, y: result.top },
      }));
    }

    #getAnchorTarget() {
      if (this.#anchorRef) return this.#anchorRef;
      return this.#anchorEl;
    }

    #resolveAnchor() {
      if (this.#anchorRef && (this.#anchorRef instanceof Element || isVirtualElement(this.#anchorRef))) {
        this.#anchorEl = this.#anchorRef instanceof Element ? this.#anchorRef : null;
        // virtual stays in #anchorRef
        if (this.active) this.#setupListeners();
        return;
      }

      const attr = this.getAttribute('anchor');
      if (attr) {
        const el = (this.getRootNode()?.getElementById?.(attr))
          || document.getElementById(attr);
        this.#anchorEl = el;
      } else {
        const assigned = this.#anchorSlot.assignedElements({ flatten: true });
        this.#anchorEl = assigned[0] || null;
      }
      if (this.active) this.#setupListeners();
    }

    #syncActive() {
      if (this.active) {
        this.#popup.hidden = false;
        this.#setupListeners();
        requestAnimationFrame(() => this.reposition());
      } else {
        this.#popup.hidden = true;
        this.#bridge.hidden = true;
        this.#teardown();
      }
    }

    #setupListeners() {
      this.#teardown(false);
      const onScroll = () => this.#schedule();
      const onResize = () => this.#schedule();
      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', onResize);
      this.#onScroll = onScroll;
      this.#onResize = onResize;

      if (typeof ResizeObserver !== 'undefined') {
        this.#ro = new ResizeObserver(() => this.#schedule());
        this.#ro.observe(this.#popup);
        const a = this.#getAnchorTarget();
        if (a instanceof Element) this.#ro.observe(a);
      }
    }

    #onScroll = null;
    #onResize = null;

    #teardown(hide = true) {
      if (this.#onScroll) window.removeEventListener('scroll', this.#onScroll, true);
      if (this.#onResize) window.removeEventListener('resize', this.#onResize);
      this.#onScroll = null;
      this.#onResize = null;
      this.#ro?.disconnect();
      this.#ro = null;
      cancelAnimationFrame(this.#raf);
      if (hide) {
        this.#popup.hidden = true;
        this.#bridge.hidden = true;
      }
    }

    #schedule() {
      cancelAnimationFrame(this.#raf);
      this.#raf = requestAnimationFrame(() => this.reposition());
    }

    #updateBridge(result, anchor) {
      if (!this.hoverBridge || !result.anchor) {
        this.#bridge.hidden = true;
        return;
      }
      const a = result.anchor;
      const side = result.placement.split('-')[0];
      const dist = this.distance;
      if (dist <= 0) {
        this.#bridge.hidden = true;
        return;
      }

      this.#bridge.hidden = false;
      this.#bridge.style.position = result.strategy;
      // Bridge fills the gap between anchor and popup in viewport coords then convert like popup
      let top; let left; let width; let height;
      if (side === 'top') {
        top = a.top - dist;
        left = Math.min(a.left, result.left);
        width = Math.max(a.right, result.left + result.popupSize.width) - left;
        height = dist;
      } else if (side === 'bottom') {
        top = a.bottom;
        left = Math.min(a.left, result.left);
        width = Math.max(a.right, result.left + result.popupSize.width) - left;
        height = dist;
      } else if (side === 'left') {
        left = a.left - dist;
        top = Math.min(a.top, result.top);
        width = dist;
        height = Math.max(a.bottom, result.top + result.popupSize.height) - top;
      } else {
        left = a.right;
        top = Math.min(a.top, result.top);
        width = dist;
        height = Math.max(a.bottom, result.top + result.popupSize.height) - top;
      }

      if (result.strategy === 'absolute') {
        top += window.scrollY;
        left += window.scrollX;
      }
      Object.assign(this.#bridge.style, {
        top: `${top}px`,
        left: `${left}px`,
        width: `${Math.max(0, width)}px`,
        height: `${Math.max(0, height)}px`,
      });
    }
  }

  if (!customElements.get('is-popup')) {
    customElements.define('is-popup', IsPopup);
  }
  if (typeof window !== 'undefined') window.IsPopup = IsPopup;
})();
