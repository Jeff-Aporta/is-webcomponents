import { adoptCss } from '../_shared/adopt-css.js';
import { getComponentPrefs, setComponentPrefs } from '../_shared/prefs.js';

/**
 * <is-split-panel> — Web Component (vanilla, zero dependencies).
 *
 * Dos paneles adyacentes
 * separados por un divisor arrastrable. Usa Shadow DOM con CSS propio,
 * sin frameworks. Se define automáticamente al importarse.
 *
 * Atributos
 *   position            number 0-100  (default 50, reflect)  — % desde el borde del panel primario
 *   position-in-pixels  number          (sin reflect)        — posición en px (sobrevive a resize)
 *   orientation         'horizontal' | 'vertical'  (default horizontal, reflect)
 *   primary             'start' | 'end'   (reflect, opcional)
 *   disabled            boolean  (reflect)
 *   snap                string  (espacio-sep "100px 50%")
 *   snap-threshold      number  (default 12)  — px ventana de snap
 *   storage-key         string  — id único; persiste tamaño en localStorage (`is-components`)
 *
 * Slots
 *   start     contenido del panel inicial
 *   end       contenido del panel final
 *   divider   override del divisor (icono, handle custom)
 *
 * CSS Parts
 *   start, end, panel, divider
 *
 * CSS custom properties
 *   --divider-width    5px
 *   --divider-hit-area 12px
 *   --min              0
 *   --max              100%
 *
 * Eventos
 *   reposition  CustomEvent<number> bubbles+composed — detail = nueva posición (%)
 *
 * Layout: paneles wrapper (.panel) en CSS grid.
 *   horizontal (lateral): grid-template-columns = primary | divider | secondary
 *   vertical (apilado):   grid-template-rows    = primary / divider / secondary
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `

    <div class="panel" part="panel start">
      <slot name="start"></slot>
    </div>
    <div part="divider" class="divider" tabindex="0" role="separator"
         aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"
         aria-orientation="horizontal" aria-label="Redimensionar panel">
      <slot name="divider"></slot>
    </div>
    <div class="panel" part="panel end">
      <slot name="end"></slot>
    </div>
  `;

  const OBSERVED = ['position', 'orientation', 'primary', 'disabled', 'snap', 'snap-threshold'];

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  class IsSplitPanel extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this._divider = shadow.querySelector('.divider');
      this._size = 0;
      this._cachedPositionInPixels = NaN;
      this._fromPixels = false;
      this._resizeObserver = null;
      this._mounted = false;
      this._isCollapsed = false;
      this._positionBeforeCollapse = 0;

      this._onKeyDown = (e) => this._handleKeyDown(e);
      this._onPointerDown = (e) => this._handlePointerDown(e);
      this._onPointerMove = (e) => this._handlePointerMove(e);
      this._onPointerUp = (e) => this._handlePointerUp(e);
    }

    connectedCallback() {
      this._mounted = true;
      this._upgradeProperties();

      this._divider.addEventListener('keydown', this._onKeyDown);
      this._divider.addEventListener('pointerdown', this._onPointerDown);

      if ('ResizeObserver' in window) {
        this._resizeObserver = new ResizeObserver((entries) => this._handleResize(entries));
        this._resizeObserver.observe(this);
      }

      // preferir px del markup YA (el track en px no necesita _size)
      this._restorePrefs();
      const pxAttr = parseFloat(this.getAttribute('position-in-pixels'));
      if (Number.isFinite(pxAttr)) this._cachedPositionInPixels = pxAttr;

      this._detectSize();
      if (Number.isFinite(this._cachedPositionInPixels) && this._size > 0) {
        this._syncPositionFromPixels(this._cachedPositionInPixels);
      } else if (!Number.isFinite(this._cachedPositionInPixels)) {
        this._cachedPositionInPixels = this._percentageToPixels(this.position);
      }
      this._updateStyles();
      this._syncDividerAria();
    }

    disconnectedCallback() {
      this._divider.removeEventListener('keydown', this._onKeyDown);
      this._divider.removeEventListener('pointerdown', this._onPointerDown);
      this._divider.removeEventListener('pointermove', this._onPointerMove);
      this._divider.removeEventListener('pointerup', this._onPointerUp);
      this._divider.removeEventListener('pointercancel', this._onPointerUp);
      this._resizeObserver?.disconnect();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this._mounted || oldVal === newVal) return;
      if (name === 'orientation') this._detectSize();
      if (name === 'disabled') this._divider.tabIndex = newVal != null ? -1 : 0;

      if (name === 'position' && oldVal != null && !this._fromPixels) {
        // cambio de % (teclado / API) → recalcular cache px
        this._cachedPositionInPixels = this._percentageToPixels(this.position);
        this.setAttribute('position-in-pixels', String(this._cachedPositionInPixels));
        this.dispatchEvent(new CustomEvent('reposition', {
          detail: this.position,
          bubbles: true,
          composed: true,
        }));
      }

      this._updateStyles();
      this._syncDividerAria();
    }

    // ---- public properties ----

    get position() {
      const v = parseFloat(this.getAttribute('position'));
      return Number.isFinite(v) ? clamp(v, 0, 100) : 50;
    }
    set position(v) {
      const n = clamp(Number(v) || 0, 0, 100);
      if (parseFloat(this.getAttribute('position')) === n) return;
      this.setAttribute('position', String(n));
    }

    get positionInPixels() {
      if (Number.isFinite(this._cachedPositionInPixels)) return this._cachedPositionInPixels;
      const v = parseFloat(this.getAttribute('position-in-pixels'));
      return Number.isFinite(v) ? v : this._percentageToPixels(this.position);
    }
    set positionInPixels(v) {
      const px = Number(v);
      if (!Number.isFinite(px)) return;
      this._syncPositionFromPixels(px);
      this._updateStyles();
      this._syncDividerAria();
    }

    /** Id único para persistir en localStorage (`is-components`). Vacío = no persiste. */
    get storageKey() {
      return (this.getAttribute('storage-key') || '').trim();
    }
    set storageKey(v) {
      if (v == null || v === '') this.removeAttribute('storage-key');
      else this.setAttribute('storage-key', String(v));
    }

    _restorePrefs() {
      const key = this.storageKey;
      if (!key) return;
      let saved = getComponentPrefs('is-split-panel', key);
      // migra legacy de la galería
      if (!saved && key === 'gallery-nav') {
        const legacy = localStorage.getItem('is-split-nav-pos');
        if (legacy && !Number.isNaN(+legacy)) {
          saved = { positionInPixels: Math.round(+legacy) };
          setComponentPrefs('is-split-panel', key, saved);
          try { localStorage.removeItem('is-split-nav-pos'); } catch { /* ignore */ }
        }
      }
      if (!saved) return;
      const px = Number(saved.positionInPixels);
      if (Number.isFinite(px)) {
        this._cachedPositionInPixels = px;
        this.setAttribute('position-in-pixels', String(Math.round(px)));
        return;
      }
      const pct = Number(saved.position);
      if (Number.isFinite(pct)) this.setAttribute('position', String(clamp(pct, 0, 100)));
    }

    _persistPrefs() {
      const key = this.storageKey;
      if (!key) return;
      setComponentPrefs('is-split-panel', key, {
        positionInPixels: Math.round(this.positionInPixels),
        position: Math.round(this.position * 10) / 10,
      });
    }

    get orientation() {
      return this.getAttribute('orientation') === 'vertical' ? 'vertical' : 'horizontal';
    }
    set orientation(v) {
      if (v === 'vertical') this.setAttribute('orientation', 'vertical');
      else this.removeAttribute('orientation');
    }

    get primary() {
      const p = this.getAttribute('primary');
      return p === 'start' || p === 'end' ? p : null;
    }
    set primary(v) {
      if (v === 'start' || v === 'end') this.setAttribute('primary', v);
      else this.removeAttribute('primary');
    }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get snap() { return this.getAttribute('snap') || ''; }
    set snap(v) {
      if (v == null || v === '') this.removeAttribute('snap');
      else this.setAttribute('snap', String(v));
    }

    get snapThreshold() {
      const v = parseFloat(this.getAttribute('snap-threshold'));
      return Number.isFinite(v) ? v : 12;
    }
    set snapThreshold(v) {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) return;
      this.setAttribute('snap-threshold', String(n));
    }

    // ---- private ----

    /** aplica px → cache + attr + position% (sin pisar cache en attributeChanged) */
    _syncPositionFromPixels(px) {
      this._cachedPositionInPixels = px;
      this.setAttribute('position-in-pixels', String(px));
      if (!(this._size > 0)) return;
      this._fromPixels = true;
      try { this.position = this._pixelsToPercentage(px); }
      finally { this._fromPixels = false; }
    }

    _upgradeProperties() {
      for (const a of OBSERVED) {
        if (Object.prototype.hasOwnProperty.call(this, a)) {
          const v = this[a];
          delete this[a];
          if (v != null) this.setAttribute(a, v);
        }
      }
    }

    _detectSize() {
      const rect = this.getBoundingClientRect();
      this._size = this.orientation === 'vertical' ? rect.height : rect.width;
    }

    _percentageToPixels(value) { return this._size > 0 ? this._size * (value / 100) : 0; }
    _pixelsToPercentage(value) { return this._size > 0 ? (value / this._size) * 100 : 50; }

    _handleResize(entries) {
      const { width, height } = entries[0].contentRect;
      this._size = this.orientation === 'vertical' ? height : width;
      if (!(this._size > 0)) return;

      const pxAttr = parseFloat(this.getAttribute('position-in-pixels'));
      if (!Number.isFinite(this._cachedPositionInPixels) && Number.isFinite(pxAttr)) {
        this._cachedPositionInPixels = pxAttr;
      }
      if (!Number.isFinite(this._cachedPositionInPixels)) {
        this._cachedPositionInPixels = this._percentageToPixels(this.position);
      }

      // re-sincronizar % con px canónico (primary mantiene px al resize)
      if (this.primary || Number.isFinite(pxAttr)) {
        this._syncPositionFromPixels(this._cachedPositionInPixels);
      }
      this._updateStyles();
      this._syncDividerAria();
    }

    _parseSnapValue(value) {
      if (value.endsWith('%')) return this._size * (parseFloat(value) / 100);
      return parseFloat(value);
    }

    _applySnap(pixels) {
      const snapStr = this.snap;
      if (!snapStr) return pixels;
      const snaps = snapStr.split(/\s+/).filter(Boolean);
      for (const v of snaps) {
        const snapPoint = this._parseSnapValue(v);
        if (Math.abs(pixels - snapPoint) <= this.snapThreshold) {
          return snapPoint;
        }
      }
      return pixels;
    }

    _updateStyles() {
      const isVertical = this.orientation === 'vertical';
      const divider = 'var(--_divider-width)';
      let primaryTrack;
      let secondaryTrack = 'minmax(0, 1fr)';

      // track primario SIEMPRE en px si hay cache/attr — evita el 50% fantasma
      const pxAttr = parseFloat(this.getAttribute('position-in-pixels'));
      const px = Number.isFinite(this._cachedPositionInPixels)
        ? this._cachedPositionInPixels
        : pxAttr;

      if (Number.isFinite(px)) {
        primaryTrack = `minmax(var(--min, 0px), min(${Math.max(0, px)}px, var(--max, 100%)))`;
      } else {
        const pct = this.position;
        primaryTrack = `clamp(0%, clamp(var(--min), ${pct}% - var(--_divider-width) / 2, var(--max)), calc(100% - var(--_divider-width)))`;
      }

      const template = this.primary === 'end'
        ? `${secondaryTrack} ${divider} ${primaryTrack}`
        : `${primaryTrack} ${divider} ${secondaryTrack}`;

      if (isVertical) {
        this.style.gridTemplateColumns = 'minmax(0, 1fr)';
        this.style.gridTemplateRows = template;
      } else {
        this.style.gridTemplateColumns = template;
        this.style.gridTemplateRows = 'minmax(0, 1fr)';
      }
    }

    _syncDividerAria() {
      const d = this._divider;
      d.setAttribute('aria-valuenow', String(Math.round(this.position)));
      d.setAttribute('aria-orientation', this.orientation);
      d.tabIndex = this.disabled ? -1 : 0;
    }

    // ---- drag ----

    _handlePointerDown(event) {
      if (this.disabled) return;
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      this._detectSize();
      try { this._divider.setPointerCapture(event.pointerId); } catch {}
      this.toggleAttribute('data-dragging', true);
      this._divider.addEventListener('pointermove', this._onPointerMove);
      this._divider.addEventListener('pointerup', this._onPointerUp);
      this._divider.addEventListener('pointercancel', this._onPointerUp);
      this._handlePointerMove(event);
    }

    _handlePointerMove(event) {
      if (this.disabled) return;
      if (event.cancelable) event.preventDefault();
      if (!(this._size > 0)) this._detectSize();
      const rect = this.getBoundingClientRect();
      let px = this.orientation === 'vertical'
        ? event.clientY - rect.top
        : event.clientX - rect.left;
      if (this.primary === 'end') px = this._size - px;
      px = clamp(px, 0, this._size);
      px = this._applySnap(px);
      this._syncPositionFromPixels(px);
      this._updateStyles();
      this._syncDividerAria();
      this.dispatchEvent(new CustomEvent('reposition', {
        detail: this.position,
        bubbles: true,
        composed: true,
      }));
    }

    _handlePointerUp(event) {
      this.toggleAttribute('data-dragging', false);
      this._divider.removeEventListener('pointermove', this._onPointerMove);
      this._divider.removeEventListener('pointerup', this._onPointerUp);
      this._divider.removeEventListener('pointercancel', this._onPointerUp);
      try {
        if (event?.pointerId != null) this._divider.releasePointerCapture(event.pointerId);
      } catch {}
      if (Number.isFinite(this._cachedPositionInPixels)) {
        this.setAttribute('position-in-pixels', String(Math.round(this._cachedPositionInPixels)));
      }
      this._persistPrefs();
    }

    // ---- keyboard ----

    _handleKeyDown(event) {
      if (this.disabled) return;
      const horizontal = this.orientation === 'horizontal';
      const flip = this.primary === 'end' ? -1 : 1;
      let handled = false;
      let next = this.position;

      switch (event.key) {
        case 'ArrowLeft':
          if (horizontal) { next -= (event.shiftKey ? 10 : 1) * flip; handled = true; }
          break;
        case 'ArrowRight':
          if (horizontal) { next += (event.shiftKey ? 10 : 1) * flip; handled = true; }
          break;
        case 'ArrowUp':
          if (!horizontal) { next -= (event.shiftKey ? 10 : 1) * flip; handled = true; }
          break;
        case 'ArrowDown':
          if (!horizontal) { next += (event.shiftKey ? 10 : 1) * flip; handled = true; }
          break;
        case 'Home':
          next = this.primary === 'end' ? 100 : 0; handled = true; break;
        case 'End':
          next = this.primary === 'end' ? 0 : 100; handled = true; break;
        case 'Enter':
          if (this._isCollapsed) {
            this.position = this._positionBeforeCollapse;
            this._isCollapsed = false;
          } else {
            this._positionBeforeCollapse = this.position;
            this.position = 0;
            this._isCollapsed = true;
          }
          event.preventDefault();
          this._persistPrefs();
          return;
      }

      if (handled) {
        event.preventDefault();
        this.position = clamp(next, 0, 100);
        this._persistPrefs();
      }
    }
  }

  if (!customElements.get('is-split-panel')) {
    customElements.define('is-split-panel', IsSplitPanel);
  }
  if (typeof window !== 'undefined') {
    window.IsSplitPanel = IsSplitPanel;
  }
})();