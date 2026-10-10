/**
 * diagram-element-base.js — Base class para los diagramas SVG del kit
 * (block-diagram, class-diagram, er-diagram, flowchart, gantt, mindmap,
 * sequence-diagram). org-chart es outlier y NO extiende de esta base.
 *
 * Centraliza lo que hoy está copiado byte-a-byte en esos 7 componentes:
 *   - scaffold de shadow DOM (wrap/svg/tooltip/slot-hidden).
 *   - lectura del <script type="application/json"> hijo (`readJsonSlot`).
 *   - debounce de render a microtask (`queueRender` / `updateComplete`).
 *   - MutationObserver de tema sobre <html> (class/data-theme/data-palette).
 *   - `isViewer`, `payload`/`spec`/`layout`.
 *   - apertura de un <iswc-diagram-lightbox> propio (`openOwnViewer(kind)`).
 *
 * Uso por la subclase:
 *
 *   import { DiagramElementBase } from '../_shared/diagram-element-base.js';
 *   import { adoptCss } from '../../core/element.js';
 *
 *   class IswcFlowchart extends DiagramElementBase {
 *     static get observedAttributes(): string[] {
 *       return [...DiagramElementBase.observedAttributes, 'mode'];
 *     }
 *
 *     constructor() {
 *       super();
 *       this.initDiagramShadow('flow-svg', 'flow-tooltip');
 *       adoptCss(this.shadowRoot!, import.meta.url);
 *     }
 *
 *     // Hook: lógica extra de connect (listeners, overrides, etc).
 *     onDiagramConnected() { this.wrap.addEventListener('click', this.#onClick); }
 *     onDiagramDisconnected() { this.wrap.removeEventListener('click', this.#onClick); }
 *
 *     // Hook obligatorio: construye el spec/layout y pinta el SVG.
 *     renderDiagram() {
 *       const spec = resolveFlowchartSpec(this.payload ?? {});
 *       this.spec = spec;
 *       if (!spec) { this.svg.innerHTML = ''; this.wrap.dataset.empty = ''; return; }
 *       delete this.wrap.dataset.empty;
 *       const layout = computeFlowchartLayout(spec);
 *       this.layout = layout;
 *       this.#buildSvg(layout); // geometry-specific, propio de la subclase
 *     }
 *   }
 *
 * Notas:
 *   - `initDiagramShadow` NO llama a `adoptCss` (necesita el `import.meta.url`
 *     del módulo de la subclase) — la subclase la llama después, igual que
 *     hoy.
 *   - `renderDiagram()` es abstracto: la base lo llama debounced desde
 *     `queueRender()`; lanza si no se sobrescribe.
 *   - `payload`/`spec`/`layout` son props normales (no privadas) para que la
 *     subclase pueda leerlas/asignarlas directo (`this.spec = spec`).
 *   - `onPayloadChanged()` es un hook opcional (no-op por defecto) para que
 *     la subclase limpie estado propio (p. ej. `hiddenGroups`) antes del
 *     render, tal como hace flowchart.js hoy.
 */

import { ElementBase } from '../../core/element-base.js';
import { findThemeContainer, readTheme } from './theme-scope.js';
import { hostStyleName, loadStylesDiagram } from '../diagrams/diagram-styles.js';

/** ¿Hay alguna referencia `{ path, query }` en el payload? (recorrido liviano, sin dependencias). */
function tieneRefs(v: unknown, n = 0): boolean {
  if (n > 64 || v === null || typeof v !== 'object') return false;
  if (Array.isArray(v)) return v.some((x) => tieneRefs(x, n + 1));
  const o = v as Record<string, unknown>;
  if (typeof o.path === 'string' && 'query' in o) return true;
  return Object.values(o).some((x) => tieneRefs(x, n + 1));
}

/**
 * Resuelve las referencias con `Obj.resolver` de la biblioteca común (`lib/obj.min.js`, junto a
 * este bundle en el CDN). Se importa solo cuando hay referencias: los diagramas sin ellas no la
 * cargan.
 */
