import { adoptCss, defineElement, emit, emitCancelable } from '../../core/element.js';
import { DiagramElementBase } from '../_shared/diagram-element-base.js';
import { resolveQuadrantSpec, computeQuadrantLayout } from './quadrant-spec.js';
import { sequenceThemeDark, sequenceThemeLight } from './sequence-spec.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import { inlineMdWeb } from '../_shared/tk-inline-md.js';
import { registerDiagramKind } from './diagram-kinds.js';
import { svgEl } from '../_shared/svg-chart-engine.js';

/**
 * <is-quadrant-chart> — matriz 2×2 en SVG, sin Mermaid.
 *
 *   <is-quadrant-chart>
 *     <script type="application/json">
 *       { "quadrant": { "xAxis": { "left": "Bajo", "right": "Alto" }, "points": [...] } }
 *     </script>
 *   </is-quadrant-chart>
 *
 * Mismo esqueleto que <is-flowchart>: shadow DOM, slot JSON + MutationObserver,
 * tema por atributo `data-theme`, `color` (inline | viewer), lightbox propio.
 *
 * Atributos: color (inline | viewer), open-on-click
 * Propiedades: payload, spec, layout, hiddenGroups
 * Eventos: is-render, is-open-viewer, is-toggle-group
 */

class IsQuadrantChart extends DiagramElementBase {
  #hiddenGroups = new Set();
  #pointNodes = new Map();
  #hoverId = null;

  constructor() {
    super();
    this.initDiagramShadow('qd-svg', 'qd-tooltip');
    adoptCss(this.shadowRoot!, import.meta.url);
  }

