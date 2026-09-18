import { adoptCss, defineElement, emit, emitCancelable } from '../../core/element.js';
import { DiagramElementBase } from '../_shared/diagram-element-base.js';
import { resolveStateSpec, computeStateLayout } from './state-spec.js';
import type {
  StateLayout,
  StateLayoutNode,
  StateLayoutTransition,
  StateResolvedSpec,
  StateSpec,
} from './state-spec.js';
import { sequenceThemeDark, sequenceThemeLight } from './sequence-spec.js';
import { SequenceTurtle } from './sequence-turtle.js';
import type { PathTurtle, TurtleTheme } from '../_shared/path-turtle.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import { edgeStrokeHex, edgeChipFill, edgeChipText } from '../_shared/diagram-edge-style.js';
import type { DiagramTheme } from './diagram-types.js';
import { inlineMdWeb } from '../_shared/tk-inline-md.js';
import { wrapText, buildTspans } from '../_shared/diagram-text-wrap.js';
import type { TSpanSpec } from '../_shared/diagram-text-wrap.js';
import { registerDiagramKind } from './diagram-kinds.js';
import { svgEl } from '../_shared/svg-chart-engine.js';
import { svgArrowHead } from '../_shared/diagram-arrow.js';

/**
 * <is-state-diagram> — diagrama de estados en SVG, sin Mermaid.
 *
 * Configuración por JSON, igual que <is-flowchart>:
 *
 *   <is-state-diagram>
 *     <script type="application/json">
 *       { "stateDiagram": { "direction": "TB", "states": [...], "transitions": [...] } }
 *     </script>
 *   </is-state-diagram>
 *
 * Atributos: color (inline | viewer), open-on-click
 * Propiedades: payload, spec, layout, turtle, hiddenGroups
 * Eventos: is-render, is-turtle-state, is-open-viewer, is-toggle-group
 */

/** Estado del callback `onState` del motor de tortuga (path-turtle). */
interface TurtleState {
  playing: boolean;
  idx: number;
  total: number;
  replay: number;
}

/** Nodo cacheado en el SVG para aplicar hover sin reconstruir el DOM. */
interface NodeNodeEntry {
  n: StateLayoutNode;
  g: SVGGElement;
}

/** Transición cacheada en el SVG para aplicar hover sin reconstruir el DOM. */
interface EdgeNodeEntry {
  e: StateLayoutTransition;
  g: SVGGElement;
}

/** Contorno SVG de un estado según su tipo. x/y = esquina superior izquierda. */
function statePath(kind: string, x: number, y: number, w: number, h: number): string {
  const r = 8;
  const cx = x + w / 2;
  const cy = y + h / 2;
  if (kind === 'choice') {
    return `M${cx},${y} L${x + w},${cy} L${cx},${y + h} L${x},${cy} Z`;
  }
  if (kind === 'start' || kind === 'end') {
    const rad = Math.min(w, h) / 2;
    return `M${cx - rad},${cy} a${rad},${rad} 0 1 0 ${rad * 2},0 a${rad},${rad} 0 1 0 ${-rad * 2},0 Z`;
  }
  return `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`;
}

class IsStateDiagram extends DiagramElementBase {
  #theme: DiagramTheme | null = null;
  #turtle: PathTurtle | null = null;
  #hiddenGroups: Set<string> = new Set<string>();
  #nodeNodes: Map<string, NodeNodeEntry> = new Map();
  #edgeNodes: Map<string, EdgeNodeEntry> = new Map();
  #hoverId: string | null = null;

  constructor() {
    super();
    this.initDiagramShadow('st-svg', 'st-tooltip');
    adoptCss(this.shadowRoot!, import.meta.url);
  }

