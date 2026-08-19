import { adoptCss } from '../_shared/adopt-css.js';
import { DiagramElementBase } from '../_shared/diagram-element-base.js';
import { resolveSwimlaneSpec, computeSwimlaneLayout } from './swimlane-spec.js';
import { sequenceThemeDark, sequenceThemeLight } from './sequence-spec.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import { inlineMdWeb } from '../_shared/tk-inline-md.js';
import { registerDiagramKind } from './diagram-kinds.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { svgEl } from '../_shared/svg-chart-engine.js';
import { svgArrowHead } from '../_shared/diagram-arrow.js';

/**
 * <is-swimlane-diagram> — diagrama de carriles en SVG, sin Mermaid.
 *
 *   <is-swimlane-diagram>
 *     <script type="application/json">
 *       { "swimlane": { "lanes": [...], "steps": [...], "links": [...] } }
 *     </script>
 *   </is-swimlane-diagram>
 *
 * Mismo esqueleto que <is-flowchart>: shadow DOM, slot JSON + MutationObserver,
 * tema por atributo `data-theme`, `color` (inline | viewer), lightbox propio.
 *
 * Atributos: color (inline | viewer), open-on-click
 * Propiedades: payload, spec, layout, hiddenLanes
 * Eventos: is-render, is-open-viewer, is-toggle-lane
 */

/** Contorno del paso según su tipo, con la misma gramática que el flowchart. */
function stepPath(kind, x, y, w, h) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  if (kind === 'decision') return `M${cx},${y} L${x + w},${cy} L${cx},${y + h} L${x},${cy} Z`;
  const r = kind === 'start' || kind === 'end' ? h / 2 : 8;
  return `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`;
}

class IsSwimlaneDiagram extends DiagramElementBase {
  #hiddenLanes = new Set();
  #stepNodes = new Map();
  #linkNodes = new Map();
  #hoverId = null;

  constructor() {
    super();
    this.initDiagramShadow('sw-svg', 'sw-tooltip');
    adoptCss(this.shadowRoot, import.meta.url);
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

  onPayloadChanged() { this.#hiddenLanes = new Set(); }

  get hiddenLanes() { return this.#hiddenLanes; }
  set hiddenLanes(v) {
    this.#hiddenLanes = v instanceof Set ? v : new Set(v || []);
    this.queueRender();
  }

  renderDiagram() {
    const spec = resolveSwimlaneSpec(this.payload ?? {});
    this.spec = spec;
    if (!spec) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }
    delete this.wrap.dataset.empty;

    // Ocultar un carril quita sus pasos y los enlaces que los tocan: el
    // proceso se lee sin el responsable que no interesa en ese momento.
    const hidden = this.#hiddenLanes;
    let visible = spec;
    if (hidden.size) {
      const lanes = spec.lanes.filter((l) => !hidden.has(l.id));
      const steps = spec.steps.filter((s) => !hidden.has(s.lane));
      const keep = new Set(steps.map((s) => s.id));
      visible = {
        ...spec,
        lanes,
        steps,
        links: spec.links.filter((l) => keep.has(l.from) && keep.has(l.to)),
      };
    }
    if (!visible.steps.length || !visible.lanes.length) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }

    const theme = this.isDarkTheme ? sequenceThemeDark() : sequenceThemeLight();
    this.syncThemeAttr();

    const layout = computeSwimlaneLayout(visible);
    this.layout = layout;
    this.#buildSvg(layout, theme);
    this.wrap.classList.toggle('is-viewer', this.isViewer);
  }

  #buildSvg(layout, theme) {
    const { width: W, height: H } = layout;
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.setAttribute('aria-label', layout.title || 'Diagrama de carriles');
    this.svg.style.cssText = 'width:100%;height:100%;max-width:none;display:block;margin:0 auto';
    this.svg.innerHTML = '';
    this.#stepNodes.clear();
    this.#linkNodes.clear();
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

    this.#buildLanes(layout, theme);
    this.#buildLinks(layout, theme);
    this.#buildSteps(layout, theme);

    emit(this, 'is-render', { layout, svg: this.svg });
  }

