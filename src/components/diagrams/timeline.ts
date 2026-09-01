import { adoptCss, defineElement, emit } from '../../core/element.js';
import { DiagramElementBase } from '../_shared/diagram-element-base.js';
import { resolveTimelineSpec, computeTimelineLayout } from './timeline-spec.js';
import { sequenceThemeDark, sequenceThemeLight } from './sequence-spec.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import { inlineMdWeb } from '../_shared/tk-inline-md.js';
import { registerDiagramKind } from './diagram-kinds.js';
import { svgEl } from '../_shared/svg-chart-engine.js';

/**
 * <is-timeline> — línea de tiempo de hitos en SVG, sin Mermaid.
 *
 *   <is-timeline>
 *     <script type="application/json">
 *       { "timeline": { "title": "...", "orientation": "horizontal", "events": [...] } }
 *     </script>
 *   </is-timeline>
 *
 * `orientation: horizontal` (default) alterna los eventos arriba/abajo de un
 * eje central; `vertical` los apila a la derecha de un eje a la izquierda.
 * No hay flechas que rutear (sin turtle): la animación no aplica aquí.
 *
 * Atributos: color (inline | viewer), open-on-click
 * Propiedades: payload, spec, layout, hiddenGroups
 * Eventos: is-render, is-open-viewer, is-toggle-group
 */

class IsTimeline extends DiagramElementBase {
  #hiddenGroups = new Set();
  #eventNodes = new Map();
  #hoverId = null;
  #ro = null;
  #lastWidth = 0;

  constructor() {
    super();
    this.initDiagramShadow('tl-svg', 'tl-tooltip');
    adoptCss(this.shadowRoot!, import.meta.url);
  }

  onDiagramConnected() {
    this.wrap.addEventListener('mousemove', this.#onMouseMove);
    this.wrap.addEventListener('mouseleave', this.#onMouseLeave);
    this.wrap.addEventListener('click', this.#onClick);
    // Re-layout cuando cambia el ancho del contenedor (fit-width).
    if (typeof ResizeObserver !== 'undefined') {
      this.#ro = new ResizeObserver(() => {
        const w = this.wrap.clientWidth;
        if (w && Math.abs(w - this.#lastWidth) > 4) {
          this.#lastWidth = w;
          this.queueRender();
        }
      });
      this.#ro.observe(this.wrap);
    }
  }

  onDiagramDisconnected() {
    this.#ro?.disconnect();
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
    const spec = resolveTimelineSpec(this.payload ?? {});
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
      const events = spec.events.filter((e) => !e.group || !hidden.has(e.group));
      visible = { ...spec, events };
    }
    if (!visible.events.length) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }

    const dark = this.isDarkTheme;
    const theme = dark ? sequenceThemeDark() : sequenceThemeLight();
    this.syncThemeAttr();

    // `Date.now()` se llama solo aquí (en el componente), nunca dentro del
    // módulo de spec puro, para que el layout siga siendo determinista.
    const availW = this.wrap.clientWidth || 0;
    const layout = computeTimelineLayout(visible, {
      now: Date.now(),
      width: availW > 80 ? Math.max(160, availW - 8) : undefined,
    });
    this.#lastWidth = availW;
    this.layout = layout;
    this.#buildSvg(layout, theme);
    this.wrap.classList.toggle('is-viewer', this.isViewer);
  }

  #buildSvg(layout, theme) {
    const { width: W, height: H } = layout;
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.setAttribute('aria-label', layout.title || 'Línea de tiempo');
    this.svg.style.cssText = 'width:100%;height:100%;max-width:none;display:block;margin:0 auto';
    this.svg.innerHTML = '';
    this.#eventNodes.clear();
    this.#hoverId = null;

    if (layout.title) {
      const t = svgEl('text', {
        x: W / 2, y: layout.titleY, 'text-anchor': 'middle', fill: theme.text,
        'font-size': '13', 'font-weight': '600', 'font-family': 'Tahoma,Arial,sans-serif',
      });
      t.textContent = layout.title;
      this.svg.appendChild(t);
    }

    if (layout.groups?.length) this.#buildLegend(layout, theme);
    this.#buildAxis(layout, theme);
    this.#buildEvents(layout, theme);

