import { adoptCss, defineElement, emit } from '../../core/element.js';
import { withStyleAttrs } from '../../core/attrs.js';

import {
  computePosition,
  PLACEMENTS,
  isVirtualElement,
  type AnchorLike,
  type ComputePositionResult,
} from '../_shared/position.js';

/**
 * <is-floating> — building block interno de posicionamiento anclado.
 *
 * No es API pública: úsalo solo desde `<is-popover>` / `<is-tooltip>`.
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
  /** Lee `--is-floating-arrow-size` en px. `parseFloat('0.375rem')` devolvía 0.375 y rompía la flecha. */
  const arrowSizePx = (el: Element): number => {
    const raw = getComputedStyle(el).getPropertyValue('--is-floating-arrow-size').trim();
    if (!raw) return 8;
    const n = parseFloat(raw);
    if (!Number.isFinite(n) || n <= 0) return 8;
    if (raw.endsWith('rem')) {
      return n * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
    }
    if (raw.endsWith('em')) {
      return n * (parseFloat(getComputedStyle(el).fontSize) || 16);
    }
    return n;
  };

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
    'modal', 'label', 'labelledby',
  ];

  class IsFloating extends withStyleAttrs(HTMLElement) {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    'arrow-size': '--is-floating-arrow-size',
    'show-duration': '--is-floating-show-duration',
    'hide-duration': '--is-floating-hide-duration',
    };

    static get observedAttributes(): string[] { return [...OBSERVED, 'arrow-size', 'show-duration', 'hide-duration']; }

    #popup!: HTMLElement;
    #arrow!: HTMLElement;
    #bridge!: HTMLElement;
    #anchorSlot!: HTMLElement;
    #anchorEl: Element | null = null;
    #anchorRef: AnchorLike | null = null;
    #mounted = false;
    #ro: ResizeObserver | null = null;
    #raf = 0;
    #measuring = false;
    #bridgeBound = false;
    #lastActive: HTMLElement | null = null;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#popup = shadow.querySelector<HTMLElement>('.popup')!;
      this.#arrow = shadow.querySelector<HTMLElement>('.arrow')!;
      this.#bridge = shadow.querySelector<HTMLElement>('.hover-bridge')!;
      this.#anchorSlot = shadow.querySelector<HTMLElement>('.anchor-slot')!;
      this.#anchorSlot.addEventListener('slotchange', () => this.#resolveAnchor());
    }

    connectedCallback(): void {

      super.connectedCallback();
      this.#mounted = true;
      this.#resolveAnchor();
      this.#syncActive();
      // Listeners de teclado globales: solo cuando es modal — propuesta g09.
      // Capturamos fase para que Escape cierre ANTES de que el evento llegue
      // al árbol del popup (que podría tener otros handlers).
      if (this.modal) {
        document.addEventListener('keydown', this.#onModalKeydown, true);
      }
    }

    disconnectedCallback(): void {
      this.#mounted = false;
      this.#teardown();
      document.removeEventListener('keydown', this.#onModalKeydown, true);
      this.#releaseTrap();
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {

      super.attributeChangedCallback(name, oldValue, newValue);
      if (!this.#mounted) return;
      if (name === 'active') this.#syncActive();
      else if (name === 'anchor') this.#resolveAnchor();
      else if (name === 'modal' || name === 'label' || name === 'labelledby') {
        // Atributos ARIA: no requieren reposition, solo reaplicar sync.
        this.#syncModalAria();
      }
      else if (this.active) this.reposition();
    }

    get active() { return this.hasAttribute('active'); }
    set active(v) { this.toggleAttribute('active', !!v); }

    get placement(): string {
      const v = this.getAttribute('placement') || 'top';
      return PLACEMENTS.includes(v as never) ? v : 'top';
    }
    set placement(v: string) { this.setAttribute('placement', v); }

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

    get autoSize(): '' | 'horizontal' | 'vertical' | 'both' {
      const v = this.getAttribute('auto-size');
      return ['horizontal', 'vertical', 'both'].includes(v ?? '') ? (v as 'horizontal' | 'vertical' | 'both') : '';
    }
    set autoSize(v: '' | 'horizontal' | 'vertical' | 'both') {
      if (!v) this.removeAttribute('auto-size');
      else this.setAttribute('auto-size', v);
    }

    get boundary() {
      return this.getAttribute('boundary') === 'scroll' ? 'scroll' : 'viewport';
    }
    set boundary(v) { this.setAttribute('boundary', v === 'scroll' ? 'scroll' : 'viewport'); }

    get hoverBridge() { return this.hasAttribute('hover-bridge'); }
    set hoverBridge(v) { this.toggleAttribute('hover-bridge', !!v); }

    /**
     * Modo modal (proposal g09 floating — `role=dialog` cuando modal).
     * Activa: `role="dialog"`, `aria-modal="true"`, focus trap con Tab cycling,
     * cierre con Escape, y restaura foco al disparador al desactivar.
     */
    get modal(): boolean { return this.hasAttribute('modal'); }
    set modal(v: boolean) { this.toggleAttribute('modal', !!v); }

    /** Etiqueta accesible del dialog (proposal g09 floating). */
    get label(): string {
      return this.getAttribute('label') ?? '';
    }
    set label(v: string) {
      if (v == null || v === '') this.removeAttribute('label');
      else this.setAttribute('label', String(v));
    }

    /** Referencia a un `<label>` externo (proposal g09 floating). */
    get labelledby(): string {
      return this.getAttribute('labelledby') ?? '';
    }
    set labelledby(v: string) {
      if (v == null || v === '') this.removeAttribute('labelledby');
      else this.setAttribute('labelledby', String(v));
    }

    get flipFallbackPlacements() { return this.getAttribute('flip-fallback-placements') || ''; }
    set flipFallbackPlacements(v: string) { this.setAttribute('flip-fallback-placements', v || ''); }

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

    get anchor(): AnchorLike | Element | null {
      if (this.#anchorRef) return this.#anchorRef;
      return this.#anchorEl;
    }
    set anchor(v: AnchorLike | Element | string | null | undefined) {
      if (v == null) this.#anchorRef = null;
      else if (typeof v === 'string') {
        this.#anchorRef = null;
        this.setAttribute('anchor', v);
      } else {
        this.#anchorRef = v;
        if (v instanceof Element || isVirtualElement(v)) this.removeAttribute('anchor');
      }
      this.#resolveAnchor();
      if (this.active) this.reposition();
    }

    reposition(): void {
      if (!this.active || !this.#mounted || this.#measuring) return;
      const anchor = this.#getAnchorTarget();
      if (!anchor) return;

      const arrowSize = arrowSizePx(this);
      this.#measuring = true;
      let result: ComputePositionResult | null;
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
      const sameBox =
        this.#popup.style.position === result.strategy
        && this.#popup.style.top === nextTop
        && this.#popup.style.left === nextLeft
        && this.#popup.dataset.currentPlacement === result.placement;

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
        // Limpiar lados previos (si no, quedan top+bottom a la vez al cambiar placement).
        this.#arrow.style.top = '';
        this.#arrow.style.left = '';
        this.#arrow.style.right = '';
        this.#arrow.style.bottom = '';
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

      if (!sameBox) {
        emit(this, 'is-reposition', { placement: result.placement, x: result.left, y: result.top });
      }
    }

    #getAnchorTarget() {
      if (this.#anchorRef) return this.#anchorRef;
      return this.#anchorEl;
    }

    #resolveAnchor(): void {
      if (this.#anchorRef && (this.#anchorRef instanceof Element || isVirtualElement(this.#anchorRef))) {
        this.#anchorEl = this.#anchorRef instanceof Element ? this.#anchorRef : null;
        if (this.active) this.#setupListeners();
        return;
      }

      const attr = this.getAttribute('anchor');
      if (attr) {
        const root = this.getRootNode() as Document | ShadowRoot | null;
        const el = root?.getElementById?.(attr) || document.getElementById(attr);
        this.#anchorEl = el;
      } else {
        const assigned = (this.#anchorSlot as HTMLSlotElement).assignedElements({ flatten: true });
        this.#anchorEl = assigned[0] || null;
      }
      if (this.active) this.#setupListeners();
    }

    #syncActive(): void {
      if (this.active) {
        this.#popup.hidden = false;
        this.#setupListeners();
        // Recordar el foco activo antes de tomar el control del foco. Se
        // restaura en la rama `else` (modal) — proposal g09 floating.
        if (this.modal) {
          const ae = document.activeElement;
          if (ae instanceof HTMLElement && ae !== document.body) {
            this.#lastActive = ae;
          }
          this.#syncModalAria();
          this.#installTrap();
        }
        requestAnimationFrame(() => {
          requestAnimationFrame(() => this.reposition());
        });
      } else {
        this.#popup.hidden = true;
        this.#bridge.hidden = true;
        this.#teardown();
        this.#releaseTrap();
      }
    }

    /**
     * Sincroniza los atributos ARIA del dialog cuando el componente está
     * activo en modo modal. Aplica `role="dialog"`, `aria-modal="true"`,
     * `aria-label`/`aria-labelledby`. Sin modal activo no se aplica nada
     * (proposal g09: solo `dialog` cuando modal).
     */
    #syncModalAria(): void {
      if (!this.modal || !this.active) {
        this.#popup.removeAttribute('role');
        this.#popup.removeAttribute('aria-modal');
        this.#popup.removeAttribute('aria-label');
        this.#popup.removeAttribute('aria-labelledby');
        return;
      }
      this.#popup.setAttribute('role', 'dialog');
      this.#popup.setAttribute('aria-modal', 'true');
      const label = this.label.trim();
      const labelledby = this.labelledby.trim();
      if (label) {
        this.#popup.setAttribute('aria-label', label);
        this.#popup.removeAttribute('aria-labelledby');
      } else if (labelledby) {
        this.#popup.setAttribute('aria-labelledby', labelledby);
        this.#popup.removeAttribute('aria-label');
      } else {
        this.#popup.removeAttribute('aria-label');
        this.#popup.removeAttribute('aria-labelledby');
      }
    }

    /**
     * Captura global de teclas en modo modal (proposal g09 floating).
     * - Tab: cicla dentro del popup.
     * - Escape: cierra el floating (emitiendo is-close-cancel y desactivando).
     */
    #onModalKeydown = (ev: KeyboardEvent): void => {
      if (!this.modal || !this.active) return;
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        ev.preventDefault();
        this.active = false;
        return;
      }
      if (ev.key === 'Tab') {
        this.#cycleFocus(ev);
      }
    };

    /**
     * Cicla el foco entre los elementos focuseables del popup. Implementa el
     * focus trap estándar: Tab en el último → primero, Shift+Tab en el
     * primero → último.
     */
    #cycleFocus(ev: KeyboardEvent): void {
      const focusables = this.#focuseables();
      if (focusables.length === 0) {
        // Sin focuseables internos: dejamos el foco en el popup mismo.
        ev.preventDefault();
        this.#popup.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const ae = this.#popup.contains(document.activeElement)
        ? (document.activeElement as HTMLElement | null)
        : null;
      if (ev.shiftKey) {
        if (ae === first || ae == null) {
          ev.preventDefault();
          last.focus();
        }
      } else {
        if (ae === last) {
          ev.preventDefault();
          first.focus();
        }
      }
    }

    /** Elementos focuseables dentro del popup (excluyendo `hidden` y `[disabled]`). */
    #focuseables(): HTMLElement[] {
      const sel = [
        'a[href]', 'area[href]', 'button:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])', 'textarea:not([disabled])',
        'iframe', 'object', 'embed',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]',
      ].join(',');
      const out: HTMLElement[] = [];
      const visit = (root: ParentNode): void => {
        for (const el of Array.from(root.querySelectorAll<HTMLElement>(sel))) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue;
          if (el.hasAttribute('disabled')) continue;
          if (el.getAttribute('aria-hidden') === 'true') continue;
          out.push(el);
        }
        for (const el of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
          if ((el as unknown as { shadowRoot?: ShadowRoot | null }).shadowRoot) {
            visit((el as unknown as { shadowRoot: ShadowRoot }).shadowRoot);
          }
        }
      };
      visit(this.#popup);
      // Quitar duplicados preservando orden (mismo nodo via shadow + visit).
      const seen = new Set<HTMLElement>();
      return out.filter((e) => (seen.has(e) ? false : (seen.add(e), true)));
    }

    #installTrap(): void {
      if (!this.modal) return;
      // Tras pintar el popup, mover foco al primer focuseable (o al popup).
      requestAnimationFrame(() => {
        const focusables = this.#focuseables();
        const target = focusables[0] ?? this.#popup;
        if (target && typeof target.focus === 'function') {
          target.focus();
        }
      });
    }

    #releaseTrap(): void {
      // Restaurar foco al elemento que lo tenía antes de abrir (proposal g09).
      if (this.#lastActive && document.contains(this.#lastActive)) {
        try { this.#lastActive.focus(); } catch { /* nodo detachado */ }
      }
      this.#lastActive = null;
      // Quitar ARIA del popup al salir del modo modal/activo.
      this.#syncModalAria();
    }

    #setupListeners(): void {
      this.#teardown(false);
      const onScroll = (): void => this.#schedule();
      const onResize = (): void => this.#schedule();
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

    #onScroll: (() => void) | null = null;
    #onResize: (() => void) | null = null;

    #teardown(hide = true): void {
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
        emit(this, 'is-hover-bridge', { hovering: true });
      });
      this.#bridge.addEventListener('pointerleave', () => {
        emit(this, 'is-hover-bridge', { hovering: false });
      });
    }

    #updateBridge(result: ComputePositionResult): void {
      if (!this.hoverBridge || !result.anchor) {
        this.#bridge.hidden = true;
        return;
      }
      const a = result.anchor;
      const side = result.placement.split('-')[0];
      // El bridge cubre la franja entre el ancla y el cuerpo del popup. Si la
      // flecha estÃ¡ activa, esa franja incluye la mitad exterior del rombo.
      const arrowSize = arrowSizePx(this);
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

  defineElement('is-floating', IsFloating, 'IsFloating');
})();
