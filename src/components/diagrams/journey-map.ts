import { adoptCss, defineElement, emit } from '../../core/element.js';
import { DiagramElementBase } from '../_shared/diagram-element-base.js';
import { resolveJourneySpec, computeJourneyLayout } from './journey-spec.js';
import { sequenceThemeDark, sequenceThemeLight } from './sequence-spec.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import { inlineMdWeb } from '../_shared/tk-inline-md.js';
import { registerDiagramKind } from './diagram-kinds.js';
import { svgEl } from '../_shared/svg-chart-engine.js';

/**
 * <is-journey-map> — mapa de recorrido (user journey) en SVG, sin Mermaid.
 *
 *   <is-journey-map>
 *     <script type="application/json">
 *       { "journey": { "phases": [...], "steps": [{ "label": "...", "score": 4 }] } }
 *     </script>
 *   </is-journey-map>
 *
 * Mismo esqueleto que <is-flowchart>: shadow DOM, slot JSON + MutationObserver,
 * tema por atributo `data-theme`, `color` (inline | viewer), lightbox propio.
 *
 * Atributos: color (inline | viewer), open-on-click
 * Propiedades: payload, spec, layout, hiddenPhases
 * Eventos: is-render, is-open-viewer, is-toggle-phase
 */

class IsJourneyMap extends DiagramElementBase {
  #hiddenPhases = new Set();
  #stepNodes = new Map();
  #hoverId = null;

  constructor() {
    super();
    this.initDiagramShadow('jn-svg', 'jn-tooltip');
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

  onPayloadChanged() { this.#hiddenPhases = new Set(); }

  get hiddenPhases() { return this.#hiddenPhases; }
  set hiddenPhases(v) {
    this.#hiddenPhases = v instanceof Set ? v : new Set(v || []);
    this.queueRender();
  }

  renderDiagram() {
    const spec = resolveJourneySpec(this.payload ?? {});
    this.spec = spec;
    if (!spec) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }
    delete this.wrap.dataset.empty;

    const hidden = this.#hiddenPhases;
    const visible = hidden.size
      ? { ...spec, steps: spec.steps.filter((s) => !hidden.has(s.phase)) }
      : spec;
    if (!visible.steps.length) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }

    const theme = this.isDarkTheme ? sequenceThemeDark() : sequenceThemeLight();
    this.syncThemeAttr();

    const layout = computeJourneyLayout(visible);
    this.layout = layout;
    this.#buildSvg(layout, theme);
    this.wrap.classList.toggle('is-viewer', this.isViewer);
  }

  #buildSvg(layout, theme) {
    const { width: W, height: H } = layout;
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.setAttribute('aria-label', layout.title || 'Mapa de recorrido');
    this.svg.style.cssText = 'width:100%;height:100%;max-width:none;display:block;margin:0 auto';
    this.svg.innerHTML = '';
    this.#stepNodes.clear();
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

    this.#buildGrid(layout, theme);
    this.#buildPhases(layout, theme);
    this.#buildLine(layout, theme);
    this.#buildSteps(layout, theme);

    emit(this, 'is-render', { layout, svg: this.svg });
  }

