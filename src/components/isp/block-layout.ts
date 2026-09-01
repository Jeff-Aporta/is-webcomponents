import { ElementBase } from '../../core/element-base.js';
import { adoptCss, defineElement, emit } from '../../core/element.js';
import {
  applyJsonBody,
  html2json,
  hostToJson,
  json2html,
} from '../_shared/json-html.js';
import {
  SCROLL_MEMORY_ATTRS,
  ScrollMemory,
  bindScrollMemoryApi,
} from '../_shared/scroll-memory.js';

/**
 * <is-block-layout> — port de ISP `layout/BlockLayout.svelte`.
 *
 * Cuerpo vía JSON compacto (mismo codec que `<is-form>`):
 *   block.json2html(body) / block.html2json() / toJSON() / fromJSON()
 *
 * Breakpoints: data-sizew, data-szw-*, --clientw, --clienth, --lerpw, evento is-breakpoint.
 * Geometría API: getWidth(), getHeight(), rect() / getRect().
 * Scroll memory (opt-in): remember-scroll + storage-key (+ cscroll para overflow).
 *
 * Atributos: inline, cscroll, remember-scroll, storage-key, scroll-ttl
 */

export const BREAKPOINTS = ['xs', 'sm', 'md', 'lg', 'xl'];

/** Anchos ancla de cada breakpoint (idénticos a ISP). */
export const BREAKPOINT_W = { xs: 0, sm: 480, md: 600, lg: 800, xl: 1200 };

/** Misma escalera de comparaciones que ISP (ojo: `<` en xs y xl, `<=` en el resto). */
export function sizewFor(width: number) {
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

export { SCROLL_MEMORY_ATTRS };

/**
 * Base compartida: observa el tamaño propio y publica el breakpoint.
 * No llama a `adoptCss` — cada subclase adopta SU css hermano.
 *
 * Geometría y memoria de scroll viven aquí para que block/flex/grid las hereden.
 */
export class BreakpointHost extends ElementBase {
  #ro = null;
  #width = -1;
  #height = -1;
  #scroll = null;

  /** Subclases deben concatenar esto a su observedAttributes. */
  static get scrollMemoryAttrs() { return SCROLL_MEMORY_ATTRS; }

  onConnected() {
    this.#ro = new ResizeObserver(() => this.measureSize());
    this.#ro.observe(this);
    this.measureSize();
    if (!this.#scroll) {
      this.#scroll = new ScrollMemory(this, {
        tag: this.localName || 'is-layout',
        restorePolicy: 'always',
      });
      bindScrollMemoryApi(this, this.#scroll);
    }
    this.#scroll.connect();
  }

  onDisconnected() {
    this.#scroll?.disconnect();
    this.#ro?.disconnect();
    this.#ro = null;
    this.#width = -1;
    this.#height = -1;
  }

  onAttributeChanged(name, prev, next) {
    if (SCROLL_MEMORY_ATTRS.includes(name)) {
      this.#scroll?.onAttributeChanged(name, prev, next);
    }
  }

  get clientWidthMeasured() { return Math.max(0, this.#width); }

  get clientHeightMeasured() { return Math.max(0, this.#height); }

  get sizew() { return sizewFor(this.clientWidthMeasured); }

  get boolszw() { return flagsFor(this.sizew); }

  lerpw(b0 = 'sm', b1 = 'xl') { return lerpFor(this.clientWidthMeasured, b0, b1); }

  /** Ancho del host en px (medido; cae a clientWidth si aún no hay RO). */
  getWidth() {
    return this.#width >= 0 ? Math.max(0, this.#width) : Math.max(0, this.clientWidth);
  }

  /** Alto del host en px (medido; cae a clientHeight si aún no hay RO). */
  getHeight() {
    return this.#height >= 0 ? Math.max(0, this.#height) : Math.max(0, this.clientHeight);
  }

  /**
   * Rectángulo del host en viewport (DOMRect-like plano).
   * @returns {{ x: number, y: number, width: number, height: number, top: number, left: number, right: number, bottom: number }}
   */
  rect() {
    const r = this.getBoundingClientRect();
    return {
      x: r.x, y: r.y, width: r.width, height: r.height,
      top: r.top, left: r.left, right: r.right, bottom: r.bottom,
    };
  }

  /** Alias de `rect()`. */
  getRect() { return this.rect(); }

  /** @deprecated usar measureSize — se mantiene por compat. */
  measureWidth() { this.measureSize(); }

  measureSize() {
    const width = this.clientWidth;
    const height = this.clientHeight;
    const same = width === this.#width && height === this.#height;
    this.#width = width;
    this.#height = height;
    if (same) return;

    const sizew = sizewFor(width);
    const boolszw = flagsFor(sizew);

    this.setAttribute('data-sizew', sizew);
    for (const bp of BREAKPOINTS) this.toggleAttribute(`data-szw-${bp}`, boolszw[bp]);

    const lerpw = lerpFor(width);
    this.style.setProperty('--clientw', String(width));
    this.style.setProperty('--clienth', String(height));
    this.style.setProperty('--lerpw', String(Math.round(lerpw * 1e4) / 1e4));

    emit(this, 'is-breakpoint', {
      width, height, sizew, boolszw,
      lerpw: (b0, b1) => lerpFor(width, b0, b1),
    });
  }
}

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `<slot part="content"></slot>`;

  class IsBlockLayout extends BreakpointHost {
    static TEMPLATE = TEMPLATE;
    static get observedAttributes(): string[] {
      return ['inline', 'cscroll', ...SCROLL_MEMORY_ATTRS];
    }

    static json2html = json2html;
    static html2json = html2json;

    #inlineApplied = false;

    constructor() {
      super();
      this.initShadow();
      adoptCss(this.shadowRoot!, import.meta.url);
    }

    onConnected() {
      super.onConnected();
      this.#applyInlineJson();
    }

    get inline() { return this.hasAttribute('inline'); }
    set inline(v) { this.setBooleanAttr('inline', v); }

    get cscroll() { return this.hasAttribute('cscroll'); }
    set cscroll(v) { this.setBooleanAttr('cscroll', v); }

    /** Monta el light DOM desde JSON compacto. */
    json2html(body, opts) {
      applyJsonBody(this, body, opts);
      return this;
    }

    /** Serializa el light DOM a JSON compacto. */
    html2json(opts) {
      return hostToJson(this, opts);
    }

    toJSON() {
      return {
        inline: this.inline,
        cscroll: this.cscroll,
        body: hostToJson(this),
      };
    }

    fromJSON(json, opts) {
      if (!json || typeof json !== 'object') return this;
      if (json.inline != null) this.inline = !!json.inline;
      if (json.cscroll != null) this.cscroll = !!json.cscroll;
      const body = json.body ?? json.html ?? (Array.isArray(json) ? json : null);
      if (body != null) applyJsonBody(this, body, opts);
      return this;
    }

    #applyInlineJson() {
      if (this.#inlineApplied) return;
      const script = this.querySelector<HTMLElement>(':scope > script[type="application/json"]');
      if (!script) return;
      this.#inlineApplied = true;
      try {
        const json = JSON.parse(script.textContent || 'null');
        if (json && typeof json === 'object') this.fromJSON(json);
      } catch {
        console.warn('<is-block-layout> script JSON inválido');
      }
    }
  }

  defineElement('is-block-layout', IsBlockLayout, 'IsBlockLayout');
})();
