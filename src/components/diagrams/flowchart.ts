import { adoptCss, defineElement, emit, emitCancelable } from '../../core/element.js';
import { DiagramElementBase } from '../_shared/diagram-element-base.js';
import { resolveFlowchartSpec, computeFlowchartLayout, shapePath, flowPaint, FLOW_LINE_H, FLOW_PILL_ICON, pillStepW, SOCKET } from './flowchart-spec.js';
import type { FlowLayoutOptions, FlowPaint } from './flowchart-spec.schemas.js';
import { hostStyleName, styleThemeFor } from './diagram-styles.js';
import { pickThemeMode, themeToDiagramTheme, injectThemeCss } from './theme.js';
import type { ErThemeJson } from './theme.schemas.js';
import { cargarFuente } from '../_shared/diagram-text-wrap.js';
import { pathEndDirection } from '../_shared/diagram-arrow.js';
import { captureEmbeddedDiagram, embedSvgElement, resolveEmbedDiagram } from '../_shared/diagram-embed.js';
import type { EmbedCapture, EmbedSize } from '../_shared/diagram-embed.schemas.js';
import type {
  FlowLayout,
  FlowLayoutNode,
  FlowLayoutEdge,
  FlowLayoutOverrides,
  FlowResolvedSpec,
  FlowNodeSpec,
} from './flowchart-spec.js';
import { sequenceThemeDark, sequenceThemeLight } from './sequence-spec.js';
import { SequenceTurtle } from './sequence-turtle.js';
import type { PathTurtle } from '../_shared/path-turtle.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import { ANGULO_AUREO, hexToOklch, oklchToHex, rotarTono } from '../_shared/oklch.js';
import { edgeStrokeHex, edgeChipFill, edgeChipText } from '../_shared/diagram-edge-style.js';
import type { DiagramTheme } from './diagram-types.js';
import { inlineMdWeb } from '../_shared/tk-inline-md.js';
import { svgIconGroup } from '../_shared/tk-icon-inline.js';
import { animarRiel, flujoActivo } from '../_shared/diagram-flow.js';
import { styledEdgePath } from '../_shared/diagram-curve.js';
import { edgeStyleFor } from './diagram-vocab.js';
import { ETIQUETA_ICONO, ETIQUETA_LINE_H } from './flowchart-labels.js';
import { wrapText, buildTspans } from '../_shared/diagram-text-wrap.js';
import type { TSpanSpec } from '../_shared/diagram-text-wrap.js';
import { registerDiagramKind } from './diagram-kinds.js';
import { svgEl } from '../_shared/svg-chart-engine.js';
import { svgArrowHead } from '../_shared/diagram-arrow.js';

import {
  loadOverrides,
  saveOverrides,
  emitLayoutChange,
  attachNodeDrag,
  snap as snapToGrid,
  openInlineEditor,
} from '../_shared/diagram-edit.js';
import type { DiagramOverrides } from '../_shared/diagram-edit.js';
import type { TurtleState, NodeNodeEntry, EdgeNodeEntry, FlowInk } from "./flowchart.schemas.js";
/**
 * <iswc-flowchart> — diagrama de flujo en SVG, sin Mermaid.
 *
 * Configuración por JSON, igual que <iswc-sequence-diagram>:
 *
 *   <iswc-flowchart>
 *     <script type="application/json">
 *       { "flowchart": { "direction": "TB", "nodes": [...], "edges": [...] } }
 *     </script>
 *   </iswc-flowchart>
 *
 * Atributos: color (inline | viewer), open-on-click,
 *   mode (read | edit), persist (none | session | local — leído por
 *   `_shared/diagram-edit.js` al cargar/guardar overrides), storage-key,
 *   animation (tokens separados por espacio; default off).
 *   Token actual: `flow` — arista dashed brand animada detrás de la continua.
 * Propiedades: payload, spec, layout, turtle, hiddenGroups, animation
 * Eventos: iswc-render, iswc-turtle-state, iswc-open-viewer, iswc-toggle-group
 */

/** Relleno de la bola del `-(O-`: el mismo del lollipop del diagrama de componentes (insoft). */
const LOLLIPOP_FILL = '#7ACFF4';
const SVG_NS = 'http://www.w3.org/2000/svg';

/** Tokens de `animation` conocidos (otros se ignoran para no romper). */
const VALID_ANIMATION: Set<string> = new Set(['flow']);

/** Estado del callback `onState` del motor de tortuga (path-turtle). */

/** Nodo cacheado en el SVG para aplicar hover sin reconstruir el DOM. */

/** Arista cacheada en el SVG para aplicar hover sin reconstruir el DOM. */

/** Espera a que cargue la hoja de la webfont del tema (si ya está en el <head>). */
function esperarHoja(href: string | undefined): Promise<void> {
  if (!href) return Promise.resolve();
  const link = [...document.head.querySelectorAll('link[data-iswc-font]')]
    .find((l) => l.getAttribute('data-iswc-font') === href);
  if (!(link instanceof HTMLLinkElement) || link.sheet) return Promise.resolve();
  return conTope(new Promise<void>((resolve) => {
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
  }), 4000).then(() => undefined);
}

/** La promesa, o `undefined` si tarda más de `ms` (un recurso caído no congela el render). */
function conTope<T>(p: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([p, new Promise<undefined>((r) => setTimeout(() => r(undefined), ms))]);
}

/** Líneas centradas en la caja de texto (en el rombo, el rect inscrito). */
function insoftText(lines: string[], tb: { x: number; y: number; w: number; h: number }, ink: FlowInk, align: 'middle' | 'start' = 'middle'): SVGTextElement {
  const t = svgEl('text', {
    fill: ink.text, 'font-size': String(ink.fontSize), 'font-weight': String(ink.fontWeight),
    'font-family': ink.font, 'text-anchor': align, class: 'flow-node__label',
  });
  const cx = align === 'start' ? tb.x : tb.x + tb.w / 2;
  const first = tb.y + tb.h / 2 - ((lines.length - 1) * FLOW_LINE_H) / 2 + ink.fontSize * 0.36;
  lines.forEach((line, i) => {
    const ts = svgEl('tspan', { x: cx, y: first + i * FLOW_LINE_H });
    ts.textContent = line;
    t.appendChild(ts);
  });
  return t;
}

/**
 * Insignia «del color de su entidad»: el mismo tono, oscurecido a luminosidad PILL_L (OKLCH) y con
 * croma suficiente para que el color se lea (a 0,25 se percibía negro). El texto blanco conserva el
 * contraste.
 */
const PILL_L = 0.42;
function oscuro(hex: string): string {
  const o = hexToOklch(hex);
  return o ? oklchToHex(PILL_L, Math.min(Math.max(o[1] * 1.4, 0.08), 0.16), o[2]) : hex;
}