  onDiagramConnected(): void {
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

  get turtle(): PathTurtle | null { return this.#turtle; }
  get hiddenGroups(): Set<string> { return this.#hiddenGroups; }
  set hiddenGroups(v: Set<string> | Iterable<string> | null | undefined) {
    this.#hiddenGroups = v instanceof Set ? v : new Set(v ?? []);
    this.queueRender();
  }

  renderDiagram(): void {
    const spec: StateResolvedSpec | null = resolveStateSpec(this.payload ?? {});
    this.spec = spec;
    if (!spec) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }
    delete this.wrap.dataset.empty;

    // Ocultar un grupo quita sus estados y las transiciones que los tocan.
    const hidden = this.#hiddenGroups;
    let visible: StateResolvedSpec = spec;
    if (hidden.size) {
      const states: StateSpec[] = spec.states.filter((s) => !s.group || !hidden.has(s.group));
      const keep = new Set(states.map((s) => s.id));
      visible = { ...spec, states, transitions: spec.transitions.filter((t) => keep.has(t.from) && keep.has(t.to)) };
    }
    if (!visible.states.length) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }

    const dark = this.isDarkTheme;
    const theme: DiagramTheme = dark ? sequenceThemeDark() : sequenceThemeLight();
    this.#theme = theme;
    this.syncThemeAttr();

    const layout: StateLayout = computeStateLayout(visible);
    this.layout = layout;
    this.#buildSvg(layout, theme);
    this.wrap.classList.toggle('is-viewer', this.isViewer);
  }

  #buildSvg(layout: StateLayout, theme: DiagramTheme): void {
    const { width: W, height: H } = layout;
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.setAttribute('aria-label', layout.title || 'Diagrama de estados');
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
    // La tortuga recorre las transiciones en orden; reutiliza el motor de secuencia.
    this.#turtle.setData({
      messages: layout.edges.map((e, i: number) => ({
        path: e.path, step: i + 1, log: e.label || '', groupHue: e.hue,
      })),
      theme: theme as unknown as TurtleTheme,
      viewW: W,
      viewH: H,
      autoLoop: this.isViewer,
      onState: (state: TurtleState) => emit(this, 'is-turtle-state', state),
    });

    emit(this, 'is-render', { layout, svg: this.svg });
  }

  #buildLegend(layout: StateLayout, theme: DiagramTheme): void {
    const g = svgEl('g', { class: 'st-legend' });
    const groups = layout.groups ?? [];
    groups.forEach((grp, gi: number) => {
      const ly = (layout.subtitleY || layout.titleY || 22) + 18 + gi * 16;
      const color = tkHueToHex(grp.hue) ?? theme.accent;
      const off = this.#hiddenGroups.has(grp.id);
      const item = svgEl('g', { class: 'st-legend__item', opacity: off ? 0.4 : 1 });
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

  #buildEdges(layout: StateLayout, theme: DiagramTheme): void {
    for (const e of layout.edges) {
      const color = edgeStrokeHex(e.hue, theme.accent);
      const g = svgEl('g', { class: 'st-trans' });
      g.dataset.edgeId = e.id;

      const path = svgEl('path', {
        d: e.path, fill: 'none', stroke: color, 'stroke-width': 1.3,
        'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        class: 'st-trans__path',
      });
      g.appendChild(path);

      // Punta orientada por el último tramo REAL del path.
      // `svgArrowHead` está tipado en `_shared/diagram-arrow.js` con campos
      // `any` (firma heredada); casteamos para pasar nuestro objeto tipado.
      // `className` infiere `null | undefined`; añadimos la clase al resultado.
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
      head.classList.add('st-trans__head');
      g.appendChild(head);

      if (e.label) {
        const pad = 4;
        // `labelW` no está declarado en StateLayoutTransition; el spec lo añade
        // opcionalmente. Cast para preservar el comportamiento runtime.
        const w = (e as { labelW?: number }).labelW ?? (e.label.length * 5.6 + pad * 2);
        g.appendChild(svgEl('rect', {
          x: e.labelX - w / 2, y: e.labelY - 8, width: w, height: 16, rx: 4,
          fill: edgeChipFill(e.hue), class: 'st-trans__chip',
        }));
        const t = svgEl('text', {
          x: e.labelX, y: e.labelY + 3.5, 'text-anchor': 'middle', fill: edgeChipText(e.hue, theme.muted),
          'font-size': '10', 'font-family': 'Consolas,Menlo,monospace',
        });
        t.textContent = e.label;
        g.appendChild(t);
      }

      this.svg.appendChild(g);
      this.#edgeNodes.set(e.id, { e, g: g as SVGGElement });
    }
  }

  #buildNodes(layout: StateLayout, theme: DiagramTheme): void {
    for (const n of layout.nodes) {
      const color = (n.hue != null && tkHueToHex(n.hue)) || theme.accent;
      const g = svgEl('g', { class: 'st-node' });
      g.dataset.nodeId = n.id;
      if (this.isViewer) g.style.cursor = 'pointer';

      if (n.kind === 'start') {
        g.appendChild(svgEl('path', {
          d: statePath('start', n.x, n.y, n.w, n.h), fill: theme.text, stroke: 'none', class: 'st-node__box',
        }));
      } else if (n.kind === 'end') {
        g.appendChild(svgEl('circle', {
          cx: n.x + n.w / 2, cy: n.y + n.h / 2, r: n.w / 2 - 1, fill: 'none',
          stroke: theme.text, 'stroke-width': 1.4, class: 'st-node__box',
        }));
        g.appendChild(svgEl('circle', {
          cx: n.x + n.w / 2, cy: n.y + n.h / 2, r: n.w / 2 - 6, fill: theme.text,
        }));
      } else {
        const box = svgEl('path', {
          d: statePath(n.kind, n.x, n.y, n.w, n.h),
          fill: theme.chipFill, stroke: color, 'stroke-width': 1.3, 'stroke-linejoin': 'round',
          class: 'st-node__box',
        });
        g.appendChild(box);

        const t = svgEl('text', {
          fill: theme.text, 'font-size': '11', 'font-weight': '600',
          'font-family': 'Tahoma,Arial,sans-serif',
        });
        const stHasMd = /[*`\[]/.test(n.label) || n.label.includes('{{');
        if (stHasMd) {
          t.setAttribute('x', String(n.x + n.w / 2));
          t.setAttribute('y', String(n.y + n.h / 2 + 4));
          t.setAttribute('text-anchor', 'middle');
          t.innerHTML = inlineMdWeb(n.label);
        } else {
          // `overflow` no está declarado en StateLayoutNode; el spec lo añade
          // opcionalmente en runtime. Cast para preservar el comportamiento.
          const rawOverflow = (n as { overflow?: string }).overflow;
          const overflow: 'grow' | 'ellipsis' =
            (rawOverflow === 'grow' || rawOverflow === 'ellipsis') ? rawOverflow : 'grow';
          const stresult = wrapText({
            text: n.label,
            maxWidth: Math.max(n.w - 12, 8),
            maxHeight: n.h - 4,
            fontSize: 11,
            fontFamily: 'Tahoma,Arial,sans-serif',
            overflow,
          });
          const sttspans: TSpanSpec[] = buildTspans(
            stresult.lines,
            n.x, n.y, n.w, n.h,
            'middle', 11, 1.2,
          );
          for (const span of sttspans) {
            const ts = svgEl('tspan', {
              x: span.x, y: span.y,
              ...(span.dy != null ? { dy: span.dy } : {}),
            });
            ts.textContent = span.text;
            t.appendChild(ts);
          }
        }
        g.appendChild(t);
      }

      this.svg.appendChild(g);
      this.#nodeNodes.set(n.id, { n, g: g as SVGGElement });
    }
  }

  /* ── hover ── */

  #onClick = (e: PointerEvent): void => {
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
    if (!ev.defaultPrevented) this.openOwnViewer('state');
  };

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

    // Resalta el estado y las transiciones que lo tocan; atenúa el resto.
    for (const [nodeId, node] of this.#nodeNodes) {
      const active = nodeId === id;
      node.g.classList.toggle('is-active', active);
      node.g.classList.toggle('is-dim', !!id && !active);
    }
    for (const [, edge] of this.#edgeNodes) {
      const touches = !!id && (edge.e.from === id || edge.e.to === id);
      edge.g.classList.toggle('is-active', touches);
      edge.g.classList.toggle('is-dim', !!id && !touches);
    }

    this.#turtle?.setPaused(!!id);

    if (!entry || (!entry.n.label && !entry.n.description)) {
      this.tooltipEl.hidden = true;
      return;
    }
    const n = entry.n;
    this.tooltipEl.hidden = false;
    this.tooltipEl.innerHTML = '';
    if (n.label) {
      const title = document.createElement('span');
      title.className = 'dg-tooltip__title';
      title.innerHTML = inlineMdWeb(n.label);
      this.tooltipEl.appendChild(title);
    }
    if (n.description) {
      const desc = document.createElement('div');
      desc.className = 'dg-tooltip__desc';
      desc.innerHTML = inlineMdWeb(n.description);
      this.tooltipEl.appendChild(desc);
    }
  }
}

defineElement('is-state-diagram', IsStateDiagram, 'IsStateDiagram');

registerDiagramKind('state', 'is-state-diagram');
registerDiagramKind('stateDiagram', 'is-state-diagram');

export { IsStateDiagram };