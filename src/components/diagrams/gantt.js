import { adoptCss } from '../_shared/adopt-css.js';
import { DiagramElementBase } from '../_shared/diagram-element-base.js';
import { resolveGanttSpec, computeGanttLayout } from './gantt-spec.js';
import { shapePath } from './flowchart-spec.js';
import { sequenceThemeDark, sequenceThemeLight } from './sequence-spec.js';
import { PathTurtle } from '../_shared/path-turtle.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import { inlineMdWeb } from '../_shared/tk-inline-md.js';
import { registerDiagramKind } from './diagram-kinds.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { svgEl } from '../_shared/svg-chart-engine.js';
import { svgArrowHead } from '../_shared/diagram-arrow.js';

/**
 * <is-gantt> — diagrama de Gantt en SVG, sin Mermaid.
 *
 *   <is-gantt>
 *     <script type="application/json">
 *       { "gantt": { "title": "...", "groups": [...], "tasks": [...] } }
 *     </script>
 *   </is-gantt>
 *
 * Una fila por tarea (orden de declaración, sin empaquetar). Las flechas
 * `after:` se rutean con A* sobre la rejilla de costos, igual que las
 * aristas de flowchart.
 *
 * Atributos: color (inline | viewer), open-on-click
 * Propiedades: payload, spec, layout, turtle, hiddenGroups
 * Eventos: is-render, is-turtle-state, is-open-viewer, is-toggle-group
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

class IsGantt extends DiagramElementBase {
  #turtle = null;
  #hiddenGroups = new Set();
  #rowNodes = new Map();
  #arrowNodes = new Map();
  #hoverId = null;

  constructor() {
    super();
    this.initDiagramShadow('gantt-svg', 'gantt-tooltip');
    adoptCss(this.shadowRoot, import.meta.url);
  }

  onDiagramConnected() {
    this.wrap.addEventListener('mousemove', this.#onMouseMove);
    this.wrap.addEventListener('mouseleave', this.#onMouseLeave);
    this.wrap.addEventListener('click', this.#onClick);
  }

  onDiagramDisconnected() {
    this.#turtle?.destroy();
    this.#turtle = null;
    this.wrap.removeEventListener('mousemove', this.#onMouseMove);
    this.wrap.removeEventListener('mouseleave', this.#onMouseLeave);
    this.wrap.removeEventListener('click', this.#onClick);
  }

  onPayloadChanged() { this.#hiddenGroups = new Set(); }

  get turtle() { return this.#turtle; }
  get hiddenGroups() { return this.#hiddenGroups; }
  set hiddenGroups(v) {
    this.#hiddenGroups = v instanceof Set ? v : new Set(v || []);
    this.queueRender();
  }

  renderDiagram() {
    const spec = resolveGanttSpec(this.payload ?? {});
    this.spec = spec;
    if (!spec) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }
    delete this.wrap.dataset.empty;

    const hidden = this.#hiddenGroups;
    let visible = spec;
    if (hidden.size) {
      const tasks = spec.tasks.filter((t) => !t.group || !hidden.has(t.group));
      visible = { ...spec, tasks };
    }
    if (!visible.tasks.length) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }

    const dark = this.isDarkTheme;
    const theme = dark ? sequenceThemeDark() : sequenceThemeLight();
    this.syncThemeAttr();

    // `Date.now()` se llama solo aquí (en el componente), nunca dentro del
    // módulo de spec puro, para que el layout siga siendo determinista.
    const layout = computeGanttLayout(visible, { now: Date.now() });
    this.layout = layout;
    this.#buildSvg(layout, theme);
    this.wrap.classList.toggle('is-viewer', this.isViewer);
  }

  #buildSvg(layout, theme) {
    const { width: W, height: H } = layout;
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.setAttribute('aria-label', layout.title || 'Diagrama de Gantt');
    this.svg.style.cssText = 'width:100%;height:100%;max-width:none;display:block;margin:0 auto';
    this.svg.innerHTML = '';
    this.#rowNodes.clear();
    this.#arrowNodes.clear();
    this.#hoverId = null;

    if (layout.title) {
      const t = svgEl('text', {
        x: 16, y: layout.titleY, fill: theme.text,
        'font-size': '13', 'font-weight': '600', 'font-family': 'Tahoma,Arial,sans-serif',
      });
      t.textContent = layout.title;
      this.svg.appendChild(t);
    }

    if (layout.groups?.length) this.#buildLegend(layout, theme);
    this.#buildGrid(layout, theme);
    this.#buildRows(layout, theme);
    this.#buildArrows(layout, theme);
    if (layout.todayX != null) this.#buildToday(layout, theme);

    const turtleGroup = svgEl('g');
    this.svg.appendChild(turtleGroup);
    this.#turtle?.destroy();
    this.#turtle = new PathTurtle(turtleGroup);
    this.#turtle.setData({
      messages: layout.arrows.map((a, i) => ({
        path: a.path, step: i + 1, log: '', groupHue: a.hue,
      })),
      theme,
      viewW: W,
      viewH: H,
      autoLoop: this.isViewer,
      onState: (state) => emit(this, 'is-turtle-state', state),
    });

    emit(this, 'is-render', { layout, svg: this.svg });
  }

  #buildGrid(layout, theme) {
    const g = svgEl('g', { class: 'gantt-grid' });
    // Divisor entre la columna de etiquetas y el área de tiempo.
    g.appendChild(svgEl('line', {
      x1: layout.gutterX, x2: layout.gutterX, y1: layout.rowsTop - 6, y2: layout.rowsBottom + 6,
      stroke: theme.border, class: 'dg-grid-line',
    }));
    for (const tk of layout.ticks) {
      g.appendChild(svgEl('line', {
        x1: tk.x, x2: tk.x, y1: layout.rowsTop - 4, y2: layout.rowsBottom + 4,
        stroke: theme.grid, 'stroke-width': tk.major ? 1.4 : 1, class: 'dg-grid-line',
        opacity: tk.major ? 0.85 : 0.45,
      }));
      const label = svgEl('text', {
        x: tk.x, y: layout.rowsTop - 10, 'text-anchor': 'middle', fill: theme.muted,
        'font-size': '9.5', 'font-family': 'Tahoma,Arial,sans-serif',
      });
      label.textContent = tk.label;
      g.appendChild(label);
    }
    this.svg.appendChild(g);
  }

  #buildRows(layout, theme) {
    for (const r of layout.rows) {
      const color = (r.hue != null && tkHueToHex(r.hue)) || theme.accent;
      const g = svgEl('g', { class: 'gantt-row' });
      g.dataset.rowId = r.id;
      if (this.isViewer) g.style.cursor = 'pointer';

      if (r.milestone) {
        const box = svgEl('path', {
          d: shapePath('diamond', r.x, r.cy - r.size / 2, r.size, r.size),
          fill: color, stroke: theme.panel, 'stroke-width': 1,
          class: 'gantt-row__milestone',
        });
        g.appendChild(box);
      } else {
        const box = svgEl('rect', {
          x: r.x, y: r.y + 4, width: r.w, height: r.h - 8, rx: 6,
          fill: color, opacity: 0.32, stroke: color, 'stroke-width': 1.2,
          class: 'gantt-row__bar',
        });
        g.appendChild(box);
        if (Number.isFinite(r.progress) && r.progress > 0) {
          const pw = Math.max(0, Math.min(r.w, (r.w * r.progress) / 100));
          g.appendChild(svgEl('rect', {
            x: r.x, y: r.y + 4, width: pw, height: r.h - 8, rx: 6,
            fill: color, class: 'gantt-row__progress',
          }));
        }
      }

      const label = svgEl('text', {
        x: 16, y: r.y + r.h / 2 + 4, fill: theme.text,
        'font-size': '11', 'font-family': 'Tahoma,Arial,sans-serif',
      });
      label.textContent = r.label;
      g.appendChild(label);

      this.svg.appendChild(g);
      this.#rowNodes.set(r.id, { r, g });
    }
  }

  #buildArrows(layout, theme) {
    for (const a of layout.arrows) {
      const color = (a.hue != null && tkHueToHex(a.hue)) || theme.accent;
      const g = svgEl('g', { class: 'gantt-arrow' });
      g.dataset.arrowId = a.id;
      const path = svgEl('path', {
        d: a.path, fill: 'none', stroke: color, 'stroke-width': 1.3,
        'stroke-linejoin': 'round', 'stroke-linecap': 'round', class: 'gantt-arrow__path',
      });
      g.appendChild(path);
      // Orientación tomada del último tramo REAL: el ángulo fijo del layout
      // (90°) daba puntas de lado cuando el router llegaba en horizontal.
      g.appendChild(svgArrowHead({
        d: a.path,
        tip: { x: a.arrowTipX, y: a.arrowTipY },
        color,
        len: 8,
        halfWidth: 4,
        className: 'gantt-arrow__head',
      }));
      this.svg.appendChild(g);
      this.#arrowNodes.set(a.id, { a, g });
    }
  }

  #buildToday(layout, theme) {
    const g = svgEl('g', { class: 'gantt-today' });
    g.appendChild(svgEl('line', {
      x1: layout.todayX, x2: layout.todayX, y1: layout.rowsTop - 8, y2: layout.rowsBottom + 8,
      stroke: theme.accent, 'stroke-width': 1.4, 'stroke-dasharray': '4 3',
    }));
    const t = svgEl('text', {
      x: layout.todayX, y: layout.rowsTop - 12, 'text-anchor': 'middle', fill: theme.accent,
      'font-size': '9', 'font-weight': '600', 'font-family': 'Tahoma,Arial,sans-serif',
    });
    t.textContent = 'hoy';
    g.appendChild(t);
    this.svg.appendChild(g);
  }

  #buildLegend(layout, theme) {
    const g = svgEl('g', { class: 'gantt-legend' });
    layout.groups.forEach((grp, gi) => {
      // Título a la izquierda: la leyenda queda arriba a la derecha (y=18).
      const ly = 18 + gi * 16;
      const color = tkHueToHex(grp.hue) ?? theme.accent;
      const off = this.#hiddenGroups.has(grp.id);
      const item = svgEl('g', { class: 'gantt-legend__item', opacity: off ? 0.4 : 1 });
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

  /* ── hover / click ── */

  #onClick = (e) => {
    if (this.isViewer) {
      const item = e.composedPath().find((x) => x?.dataset?.groupId);
      if (item) {
        emit(this, 'is-toggle-group', { id: item.dataset.groupId });
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
    if (!ev.defaultPrevented) this.openOwnViewer('gantt');
  };

  #onMouseMove = (e) => {
    if (!this.isViewer) return;
    const g = e.composedPath().find((n) => n?.dataset?.rowId);
    const id = g?.dataset.rowId ?? null;
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
    const entry = id ? this.#rowNodes.get(id) : null;

    for (const [rowId, node] of this.#rowNodes) {
      const active = rowId === id;
      node.g.classList.toggle('is-active', active);
      node.g.classList.toggle('is-dim', !!id && !active);
    }
    for (const [, arrow] of this.#arrowNodes) {
      const touches = !!id && (arrow.a.from === id || arrow.a.to === id);
      arrow.g.classList.toggle('is-active', touches);
      arrow.g.classList.toggle('is-dim', !!id && !touches);
    }

    this.#turtle?.setPaused(!!id);

    if (!entry) {
      this.tooltipEl.hidden = true;
      return;
    }
    const r = entry.r;
    this.tooltipEl.hidden = false;
    this.tooltipEl.innerHTML = '';
    const title = document.createElement('span');
    title.className = 'dg-tooltip__title';
    title.innerHTML = inlineMdWeb(r.label);
    this.tooltipEl.appendChild(title);
    if (r.description) {
      const desc = document.createElement('div');
      desc.className = 'dg-tooltip__desc';
      desc.innerHTML = inlineMdWeb(r.description);
      this.tooltipEl.appendChild(desc);
    }
    if (Number.isFinite(r.progress)) {
      const desc = document.createElement('div');
      desc.className = 'dg-tooltip__desc';
      desc.textContent = `Progreso: ${r.progress}%`;
      this.tooltipEl.appendChild(desc);
    }
  }
}

defineElement('is-gantt', IsGantt, 'IsGantt');

registerDiagramKind('gantt', 'is-gantt');

export { IsGantt };
