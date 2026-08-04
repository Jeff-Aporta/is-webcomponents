import { adoptCss } from '../_shared/adopt-css.js';
import { computePosition, PLACEMENTS, isVirtualElement } from '../_shared/position.js';

/**
 * <is-floating> â€” building block interno de posicionamiento anclado.
 *
 * No es API pÃºblica: Ãºsalo solo desde `<is-popover>` / `<is-tooltip>`.
 * Para UI de producto usa siempre `<is-popover>`.
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
 *         is-hover-bridge { hovering }
 * Parts: ::part(popup) ::part(arrow) ::part(hover-bridge) ::part(anchor)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="base" part="base">
      <slot name="anchor" class="anchor-slot" part="anchor"></slot>
      <div class="popup" part="popup" hidden>
        <slot></slot>
        <div class="arrow" part="arrow" hidden>
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <!-- Rombo: punta arriba/abajo/izq/der a 1px del borde del viewBox
                 en escala 1:1 con el cuadrado de 16x16 que renderiza arrowSize.
                 El triangulo exterior cierra sobre el borde del popup; el
                 interior esta 1px mas adentro para que el stroke de 1px no
                 sangre dentro del contenido. -->
            <polygon class="arrow-fill"
              points="8,8 8,1 15,8 8,15 1,8"></polygon>
            <polygon class="arrow-stroke"
              points="8,8 8,2 14,8 8,14 2,8"></polygon>
          </svg>
        </div>
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

  class IsFloating extends HTMLElement {
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
    #measuring = false;
    #bridgeBound = false;

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
      if (!this.active || !this.#mounted || this.#measuring) return;
      const anchor = this.#getAnchorTarget();
      if (!anchor) return;

      const arrowSize = parseFloat(getComputedStyle(this).getPropertyValue('--arrow-size')) || 8;
      this.#measuring = true;
      let result;
      try {
        result = computePosition({
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
      } finally {
        this.#measuring = false;
      }
      if (!result) return;

      const nextTop = `${result.top}px`;
      const nextLeft = `${result.left}px`;
      if (
        this.#popup.style.position === result.strategy
        && this.#popup.style.top === nextTop
        && this.#popup.style.left === nextLeft
        && this.#popup.dataset.currentPlacement === result.placement
      ) {
        return;
      }

      this.#popup.style.position = result.strategy;
      this.#popup.style.top = nextTop;
      this.#popup.style.left = nextLeft;
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

      this.#updateBridge(result);
      this.#bindBridgeEvents();

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
        requestAnimationFrame(() => {
          requestAnimationFrame(() => this.reposition());
        });
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

      // Solo ancla: observar el popup causa loop RO â†” reposition (flicker)
      if (typeof ResizeObserver !== 'undefined') {
        this.#ro = new ResizeObserver(() => {
          if (!this.#measuring) this.#schedule();
        });
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

    #bindBridgeEvents() {
      if (this.#bridgeBound) return;
      this.#bridgeBound = true;
      this.#bridge.addEventListener('pointerenter', () => {
        this.dispatchEvent(new CustomEvent('is-hover-bridge', {
          bubbles: true,
          composed: true,
          detail: { hovering: true },
        }));
      });
      this.#bridge.addEventListener('pointerleave', () => {
        this.dispatchEvent(new CustomEvent('is-hover-bridge', {
          bubbles: true,
          composed: true,
          detail: { hovering: false },
        }));
      });
    }

    #updateBridge(result) {
      if (!this.hoverBridge || !result.anchor) {
        this.#bridge.hidden = true;
        return;
      }
      const a = result.anchor;
      const side = result.placement.split('-')[0];
      // El bridge cubre la franja entre el ancla y el cuerpo del popup. Si la
      // flecha estÃ¡ activa, esa franja incluye la mitad exterior del rombo.
      const arrowSize = parseFloat(getComputedStyle(this).getPropertyValue('--arrow-size')) || 8;
      const dist = this.distance + (this.arrow ? arrowSize : 0);
      if (dist <= 0) {
        this.#bridge.hidden = true;
        return;
      }

      const popLeft = result.viewportLeft ?? result.left;
      const popTop = result.viewportTop ?? result.top;
      const popW = result.popupSize.width;
      const popH = result.popupSize.height;

      this.#bridge.hidden = false;
      this.#bridge.style.position = result.strategy;
      let top; let left; let width; let height;
      if (side === 'top') {
        top = a.top - dist;
        left = Math.min(a.left, popLeft);
        width = Math.max(a.right, popLeft + popW) - left;
        height = dist;
      } else if (side === 'bottom') {
        top = a.bottom;
        left = Math.min(a.left, popLeft);
        width = Math.max(a.right, popLeft + popW) - left;
        height = dist;
      } else if (side === 'left') {
        left = a.left - dist;
        top = Math.min(a.top, popTop);
        width = dist;
        height = Math.max(a.bottom, popTop + popH) - top;
      } else {
        left = a.right;
        top = Math.min(a.top, popTop);
        width = dist;
        height = Math.max(a.bottom, popTop + popH) - top;
      }

      if (result.strategy === 'fixed') {
        const dx = (result.viewportLeft ?? result.left) - result.left;
        const dy = (result.viewportTop ?? result.top) - result.top;
        top -= dy;
        left -= dx;
      } else {
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

  if (!customElements.get('is-floating')) {
    customElements.define('is-floating', IsFloating);
  }
  if (typeof window !== 'undefined') window.IsFloating = IsFloating;
})();