  #buildGrid(layout, theme) {
    const g = svgEl('g', { class: 'jn-grid' });
    for (const line of layout.gridLines) {
      g.appendChild(svgEl('line', {
        x1: line.x1, y1: line.y, x2: line.x2, y2: line.y,
        stroke: theme.grid, 'stroke-width': 1, 'stroke-dasharray': '3 4', class: 'jn-grid__line',
      }));
      const t = svgEl('text', {
        x: line.labelX, y: line.y + 3.5, 'text-anchor': 'end', fill: theme.muted,
        'font-size': '9.5', 'font-family': 'Consolas,Menlo,monospace',
      });
      t.textContent = String(line.value);
      g.appendChild(t);
    }
    this.svg.appendChild(g);
  }

  #buildPhases(layout, theme) {
    const g = svgEl('g', { class: 'jn-phases' });
    for (const f of layout.phases) {
      const color = tkHueToHex(f.hue) ?? theme.accent;
      const item = svgEl('g', { class: 'jn-phase' });
      item.dataset.phaseId = f.id;
      if (this.isViewer) item.style.cursor = 'pointer';
      item.appendChild(svgEl('rect', {
        x: f.x + 2, y: f.y, width: f.w - 4, height: f.h, rx: 6,
        fill: color, 'fill-opacity': 0.16, stroke: color, 'stroke-width': 1,
        class: 'jn-phase__band',
      }));
      const t = svgEl('text', {
        x: f.x + f.w / 2, y: f.y + f.h / 2 + 4, 'text-anchor': 'middle', fill: theme.text,
        'font-size': '10.5', 'font-weight': '600', 'letter-spacing': '0.03em',
        'font-family': 'Tahoma,Arial,sans-serif',
      });
      t.textContent = f.name;
      item.appendChild(t);
      g.appendChild(item);
    }
    this.svg.appendChild(g);
  }

  #buildLine(layout, theme) {
    if (!layout.line) return;
    this.svg.appendChild(svgEl('path', {
      d: layout.line, fill: 'none', stroke: theme.accent, 'stroke-width': 1.6,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round', class: 'jn-line',
    }));
  }

  #buildSteps(layout, theme) {
    for (const s of layout.steps) {
      const color = (s.hue != null && tkHueToHex(s.hue)) || theme.accent;
      const g = svgEl('g', { class: 'jn-step' });
      g.dataset.stepId = s.id;
      if (this.isViewer) g.style.cursor = 'pointer';

      if (s.hasScore) {
        g.appendChild(svgEl('circle', {
          cx: s.cx, cy: s.cy, r: 6, fill: color, stroke: theme.chipFill, 'stroke-width': 1.4,
          class: 'jn-step__dot',
        }));
      } else {
        // Paso sin puntaje: aro vacío. No es un cero, es un dato que falta.
        g.appendChild(svgEl('circle', {
          cx: s.cx, cy: s.cy, r: 5, fill: 'none', stroke: color, 'stroke-width': 1.3,
          'stroke-dasharray': '3 3', class: 'jn-step__dot',
        }));
      }

      const t = svgEl('text', {
        x: s.cx, y: s.labelY, 'text-anchor': 'middle', fill: theme.text,
        'font-size': '10.5', 'font-weight': '600', 'font-family': 'Tahoma,Arial,sans-serif',
        class: 'jn-step__label',
      });
      t.innerHTML = inlineMdWeb(s.label);
      g.appendChild(t);

      if (s.actor) {
        const a = svgEl('text', {
          x: s.cx, y: s.actorY, 'text-anchor': 'middle', fill: theme.muted,
          'font-size': '9.5', 'font-family': 'Tahoma,Arial,sans-serif',
        });
        a.textContent = s.actor;
        g.appendChild(a);
      }

      this.svg.appendChild(g);
      this.#stepNodes.set(s.id, { s, g });
    }
  }

  /* ── interacción ── */

  #onClick = (e: PointerEvent) => {
    if (this.isViewer) {
      const phase = e.composedPath().find((x) => x?.dataset?.phaseId);
      if (phase) emit(this, 'is-toggle-phase', { id: phase.dataset.phaseId });
      return;
    }
    // El visor es opt-in: sin `open-on-click` el clic no hace nada y tampoco
    // se anuncia `is-open-viewer`, que prometeria una apertura que no ocurre.
    if (!this.hasAttribute('open-on-click')) return;
    const ev = new CustomEvent('is-open-viewer', {
      bubbles: true, composed: true, cancelable: true, detail: { payload: this.payload },
    });
    this.dispatchEvent(ev);
    if (!ev.defaultPrevented) this.openOwnViewer('journey');
  };

  #onMouseMove = (e: PointerEvent) => {
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
    const parts = [];
    if (s.hasScore) parts.push(`Satisfacción ${s.score} de ${this.layout.scale.max}`);
    if (s.actor) parts.push(s.actor);
    if (s.description) parts.unshift(inlineMdWeb(s.description));
    if (parts.length) {
      const desc = document.createElement('div');
      desc.className = 'dg-tooltip__desc';
      desc.innerHTML = parts.join(' · ');
      this.tooltipEl.appendChild(desc);
    }
  }
}

defineElement('is-journey-map', IsJourneyMap, 'IsJourneyMap');

registerDiagramKind('journey', 'is-journey-map');

export { IsJourneyMap };
