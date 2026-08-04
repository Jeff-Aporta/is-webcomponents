import { adoptCss } from '../_shared/adopt-css.js';
import { BreakpointHost } from './block-layout.js';

/**
 * <is-grid-layout> — port de ISP `layout/GridLayout.svelte`.
 *
 * `cells` acepta lo mismo que en ISP:
 *   - un número (`cells="3"`)   → repeat(3, minmax(0, 1fr)), o
 *                                 repeat(3, max-content) si está `cells-fit`.
 *   - una track list CSS cruda  → se usa tal cual (`cells="200px 1fr auto"`).
 * Se resuelve a la custom property `--cells`; `direction` decide si alimenta
 * `grid-template-columns` (default, `column`) o `grid-template-rows` + auto-flow
 * en columna (`row`).
 *
 * Atributos
 *   cells        number | track list CSS
 *   cells-fit    boolean  (ISP: `cellsFit`)
 *   direction    column | row                       (default column)
 *   gap          string   cualquier valor CSS
 *   justify      start | center | end | between | around | evenly | stretch | …
 *   items        align-items
 *   inline       boolean  → display: inline-grid
 *   cscroll      boolean  → overflow: auto
 *
 * Eventos: `is-breakpoint` (ver block-layout.js).
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `<slot part="content"></slot>`;

  const OBSERVED = ['cells', 'cells-fit', 'direction', 'gap', 'justify', 'items', 'inline', 'cscroll'];

  const IS_NUMBER = /^\d+(\.\d+)?$/;

  class IsGridLayout extends BreakpointHost {
    static TEMPLATE = TEMPLATE;
    static get observedAttributes() { return OBSERVED; }
    // El attributeChangedCallback lo aporta ElementBase (vía BreakpointHost);
    // aquí solo se implementa el hook onAttributeChanged.

    constructor() {
      super();
      this.initShadow();
      adoptCss(this.shadowRoot, import.meta.url);
    }

    onConnected() {
      super.onConnected();
      this.#syncVars();
    }

    onAttributeChanged(name) {
      if (name === 'cells' || name === 'cells-fit' || name === 'gap') this.#syncVars();
    }

    #syncVars() {
      const gap = (this.getAttribute('gap') ?? '').trim();
      if (gap) this.style.setProperty('--gap', gap);
      else this.style.removeProperty('--gap');

      const cells = this.#resolveCells();
      if (cells) this.style.setProperty('--cells', cells);
      else this.style.removeProperty('--cells');
    }

    /** Traduce `cells` + `cells-fit` a una track list, igual que ISP. */
    #resolveCells() {
      const raw = (this.getAttribute('cells') ?? '').trim();
      if (!raw) return '';
      if (!IS_NUMBER.test(raw)) return raw;
      return `repeat(${raw}, ${this.cellsFit ? 'max-content' : 'minmax(0, 1fr)'})`;
    }

    get cells() { return this.getAttribute('cells'); }
    set cells(v) { v == null || v === '' ? this.removeAttribute('cells') : this.setAttribute('cells', String(v)); }

    get cellsFit() { return this.hasAttribute('cells-fit'); }
    set cellsFit(v) { this.setBooleanAttr('cells-fit', v); }

    get direction() { return this.getAttribute('direction') ?? 'column'; }
    set direction(v) { v ? this.setAttribute('direction', v) : this.removeAttribute('direction'); }

    get inline() { return this.hasAttribute('inline'); }
    set inline(v) { this.setBooleanAttr('inline', v); }

    get cscroll() { return this.hasAttribute('cscroll'); }
    set cscroll(v) { this.setBooleanAttr('cscroll', v); }
  }

  if (!customElements.get('is-grid-layout')) {
    customElements.define('is-grid-layout', IsGridLayout);
  }
  if (typeof window !== 'undefined') window.IsGridLayout = IsGridLayout;
})();
