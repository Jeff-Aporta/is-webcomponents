import { adoptCss, defineElement } from '../../core/element.js';
import { BreakpointHost } from './block-layout.js';

/**
 * g11 — UX/UI proposals (aria/region/aria-orientation/prefers-*):
 *   - role="region" cuando hay `label` o `labelledby`.
 *   - aria-orientation refleja `direction` (row→horizontal, column→vertical).
 *   - `label` y `labelledby` se reflejan a aria-label / aria-labelledby.
 */

/**
 * <is-flex-layout> — port de ISP `layout/FlexLayout.svelte`.
 *
 * ISP construía un `style=""` gigante en el div interno. Aquí las dimensiones
 * enumeradas (direction/justify/align/wrap/grow/inline) son ATRIBUTOS que
 * resuelve el CSS con `:host([attr])`, y las que aceptan cualquier valor CSS
 * (gap, width, height, min/max) se publican como custom properties en el host.
 *
 * Igual que en ISP, el gap por defecto depende del ancho propio
 * (xs → 0.2rem, sm → 0.35rem, resto → 0.5rem); eso lo resuelve el CSS a partir
 * de `data-sizew`, que hereda de BreakpointHost (ver block-layout.js).
 *
 * Atributos
 *   gap          string   cualquier valor CSS de gap
 *   direction    row | column                       (default row)
 *   wrap         boolean
 *   justify      start | center | end | between | around | evenly |
 *                left | right | flex-start | flex-end
 *   align        start | center | end | stretch | baseline
 *   items        alias de `align` (ISP aceptaba ambos; `align` gana)
 *   grow         boolean  → flex: 1 1 auto
 *   inline       boolean  → display: inline-flex
 *   cscroll      boolean  → overflow: auto (habilita remember-scroll)
 *   remember-scroll, storage-key, scroll-ttl  → memoria de scroll (BreakpointHost)
 *   width, height, min-width, min-height, max-width, max-height   string CSS
 *
 * Eventos: `is-breakpoint` (ver block-layout.js).
 * Geometría: getWidth(), getHeight(), rect() / getRect().
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `<slot part="content"></slot>`;

  // Atributo → custom property que consume el CSS.
  const SIZE_VARS = {
    gap: '--gap',
    width: '--width',
    height: '--height',
    'min-width': '--min-width',
    'min-height': '--min-height',
    'max-width': '--max-width',
    'max-height': '--max-height',
  };

  const OBSERVED = [
    ...Object.keys(SIZE_VARS),
    'direction', 'wrap', 'justify', 'align', 'items', 'grow', 'inline', 'cscroll',
    'label', 'labelledby',
    ...BreakpointHost.scrollMemoryAttrs,
  ];

  class IsFlexLayout extends BreakpointHost {
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
      if (name in SIZE_VARS) this.#syncVars();
      if (name === 'label' || name === 'labelledby' || name === 'direction') this.#syncAria();
    }

    #syncAria(): void {
      const label = (this.getAttribute('label') ?? '').trim();
      const labelledby = (this.getAttribute('labelledby') ?? '').trim();
      if (label || labelledby) this.setAttribute('role', 'region');
      else this.removeAttribute('role');
      if (label) this.setAttribute('aria-label', label);
      else this.removeAttribute('aria-label');
      if (labelledby) this.setAttribute('aria-labelledby', labelledby);
      else this.removeAttribute('aria-labelledby');
      const dir = (this.getAttribute('direction') || 'row').toLowerCase();
      const orient = dir === 'row' ? 'horizontal' : 'vertical';
      this.setAttribute('aria-orientation', orient);
    }

    #syncVars(): void {
      for (const [attr, prop] of Object.entries(SIZE_VARS)) {
        const raw = this.getAttribute(attr);
        const value = raw == null ? '' : raw.trim();
        if (value) this.style.setProperty(prop, value);
        else this.style.removeProperty(prop);
      }
    }

    get gap() { return this.getAttribute('gap'); }
    set gap(v) { v ? this.setAttribute('gap', v) : this.removeAttribute('gap'); }

    get direction() { return this.getAttribute('direction') ?? 'row'; }
    set direction(v) { v ? this.setAttribute('direction', v) : this.removeAttribute('direction'); }

    get wrap() { return this.hasAttribute('wrap'); }
    set wrap(v) { this.setBooleanAttr('wrap', v); }

    get grow() { return this.hasAttribute('grow'); }
    set grow(v) { this.setBooleanAttr('grow', v); }

    get inline() { return this.hasAttribute('inline'); }
    set inline(v) { this.setBooleanAttr('inline', v); }

    get cscroll() { return this.hasAttribute('cscroll'); }
    set cscroll(v) { this.setBooleanAttr('cscroll', v); }

    /** g11 — Etiqueta accesible del landmark; se refleja a `aria-label`. */
    get label() { return this.getAttribute('label') ?? ''; }
    set label(v) { v == null || v === '' ? this.removeAttribute('label') : this.setAttribute('label', String(v)); }

    /** g11 — ID del elemento que etiqueta al landmark; se refleja a `aria-labelledby`. */
    get labelledby() { return this.getAttribute('labelledby') ?? ''; }
    set labelledby(v) { v == null || v === '' ? this.removeAttribute('labelledby') : this.setAttribute('labelledby', String(v)); }
  }

  defineElement('is-flex-layout', IsFlexLayout, 'IsFlexLayout');
})();
