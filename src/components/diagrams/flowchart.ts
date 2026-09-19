import { adoptCss, defineElement, emit, emitCancelable } from '../../core/element.js';
import { DiagramElementBase } from '../_shared/diagram-element-base.js';
import { resolveFlowchartSpec, computeFlowchartLayout, shapePath } from './flowchart-spec.js';
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
import { edgeStrokeHex, edgeChipFill, edgeChipText } from '../_shared/diagram-edge-style.js';
import type { DiagramTheme } from './diagram-types.js';
import { inlineMdWeb } from '../_shared/tk-inline-md.js';
import { svgIconGroup } from '../_shared/tk-icon-inline.js';
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
/**
 * <is-flowchart> — diagrama de flujo en SVG, sin Mermaid.
 *
 * Configuración por JSON, igual que <is-sequence-diagram>:
 *
 *   <is-flowchart>
 *     <script type="application/json">
 *       { "flowchart": { "direction": "TB", "nodes": [...], "edges": [...] } }
 *     </script>
 *   </is-flowchart>
 *
 * Atributos: color (inline | viewer), open-on-click,
 *   mode (read | edit), persist (none | session | local — leído por
 *   `_shared/diagram-edit.js` al cargar/guardar overrides), storage-key,
 *   animation (tokens separados por espacio; default off).
 *   Token actual: `flow` — arista dashed brand animada detrás de la continua.
 * Propiedades: payload, spec, layout, turtle, hiddenGroups, animation
 * Eventos: is-render, is-turtle-state, is-open-viewer, is-toggle-group
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Tokens de `animation` conocidos (otros se ignoran para no romper). */
const VALID_ANIMATION: Set<string> = new Set(['flow']);

/** Estado del callback `onState` del motor de tortuga (path-turtle). */
interface TurtleState {
  playing: boolean;
  idx: number;
  total: number;
  replay: number;
}

/** Nodo cacheado en el SVG para aplicar hover sin reconstruir el DOM. */
interface NodeNodeEntry {
  n: FlowLayoutNode;
  g: SVGGElement;
  box: SVGPathElement;
}

/** Arista cacheada en el SVG para aplicar hover sin reconstruir el DOM. */
interface EdgeNodeEntry {
  e: FlowLayoutEdge;
  g: SVGGElement;
  path: SVGPathElement;
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

class IsFlowchart extends DiagramElementBase {
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
    const theme: DiagramTheme = dark ? sequenceThemeDark() : sequenceThemeLight();
    this.#theme = theme;
    this.syncThemeAttr();

    const layout: FlowLayout = computeFlowchartLayout(visible, this.#overrides);
    this.layout = layout;
    this.#buildSvg(layout, theme);
    this.wrap.classList.toggle('is-viewer', this.isViewer);
    this.wrap.classList.toggle('is-editable', this.mode === 'edit');
    if (this.mode === 'edit') this.#installEditInteractions();
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
        'font-size': '13', 'font-weight': '600', 'font-family': 'Tahoma,Arial,sans-serif',
      });
      t.textContent = layout.title;
      this.svg.appendChild(t);
    }
    if (layout.subtitle) {
      const t = svgEl('text', {
        x: W / 2, y: layout.subtitleY, 'text-anchor': 'middle', fill: theme.muted,
        'font-size': '11', 'font-family': 'Tahoma,Arial,sans-serif',
      });
      t.textContent = layout.subtitle;
      this.svg.appendChild(t);
    }

    if (layout.groups?.length) this.#buildLegend(layout, theme);
    this.#buildEdges(layout, theme);
    this.#buildNodes(layout, theme);

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
      onState: (state: TurtleState) => emit(this, 'is-turtle-state', state),
    });

    emit(this, 'is-render', { layout, svg: this.svg });
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
    for (const e of layout.edges) {
      const color = edgeStrokeHex(e.hue, theme.accent);
      const g = svgEl('g', { class: 'flow-edge' });
      g.dataset.edgeId = e.id;

      const dash = e.kind === 'dashed' ? '6 4' : null;
      const wdt = e.kind === 'thick' ? 2.4 : 1.3;

      // Capa de flujo (opcional): dashed brand detrás de la arista continua.
      if (flowAnim && e.kind !== 'dashed') {
        g.appendChild(svgEl('path', {
          d: e.path,
          fill: 'none',
          'stroke-width': Math.max(wdt + 1.4, 2.6),
          'stroke-linejoin': 'round',
          'stroke-linecap': 'round',
          class: 'flow-edge__flow',
        }));
      }

      const path = svgEl('path', {
        d: e.path, fill: 'none', stroke: color, 'stroke-width': wdt,
        'stroke-dasharray': dash, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        class: 'flow-edge__path',
      });
      g.appendChild(path);

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

      const box = svgEl('path', {
        d: shapePath(n.shape, n.x, n.y, n.w, n.h),
        fill: theme.chipFill,
        stroke: color,
        'stroke-width': 1.3,
        'stroke-linejoin': 'round',
        class: 'flow-node__box',
      });
      g.appendChild(box);

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
        emitCancelable(this, 'is-toggle-group', { id: (item as HTMLElement).dataset.groupId });
      }
      return;
    }
    // El visor es opt-in: sin `open-on-click` el clic no hace nada y tampoco
    // se anuncia `is-open-viewer`, que prometeria una apertura que no ocurre.
    if (!this.hasAttribute('open-on-click')) return;
    const ev = new CustomEvent('is-open-viewer', {
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
      node.g.classList.toggle('is-active', active);
      node.g.classList.toggle('is-dim', !!id && !active);
      node.box.setAttribute('stroke-width', String(active ? 2.1 : 1.3));
    }
    for (const [, edge] of this.#edgeNodes) {
      const touches = !!id && (edge.e.from === id || edge.e.to === id);
      edge.g.classList.toggle('is-active', touches);
      edge.g.classList.toggle('is-dim', !!id && !touches);
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

defineElement('is-flowchart', IsFlowchart, 'IsFlowchart');

registerDiagramKind('flowchart', 'is-flowchart');
registerDiagramKind('flow', 'is-flowchart');
registerDiagramKind('graph', 'is-flowchart');

export { IsFlowchart };