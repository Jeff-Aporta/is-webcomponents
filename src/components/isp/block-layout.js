import { ElementBase } from '../_shared/element-base.js';
import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';

/**
 * <is-block-layout> — port de ISP `layout/BlockLayout.svelte`.
 *
 * En Svelte el componente medía su propio `clientWidth` y entregaba
 * `{ sizew, boolszw, lerpw }` como SLOT PROPS. Un Web Component no tiene slot
 * props, así que el equivalente se publica en tres canales:
 *
 *   1. Atributos reflejados en el host  → `data-sizew="xs|sm|md|lg|xl"` y
 *      `data-szw-xs … data-szw-xl` (presentes cuando el breakpoint es <= al
 *      actual; es exactamente el `boolszw` acumulativo de ISP). Sirven para
 *      estilar desde el light DOM: `is-block-layout[data-szw-lg] .foo { … }`.
 *   2. Custom properties en el host     → `--clientw` (ancho en px, sin unidad)
 *      y `--lerpw` (el `lerpw('sm','xl')` por defecto de ISP). Sirven para
 *      interpolar tamaños en CSS con `calc()`.
 *   3. Evento `is-breakpoint`           → detail { width, sizew, boolszw, lerpw }
 *      donde `lerpw` es la MISMA función de ISP `(b0='sm', b1='xl') => number`.
 *
 * Además la clase expone `sizew`, `boolszw` y `lerpw(b0, b1)` como API JS.
 *
 * Atributos
 *   inline     boolean  → display:inline-block (ISP: prop `inline`)
 *   cscroll    boolean  → overflow:auto con el scrollbar temizado del kit
 *                         (ISP añadía la clase `custom-scrollbar`)
 *
 * Este módulo también exporta la maquinaria de breakpoints que reutilizan
 * `flex-layout.js` y `grid-layout.js` (en ISP estaba copiada en los tres).
 */

export const BREAKPOINTS = ['xs', 'sm', 'md', 'lg', 'xl'];

/** Anchos ancla de cada breakpoint (idénticos a ISP). */
export const BREAKPOINT_W = { xs: 0, sm: 480, md: 600, lg: 800, xl: 1200 };

/** Misma escalera de comparaciones que ISP (ojo: `<` en xs y xl, `<=` en el resto). */
export function sizewFor(width) {
  return width < 480 ? 'xs'
    : width <= 600 ? 'sm'
      : width <= 800 ? 'md'
        : width < 1200 ? 'lg' : 'xl';
}

/** `boolszw` de ISP: acumulativo, todo breakpoint <= al actual va en true. */
export function flagsFor(sizew) {
  const idx = BREAKPOINTS.indexOf(sizew);
  const flags = {};
  for (const bp of BREAKPOINTS) flags[bp] = BREAKPOINTS.indexOf(bp) <= idx;
  return flags;
}

/** `lerpw` de ISP: progreso lineal (sin recortar) del ancho entre dos anclas. */
export function lerpFor(width, b0 = 'sm', b1 = 'xl') {
  const w0 = BREAKPOINT_W[b0] ?? 0;
  const w1 = BREAKPOINT_W[b1] ?? 0;
  return w1 === w0 ? 0 : (width - w0) / (w1 - w0);
}

/**
 * Base compartida: observa el ancho propio y publica el breakpoint.
 * No llama a `adoptCss` — cada subclase adopta SU css hermano.
 */
export class BreakpointHost extends ElementBase {
  #ro = null;
  #width = -1;

  onConnected() {
    // El observer se crea en connect y se destruye en disconnect (nunca en el
    // constructor) para no fugar cuando el elemento se mueve del DOM.
    this.#ro = new ResizeObserver(() => this.measureWidth());
    this.#ro.observe(this);
    this.measureWidth();
  }

  onDisconnected() {
    this.#ro?.disconnect();
    this.#ro = null;
    this.#width = -1;
  }

  /** Ancho medido en el último ciclo (equivale al `clientWidth` bindeado de ISP). */
  get clientWidthMeasured() { return Math.max(0, this.#width); }

  get sizew() { return sizewFor(this.clientWidthMeasured); }

  get boolszw() { return flagsFor(this.sizew); }

  lerpw(b0 = 'sm', b1 = 'xl') { return lerpFor(this.clientWidthMeasured, b0, b1); }

  measureWidth() {
    const width = this.clientWidth;
    if (width === this.#width) return;
    this.#width = width;

    const sizew = sizewFor(width);
    const boolszw = flagsFor(sizew);

    this.setAttribute('data-sizew', sizew);
    for (const bp of BREAKPOINTS) this.toggleAttribute(`data-szw-${bp}`, boolszw[bp]);

    const lerpw = lerpFor(width);
    this.style.setProperty('--clientw', String(width));
    this.style.setProperty('--lerpw', String(Math.round(lerpw * 1e4) / 1e4));

    emit(this, 'is-breakpoint', { width, sizew, boolszw, lerpw: (b0, b1) => lerpFor(width, b0, b1) });
  }
}

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `<slot part="content"></slot>`;

  class IsBlockLayout extends BreakpointHost {
    static TEMPLATE = TEMPLATE;
    static get observedAttributes() { return ['inline', 'cscroll']; }
    // El attributeChangedCallback lo aporta ElementBase (vía BreakpointHost);
    // inline/cscroll se resuelven 100% por CSS, no hace falta el hook.

    constructor() {
      super();
      this.initShadow();
      adoptCss(this.shadowRoot, import.meta.url);
    }

    get inline() { return this.hasAttribute('inline'); }
    set inline(v) { this.setBooleanAttr('inline', v); }

    get cscroll() { return this.hasAttribute('cscroll'); }
    set cscroll(v) { this.setBooleanAttr('cscroll', v); }
  }

  defineElement('is-block-layout', IsBlockLayout, 'IsBlockLayout');
})();
