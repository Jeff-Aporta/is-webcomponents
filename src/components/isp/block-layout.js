import { ElementBase } from '../_shared/element-base.js';
import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import {
  applyJsonBody,
  html2json,
  hostToJson,
  json2html,
} from '../_shared/json-html.js';

/**
 * <is-block-layout> — port de ISP `layout/BlockLayout.svelte`.
 *
 * Cuerpo vía JSON compacto (mismo codec que `<is-form>`):
 *   block.json2html(body) / block.html2json() / toJSON() / fromJSON()
 *
 * Breakpoints: data-sizew, data-szw-*, --clientw, --lerpw, evento is-breakpoint.
 *
 * Atributos: inline, cscroll
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
    this.#ro = new ResizeObserver(() => this.measureWidth());
    this.#ro.observe(this);
    this.measureWidth();
  }

  onDisconnected() {
    this.#ro?.disconnect();
    this.#ro = null;
    this.#width = -1;
  }

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

    static json2html = json2html;
    static html2json = html2json;

    #inlineApplied = false;

    constructor() {
      super();
      this.initShadow();
      adoptCss(this.shadowRoot, import.meta.url);
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
      const script = this.querySelector(':scope > script[type="application/json"]');
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
