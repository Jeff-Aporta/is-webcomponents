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

export const BREAKPOINTS = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
export type Breakpoint = typeof BREAKPOINTS[number];

/** Anchos ancla de cada breakpoint (idénticos a ISP). */
export const BREAKPOINT_W: Record<string, number> = { xs: 0, sm: 480, md: 600, lg: 800, xl: 1200 };

/** Bandera acumulativa por breakpoint: `boolszw[bp] === BREAKPOINTS.indexOf(bp) <= idx`. */
export type BreakpointFlags = Record<string, boolean>;

/** Misma escalera de comparaciones que ISP (ojo: `<` en xs y xl, `<=` en el resto). */
export function sizewFor(width: number): Breakpoint {
  return width < 480 ? 'xs'
    : width <= 600 ? 'sm'
      : width <= 800 ? 'md'
        : width < 1200 ? 'lg' : 'xl';
}

/** `boolszw` de ISP: acumulativo, todo breakpoint <= al actual va en true. */
export function flagsFor(sizew: string): BreakpointFlags {
  const idx = BREAKPOINTS.indexOf(sizew as Breakpoint);
  const flags: BreakpointFlags = {};
  for (const bp of BREAKPOINTS) flags[bp] = BREAKPOINTS.indexOf(bp) <= idx;
  return flags;
}

/** `lerpw` de ISP: progreso lineal (sin recortar) del ancho entre dos anclas. */
export function lerpFor(width: number, b0: string = 'sm', b1: string = 'xl'): number {
  const w0 = BREAKPOINT_W[b0] ?? 0;
  const w1 = BREAKPOINT_W[b1] ?? 0;
  return w1 === w0 ? 0 : (width - w0) / (w1 - w0);
}

export { SCROLL_MEMORY_ATTRS };

/** Callback que `lerpw` entrega dentro del evento `is-breakpoint`. */
type LerpwFn = (b0?: string, b1?: string) => number;

/**
 * Base compartida: observa el tamaño propio y publica el breakpoint.
 * No llama a `adoptCss` — cada subclase adopta SU css hermano.
 *
 * Geometría y memoria de scroll viven aquí para que block/flex/grid las hereden.
 */
export class BreakpointHost extends ElementBase {
  #ro: ResizeObserver | null = null;
  #width = -1;
  #height = -1;
  #scroll: ScrollMemory | null = null;

  /** Subclases deben concatenar esto a su observedAttributes. */
  static get scrollMemoryAttrs() { return SCROLL_MEMORY_ATTRS; }

  onConnected(): void {
    const ro = new ResizeObserver(() => this.measureSize());
    this.#ro = ro;
    ro.observe(this);
    this.measureSize();
    if (!this.#scroll) {
      const sm = new ScrollMemory(this, {
        tag: this.localName || 'is-layout',
        restorePolicy: 'always',
      });
      this.#scroll = sm;
      bindScrollMemoryApi(this, sm);
    }
    this.#scroll.connect();
  }

  onDisconnected(): void {
    this.#scroll?.disconnect();
    this.#ro?.disconnect();
    this.#ro = null;
    this.#width = -1;
    this.#height = -1;
  }

  onAttributeChanged(name: string, prev: string | null, next: string | null): void {
    if (SCROLL_MEMORY_ATTRS.includes(name)) {
      this.#scroll?.onAttributeChanged(name, prev, next);
    }
  }