    emit(this, 'is-render', { layout, svg: this.svg });
  }

  #buildAxis(layout, theme) {
    const g = svgEl('g', { class: 'tl-axis' });
    const horizontal = layout.orientation === 'horizontal';
    if (horizontal) {
      g.appendChild(svgEl('line', {
        x1: layout.axisX0, x2: layout.axisX0 + layout.axisLen, y1: layout.axisY0, y2: layout.axisY0,
        stroke: theme.border, 'stroke-width': 1.6,
      }));
    } else {
      g.appendChild(svgEl('line', {
        x1: layout.axisX0, x2: layout.axisX0, y1: layout.axisY0, y2: layout.axisY0 + layout.axisLen,
        stroke: theme.border, 'stroke-width': 1.6,
      }));
    }
    for (const tk of layout.ticks) {
      const line = horizontal
        ? svgEl('line', { x1: tk.pos, x2: tk.pos, y1: layout.axisY0 - 4, y2: layout.axisY0 + 4 })
        : svgEl('line', { x1: layout.axisX0 - 4, x2: layout.axisX0 + 4, y1: tk.pos, y2: tk.pos });
      line.setAttribute('stroke', theme.grid);
      line.setAttribute('stroke-width', tk.major ? 1.4 : 1);
      line.setAttribute('class', 'dg-grid-line');
      g.appendChild(line);
    }
    if (layout.todayPos != null) {
      const today = horizontal
        ? svgEl('line', { x1: layout.todayPos, x2: layout.todayPos, y1: layout.axisY0 - 10, y2: layout.axisY0 + 10 })
        : svgEl('line', { x1: layout.axisX0 - 10, x2: layout.axisX0 + 10, y1: layout.todayPos, y2: layout.todayPos });
      today.setAttribute('stroke', theme.accent);
      today.setAttribute('stroke-width', 1.4);
      today.setAttribute('stroke-dasharray', '4 3');
      g.appendChild(today);
    }
    this.svg.appendChild(g);
  }

  #buildEvents(layout, theme) {
    for (const e of layout.events) {
      const color = (e.hue != null && tkHueToHex(e.hue)) || theme.accent;
      const g = svgEl('g', { class: 'tl-event' });
      g.dataset.eventId = e.id;
      if (this.isViewer) g.style.cursor = 'pointer';

      const horizontal = layout.orientation === 'horizontal';
      const stemX2 = horizontal ? e.dotX : e.cardX;
      const stemY2 = horizontal ? (e.side < 0 ? e.cardY + e.cardH : e.cardY) : e.dotY;
      g.appendChild(svgEl('line', {
        x1: e.dotX, y1: e.dotY, x2: stemX2, y2: stemY2,
        stroke: color, 'stroke-width': 1.4, class: 'tl-event__stem',
      }));
      g.appendChild(svgEl('circle', { cx: e.dotX, cy: e.dotY, r: 4.5, fill: color, class: 'tl-event__dot' }));

      const card = svgEl('rect', {
        x: e.cardX, y: e.cardY, width: e.cardW, height: e.cardH, rx: 8,
        fill: theme.chipFill, stroke: color, 'stroke-width': 1.2, class: 'tl-event__card',
      });
      g.appendChild(card);

      const fo = svgEl('foreignObject', { x: e.cardX + 6, y: e.cardY, width: e.cardW - 12, height: e.cardH });
      const div = document.createElement('div');
      div.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
      div.className = 'tl-event-label';
      Object.assign(div.style, {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', height: '100%', fontSize: '10.5px', fontWeight: '600',
        fontFamily: 'Tahoma,Arial,sans-serif', color: theme.text, lineHeight: '1.2', textAlign: 'center',
      });
      div.innerHTML = inlineMdWeb(e.label);
      fo.appendChild(div);
      g.appendChild(fo);

      this.svg.appendChild(g);
      this.#eventNodes.set(e.id, { e, g });
    }
  }

  #buildLegend(layout, theme) {
    const g = svgEl('g', { class: 'tl-legend' });
    layout.groups.forEach((grp, gi: number) => {
      const ly = (layout.subtitleY || layout.titleY || 22) + 18 + gi * 16;
      const color = tkHueToHex(grp.hue) ?? theme.accent;
      const off = this.#hiddenGroups.has(grp.id);
      const item = svgEl('g', { class: 'tl-legend__item', opacity: off ? 0.4 : 1 });
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

  #onClick = (e: PointerEvent) => {
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
    if (!ev.defaultPrevented) this.openOwnViewer('timeline');
  };

  #onMouseMove = (e: PointerEvent) => {
    if (!this.isViewer) return;
    const g = e.composedPath().find((n) => n?.dataset?.eventId);
    const id = g?.dataset.eventId ?? null;
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
    const entry = id ? this.#eventNodes.get(id) : null;

    for (const [eventId, node] of this.#eventNodes) {
      const active = eventId === id;
      node.g.classList.toggle('is-active', active);
      node.g.classList.toggle('is-dim', !!id && !active);
    }

    if (!entry) {
      this.tooltipEl.hidden = true;
      return;
    }
    const e = entry.e;
    this.tooltipEl.hidden = false;
    this.tooltipEl.innerHTML = '';
    const title = document.createElement('span');
    title.className = 'dg-tooltip__title';
    title.innerHTML = inlineMdWeb(e.label);
    this.tooltipEl.appendChild(title);
    if (e.desc) {
      const desc = document.createElement('div');
      desc.className = 'dg-tooltip__desc';
      desc.innerHTML = inlineMdWeb(e.desc);
      this.tooltipEl.appendChild(desc);
    }
  }
}

defineElement('is-timeline', IsTimeline, 'IsTimeline');

registerDiagramKind('timeline', 'is-timeline');

export { IsTimeline };
