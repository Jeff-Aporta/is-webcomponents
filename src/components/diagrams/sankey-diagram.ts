import { adoptCss, defineElement, emit } from '../../core/element.js';
import { DiagramElementBase } from '../_shared/diagram-element-base.js';
import { resolveSankeySpec, computeSankeyLayout } from './sankey-spec.js';
import { sequenceThemeDark, sequenceThemeLight } from './sequence-spec.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import { inlineMdWeb } from '../_shared/tk-inline-md.js';
import { registerDiagramKind } from './diagram-kinds.js';
import { svgEl } from '../_shared/svg-chart-engine.js';

/**
 * <is-sankey-diagram> — diagrama de Sankey en SVG, sin Mermaid.
 *
 *   <is-sankey-diagram>
 *     <script type="application/json">
 *       { "sankey": { "nodes": [...], "links": [{ "from": "a", "to": "b", "value": 40 }] } }
 *     </script>
 *   </is-sankey-diagram>
 *
 * Mismo esqueleto que <is-flowchart>: shadow DOM, slot JSON + MutationObserver,
 * tema por atributo `data-theme`, `color` (inline | viewer), lightbox propio.
 *
 * Atributos: color (inline | viewer), open-on-click, height
 * Propiedades: payload, spec, layout, hiddenGroups
 * Eventos: is-render, is-open-viewer, is-toggle-group
 */

const DEFAULT_HEIGHT = 320;

class IsSankeyDiagram extends DiagramElementBase {
  static get observedAttributes(): string[] {
    return [...DiagramElementBase.observedAttributes, 'height'];
  }

  #hiddenGroups = new Set();
  #nodeNodes = new Map();
  #linkNodes = new Map();
  #hoverId = null;

  constructor() {
    super();
    this.initDiagramShadow('sk-svg', 'sk-tooltip');
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
    const spec = resolveSankeySpec(this.payload ?? {});
    this.spec = spec;
    if (!spec) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }
    delete this.wrap.dataset.empty;