async function resolverRefs(payload: unknown, base: string): Promise<unknown> {
  const url = new URL('../lib/obj.min.js', import.meta.url).href;
  const { Obj } = await import(/* @vite-ignore */ url) as { Obj: { resolver: (v: unknown, o: { base: string; cargar: (u: string) => Promise<unknown> }) => Promise<unknown> } };
  return Obj.resolver(payload, {
    base,
    cargar: async (u: string) => {
      const r = await fetch(u);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
  });
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export class DiagramElementBase extends ElementBase {
  static get observedAttributes(): string[] { return ['color', 'look', 'diagram-style']; }

  #wrap: HTMLElement | null = null;
  #svg: SVGElement | null = null;
  #tooltipEl: HTMLElement | null = null;
  #payload: unknown = null;
  #spec: unknown = null;
  #layout: unknown = null;
  #jsonMo: MutationObserver | null = null;
  #themeObs: MutationObserver | null = null;
  #renderQueued: Promise<void> | null = null;
  #ownViewer: HTMLElement | null = null;

  /** Construye el scaffold estándar (wrap/svg/tooltip/slot-hidden) y guarda
   *  referencias. Llamar en el constructor de la subclase, ANTES de
   *  `adoptCss` (adoptCss debe correr después de fijar `shadow.innerHTML`). */
  initDiagramShadow(svgClass: string, tooltipClass: string): void {
    const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
    shadow.innerHTML = /* html */ `
      <div part="base" class="wrap">
        <svg part="canvas" class="${svgClass}" xmlns="${SVG_NS}" role="img"></svg>
        <div part="tooltip" class="${tooltipClass} dg-tooltip iswc-rich" hidden></div>
        <div class="slot-hidden"><slot></slot></div>
      </div>
    `;
    this.#wrap = shadow.querySelector<HTMLElement>('.wrap')!;
    this.#svg = shadow.querySelector<SVGElement>(`.${svgClass}`)!;
    this.#tooltipEl = shadow.querySelector<HTMLElement>(`.${tooltipClass}`)!;
  }

  get wrap(): HTMLElement { return this.#wrap!; }
  get svg(): SVGElement { return this.#svg!; }
  get tooltipEl(): HTMLElement { return this.#tooltipEl!; }

  get isViewer(): boolean { return this.getAttribute('color') === 'viewer'; }

  get payload(): unknown { return this.#payload; }
  set payload(v: unknown) { this.#payload = v; this.onPayloadChanged(); this.queueRender(); }
  /** Hook opcional: la subclase limpia estado propio (hiddenGroups, etc.)
   *  antes de que se dispare el render. No-op por defecto. */
  onPayloadChanged(): void {}

  get spec(): unknown { return this.#spec; }
  set spec(v: unknown) { this.#spec = v; }
  get layout(): unknown { return this.#layout; }
  set layout(v: unknown) { this.#layout = v; }

  /** Se llama una vez por conexión (ver comentario de ElementBase#onConnected
   *  sobre por qué NO es solo la primera vez): monta el observer de JSON
   *  slot y el de tema, y dispara el primer render. */
  onConnected(): void {
    this.#readJsonSlot();
    this.#jsonMo = new MutationObserver(() => this.#readJsonSlot());
    this.#jsonMo.observe(this, { childList: true, characterData: true, subtree: true });
    this.#themeObs = new MutationObserver(() => this.queueRender());
    this.#themeObs.observe(document.documentElement, {
      attributes: true, attributeFilter: ['class', 'data-theme', 'data-palette'],
    });
    this.onDiagramConnected();
    this.queueRender();
  }

  onDisconnected(): void {
    this.#jsonMo?.disconnect();
    this.#themeObs?.disconnect();
    this.onDiagramDisconnected();
  }

  onAttributeChanged(): void { this.queueRender(); }

  /** Hooks para que la subclase añada listeners/estado propio sin pisar el
   *  connect/disconnect de la base. No-op por defecto. */
  onDiagramConnected(): void {}
  onDiagramDisconnected(): void {}

  /** true cuando el tema activo es oscuro (`data-theme`, no clase legacy). */
  get isDarkTheme(): boolean {
    const container = findThemeContainer(this);
    return readTheme(container) !== 'light';
  }

  /** Aplica `data-theme` al wrapper del shadow, como hacen hoy todos los
   *  diagramas dentro de su `#render`. La subclase la llama desde
   *  `renderDiagram()` tras resolver el tema. */
  syncThemeAttr(): void {
    this.#wrap!.dataset.theme = this.isDarkTheme ? 'dark' : 'light';
  }

  #readJsonSlot(): void {
    const script = [...this.children].find((c) => c.tagName === 'SCRIPT' && /json/i.test((c as HTMLScriptElement).type || ''));
    if (!script) return;
    try {
      this.#payload = JSON.parse((script as HTMLScriptElement).textContent!.trim());
      this.onPayloadChanged();
      this.queueRender();
    } catch { /* JSON inválido: conserva el último válido */ }
  }

  /** Debounce a microtask: varias llamadas síncronas (cambio de atributo +
   *  cambio de payload, etc.) colapsan en un solo `renderDiagram()`. */
  queueRender(): Promise<void> {
    if (this.#renderQueued) return this.#renderQueued;
    this.#renderQueued = (async () => {
      await Promise.resolve();
      try {
        // Estilo por atributo (`diagram-style="insoft"`): se descarga una
        // sola vez y el render espera a tenerlo, así el primer pintado ya
        // sale con su tema y un export headless no captura la versión sin
        // estilo. Si la carga falla, se pinta con el tema por defecto.
        const estilo = hostStyleName(this);
        if (estilo) await loadStylesDiagram(estilo).catch(() => undefined);
        // Referencias { path, query, actions } del payload (fuentes de verdad en JSON): se resuelven
        // antes de pintar. Un valor que no existe es un error: no se pinta y se muestra.
        if (this.mounted && tieneRefs(this.#payload)) {
          try {
            this.#payload = await resolverRefs(this.#payload, this.getAttribute('payload-base') || document.baseURI);
          } catch (e) {
            this.#mostrarError(e);
            return;
          }
        }
        // Trabajo asíncrono previo al pintado (webfont, diagramas incrustados…).
        if (this.mounted) await this.prepareRender().catch(() => undefined);
        if (this.mounted) {
          this.renderDiagram();
          this.#applyLook();
        }
      } finally {
        this.#renderQueued = null;
      }
    })();
    return this.#renderQueued;
  }

  async updateComplete(): Promise<void> { await this.queueRender(); }

  /** Error del payload (p. ej. una referencia a un valor que no existe): a la consola y al lienzo. */
  #mostrarError(e: unknown): void {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[${this.localName}] ${msg}`);
    if (!this.#svg) return;
    this.#svg.replaceChildren();
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('x', '8');
    t.setAttribute('y', '20');
    t.setAttribute('fill', '#b91c1c');
    t.setAttribute('font-size', '12');
    t.textContent = msg;
    this.#svg.appendChild(t);
  }

  /** Hook opcional: trabajo asíncrono que el render necesita listo (no-op por
   *  defecto). Se espera dentro de `queueRender`, así `updateComplete` (y el
   *  export headless) ya incluyen su resultado. */
  async prepareRender(): Promise<void> {}

  /**
   * `look="sketch"` (servilleta / boceto): trazo “a mano” sobre las formas
   * (cajas, rieles, conectores) con un filtro SVG de turbulencia; el texto
   * queda nítido y con la tipografía del theme. Va dentro del SVG, así que
   * el export estático lo conserva. Sirve para cualquier tipo de diagrama.
   */
  #applyLook(): void {
    const svg = this.#svg;
    if (!svg || this.getAttribute('look') !== 'sketch') return;
    const id = 'iswc-look-sketch';
    if (!svg.querySelector(`#${id}`)) {
      let defs = svg.querySelector('defs');
      if (!defs) {
        defs = document.createElementNS(SVG_NS, 'defs');
        svg.insertBefore(defs, svg.firstChild);
      }
      const f = document.createElementNS(SVG_NS, 'filter');
      f.setAttribute('id', id);
      f.setAttribute('x', '-5%');
      f.setAttribute('y', '-5%');
      f.setAttribute('width', '110%');
      f.setAttribute('height', '110%');
      f.innerHTML = '<feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="7" result="n"/>'
        + '<feDisplacementMap in="SourceGraphic" in2="n" scale="3.5" xChannelSelector="R" yChannelSelector="G"/>';
      defs.appendChild(f);
    }
    for (const el of svg.querySelectorAll('rect, path, line, polyline, polygon, circle, ellipse')) {
      if (el.closest('defs')) continue;
      el.setAttribute('filter', `url(#${id})`);
    }
  }

  /** Abstracto: la subclase construye spec/layout y pinta el SVG
   *  (`this.svg`). Debe asignar `this.spec` / `this.layout`. */
  renderDiagram(): void {
    throw new Error(`${this.constructor.name} debe implementar renderDiagram()`);
  }

  /** Abre (o reutiliza) un <iswc-diagram-lightbox> propio con `kind` fijo y
   *  le pasa el payload actual. Mismo mecanismo que hoy en cada diagrama,
   *  parametrizado por el `kind` de `diagram-kinds.js`.
   *  Pasa de largo atributos opt-in (hoy `animation`) para que la copia
   *  montada dentro del visor conserve los efectos declarados en la fuente. */
  async openOwnViewer(kind: string): Promise<void> {
    await import('../diagrams/diagram-lightbox.js');
    let lb = this.#ownViewer as HTMLElement & { payload: unknown; open: boolean } | null;
    if (!lb || !lb.isConnected) {
      lb = document.createElement('iswc-diagram-lightbox') as unknown as HTMLElement & { payload: unknown; open: boolean };
      lb.setAttribute('kind', kind);
      lb.addEventListener('iswc-after-hide', () => lb!.remove());
      document.body.appendChild(lb);
      this.#ownViewer = lb;
    }
    // Re-aplicar en cada apertura: el atributo puede haber cambiado desde
    // la última vez (o ser la primera, si el lightbox ya existía).
    const anim = this.getAttribute('animation');
    if (anim) lb.setAttribute('animation', anim);
    else lb.removeAttribute('animation');
    for (const name of (this.constructor as typeof DiagramElementBase).observedAttributes ?? []) {
      if (name === 'color' || name === 'animation') continue;
      const v = this.getAttribute(name);
      if (v != null) lb.setAttribute(name, v);
      else lb.removeAttribute(name);
    }
    lb.payload = this.#payload;
    lb.open = true;
  }
}
