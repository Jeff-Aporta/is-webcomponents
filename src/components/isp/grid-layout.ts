import { adoptCss, defineElement } from '../../core/element.js';
import { BreakpointHost } from './block-layout.js';
import { setStringAttr } from '../_shared/reflect.js';

/**
 * g11 — UX/UI proposals (aria/region/aria-orientation/prefers-*):
 *   - role="region" cuando hay `label` o `labelledby` (los landmarks sin
 *     etiqueta accesible NO se exponen, por norma ARIA).
 *   - aria-orientation refleja `direction` (column→vertical, row→horizontal).
 *   - `label` y `labelledby` se reflejan a aria-label / aria-labelledby.
 */

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
 *   remember-scroll, storage-key, scroll-ttl  → memoria de scroll (BreakpointHost)
 *
 * Eventos: `is-breakpoint` (ver block-layout.js).
 * Geometría: getWidth(), getHeight(), rect() / getRect().
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `<slot part="content"></slot>`;

  const OBSERVED = [
    'cells', 'cells-fit', 'direction', 'gap', 'justify', 'items', 'inline', 'cscroll',
    'label', 'labelledby',
    ...BreakpointHost.scrollMemoryAttrs,
  ];

  const IS_NUMBER = /^\d+(\.\d+)?$/;

  class IsGridLayout extends BreakpointHost {
    static TEMPLATE = TEMPLATE;
    static get observedAttributes(): string[] { return OBSERVED; }
    // El attributeChangedCallback lo aporta ElementBase (vía BreakpointHost);
    // aquí solo se implementa el hook onAttributeChanged.

    constructor() {
      super();
      this.initShadow();
      adoptCss(this.shadowRoot!, import.meta.url);
    }

    onConnected() {
      super.onConnected();
      this.#syncVars();
      this.#syncAria();
    }

    onAttributeChanged(name: string, prev: string | null, next: string | null): void {
      super.onAttributeChanged(name, prev, next);
      if (name === 'cells' || name === 'cells-fit' || name === 'gap') this.#syncVars();
      if (name === 'label' || name === 'labelledby' || name === 'direction') this.#syncAria();
    }

    #syncAria(): void {
      const label = (this.getAttribute('label') ?? '').trim();
      const labelledby = (this.getAttribute('labelledby') ?? '').trim();
      // role="region" sólo si hay label/aria-labelledby (norma ARIA).
      if (label || labelledby) this.setAttribute('role', 'region');
      else this.removeAttribute('role');
      if (label) this.setAttribute('aria-label', label);
      else this.removeAttribute('aria-label');
      if (labelledby) this.setAttribute('aria-labelledby', labelledby);
      else this.removeAttribute('aria-labelledby');
      const dir = (this.getAttribute('direction') || 'column').toLowerCase();
      const orient = dir === 'row' ? 'horizontal' : 'vertical';
      this.setAttribute('aria-orientation', orient);
    }

    #syncVars(): void {
      const gap = (this.getAttribute('gap') ?? '').trim();
      if (gap) this.style.setProperty('--gap', gap);
      else this.style.removeProperty('--gap');

      const cells = this.#resolveCells();
      if (cells) this.style.setProperty('--cells', cells);
      else this.style.removeProperty('--cells');
    }

    /** Traduce `cells` + `cells-fit` a una track list, igual que ISP. */
    #resolveCells(): string {
      const raw = (this.getAttribute('cells') ?? '').trim();
      if (!raw) return '';
      if (!IS_NUMBER.test(raw)) return raw;
      return `repeat(${raw}, ${this.cellsFit ? 'max-content' : 'minmax(0, 1fr)'})`;
    }

    get cells() { return this.getAttribute('cells'); }
    set cells(v) { setStringAttr(this, 'cells', v); }

    get cellsFit() { return this.hasAttribute('cells-fit'); }
    set cellsFit(v) { this.setBooleanAttr('cells-fit', v); }

    get direction() { return this.getAttribute('direction') ?? 'column'; }
    set direction(v) { v ? this.setAttribute('direction', v) : this.removeAttribute('direction'); }

    get inline() { return this.hasAttribute('inline'); }
    set inline(v) { this.setBooleanAttr('inline', v); }

    get cscroll() { return this.hasAttribute('cscroll'); }
    set cscroll(v) { this.setBooleanAttr('cscroll', v); }

    /** Etiqueta accesible del landmark; se refleja a `aria-label`. */
    get label() { return this.getAttribute('label') ?? ''; }
    set label(v) { setStringAttr(this, 'label', v); }

    /** ID del elemento que etiqueta al landmark; se refleja a `aria-labelledby`. */
    get labelledby() { return this.getAttribute('labelledby') ?? ''; }
    set labelledby(v) { setStringAttr(this, 'labelledby', v); }
  }

  defineElement('is-grid-layout', IsGridLayout, 'IsGridLayout');
})();