    // Ocultar un grupo quita sus nodos y los enlaces que los tocan.
    const hidden = this.#hiddenGroups;
    let visible = spec;
    if (hidden.size) {
      const nodes = spec.nodes.filter((n) => !n.group || !hidden.has(n.group));
      const keep = new Set(nodes.map((n) => n.id));
      visible = { ...spec, nodes, links: spec.links.filter((l) => keep.has(l.from) && keep.has(l.to)) };
    }
    if (!visible.links.length) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }

    const theme = this.isDarkTheme ? sequenceThemeDark() : sequenceThemeLight();
    this.syncThemeAttr();

    const height = Number(this.getAttribute('height')) || DEFAULT_HEIGHT;
    const layout = computeSankeyLayout(visible, { height });
    this.layout = layout;
    this.#buildSvg(layout, theme);
    this.wrap.classList.toggle('is-viewer', this.isViewer);
  }

  #buildSvg(layout, theme) {
    const { width: W, height: H } = layout;
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.setAttribute('aria-label', layout.title || 'Diagrama de Sankey');
    this.svg.style.cssText = 'width:100%;height:100%;max-width:none;display:block;margin:0 auto';
    this.svg.innerHTML = '';
    this.#nodeNodes.clear();
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

    if (layout.groups?.length) this.#buildLegend(layout, theme);
    this.#buildLinks(layout, theme);
    this.#buildNodes(layout, theme);

    emit(this, 'is-render', { layout, svg: this.svg });
  }

  #buildLegend(layout, theme) {
    const g = svgEl('g', { class: 'sk-legend' });
    layout.groups.forEach((grp, gi: number) => {
      const ly = (layout.subtitleY || layout.titleY || 22) + 18 + gi * 16;
      const color = tkHueToHex(grp.hue) ?? theme.accent;
      const off = this.#hiddenGroups.has(grp.id);
      const item = svgEl('g', { class: 'sk-legend__item', opacity: off ? 0.4 : 1 });
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

  #buildLinks(layout, theme) {
    for (const l of layout.links) {
      const color = (l.hue != null && tkHueToHex(l.hue)) || theme.accent;
      const g = svgEl('g', { class: 'sk-link' });
      g.dataset.linkId = l.id;
      g.appendChild(svgEl('path', {
        d: l.path, fill: color, stroke: 'none', 'fill-opacity': 0.34, class: 'sk-link__band',
      }));
      this.svg.appendChild(g);
      this.#linkNodes.set(l.id, { l, g });
    }
  }

  #buildNodes(layout, theme) {
    for (const n of layout.nodes) {
      const color = (n.hue != null && tkHueToHex(n.hue)) || theme.accent;
      const g = svgEl('g', { class: 'sk-node' });
      g.dataset.nodeId = n.id;
      if (this.isViewer) g.style.cursor = 'pointer';

      g.appendChild(svgEl('rect', {
        x: n.x, y: n.y, width: n.w, height: n.h, rx: 3,
        fill: color, class: 'sk-node__bar',
      }));

      const right = n.labelSide === 'right';
      const t = svgEl('text', {
        x: right ? n.x + n.w + 8 : n.x - 8,
        y: n.y + n.h / 2 + 3.5,
        'text-anchor': right ? 'start' : 'end',
        fill: theme.text, 'font-size': '11', 'font-weight': '600',
        'font-family': 'Tahoma,Arial,sans-serif',
      });
      t.innerHTML = inlineMdWeb(n.label);
      g.appendChild(t);

      const value = svgEl('text', {
        x: right ? n.x + n.w + 8 : n.x - 8,
        y: n.y + n.h / 2 + 15,
        'text-anchor': right ? 'start' : 'end',
        fill: theme.muted, 'font-size': '10',
        'font-family': 'Consolas,Menlo,monospace',
      });
      value.textContent = layout.unit ? `${n.value} ${layout.unit}` : String(n.value);
      g.appendChild(value);

      this.svg.appendChild(g);
      this.#nodeNodes.set(n.id, { n, g });
    }
  }

  /* ── interacción ── */

  #onClick = (e: PointerEvent) => {
    if (this.isViewer) {
      const item = e.composedPath().find((x) => x?.dataset?.groupId);
      if (item) emit(this, 'is-toggle-group', { id: item.dataset.groupId });
      return;
    }
    // El visor es opt-in: sin `open-on-click` el clic no hace nada y tampoco
    // se anuncia `is-open-viewer`, que prometeria una apertura que no ocurre.
    if (!this.hasAttribute('open-on-click')) return;
    const ev = new CustomEvent('is-open-viewer', {
      bubbles: true, composed: true, cancelable: true, detail: { payload: this.payload },
    });
    this.dispatchEvent(ev);
    if (!ev.defaultPrevented) this.openOwnViewer('sankey');
  };

  #onMouseMove = (e: PointerEvent) => {
    if (!this.isViewer) return;
    const g = e.composedPath().find((n) => n?.dataset?.nodeId);
    const id = g?.dataset.nodeId ?? null;
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
    const entry = id ? this.#nodeNodes.get(id) : null;

    // Resalta el nodo y las bandas que entran o salen de él; atenúa el resto.
    for (const [nodeId, node] of this.#nodeNodes) {
      const active = nodeId === id;
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
    const n = entry.n;
    this.tooltipEl.hidden = false;
    this.tooltipEl.innerHTML = '';
    const title = document.createElement('span');
    title.className = 'dg-tooltip__title';
    title.innerHTML = inlineMdWeb(n.label);
    this.tooltipEl.appendChild(title);
    const desc = document.createElement('div');
    desc.className = 'dg-tooltip__desc';
    const unit = this.layout?.unit ? ` ${this.layout.unit}` : '';
    desc.innerHTML = n.description
      ? `${inlineMdWeb(n.description)} · ${n.value}${unit}`
      : `${n.value}${unit}`;
    this.tooltipEl.appendChild(desc);
  }
}

defineElement('is-sankey-diagram', IsSankeyDiagram, 'IsSankeyDiagram');

registerDiagramKind('sankey', 'is-sankey-diagram');

export { IsSankeyDiagram };