  #buildLanes(layout, theme) {
    layout.lanes.forEach((lane, i) => {
      const color = tkHueToHex(lane.hue) ?? theme.accent;
      const g = svgEl('g', { class: 'sw-lane' });
      g.dataset.laneId = lane.id;
      if (this.isViewer) g.style.cursor = 'pointer';

      // Bandas alternas: el ojo sigue la fila sin necesidad de líneas gruesas.
      if (i % 2 === 1) {
        g.appendChild(svgEl('rect', {
          x: lane.x, y: lane.y, width: lane.w, height: lane.h,
          fill: theme.altFill, class: 'sw-lane__band',
        }));
      }
      g.appendChild(svgEl('rect', {
        x: lane.x, y: lane.y, width: lane.labelW, height: lane.h,
        fill: color, 'fill-opacity': 0.14, stroke: theme.border, 'stroke-width': 1,
        class: 'sw-lane__head',
      }));
      g.appendChild(svgEl('line', {
        x1: lane.x, y1: lane.y, x2: lane.x + lane.w, y2: lane.y,
        stroke: theme.border, 'stroke-width': 1, class: 'sw-lane__rule',
      }));
      if (i === layout.lanes.length - 1) {
        g.appendChild(svgEl('line', {
          x1: lane.x, y1: lane.y + lane.h, x2: lane.x + lane.w, y2: lane.y + lane.h,
          stroke: theme.border, 'stroke-width': 1, class: 'sw-lane__rule',
        }));
      }

      const t = svgEl('text', {
        x: lane.x + 12, y: lane.y + lane.h / 2 + 4, fill: theme.text,
        'font-size': '11', 'font-weight': '600', 'font-family': 'Tahoma,Arial,sans-serif',
        class: 'sw-lane__label',
      });
      t.innerHTML = inlineMdWeb(lane.name);
      g.appendChild(t);

      this.svg.appendChild(g);
    });
  }

  #buildLinks(layout, theme) {
    for (const l of layout.links) {
      const color = (l.hue != null && tkHueToHex(l.hue)) || theme.accent;
      const g = svgEl('g', { class: `sw-link${l.forward ? '' : ' sw-link--return'}` });
      g.dataset.linkId = l.id;

      g.appendChild(svgEl('path', {
        d: l.path, fill: 'none', stroke: color, 'stroke-width': 1.3,
        'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        'stroke-dasharray': l.forward ? null : '5 4',
        class: 'sw-link__path',
      }));
      g.appendChild(svgArrowHead({
        d: l.path, tip: { x: l.arrowTipX, y: l.arrowTipY }, color,
        len: 8, halfWidth: 4, className: 'sw-link__head',
      }));

      if (l.label) {
        const w = l.labelW ?? (l.label.length * 5.6 + 8);
        g.appendChild(svgEl('rect', {
          x: l.labelX - w / 2, y: l.labelY - 8, width: w, height: 15, rx: 4,
          fill: theme.chipFillSoft ?? theme.chipFill, class: 'sw-link__chip',
        }));
        const t = svgEl('text', {
          x: l.labelX, y: l.labelY + 3, 'text-anchor': 'middle', fill: theme.muted,
          'font-size': '9.5', 'font-family': 'Consolas,Menlo,monospace',
        });
        t.textContent = l.label;
        g.appendChild(t);
      }

      this.svg.appendChild(g);
      this.#linkNodes.set(l.id, { l, g });
    }
  }

  #buildSteps(layout, theme) {
    for (const s of layout.steps) {
      const color = (s.hue != null && tkHueToHex(s.hue)) || theme.accent;
      const g = svgEl('g', { class: `sw-step sw-step--${s.kind}` });
      g.dataset.stepId = s.id;
      if (this.isViewer) g.style.cursor = 'pointer';

      g.appendChild(svgEl('path', {
        d: stepPath(s.kind, s.x, s.y, s.w, s.h),
        fill: theme.chipFill, stroke: color, 'stroke-width': 1.3, 'stroke-linejoin': 'round',
        class: 'sw-step__box',
      }));
      const t = svgEl('text', {
        x: s.x + s.w / 2, y: s.y + s.h / 2 + 4, 'text-anchor': 'middle', fill: theme.text,
        'font-size': '10.5', 'font-weight': '600', 'font-family': 'Tahoma,Arial,sans-serif',
      });
      t.innerHTML = inlineMdWeb(s.label);
      g.appendChild(t);

      this.svg.appendChild(g);
      this.#stepNodes.set(s.id, { s, g });
    }
  }

  /* ── interacción ── */

  #onClick = (e) => {
    if (this.isViewer) {
      const lane = e.composedPath().find((x) => x?.dataset?.laneId);
      if (lane) emit(this, 'is-toggle-lane', { id: lane.dataset.laneId });
      return;
    }
    // El visor es opt-in: sin `open-on-click` el clic no hace nada y tampoco
    // se anuncia `is-open-viewer`, que prometeria una apertura que no ocurre.
    if (!this.hasAttribute('open-on-click')) return;
    const ev = new CustomEvent('is-open-viewer', {
      bubbles: true, composed: true, cancelable: true, detail: { payload: this.payload },
    });
    this.dispatchEvent(ev);
    if (!ev.defaultPrevented) this.openOwnViewer('swimlane');
  };

  #onMouseMove = (e) => {
    if (!this.isViewer) return;
    const g = e.composedPath().find((n) => n?.dataset?.stepId);
    const id = g?.dataset.stepId ?? null;
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
    const entry = id ? this.#stepNodes.get(id) : null;

    for (const [stepId, node] of this.#stepNodes) {
      const active = stepId === id;
      node.g.classList.toggle('is-active', active);
      node.g.classList.toggle('is-dim', !!id && !active);
    }
    for (const [, link] of this.#linkNodes) {
      const touches = !!id && (link.l.from === id || link.l.to === id);
      link.g.classList.toggle('is-active', touches);
      link.g.classList.toggle('is-dim', !!id && !touches);
    }

    if (!entry) {
      this.tooltipEl.hidden = true;
      return;
    }
    const s = entry.s;
    this.tooltipEl.hidden = false;
    this.tooltipEl.innerHTML = '';
    const title = document.createElement('span');
    title.className = 'dg-tooltip__title';
    title.innerHTML = inlineMdWeb(s.label);
    this.tooltipEl.appendChild(title);
    if (s.description) {
      const desc = document.createElement('div');
      desc.className = 'dg-tooltip__desc';
      desc.innerHTML = inlineMdWeb(s.description);
      this.tooltipEl.appendChild(desc);
    }
  }
}

defineElement('is-swimlane-diagram', IsSwimlaneDiagram, 'IsSwimlaneDiagram');

registerDiagramKind('swimlane', 'is-swimlane-diagram');

export { IsSwimlaneDiagram };