  onDiagramConnected() {
    this.wrap.addEventListener('mousemove', this.#onMouseMove);
    this.wrap.addEventListener('mouseleave', this.#onMouseLeave);
    this.wrap.addEventListener('click', this.#onClick);
  }

  onDiagramDisconnected() {
    this.wrap.removeEventListener('mousemove', this.#onMouseMove);
    this.wrap.removeEventListener('mouseleave', this.#onMouseLeave);
    this.wrap.removeEventListener('click', this.#onClick);
  }

  onPayloadChanged() { this.#hiddenGroups = new Set(); }

  get hiddenGroups() { return this.#hiddenGroups; }
  set hiddenGroups(v) {
    this.#hiddenGroups = v instanceof Set ? v : new Set(v || []);
    this.queueRender();
  }

  renderDiagram() {
    const spec = resolveQuadrantSpec(this.payload ?? {});
    this.spec = spec;
    if (!spec) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }
    delete this.wrap.dataset.empty;

    // Ocultar un grupo quita sus puntos; los ejes y cuadrantes se mantienen
    // porque son el marco de lectura, no datos.
    const hidden = this.#hiddenGroups;
    const visible = hidden.size
      ? { ...spec, points: spec.points.filter((p) => !p.group || !hidden.has(p.group)) }
      : spec;
    if (!visible.points.length) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }

    const theme = this.isDarkTheme ? sequenceThemeDark() : sequenceThemeLight();
    this.syncThemeAttr();

    const layout = computeQuadrantLayout(visible);
    this.layout = layout;
    this.#buildSvg(layout, theme);
    this.wrap.classList.toggle('is-viewer', this.isViewer);
  }

  #buildSvg(layout, theme) {
    const { width: W, height: H } = layout;
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.setAttribute('aria-label', layout.title || 'Matriz de cuadrantes');
    this.svg.style.cssText = 'width:100%;height:100%;max-width:none;display:block;margin:0 auto';
    this.svg.innerHTML = '';
    this.#pointNodes.clear();
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

    this.#buildFrame(layout, theme);
    if (layout.groups?.length) this.#buildLegend(layout, theme);
    this.#buildPoints(layout, theme);

    emit(this, 'is-render', { layout, svg: this.svg });
  }

  #buildFrame(layout, theme) {
    const { plot, axes } = layout;
    const g = svgEl('g', { class: 'qd-frame' });

    // Fondo tenue alterno: los cuadrantes se distinguen sin necesidad de color.
    const half = { w: plot.w / 2, h: plot.h / 2 };
    for (const [qx, qy] of [[0, 0], [1, 1]]) {
      g.appendChild(svgEl('rect', {
        x: plot.x + qx * half.w, y: plot.y + qy * half.h, width: half.w, height: half.h,
        fill: theme.altFill, class: 'qd-frame__cell',
      }));
    }

    g.appendChild(svgEl('rect', {
      x: plot.x, y: plot.y, width: plot.w, height: plot.h, rx: 6,
      fill: 'none', stroke: theme.border, 'stroke-width': 1, class: 'qd-frame__box',
    }));
    g.appendChild(svgEl('line', {
      x1: axes.midX, y1: plot.y, x2: axes.midX, y2: plot.y + plot.h,
      stroke: theme.grid, 'stroke-width': 1, class: 'qd-frame__axis',
    }));
    g.appendChild(svgEl('line', {
      x1: plot.x, y1: axes.midY, x2: plot.x + plot.w, y2: axes.midY,
      stroke: theme.grid, 'stroke-width': 1, class: 'qd-frame__axis',
    }));

    for (const quad of layout.quadrants) {
      const t = svgEl('text', {
        x: quad.cx, y: quad.cy, 'text-anchor': 'middle', fill: theme.muted,
        'font-size': '10', 'font-weight': '600', 'letter-spacing': '0.04em',
        'font-family': 'Tahoma,Arial,sans-serif', class: 'qd-quadrant',
      });
      t.textContent = quad.name.toUpperCase();
      g.appendChild(t);
    }

    const axisText = (spec, anchor, rotate) => {
      if (!spec) return;
      const t = svgEl('text', {
        x: spec.x, y: spec.y, 'text-anchor': anchor, fill: theme.muted,
        'font-size': '10', 'font-family': 'Tahoma,Arial,sans-serif',
        transform: rotate ? `rotate(-90 ${spec.x} ${spec.y})` : null,
        class: 'qd-axis-label',
      });
      t.textContent = spec.text;
      g.appendChild(t);
    };
    axisText(layout.axes.xLeft, 'start', false);
    axisText(layout.axes.xRight, 'end', false);
    axisText(layout.axes.yBottom, 'start', true);
    axisText(layout.axes.yTop, 'end', true);

    this.svg.appendChild(g);
  }

  #buildLegend(layout, theme) {
    const g = svgEl('g', { class: 'qd-legend' });
    layout.groups.forEach((grp, gi: number) => {
      const ly = layout.plot.y + 10 + gi * 16;
      const color = tkHueToHex(grp.hue) ?? theme.accent;
      const off = this.#hiddenGroups.has(grp.id);
      const item = svgEl('g', { class: 'qd-legend__item', opacity: off ? 0.4 : 1 });
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

  #buildPoints(layout, theme) {
    const groupHue = new Map((layout.groups ?? []).map((grp) => [grp.id, grp.hue]));
    for (const pt of layout.points) {
      const hue = pt.hue ?? (pt.group ? groupHue.get(pt.group) : undefined);
      const color = (hue != null && tkHueToHex(hue)) || theme.accent;
      const g = svgEl('g', { class: 'qd-point' });
      g.dataset.pointId = pt.id;
      if (this.isViewer) g.style.cursor = 'pointer';

      g.appendChild(svgEl('circle', {
        cx: pt.cx, cy: pt.cy, r: pt.r, fill: color, stroke: theme.chipFill, 'stroke-width': 1.2,
        class: 'qd-point__dot',
      }));
      const t = svgEl('text', {
        x: pt.cx + pt.r + 5, y: pt.cy + 3.5 + pt.labelDy, fill: theme.text,
        'font-size': '10', 'font-weight': '600', 'font-family': 'Tahoma,Arial,sans-serif',
        class: 'qd-point__label',
      });
      t.innerHTML = inlineMdWeb(pt.label);
      g.appendChild(t);

      this.svg.appendChild(g);
      this.#pointNodes.set(pt.id, { pt, g });
    }
  }

  /* ── interacción ── */

  #onClick = (e: PointerEvent) => {
    if (this.isViewer) {
      const item = e.composedPath().find((x) => x?.dataset?.groupId);
      if (item) emitCancelable(this, 'is-toggle-group', { id: item.dataset.groupId });
      return;
    }
    // El visor es opt-in: sin `open-on-click` el clic no hace nada y tampoco
    // se anuncia `is-open-viewer`, que prometeria una apertura que no ocurre.
    if (!this.hasAttribute('open-on-click')) return;
    const ev = new CustomEvent('is-open-viewer', {
      bubbles: true, composed: true, cancelable: true, detail: { payload: this.payload },
    });
    this.dispatchEvent(ev);
    if (!ev.defaultPrevented) this.openOwnViewer('quadrant');
  };

  #onMouseMove = (e: PointerEvent) => {
    if (!this.isViewer) return;
    const g = e.composedPath().find((n) => n?.dataset?.pointId);
    const id = g?.dataset.pointId ?? null;
    if (id !== this.#hoverId) this.#applyHover(id);
    if (id) {
      const rect = this.wrap.getBoundingClientRect();
      const left = Math.max(8, Math.min(rect.width - 300, e.clientX - rect.left + 16));
      this.tooltipEl.style.left = `${left}px`;
      this.tooltipEl.style.top = `${e.clientY - rect.top + 22}px`;
    }
  };

  #onMouseLeave = () => {
    if (!this.isViewer) return;
    this.#applyHover(null);
  };

  #applyHover(id) {
    this.#hoverId = id;
    const entry = id ? this.#pointNodes.get(id) : null;

    for (const [pointId, node] of this.#pointNodes) {
      const active = pointId === id;
      node.g.classList.toggle('is-active', active);
      node.g.classList.toggle('is-dim', !!id && !active);
    }

    if (!entry) {
      this.tooltipEl.hidden = true;
      return;
    }
    const pt = entry.pt;
    this.tooltipEl.hidden = false;
    this.tooltipEl.innerHTML = '';
    const title = document.createElement('span');
    title.className = 'dg-tooltip__title';
    title.innerHTML = inlineMdWeb(pt.label);
    this.tooltipEl.appendChild(title);
    const desc = document.createElement('div');
    desc.className = 'dg-tooltip__desc';
    const coords = `x ${pt.x.toFixed(2)} · y ${pt.y.toFixed(2)}`;
    desc.innerHTML = pt.description ? `${inlineMdWeb(pt.description)} · ${coords}` : coords;
    this.tooltipEl.appendChild(desc);
  }
}

defineElement('is-quadrant-chart', IsQuadrantChart, 'IsQuadrantChart');

registerDiagramKind('quadrant', 'is-quadrant-chart');

export { IsQuadrantChart };