  get clientWidthMeasured(): number { return Math.max(0, this.#width); }

  get clientHeightMeasured(): number { return Math.max(0, this.#height); }

  get sizew(): Breakpoint { return sizewFor(this.clientWidthMeasured); }

  get boolszw(): BreakpointFlags { return flagsFor(this.sizew); }

  lerpw(b0: string = 'sm', b1: string = 'xl'): number { return lerpFor(this.clientWidthMeasured, b0, b1); }

  /** Ancho del host en px (medido; cae a clientWidth si aún no hay RO). */
  getWidth(): number {
    return this.#width >= 0 ? Math.max(0, this.#width) : Math.max(0, this.clientWidth);
  }

  /** Alto del host en px (medido; cae a clientHeight si aún no hay RO). */
  getHeight(): number {
    return this.#height >= 0 ? Math.max(0, this.#height) : Math.max(0, this.clientHeight);
  }

  /**
   * Rectángulo del host en viewport (DOMRect-like plano).
   */
  rect(): { x: number; y: number; width: number; height: number; top: number; left: number; right: number; bottom: number } {
    const r = this.getBoundingClientRect();
    return {
      x: r.x, y: r.y, width: r.width, height: r.height,
      top: r.top, left: r.left, right: r.right, bottom: r.bottom,
    };
  }

  /** Alias de `rect()`. */
  getRect(): { x: number; y: number; width: number; height: number; top: number; left: number; right: number; bottom: number } { return this.rect(); }

  /** @deprecated usar measureSize — se mantiene por compat. */
  measureWidth(): void { this.measureSize(); }

  measureSize(): void {
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

    const lerpwFn: LerpwFn = (b0?: string, b1?: string) => lerpFor(width, b0, b1);
    emit(this, 'is-breakpoint', {
      width, height, sizew, boolszw,
      lerpw: lerpwFn,
    });
  }
}

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `<slot part="content"></slot>`;

  class IsBlockLayout extends BreakpointHost {
    static TEMPLATE = TEMPLATE;
    static get observedAttributes(): string[] {
      return ['inline', 'cscroll', 'label', 'labelledby', ...SCROLL_MEMORY_ATTRS];
    }

    static json2html = json2html;
    static html2json = html2json;

    #inlineApplied = false;

    constructor() {
      super();
      this.initShadow();
      adoptCss(this.shadowRoot!, import.meta.url);
    }

    onConnected(): void {
      super.onConnected();
      this.#applyInlineJson();
      this.#syncAria();
    }

    onAttributeChanged(name: string, prev: string | null, next: string | null): void {
      super.onAttributeChanged(name, prev, next);
      if (name === 'label' || name === 'labelledby') this.#syncAria();
    }

    #syncAria(): void {
      // g11 — role="region" sólo si hay etiqueta accesible (norma ARIA).
      const label = (this.getAttribute('label') ?? '').trim();
      const labelledby = (this.getAttribute('labelledby') ?? '').trim();
      if (label || labelledby) this.setAttribute('role', 'region');
      else this.removeAttribute('role');
      if (label) this.setAttribute('aria-label', label);
      else this.removeAttribute('aria-label');
      if (labelledby) this.setAttribute('aria-labelledby', labelledby);
      else this.removeAttribute('aria-labelledby');
    }

    get inline(): boolean { return this.hasAttribute('inline'); }
    set inline(v: unknown) { this.setBooleanAttr('inline', v); }

    get cscroll(): boolean { return this.hasAttribute('cscroll'); }
    set cscroll(v: unknown) { this.setBooleanAttr('cscroll', v); }

    /** g11 — Etiqueta accesible del landmark; se refleja a `aria-label`. */
    get label(): string { return this.getAttribute('label') ?? ''; }
    set label(v: unknown) {
      if (v == null || v === '') this.removeAttribute('label');
      else this.setAttribute('label', String(v));
    }

    /** g11 — ID del elemento que etiqueta al landmark; se refleja a `aria-labelledby`. */
    get labelledby(): string { return this.getAttribute('labelledby') ?? ''; }
    set labelledby(v: unknown) {
      if (v == null || v === '') this.removeAttribute('labelledby');
      else this.setAttribute('labelledby', String(v));
    }

    /** Monta el light DOM desde JSON compacto. */
    json2html(body: unknown, opts?: Parameters<typeof applyJsonBody>[2]): this {
      applyJsonBody(this, body, opts ?? {});
      return this;
    }

    /** Serializa el light DOM a JSON compacto. */
    html2json(opts?: Parameters<typeof hostToJson>[1]): unknown {
      return hostToJson(this, opts ?? {});
    }

    toJSON(): { inline: boolean; cscroll: boolean; body: unknown } {
      return {
        inline: this.inline,
        cscroll: this.cscroll,
        body: hostToJson(this),
      };
    }

    fromJSON(json: unknown, opts?: Parameters<typeof applyJsonBody>[2]): this {
      if (!json || typeof json !== 'object') return this;
      const j = json as { inline?: unknown; cscroll?: unknown; body?: unknown; html?: unknown };
      if (j.inline != null) this.inline = !!j.inline;
      if (j.cscroll != null) this.cscroll = !!j.cscroll;
      const body = j.body ?? j.html ?? (Array.isArray(j) ? j : null);
      if (body != null) applyJsonBody(this, body, opts ?? {});
      return this;
    }

    #applyInlineJson(): void {
      if (this.#inlineApplied) return;
      const script = this.querySelector<HTMLElement>(':scope > script[type="application/json"]');
      if (!script) return;
      this.#inlineApplied = true;
      try {
        const json: unknown = JSON.parse(script.textContent || 'null');
        if (json && typeof json === 'object') this.fromJSON(json);
      } catch {
        console.warn('<is-block-layout> script JSON inválido');
      }
    }
  }

  defineElement('is-block-layout', IsBlockLayout, 'IsBlockLayout');
})();