/** Color de una entidad incrustada: el primer relleno con color (ni blanco, ni gris, ni transparente) de su dibujo. */
function colorDeEntidad(g: Element): string {
  for (const el of g.querySelectorAll('[fill]')) {
    const f = (el.getAttribute('fill') ?? '').trim();
    if (!/^#[0-9a-f]{6}$/i.test(f)) continue;
    const o = hexToOklch(f);
    if (o && o[1] > 0.03 && o[0] > 0.3 && o[0] < 0.98) return f;
  }
  return '';
}

/** Globo de comentario: rect de esquinas redondeadas con un triángulo en el costado que señala. */
function globoPath(x: number, y: number, w: number, h: number, lado: 'left' | 'right'): string {
  const r = 8;
  const cy = y + h / 2;
  const t = 8;
  const izq = lado === 'left'
    ? `L${x},${cy + t / 2} L${x - t},${cy} L${x},${cy - t / 2} `
    : '';
  const der = lado === 'right'
    ? `L${x + w},${cy - t / 2} L${x + w + t},${cy} L${x + w},${cy + t / 2} `
    : '';
  return `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} ${der}V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} `
    + `H${x + r} Q${x},${y + h} ${x},${y + h - r} ${izq}V${y + r} Q${x},${y} ${x + r},${y} Z`;
}

function parseAnimationTokens(raw: string | null | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of String(raw ?? '').trim().split(/\s+/)) {
    if (!t || !VALID_ANIMATION.has(t) || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

class IswcFlowchart extends DiagramElementBase {
  static get observedAttributes(): string[] {
    return [...DiagramElementBase.observedAttributes, 'mode', 'persist', 'storage-key', 'animation'];
  }

  #theme: DiagramTheme | null = null;
  #turtle: PathTurtle | null = null;
  #hiddenGroups: Set<string> = new Set<string>();
  #nodeNodes: Map<string, NodeNodeEntry> = new Map();
  #edgeNodes: Map<string, EdgeNodeEntry> = new Map();
  #hoverId: string | null = null;
  #overrides: FlowLayoutOverrides | null = null;
  #dragDetach: (() => void) | null = null;
  /** Tema del estilo (`diagram-style="insoft"` → tema `flowchart`), ya fusionado con el modo. */
  #styleTheme: ErThemeJson | null = null;
  /** Pintura insoft resuelta; null = estilo clásico. */
  #paint: FlowPaint | null = null;
  /** SVG capturado de cada nodo especial (clave: contrato del nodo + modo + estilo). */
  /** Spec visible del último render (nodos especiales → su captura). */
  #visibleSpec: FlowResolvedSpec | null = null;
  #captures: Map<string, EmbedCapture | null> = new Map();
  #stage: HTMLElement | null = null;
  #probe: SVGTextElement | null = null;
  #fontRetry = false;

  constructor() {
    super();
    this.initDiagramShadow('flow-svg', 'flow-tooltip');
    adoptCss(this.shadowRoot!, import.meta.url);
  }

  onDiagramConnected(): void {
    this.#overrides = loadOverrides(this, this.getAttribute('storage-key') ?? '') || { nodes: {}, edges: {} };
    this.wrap.addEventListener('mousemove', this.#onMouseMove as EventListener);
    this.wrap.addEventListener('mouseleave', this.#onMouseLeave as EventListener);
    this.wrap.addEventListener('click', this.#onClick as EventListener);
  }

  onDiagramDisconnected(): void {
    this.#turtle?.destroy();
    this.#turtle = null;
    this.wrap.removeEventListener('mousemove', this.#onMouseMove as EventListener);
    this.wrap.removeEventListener('mouseleave', this.#onMouseLeave as EventListener);
    this.wrap.removeEventListener('click', this.#onClick as EventListener);
  }

  onPayloadChanged(): void { this.#hiddenGroups = new Set(); }

  get mode(): string { return this.getAttribute('mode') || 'read'; }
  set mode(v: string) { this.setAttribute('mode', v); }
  get overrides(): FlowLayoutOverrides | null { return this.#overrides; }
  set overrides(v: FlowLayoutOverrides | null) {
    this.#overrides = v || { nodes: {}, edges: {} };
    this.queueRender();
  }

  /**
   * Tokens de animación activos (`flow`, …). Ausente / vacío = sin animación.
   * Espacio-separados para sumar efectos futuros: `animation="flow pulse"`.
   */
  get animation(): string {
    return parseAnimationTokens(this.getAttribute('animation')).join(' ');
  }
  set animation(v: string) {
    const next = parseAnimationTokens(v).join(' ');
    if (next) this.setAttribute('animation', next);
    else this.removeAttribute('animation');
  }

  /** @param {string} token */
  hasAnimation(token: string): boolean {
    return parseAnimationTokens(this.getAttribute('animation')).includes(token);
  }

  get turtle(): PathTurtle | null { return this.#turtle; }
  get hiddenGroups(): Set<string> { return this.#hiddenGroups; }
  set hiddenGroups(v: Set<string> | Iterable<string> | null | undefined) {
    this.#hiddenGroups = v instanceof Set ? v : new Set(v ?? []);
    this.queueRender();
  }

  renderDiagram(): void {
    const spec: FlowResolvedSpec | null = resolveFlowchartSpec(this.payload ?? {});
    this.spec = spec;
    if (!spec) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }
    delete this.wrap.dataset.empty;

    // Ocultar un grupo quita sus nodos y las aristas que los tocan.
    const hidden = this.#hiddenGroups;
    let visible: FlowResolvedSpec = spec;
    if (hidden.size) {
      const nodes: FlowNodeSpec[] = spec.nodes.filter((n) => !n.group || !hidden.has(n.group));
      const keep = new Set(nodes.map((n) => n.id));
      visible = { ...spec, nodes, edges: spec.edges.filter((e) => keep.has(e.from) && keep.has(e.to)) };
    }
    if (!visible.nodes.length) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }

    const dark = this.isDarkTheme;
    const base: DiagramTheme = dark ? sequenceThemeDark() : sequenceThemeLight();
    const styleTheme = this.#resolveStyleTheme();
    this.#styleTheme = styleTheme;
    this.#paint = styleTheme?.flow ? flowPaint(styleTheme) : null;
    const theme: DiagramTheme = styleTheme ? themeToDiagramTheme(styleTheme, base) : base;
    this.#theme = theme;
    this.#visibleSpec = visible;
    this.syncThemeAttr();

    const opts: FlowLayoutOptions = { embeds: this.#embedSizes(visible) };
    if (this.#paint) {
      const paint = this.#paint;
      opts.style = 'insoft';
      opts.fontSize = paint.fontSize;
      opts.measure = (t: string) => this.#measure(t, paint);
    }
    const layout: FlowLayout = computeFlowchartLayout(visible, this.#overrides, opts);
    this.layout = layout;
    this.#buildSvg(layout, theme);
    if (styleTheme) {
      injectThemeCss(this.svg, styleTheme);
      this.svg.setAttribute('data-flow-theme', styleTheme.id);
    } else {
      this.svg.removeAttribute('data-flow-theme');
    }
    this.#watchFont();
    this.wrap.classList.toggle('iswc-viewer', this.isViewer);
    this.wrap.classList.toggle('iswc-editable', this.mode === 'edit');
    if (this.mode === 'edit') this.#installEditInteractions();
  }

  /** Tema `flowchart` del estilo pedido por el host, fusionado con el modo claro/oscuro. */
  #resolveStyleTheme(): ErThemeJson | null {
    const raw = styleThemeFor(hostStyleName(this), 'flowchart');
    return raw && raw.kind === 'flowchart' ? pickThemeMode(raw, this.isDarkTheme) : null;
  }

  /** Clave de captura de un nodo especial: su contrato + modo + estilo. */
  #embedKey(n: FlowNodeSpec): string {
    return `${hostStyleName(this) ?? ''}|${this.isDarkTheme ? 'd' : 'l'}|${JSON.stringify(n.embed ?? null)}`;
  }

  /** Tamaño natural medido de cada diagrama incrustado ya capturado. */
  #embedSizes(spec: FlowResolvedSpec): Record<string, EmbedSize> {
    const out: Record<string, EmbedSize> = {};
    for (const n of spec.nodes) {
      if (!n.embed) continue;
      const cap = this.#captures.get(this.#embedKey(n));
      if (cap) out[n.id] = { w: cap.box.w, h: cap.box.h };
    }
    return out;
  }

  #ensureStage(): HTMLElement {
    if (this.#stage?.isConnected) return this.#stage;
    const stage = document.createElement('div');
    stage.className = 'flow-embed-stage';
    stage.setAttribute('aria-hidden', 'true');
    this.shadowRoot!.appendChild(stage);
    this.#stage = stage;
    return stage;
  }

  /** Ancho real del texto con la tipografía del tema (fuera de pantalla). */
  #measure(text: string, paint: FlowPaint): number {
    if (!this.#probe?.isConnected) {
      const svg = svgEl('svg', { width: 10, height: 10 });
      const t = svgEl('text', { x: 0, y: 10 });
      svg.appendChild(t);
      this.#ensureStage().appendChild(svg);
      this.#probe = t;
    }
    const probe = this.#probe!;
    probe.setAttribute('font-family', paint.font);
    probe.setAttribute('font-size', String(paint.fontSize));
    probe.setAttribute('font-weight', String(paint.fontWeight));
    probe.textContent = text;
    const w = probe.getComputedTextLength();
    return w > 0 ? w : text.length * paint.fontSize * 0.6;
  }

  /** Si se midió antes de que llegara la webfont, re-maqueta una vez al llegar. */
  #watchFont(): void {
    const paint = this.#paint;
    if (!paint || this.#fontRetry || !document.fonts) return;
    const spec = `${paint.fontWeight} ${paint.fontSize}px ${paint.font}`;
    let lista = true;
    try { lista = document.fonts.check(spec); } catch { lista = true; }
    if (lista) return;
    this.#fontRetry = true;
    document.fonts.load(spec).then(() => this.queueRender()).catch(() => undefined);
  }

  /**
   * Antes de pintar: la webfont del estilo (para medir con ella) y la captura
   * de cada nodo especial (`nested`, `tableder`, `component`).
   */
  override async prepareRender(): Promise<void> {
    const styleTheme = this.#resolveStyleTheme();
    if (styleTheme?.font?.family) {
      injectThemeCss(this.svg, styleTheme);
      await esperarHoja(styleTheme.font.import);
      const paint = styleTheme.flow ? flowPaint(styleTheme) : null;
      await conTope(cargarFuente(styleTheme.font.family, paint?.fontSize ?? 11), 4000);
    }
    const spec = resolveFlowchartSpec(this.payload ?? {});
    if (!spec) return;
    const pendientes = spec.nodes.filter((n) => n.embed && !this.#captures.has(this.#embedKey(n)));
    for (const [i, n] of pendientes.entries()) {
      const key = this.#embedKey(n);
      const embed = n.embed!;
      let cap: EmbedCapture | null = null;
      try {
        const diagram = await resolveEmbedDiagram(embed);
        cap = diagram
          ? (await conTope(captureEmbeddedDiagram(this.#ensureStage(), diagram, {
            moduleUrl: import.meta.url,
            styleName: hostStyleName(this),
            idPrefix: `fe${this.#captures.size}x${i}-`,
          }), 15000)) ?? null
          : null;
      } catch {
        cap = null;
      }
      this.#captures.set(key, cap);
    }
  }

  #buildSvg(layout: FlowLayout, theme: DiagramTheme): void {
    const { width: W, height: H } = layout;
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.setAttribute('aria-label', layout.title || 'Diagrama de flujo');
    this.svg.style.cssText = 'width:100%;height:100%;max-width:none;display:block;margin:0 auto';
    this.svg.innerHTML = '';
    this.#nodeNodes.clear();
    this.#edgeNodes.clear();
    this.#hoverId = null;

    if (layout.title) {
      const t = svgEl('text', {
        x: W / 2, y: layout.titleY, 'text-anchor': 'middle', fill: theme.text,
        'font-size': '13', 'font-weight': '600', 'font-family': this.#paint?.font ?? 'Tahoma,Arial,sans-serif',
      });
      t.textContent = layout.title;
      this.svg.appendChild(t);
    }
    if (layout.subtitle) {
      const t = svgEl('text', {
        x: W / 2, y: layout.subtitleY, 'text-anchor': 'middle', fill: theme.muted,
        'font-size': '11', 'font-family': this.#paint?.font ?? 'Tahoma,Arial,sans-serif',
      });
      t.textContent = layout.subtitle;
      this.svg.appendChild(t);
    }

    if (layout.groups?.length) this.#buildLegend(layout, theme);
    if (this.#paint) {
      if (layout.lanes?.length) this.#buildInsoftLanes(layout, this.#paint);
      if (layout.contexts?.length) this.#buildInsoftContexts(layout, this.#paint);
      this.#buildInsoftEdges(layout, this.#paint);
      this.#buildInsoftNodes(layout, this.#paint);
    } else {
      this.#buildEdges(layout, theme);
      this.#buildNodes(layout, theme);
    }

    const turtleGroup = svgEl('g');
    this.svg.appendChild(turtleGroup);
    this.#turtle?.destroy();
    this.#turtle = new SequenceTurtle(turtleGroup as unknown as HTMLElement);
    // La tortuga recorre las aristas en orden; reutiliza el motor del secuencia.
    this.#turtle.setData({
      messages: layout.edges.map((e, i: number) => ({
        path: e.path, step: i + 1, log: e.label || '', groupHue: e.hue,
      })),
      theme: theme as unknown as { accent: string; [key: string]: unknown },
      viewW: W,
      viewH: H,
      autoLoop: this.isViewer,
      onState: (state: TurtleState) => emit(this, 'iswc-turtle-state', state),
    });

    emit(this, 'iswc-render', { layout, svg: this.svg });
  }

  #buildLegend(layout: FlowLayout, theme: DiagramTheme): void {
    const g = svgEl('g', { class: 'flow-legend' });
    const groups = layout.groups ?? [];
    groups.forEach((grp, gi: number) => {
      const ly = (layout.subtitleY || layout.titleY || 22) + 18 + gi * 16;
      const color = tkHueToHex(grp.hue) ?? theme.accent;
      const off = this.#hiddenGroups.has(grp.id);
      const item = svgEl('g', { class: 'flow-legend__item', opacity: off ? 0.4 : 1 });
      if (this.isViewer) {
        item.style.cursor = 'pointer';
        item.dataset.groupId = grp.id;
        item.appendChild(svgEl('rect', {
          x: layout.legendX - 2, y: ly - 8, width: grp.name.length * 6 + 26, height: 16, rx: 4, fill: 'transparent',
        }));
      }
      item.appendChild(off
        ? svgEl('circle', { cx: layout.legendX + 5, cy: ly, r: 4.5, fill: 'none', stroke: color, 'stroke-width': 1.4 })
        : svgEl('circle', { cx: layout.legendX + 5, cy: ly, r: 4.5, fill: color }));
      const label = svgEl('text', {
        x: layout.legendX + 16, y: ly + 3.5, fill: theme.muted,
        'font-size': '10', 'font-family': 'Tahoma,Arial,sans-serif',
        'text-decoration': off ? 'line-through' : null,
      });
      label.textContent = grp.name;
      item.appendChild(label);
      g.appendChild(item);
    });
    this.svg.appendChild(g);
  }

  #buildEdges(layout: FlowLayout, theme: DiagramTheme): void {
    const flowAnim = this.hasAnimation('flow');
    const estilo = edgeStyleFor(this, this.payload);
    for (const e of layout.edges) {
      const color = edgeStrokeHex(e.hue, theme.accent);
      const g = svgEl('g', { class: 'flow-edge' });
      g.dataset.edgeId = e.id;

      const dash = e.kind === 'dashed' ? '6 4' : null;
      const wdt = e.kind === 'thick' ? 2.4 : 1.3;

      // Capa de flujo (opcional): dashed brand detrás de la arista continua.
      if (flowAnim && e.kind !== 'dashed') {
        g.appendChild(svgEl('path', {
          d: styledEdgePath(e.path, estilo),
          fill: 'none',
          'stroke-width': Math.max(wdt + 1.4, 2.6),
          'stroke-linejoin': 'round',
          'stroke-linecap': 'round',
          class: 'flow-edge__flow',
          stroke: color,
        }));
        // El `g` setea `color` para que el `.flow-edge__flow` herede via
        // `currentColor` (CSS) → mismo color que la arista principal.
        g.setAttribute('color', color);
      }

      const path = svgEl('path', {
        d: styledEdgePath(e.path, estilo), fill: 'none', stroke: color, 'stroke-width': wdt,
        'stroke-dasharray': dash, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        class: 'flow-edge__path',
      });
      g.appendChild(path);
      if (!flowAnim && flujoActivo(this)) {
        const puntos = animarRiel(path, { punteado: !!dash, reverse: !!e.reverse, color, ancho: wdt });
        if (puntos) g.appendChild(puntos);
      }

      // Punta orientada por el último tramo REAL del path (no por el lado de
      // entrada planificado, que el router puede no respetar).
      // Cast: svgArrowHead tiene firma heredada con `any`; añadimos la clase
      // CSS al resultado en vez de pasarla por el parámetro tipado a null.
      const head = (svgArrowHead as unknown as (opts: {
        d: string; tip: { x: number; y: number }; color: string;
        len?: number; halfWidth?: number;
      }) => SVGElement)({
        d: e.path,
        tip: { x: e.arrowTipX, y: e.arrowTipY },
        color,
        len: 8,
        halfWidth: 4,
      });
      head.classList.add('flow-edge__head');
      g.appendChild(head);

      if (e.label) {
        const pad = 4;
        // `labelW` no está declarado en FlowLayoutEdge; el spec lo añade
        // opcionalmente en runtime. Cast para preservar comportamiento.
        const w = (e as { labelW?: number }).labelW ?? (e.label.length * 5.6 + pad * 2);
        g.appendChild(svgEl('rect', {
          x: e.labelX - w / 2, y: e.labelY - 8, width: w, height: 16, rx: 4,
          fill: edgeChipFill(e.hue), class: 'flow-edge__chip',
        }));
        const t = svgEl('text', {
          x: e.labelX, y: e.labelY + 3.5, 'text-anchor': 'middle', fill: edgeChipText(e.hue, theme.muted),
          'font-size': '10', 'font-family': 'Consolas,Menlo,monospace',
        });
        t.textContent = e.label;
        g.appendChild(t);
      }

      this.svg.appendChild(g);
      this.#edgeNodes.set(e.id, { e, g: g as SVGGElement, path: path as SVGPathElement });
    }
  }

  #buildNodes(layout: FlowLayout, theme: DiagramTheme): void {
    for (const n of layout.nodes) {
      const color = (n.hue != null && tkHueToHex(n.hue)) || theme.accent;
      const g = svgEl('g', { class: 'flow-node' });
      g.dataset.nodeId = n.id;
      if (this.isViewer) g.style.cursor = 'pointer';

      const terminal = n.shape === 'start' || n.shape === 'end';
      const box = svgEl('path', {
        d: shapePath(n.shape, n.x, n.y, n.w, n.h),
        fill: n.shape === 'start' ? color : (n.embed?.bg ?? theme.chipFill),
        stroke: color,
        'stroke-width': 1.3,
        'stroke-linejoin': 'round',
        class: 'flow-node__box',
      });
      if (n.kind !== 'tableder' && n.kind !== 'component' && n.kind !== 'class') g.appendChild(box);
      if (n.shape === 'end') {
        g.appendChild(svgEl('circle', { cx: n.x + n.w / 2, cy: n.y + n.h / 2, r: n.w / 2 - 5, fill: color }));
      }
      if (n.embed || terminal) {
        if (n.embed) this.#paintEmbed(g, n, { text: theme.text, muted: theme.muted, font: 'Tahoma,Arial,sans-serif', fontSize: 11, fontWeight: 600 });
        this.svg.appendChild(g);
        this.#nodeNodes.set(n.id, { n, g: g as SVGGElement, box: box as SVGPathElement });
        continue;
      }

      const hasIcon = !!n.icon;
      const padX = hasIcon ? 26 : 10;
      const textLeft = n.x + padX;
      const textRight = n.x + n.w - 10;

      if (hasIcon) {
        g.appendChild(svgIconGroup(n.icon ?? '', {
          x: n.x + 8, y: n.y + n.h / 2 - 8, size: 16, hue: n.hue,
        }));
      }

      if (n.label.includes('{{') || /[*`\[]/.test(n.label)) {
        const fo = svgEl('foreignObject', {
          x: textLeft, y: n.y, width: Math.max(textRight - textLeft, 8), height: n.h, overflow: 'visible',
        });
        const div = document.createElement('div');
        div.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
        div.className = 'flow-node-label';
        Object.assign(div.style, {
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', height: '100%', fontSize: '11px', fontWeight: '600',
          fontFamily: 'Tahoma,Arial,sans-serif', color: theme.text,
          lineHeight: '1.2', textAlign: 'center',
        });
        div.innerHTML = inlineMdWeb(n.label);
        fo.appendChild(div);
        g.appendChild(fo);
      } else {
        // Wrap con el helper compartido: respeta `n.overflow` (grow/ellipsis).
        // `overflow` no está declarado en FlowLayoutNode; cast para leer.
        const rawOverflow = (n as { overflow?: string }).overflow;
        const overflow: 'grow' | 'ellipsis' =
          (rawOverflow === 'grow' || rawOverflow === 'ellipsis') ? rawOverflow : 'grow';
        const result = wrapText({
          text: n.label,
          maxWidth: Math.max(textRight - textLeft, 8),
          maxHeight: n.h,
          fontSize: 11,
          fontFamily: 'Tahoma,Arial,sans-serif',
          overflow,
        });
        const tspans: TSpanSpec[] = buildTspans(
          result.lines,
          n.x, n.y, n.w, n.h,
          'middle', 11, 1.2,
        );
        const t = svgEl('text', {
          fill: theme.text, 'font-size': '11', 'font-weight': '600',
          'font-family': 'Tahoma,Arial,sans-serif',
          // text-anchor: el default SVG es `start`. Los tspans (con su x en el
          // centro del box) renderizan arrancando en x y extendiéndose a la
          // derecha → descentrado visible. Forzamos `middle`.
          'text-anchor': 'middle',
        });
        for (const span of tspans) {
          const ts = svgEl('tspan', {
            x: span.x, y: span.y,
            ...(span.dy != null ? { dy: span.dy } : {}),
            ...(span.textAnchor != null ? { 'text-anchor': span.textAnchor } : {}),
            ...(span.dominantBaseline != null ? { 'dominant-baseline': span.dominantBaseline } : {}),
          });
          ts.textContent = span.text;
          t.appendChild(ts);
        }
        g.appendChild(t);
      }

      this.svg.appendChild(g);
      this.#nodeNodes.set(n.id, { n, g: g as SVGGElement, box: box as SVGPathElement });
    }
  }

  /* ── estilo insoft (actividad) ── */

  /**
   * Grupos de contexto dentro de un carril: recuadro de borde punteado celeste y fondo suave, con su
   * título como etiqueta oscura arriba a la izquierda (como los fragmentos de secuencia).
   */
  #buildInsoftContexts(layout: FlowLayout, paint: FlowPaint): void {
    const g = svgEl('g', { class: 'flow-contexts' });
    for (const c of layout.contexts ?? []) {
      const caja = svgEl('g', { class: 'flow-context' });
      // Recuadro: borde punteado celeste (el de los carriles) y fondo suave.
      caja.appendChild(svgEl('rect', {
        x: c.x, y: c.y, width: c.w, height: c.h, rx: 6, fill: paint.laneLine, 'fill-opacity': 0.08,
        stroke: paint.laneLine, 'stroke-width': 1.2, 'stroke-dasharray': '6 4', class: 'flow-context__bg',
      }));
      // Título como etiqueta de los fragmentos de secuencia: fondo oscuro arriba a la izquierda.
      const tw = Math.ceil(c.label.length * 6.2) + 14;
      caja.appendChild(svgEl('rect', {
        x: c.x, y: c.y, width: tw, height: 18, rx: 3, fill: paint.startFill, class: 'flow-context__tag',
      }));
      const t = svgEl('text', {
        x: c.x + 7, y: c.y + 12.5, fill: paint.background, 'font-family': paint.font, 'font-size': 10.5,
        'font-weight': 700, class: 'flow-context__label',
      });
      t.textContent = c.label;
      caja.appendChild(t);
      g.appendChild(caja);
    }
    this.svg.appendChild(g);
  }

  /**
   * Carriles de contexto: separadores punteados entre carriles y el nombre de cada contexto en
   * negrita (arriba si son verticales; a la izquierda si son horizontales). Van detrás de todo.
   */
  #buildInsoftLanes(layout: FlowLayout, paint: FlowPaint): void {
    const lanes = layout.lanes ?? [];
    const horizontal = layout.laneDirection === 'horizontal';
    const g = svgEl('g', { class: 'flow-lanes' });
    lanes.forEach((l, i) => {
      const t = svgEl('text', horizontal
        ? { x: l.x + 12, y: l.y + l.h / 2, 'dominant-baseline': 'middle', 'text-anchor': 'start' }
        : { x: l.x + l.w / 2, y: l.y + 26, 'text-anchor': 'middle' });
      for (const [k, v] of Object.entries({
        fill: paint.text, 'font-family': paint.font, 'font-size': 13, 'font-weight': 700, class: 'flow-lane__label',
      })) t.setAttribute(k, String(v));
      t.textContent = l.label;
      const lane = svgEl('g', { class: 'flow-lane' });
      lane.dataset.laneId = l.id;
      lane.appendChild(t);
      if (i < lanes.length - 1) {
        lane.appendChild(svgEl('line', horizontal
          ? { x1: l.x, y1: l.y + l.h, x2: l.x + l.w, y2: l.y + l.h }
          : { x1: l.x + l.w, y1: l.y, x2: l.x + l.w, y2: l.y + l.h }));
        const sep = lane.lastElementChild!;
        // Separador de carril: línea continua celeste (los grupos sí van punteados).
        for (const [k, v] of Object.entries({ stroke: paint.laneLine, 'stroke-width': 1.2, class: 'flow-lane__sep' })) sep.setAttribute(k, String(v));
      }
      g.appendChild(lane);
    });
    this.svg.appendChild(g);
  }

  #buildInsoftEdges(layout: FlowLayout, paint: FlowPaint): void {
    const flowAnim = this.hasAnimation('flow');
    const estilo = edgeStyleFor(this, this.payload);
    // Ramas que se funden en la misma entrada comparten una sola punta.
    const puntas = new Set<string>();
    for (const e of layout.edges) {
      const g = svgEl('g', { class: 'flow-edge' });
      g.dataset.edgeId = e.id;
      const color = paint.edgeStroke;
      const wdt = e.kind === 'thick' ? paint.edgeWidth * 2 : paint.edgeWidth;
      if (flowAnim && e.kind !== 'dashed') {
        g.appendChild(svgEl('path', {
          d: styledEdgePath(e.path, estilo), fill: 'none', 'stroke-width': Math.max(wdt + 1.4, 2.6),
          'stroke-linejoin': 'round', 'stroke-linecap': 'round', class: 'flow-edge__flow', stroke: color,
        }));
        g.setAttribute('color', color);
      }
      const path = svgEl('path', {
        d: styledEdgePath(e.path, estilo), fill: 'none', stroke: color, 'stroke-width': wdt,
        'stroke-dasharray': e.kind === 'dashed' ? '5 4' : null,
        'stroke-linejoin': estilo === 'orthogonal' ? 'miter' : 'round', class: 'flow-edge__path',
      });
      g.appendChild(path);
      // Flujo animado (estándar de todos los diagramas, ver _shared/diagram-flow.ts): la punteada
      // avanza; la continua lleva su línea de puntos. `reverse` lo invierte (de la punta al origen).
      if (paint.dashFlow && flujoActivo(this)) {
        const puntos = animarRiel(path, { punteado: e.kind === 'dashed', reverse: !!e.reverse, color, ancho: wdt });
        if (puntos) g.appendChild(puntos);
      }
      // Punta abierta (dos trazos), orientada por el último tramo real.
      const dir = pathEndDirection(e.path, { x: 0, y: 1 });
      const tip = { x: e.arrowTipX, y: e.arrowTipY };
      const len = 9;
      const half = 4.5;
      const bx = tip.x - dir.x * len;
      const by = tip.y - dir.y * len;
      const clave = `${tip.x},${tip.y}`;
      if (e.socket) {
        // Conector UML `-(O-`: el componente expone su interfaz (palo + bola desde su borde) y quien
        // llega la toma con el socket `(` al final de su riel. Uno por punta (el abanico converge ahí).
        if (!puntas.has(clave)) {
          const { palo, bola, socket } = SOCKET;
          const c = { x: tip.x - dir.x * (palo + bola), y: tip.y - dir.y * (palo + bola) };
          g.appendChild(svgEl('line', { x1: tip.x, y1: tip.y, x2: tip.x - dir.x * palo, y2: tip.y - dir.y * palo, stroke: color, 'stroke-width': wdt, class: 'flow-edge__lollipop' }));
          g.appendChild(svgEl('circle', { cx: c.x, cy: c.y, r: bola, fill: LOLLIPOP_FILL, stroke: color, 'stroke-width': wdt, class: 'flow-edge__lollipop' }));
          // Semicírculo abierto hacia el componente.
          const a1 = { x: c.x - dir.y * socket, y: c.y + dir.x * socket };
          const a2 = { x: c.x + dir.y * socket, y: c.y - dir.x * socket };
          g.appendChild(svgEl('path', { d: `M${a1.x},${a1.y} A${socket},${socket} 0 0 1 ${a2.x},${a2.y}`, fill: 'none', stroke: color, 'stroke-width': wdt, class: 'flow-edge__socket' }));
        }
        puntas.add(clave);
      } else if (!puntas.has(clave)) g.appendChild(svgEl('polyline', {
        points: `${bx - dir.y * half},${by + dir.x * half} ${tip.x},${tip.y} ${bx + dir.y * half},${by - dir.x * half}`,
        fill: 'none', stroke: color, 'stroke-width': wdt, 'stroke-linejoin': 'miter', 'stroke-linecap': 'butt',
        class: 'flow-edge__head',
      }));
      puntas.add(clave);
      if (e.label) {
        // Junto a la arista (no encima): halo del color del lienzo para que
        // un cruce no la ensucie.
        const t = svgEl('text', {
          x: e.labelX, y: e.labelY, 'text-anchor': e.labelAnchor ?? 'middle', fill: paint.labelText,
          'font-size': String(paint.fontSize - 0.5), 'font-weight': String(paint.fontWeight),
          'font-family': paint.font, stroke: paint.background, 'stroke-width': 3,
          'paint-order': 'stroke', 'stroke-linejoin': 'round', class: 'flow-edge__label',
        });
        if (e.labelVertical) t.setAttribute('transform', `rotate(-90 ${e.labelX} ${e.labelY})`);
        // Etiqueta partida (o resumida) por el layout: una línea por renglón.
        const lineas = e.labelLines ?? [e.label];
        if (lineas.length > 1) {
          lineas.forEach((l, k) => {
            const ts = svgEl('tspan', { x: e.labelX, dy: k ? 12 : 0 });
            ts.textContent = l;
            t.appendChild(ts);
          });
        } else t.textContent = lineas[0] ?? e.label;
        if (e.labelIcon && e.labelBox) {
          // Ícono delante del texto: a la izquierda (horizontal) o abajo (vertical, el texto sube).
          const b = e.labelBox;
          const [ix, iy] = e.labelVertical
            ? [b.x + (b.w - ETIQUETA_ICONO) / 2, b.y + b.h - ETIQUETA_ICONO - 2]
            : [b.x + 2, b.y + (ETIQUETA_LINE_H - ETIQUETA_ICONO) / 2];
          const ic = svgIconGroup(e.labelIcon, { x: ix, y: iy, size: ETIQUETA_ICONO, color: paint.labelText });
          ic.classList.add('flow-edge__label-icon');
          g.appendChild(ic);
        }
        g.appendChild(t);
      }
      this.svg.appendChild(g);
      this.#edgeNodes.set(e.id, { e, g: g as SVGGElement, path: path as SVGPathElement });
    }
  }

  #buildInsoftNodes(layout: FlowLayout, paint: FlowPaint): void {
    // Con `hueRotate`, cada símbolo pintado con el relleno del tema toma su propio tono (en orden
    // de lectura): mismo L y C en OKLCH, el tono avanza por el ángulo áureo.
    let simbolo = 0;
    const relleno = (base: string): string => paint.hueRotate ? rotarTono(base, ANGULO_AUREO * simbolo++) : base;
    // Color de la entidad (para su insignia): el relleno del símbolo o, si es incrustado, el de su diagrama.
    let tono = '';
    const pinta = (base: string): string => (tono = relleno(base));
    for (const n of layout.nodes) {
      const g = svgEl('g', { class: 'flow-node' });
      g.dataset.nodeId = n.id;
      if (this.isViewer) g.style.cursor = 'pointer';
      tono = '';
      const stroke = { stroke: paint.actionBorder, 'stroke-width': paint.borderWidth, class: 'flow-node__box' };
      let box: SVGElement;
      if (n.shape === 'start') {
        box = svgEl('circle', { cx: n.x + n.w / 2, cy: n.y + n.h / 2, r: n.w / 2, fill: paint.startFill, class: 'flow-node__box' });
        g.appendChild(box);
      } else if (n.shape === 'end') {
        box = svgEl('circle', {
          cx: n.x + n.w / 2, cy: n.y + n.h / 2, r: n.w / 2 - 0.75, fill: paint.background,
          stroke: paint.endFill, 'stroke-width': 1.5, class: 'flow-node__box',
        });
        g.appendChild(box);
        g.appendChild(svgEl('circle', { cx: n.x + n.w / 2, cy: n.y + n.h / 2, r: n.w / 2 - 5, fill: paint.endFill }));
      } else if (n.kind === 'nested') {
        box = svgEl('rect', { x: n.x, y: n.y, width: n.w, height: n.h, rx: 4, fill: n.embed?.bg ?? paint.nestedBg, ...stroke });
        g.appendChild(box);
      } else if (n.kind === 'tableder' || n.kind === 'component' || n.kind === 'class') {
        // La forma la pone el diagrama incrustado; la caja solo sirve al hover.
        box = svgEl('rect', { x: n.x, y: n.y, width: n.w, height: n.h, fill: 'none', stroke: 'none', class: 'flow-node__box' });
        g.appendChild(box);
      } else if (n.shape === 'comment') {
        // Globo de diálogo: esquinas redondeadas, triángulo hacia el nodo comentado y comillas.
        box = svgEl('path', {
          d: globoPath(n.x, n.y, n.w, n.h, n.pointer ?? 'left'), fill: paint.background,
          stroke: paint.muted, 'stroke-width': 1, 'stroke-linejoin': 'round', class: 'flow-node__box flow-node__comment',
        });
        g.appendChild(box);
        g.appendChild(svgIconGroup('mdi:format-quote-open', { x: n.x + 8, y: n.y + 8, size: 16, color: paint.muted }));
      } else if (n.shape === 'bar') {
        // Barra de sincronización (bifurcación / unión): sólida, del color del inicio.
        box = svgEl('path', { d: shapePath('bar', n.x, n.y, n.w, n.h), fill: paint.startFill, class: 'flow-node__box' });
        g.appendChild(box);
      } else if (n.shape === 'diamond') {
        box = svgEl('path', { d: shapePath('diamond', n.x, n.y, n.w, n.h), fill: pinta(paint.decisionFill), 'stroke-linejoin': 'miter', ...stroke });
        g.appendChild(box);
      } else if (n.shape === 'rect' || n.shape === 'round' || n.shape === 'stadium') {
        const r = Math.min(paint.radius, n.h / 2);
        box = svgEl('rect', { x: n.x, y: n.y, width: n.w, height: n.h, rx: r, ry: r, fill: pinta(paint.actionFill), ...stroke });
        g.appendChild(box);
      } else {
        box = svgEl('path', { d: shapePath(n.shape, n.x, n.y, n.w, n.h), fill: pinta(paint.actionFill), 'stroke-linejoin': 'round', ...stroke });
        g.appendChild(box);
      }
      if (n.embed) {
        this.#paintEmbed(g, n, { text: paint.actionText, muted: paint.muted, font: paint.font, fontSize: paint.fontSize, fontWeight: paint.fontWeight });
        if (n.pill) g.appendChild(this.#pill(n, paint, colorDeEntidad(g)));
      } else if (n.lines?.length && n.textBox) {
        g.appendChild(insoftText(n.lines, n.textBox, { text: paint.actionText, muted: paint.muted, font: paint.font, fontSize: paint.fontSize, fontWeight: paint.fontWeight }, n.textAlign ?? 'middle'));
        if (n.pill) g.appendChild(this.#pill(n, paint, tono));
      }
      this.svg.appendChild(g);
      this.#nodeNodes.set(n.id, { n, g: g as SVGGElement, box: box as SVGPathElement });
    }
  }

  /**
   * Pastilla de una acción: número de paso (orden de la secuencia) e ícono, sobre un fondo claro al
   * 30 % y sin borde. Une la lectura de flujo (forma, carril) con la de secuencia (paso numerado).
   */
  #pill(n: FlowLayoutNode, paint: FlowPaint, entidad = ''): SVGGElement {
    const p = n.pill!;
    const g = svgEl('g', { class: 'flow-node__pill' }) as SVGGElement;
    // Suelta (decisión, nodo incrustado): fondo oscuro y número claro, como los pasos de la secuencia.
    // Con `pillTone: entity` (insoft), el fondo es el tono de su entidad oscurecido (ver PILL_L).
    const suelta = !!n.pillFloat;
    const fondo = paint.pillTone !== 'entity' ? paint.pillTone : entidad ? oscuro(entidad) : paint.startFill;
    g.appendChild(svgEl('rect', {
      x: p.x, y: p.y, width: p.w, height: p.h, rx: p.h / 2,
      fill: suelta ? fondo : paint.background, 'fill-opacity': suelta ? 1 : 0.3,
      class: 'flow-node__pill-bg',
    }));
    let x = p.x + 6;
    const cy = p.y + p.h / 2;
    if (n.step != null) {
      const t = svgEl('text', {
        // Sin ícono, el número queda centrado en la pastilla.
        x: n.icon ? x + pillStepW(n.step) / 2 : p.x + p.w / 2, y: cy, 'text-anchor': 'middle', 'dominant-baseline': 'central',
        fill: suelta ? paint.background : paint.actionText, 'font-family': paint.font, 'font-size': 10, 'font-weight': 700, class: 'flow-node__step',
      });
      t.textContent = String(n.step);
      g.appendChild(t);
      x += pillStepW(n.step) + 4;
    }
    if (n.icon) {
      // Sin número, el ícono queda centrado en la pastilla.
      const ix = n.step != null ? x : p.x + (p.w - FLOW_PILL_ICON) / 2;
      g.appendChild(svgIconGroup(n.icon, { x: ix, y: cy - FLOW_PILL_ICON / 2, size: FLOW_PILL_ICON, color: suelta ? paint.background : paint.actionText }));
    }
    return g;
  }

  /**
   * Nodo especial: rótulo (si el nodo lo trae) y el diagrama capturado
   * encajado en `embedBox`. Sin captura (bundle o `src` no disponibles), un
   * marco punteado con el rótulo.
   */
  #paintEmbed(g: SVGElement, n: FlowLayoutNode, ink: FlowInk): void {
    const source = this.#visibleSpec?.nodes.find((x) => x.id === n.id);
    const cap = source ? this.#captures.get(this.#embedKey(source)) : null;
    if (n.lines?.length && n.textBox) g.appendChild(insoftText(n.lines, n.textBox, ink));
    const eb = n.embedBox;
    if (!eb) return;
    if (cap) {
      g.appendChild(embedSvgElement(cap, eb));
      return;
    }
    g.appendChild(svgEl('rect', {
      x: eb.x, y: eb.y, width: eb.w, height: eb.h, rx: 3, fill: 'none', stroke: ink.muted,
      'stroke-width': 1, 'stroke-dasharray': '3 3', class: 'flow-node__embed-missing',
    }));
    if (!n.lines?.length) {
      const t = svgEl('text', {
        x: eb.x + eb.w / 2, y: eb.y + eb.h / 2 + 4, 'text-anchor': 'middle', fill: ink.muted,
        'font-size': '10', 'font-family': ink.font,
      });
      t.textContent = n.label;
      g.appendChild(t);
    }
  }

  /* ── hover ── */

  #onClick = (e: PointerEvent): void => {
    // Modo edición: doble click en nodo → editor inline.
    if (this.mode === 'edit') {
      const nodeEl = e.composedPath().find((x: EventTarget | null) => (x as HTMLElement | undefined)?.dataset?.nodeId);
      if (nodeEl && e.detail === 2) {
        e.preventDefault();
        const nodeId = (nodeEl as HTMLElement).dataset.nodeId;
        if (nodeId) {
          const entry = this.#nodeNodes.get(nodeId);
          if (entry) this.#openEditorForNode(entry.n);
        }
      }
      return;
    }
    if (this.isViewer) {
      const item = e.composedPath().find((x: EventTarget | null) => (x as HTMLElement | undefined)?.dataset?.groupId);
      if (item) {
        emitCancelable(this, 'iswc-toggle-group', { id: (item as HTMLElement).dataset.groupId });
      }
      return;
    }
    // El visor es opt-in: sin `open-on-click` el clic no hace nada y tampoco
    // se anuncia `iswc-open-viewer`, que prometeria una apertura que no ocurre.
    if (!this.hasAttribute('open-on-click')) return;
    const ev = new CustomEvent('iswc-open-viewer', {
      bubbles: true, composed: true, cancelable: true, detail: { payload: this.payload },
    });
    this.dispatchEvent(ev);
    if (!ev.defaultPrevented) this.openOwnViewer('flowchart');
  };

  /* ── edit mode: drag de nodos + editor inline ── */

  #installEditInteractions(): void {
    this.#dragDetach?.();
    this.#dragDetach = null;
    if (!this.#overrides) this.#overrides = { nodes: {}, edges: {} };
    for (const entry of this.#nodeNodes.values()) {
      const { g, n } = entry;
      g.style.cursor = 'grab';
      const nodeId = g.dataset.nodeId;
      if (!nodeId) continue;
      // Cast a HTMLElement: attachNodeDrag viene de `_shared/diagram-edit.js`
      // con tipos heredados `any`; la SVGGElement es estructuralmente válida.
      const detach = (attachNodeDrag as unknown as (
        el: HTMLElement,
        onMove: (dx: number, dy: number) => void,
        onEnd: () => void,
      ) => () => void)(
        g as unknown as HTMLElement,
        (dx: number, dy: number) => {
          // Preview: trasladamos el grupo en SVG coords. Como el viewBox
          // está en SVG coords (1:1 con layout interno), usamos dx/dy tal
          // cual. Si el SVG está escalado por CSS, la sensación es que el
          // cursor "arrastra" más rápido que el nodo — aceptable para
          // el primer piloto. Se recalculará en el snap final.
          entry.n.x += dx;
          entry.n.y += dy;
        },
        () => {
          const cur = entry.n;
          cur.x = snapToGrid(cur.x);
          cur.y = snapToGrid(cur.y);
          if (!this.#overrides!.nodes) this.#overrides!.nodes = {};
          this.#overrides!.nodes![cur.id] ??= {};
          this.#overrides!.nodes![cur.id].x = cur.x;
          this.#overrides!.nodes![cur.id].y = cur.y;
          saveOverrides(this, this.getAttribute('storage-key') ?? '', (this.#overrides ?? {}) as DiagramOverrides);
          emitLayoutChange(this, { nodeId: cur.id, x: cur.x, y: cur.y, overrides: this.#overrides });
          this.queueRender();
        },
      );
      this.#dragDetach = detach;
      // n referencia no usada en esta rama; solo tipa para evitar unused-var.
      void n;
    }
  }

  #openEditorForNode(node: FlowLayoutNode): void {
    const rect = this.getBoundingClientRect();
    // Cast: openInlineEditor viene de `_shared/diagram-edit.js` con tipos
    // heredados `any`. Pasamos nuestro objeto tipado.
    (openInlineEditor as unknown as (opts: {
      anchor: { x: number; y: number };
      initial: { label?: string; hue?: number };
      onSave: (v: { label: string; hue: number }) => void;
    }) => void)({
      anchor: { x: rect.left + node.x, y: rect.top + node.y - 36 },
      initial: { label: node.label, hue: node.hue },
      onSave: ({ label, hue }: { label: string; hue: number }) => {
        if (!this.#overrides) this.#overrides = { nodes: {}, edges: {} };
        if (!this.#overrides.nodes) this.#overrides.nodes = {};
        if (!this.#overrides.nodes[node.id]) this.#overrides.nodes[node.id] = {};
        if (label) this.#overrides.nodes[node.id].label = label;
        if (Number.isFinite(hue)) this.#overrides.nodes[node.id].hue = hue;
        saveOverrides(this, this.getAttribute('storage-key') ?? '', this.#overrides);
        emitLayoutChange(this, { nodeId: node.id, overrides: this.#overrides });
        this.queueRender();
      },
    });
  }

  #onMouseMove = (e: PointerEvent): void => {
    if (!this.isViewer) return;
    const g = e.composedPath().find((n: EventTarget | null) => (n as HTMLElement | undefined)?.dataset?.nodeId);
    const id: string | null = (g as HTMLElement | undefined)?.dataset.nodeId ?? null;
    if (id !== this.#hoverId) this.#applyHover(id);
    if (id) {
      const rect = this.wrap.getBoundingClientRect();
      const left = Math.max(8, Math.min(rect.width - 300, e.clientX - rect.left + 16));
      this.tooltipEl.style.left = `${left}px`;
      this.tooltipEl.style.top = `${e.clientY - rect.top + 22}px`;
    }
  };

  #onMouseLeave = (_e: MouseEvent): void => {
    if (!this.isViewer) return;
    this.#applyHover(null);
  };

  #applyHover(id: string | null): void {
    this.#hoverId = id;
    const entry = id ? this.#nodeNodes.get(id) : null;

    // Resalta el nodo y las aristas que lo tocan; atenúa el resto.
    for (const [nodeId, node] of this.#nodeNodes) {
      const active = nodeId === id;
      node.g.classList.toggle('iswc-active', active);
      node.g.classList.toggle('iswc-dim', !!id && !active);
      node.box.setAttribute('stroke-width', String(active ? 2.1 : 1.3));
    }
    for (const [, edge] of this.#edgeNodes) {
      const touches = !!id && (edge.e.from === id || edge.e.to === id);
      edge.g.classList.toggle('iswc-active', touches);
      edge.g.classList.toggle('iswc-dim', !!id && !touches);
    }

    this.#turtle?.setPaused(!!id);

    if (!entry) {
      this.tooltipEl.hidden = true;
      return;
    }
    const n = entry.n;
    this.tooltipEl.hidden = false;
    this.tooltipEl.innerHTML = '';
    const title = document.createElement('span');
    title.className = 'dg-tooltip__title';
    title.innerHTML = inlineMdWeb(n.label);
    this.tooltipEl.appendChild(title);
    if (n.description) {
      const desc = document.createElement('div');
      desc.className = 'dg-tooltip__desc';
      desc.innerHTML = inlineMdWeb(n.description);
      this.tooltipEl.appendChild(desc);
    }
  }
}

defineElement('iswc-flowchart', IswcFlowchart, 'IswcFlowchart');

registerDiagramKind('flowchart', 'iswc-flowchart');
registerDiagramKind('flow', 'iswc-flowchart');
registerDiagramKind('graph', 'iswc-flowchart');

export { IswcFlowchart };