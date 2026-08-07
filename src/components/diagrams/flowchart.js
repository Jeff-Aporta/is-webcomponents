import { adoptCss } from '../_shared/adopt-css.js';
import { resolveFlowchartSpec, computeFlowchartLayout, shapePath } from './flowchart-spec.js';
import { sequenceThemeDark, sequenceThemeLight } from './sequence-spec.js';
import { SequenceTurtle } from './sequence-turtle.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import { inlineMdWeb } from '../_shared/tk-inline-md.js';
import { svgIconGroup } from '../_shared/tk-icon-inline.js';
import { registerDiagramKind } from './diagram-kinds.js';

import {
  loadOverrides,
  saveOverrides,
  emitLayoutChange,
  applyOverrides,
  attachNodeDrag,
  snap as snapToGrid,
  openInlineEditor,
} from '../_shared/diagram-edit.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
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
 * Atributos: color (inline | viewer), open-on-click
 * Propiedades: payload, spec, layout, turtle, hiddenGroups
 * Eventos: is-render, is-turtle-state, is-open-viewer, is-toggle-group
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v != null) n.setAttribute(k, v);
  }
  return n;
}

class IsFlowchart extends HTMLElement {
  static get observedAttributes() { return ['color', 'mode', 'persist', 'storage-key']; }

  #wrap; #svg; #tooltipEl;
  #payload = null;
  #spec = null;
  #layout = null;
  #theme = null;
  #turtle = null;
  #mounted = false;
  #mo = null; #themeObs = null;
  #renderQueued = false;
  #hiddenGroups = new Set();
  #nodeNodes = new Map();
  #edgeNodes = new Map();
  #hoverId = null;
  #ownLightbox = null;
  #overrides = null;
  #dragDetach = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = /* html */ `
      <div part="base" class="wrap">
        <svg part="canvas" class="flow-svg" xmlns="${SVG_NS}" role="img"></svg>
        <div part="tooltip" class="flow-tooltip dg-tooltip is-rich" hidden></div>
        <div class="slot-hidden"><slot></slot></div>
      </div>
    `;
    adoptCss(shadow, import.meta.url);
    this.#wrap = shadow.querySelector('.wrap');
    this.#svg = shadow.querySelector('.flow-svg');
    this.#tooltipEl = shadow.querySelector('.flow-tooltip');
  }

  connectedCallback() {
    this.#mounted = true;
    this.#overrides = loadOverrides(this, this.getAttribute('storage-key')) || { nodes: {}, edges: {} };
    this.#readJsonSlot();
    this.#mo = new MutationObserver(() => this.#readJsonSlot());
    this.#mo.observe(this, { childList: true, characterData: true, subtree: true });
    this.#themeObs = new MutationObserver(() => this.#queueRender());
    this.#themeObs.observe(document.documentElement, {
      attributes: true, attributeFilter: ['class', 'data-theme', 'data-palette'],
    });
    this.#wrap.addEventListener('mousemove', this.#onMouseMove);
    this.#wrap.addEventListener('mouseleave', this.#onMouseLeave);
    this.#wrap.addEventListener('click', this.#onClick);
    this.#queueRender();
  }

  get mode() { return this.getAttribute('mode') || 'read'; }
  set mode(v) { this.setAttribute('mode', v); }
  get overrides() { return this.#overrides; }
  set overrides(v) { this.#overrides = v || { nodes: {}, edges: {} }; this.#queueRender(); }

  disconnectedCallback() {
    this.#mounted = false;
    this.#mo?.disconnect();
    this.#themeObs?.disconnect();
    this.#turtle?.destroy();
    this.#turtle = null;
    this.#wrap.removeEventListener('mousemove', this.#onMouseMove);
    this.#wrap.removeEventListener('mouseleave', this.#onMouseLeave);
    this.#wrap.removeEventListener('click', this.#onClick);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this.#mounted || oldVal === newVal) return;
    this.#queueRender();
  }

  get isViewer() { return this.getAttribute('color') === 'viewer'; }
  get payload() { return this.#payload; }
  set payload(v) { this.#payload = v; this.#hiddenGroups = new Set(); this.#queueRender(); }
  get spec() { return this.#spec; }
  get layout() { return this.#layout; }
  get turtle() { return this.#turtle; }
  get hiddenGroups() { return this.#hiddenGroups; }
  set hiddenGroups(v) {
    this.#hiddenGroups = v instanceof Set ? v : new Set(v || []);
    this.#queueRender();
  }

  async updateComplete() { await this.#queueRender(); }

  #readJsonSlot() {
    const script = [...this.children].find((c) => c.tagName === 'SCRIPT' && /json/i.test(c.type || ''));
    if (!script) return;
    try {
      this.#payload = JSON.parse(script.textContent.trim());
      this.#queueRender();
    } catch { /* JSON inválido: conserva el último válido */ }
  }

  #queueRender() {
    if (this.#renderQueued) return this.#renderQueued;
    this.#renderQueued = (async () => {
      await Promise.resolve();
      try { this.#render(); } finally { this.#renderQueued = false; }
    })();
    return this.#renderQueued;
  }

  #render() {
    if (!this.#mounted) return;
    const spec = resolveFlowchartSpec(this.#payload ?? {});
    this.#spec = spec;
    if (!spec) {
      this.#svg.innerHTML = '';
      this.#wrap.dataset.empty = '';
      return;
    }
    delete this.#wrap.dataset.empty;

    // Ocultar un grupo quita sus nodos y las aristas que los tocan.
    const hidden = this.#hiddenGroups;
    let visible = spec;
    if (hidden.size) {
      const nodes = spec.nodes.filter((n) => !n.group || !hidden.has(n.group));
      const keep = new Set(nodes.map((n) => n.id));
      visible = { ...spec, nodes, edges: spec.edges.filter((e) => keep.has(e.from) && keep.has(e.to)) };
    }
    if (!visible.nodes.length) {
      this.#svg.innerHTML = '';
      this.#wrap.dataset.empty = '';
      return;
    }

    const dark = !document.documentElement.classList.contains('theme-light');
    const theme = dark ? sequenceThemeDark() : sequenceThemeLight();
    this.#theme = theme;
    this.#wrap.dataset.theme = dark ? 'dark' : 'light';

    const layout = computeFlowchartLayout(visible, this.#overrides);
    this.#layout = layout;
    this.#buildSvg(layout, theme);
    this.#wrap.classList.toggle('is-viewer', this.isViewer);
    this.#wrap.classList.toggle('is-editable', this.mode === 'edit');
    if (this.mode === 'edit') this.#installEditInteractions();
  }

  #buildSvg(layout, theme) {
    const { width: W, height: H } = layout;
    this.#svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.#svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.#svg.setAttribute('aria-label', layout.title || 'Diagrama de flujo');
    this.#svg.style.cssText = 'width:100%;height:100%;max-width:none;display:block;margin:0 auto';
    this.#svg.innerHTML = '';
    this.#nodeNodes.clear();
    this.#edgeNodes.clear();
    this.#hoverId = null;

    if (layout.title) {
      const t = svgEl('text', {
        x: W / 2, y: layout.titleY, 'text-anchor': 'middle', fill: theme.text,
        'font-size': '13', 'font-weight': '600', 'font-family': 'Tahoma,Arial,sans-serif',
      });
      t.textContent = layout.title;
      this.#svg.appendChild(t);
    }
    if (layout.subtitle) {
      const t = svgEl('text', {
        x: W / 2, y: layout.subtitleY, 'text-anchor': 'middle', fill: theme.muted,
        'font-size': '11', 'font-family': 'Tahoma,Arial,sans-serif',
      });
      t.textContent = layout.subtitle;
      this.#svg.appendChild(t);
    }

    if (layout.groups?.length) this.#buildLegend(layout, theme);
    this.#buildEdges(layout, theme);
    this.#buildNodes(layout, theme);

    const turtleGroup = svgEl('g');
    this.#svg.appendChild(turtleGroup);
    this.#turtle?.destroy();
    this.#turtle = new SequenceTurtle(turtleGroup);
    // La tortuga recorre las aristas en orden; reutiliza el motor del secuencia.
    this.#turtle.setData({
      messages: layout.edges.map((e, i) => ({
        path: e.path, step: i + 1, log: e.label || '', groupHue: e.hue,
      })),
      theme,
      viewW: W,
      viewH: H,
      autoLoop: this.isViewer,
      onState: (state) => emit(this, 'is-turtle-state', state),
    });

    emit(this, 'is-render', { layout, svg: this.#svg });
  }

  #buildLegend(layout, theme) {
    const g = svgEl('g', { class: 'flow-legend' });
    layout.groups.forEach((grp, gi) => {
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
    this.#svg.appendChild(g);
  }

  #buildEdges(layout, theme) {
    for (const e of layout.edges) {
      const color = (e.hue != null && tkHueToHex(e.hue)) || theme.accent;
      const g = svgEl('g', { class: 'flow-edge' });
      g.dataset.edgeId = e.id;

      const dash = e.kind === 'dashed' ? '6 4' : null;
      const wdt = e.kind === 'thick' ? 2.4 : 1.3;
      const path = svgEl('path', {
        d: e.path, fill: 'none', stroke: color, 'stroke-width': wdt,
        'stroke-dasharray': dash, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        class: 'flow-edge__path',
      });
      g.appendChild(path);

      // Punta: triángulo rotado hacia el lado por el que entra al nodo.
      g.appendChild(svgEl('polygon', {
        points: '0,0 -8,-4 -8,4',
        fill: color,
        transform: `translate(${e.arrowTipX},${e.arrowTipY}) rotate(${e.arrowAngle})`,
        class: 'flow-edge__head',
      }));

      if (e.label) {
        const pad = 4;
        const w = e.label.length * 5.6 + pad * 2;
        g.appendChild(svgEl('rect', {
          x: e.labelX - w / 2, y: e.labelY - 8, width: w, height: 16, rx: 4,
          fill: theme.chipFill, class: 'flow-edge__chip',
        }));
        const t = svgEl('text', {
          x: e.labelX, y: e.labelY + 3.5, 'text-anchor': 'middle', fill: theme.muted,
          'font-size': '10', 'font-family': 'Consolas,Menlo,monospace',
        });
        t.textContent = e.label;
        g.appendChild(t);
      }

      this.#svg.appendChild(g);
      this.#edgeNodes.set(e.id, { e, g, path });
    }
  }

  #buildNodes(layout, theme) {
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
        g.appendChild(svgIconGroup(n.icon, {
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
        const t = svgEl('text', {
          x: (textLeft + textRight) / 2, y: n.y + n.h / 2 + 4, 'text-anchor': 'middle',
          fill: theme.text, 'font-size': '11', 'font-weight': '600',
          'font-family': 'Tahoma,Arial,sans-serif',
        });
        t.textContent = n.label;
        g.appendChild(t);
      }

      this.#svg.appendChild(g);
      this.#nodeNodes.set(n.id, { n, g, box });
    }
  }

  /* ── hover ── */

  #onClick = (e) => {
    // Modo edición: doble click en nodo → editor inline.
    if (this.mode === 'edit') {
      const nodeEl = e.composedPath().find((x) => x?.dataset?.nodeId);
      if (nodeEl && e.detail === 2) {
        e.preventDefault();
        const entry = this.#nodeNodes.get(nodeEl.dataset.nodeId);
        if (entry) this.#openEditorForNode(entry.n);
      }
      return;
    }
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
      bubbles: true, composed: true, cancelable: true, detail: { payload: this.#payload },
    });
    this.dispatchEvent(ev);
    if (!ev.defaultPrevented) this.#openOwnViewer();
  };

  /* ── edit mode: drag de nodos + editor inline ── */

  #installEditInteractions() {
    this.#dragDetach?.();
    this.#dragDetach = null;
    for (const { g, n } of this.#nodeNodes.values()) {
      g.style.cursor = 'grab';
      const entry = this.#nodeNodes.get(g.dataset.nodeId);
      const detach = attachNodeDrag(
        g,
        (dx, dy) => {
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
          this.#overrides.nodes[cur.id] ??= {};
          this.#overrides.nodes[cur.id].x = cur.x;
          this.#overrides.nodes[cur.id].y = cur.y;
          saveOverrides(this, this.getAttribute('storage-key'), this.#overrides);
          emitLayoutChange(this, { nodeId: cur.id, x: cur.x, y: cur.y, overrides: this.#overrides });
          this.#queueRender();
        },
      );
      this.#dragDetach = detach;
    }
  }

  #openEditorForNode(node) {
    const rect = this.getBoundingClientRect();
    openInlineEditor({
      anchor: { x: rect.left + node.x, y: rect.top + node.y - 36 },
      initial: { label: node.label, hue: node.hue },
      onSave: ({ label, hue }) => {
        if (!this.#overrides.nodes[node.id]) this.#overrides.nodes[node.id] = {};
        if (label) this.#overrides.nodes[node.id].label = label;
        if (Number.isFinite(hue)) this.#overrides.nodes[node.id].hue = hue;
        saveOverrides(this, this.getAttribute('storage-key'), this.#overrides);
        emitLayoutChange(this, { nodeId: node.id, overrides: this.#overrides });
        this.#queueRender();
      },
    });
  }

  async #openOwnViewer() {
    await import('./diagram-lightbox.js');
    let lb = this.#ownLightbox;
    if (!lb || !lb.isConnected) {
      lb = document.createElement('is-diagram-lightbox');
      lb.setAttribute('kind', 'flowchart');
      lb.addEventListener('is-close', () => lb.remove());
      document.body.appendChild(lb);
      this.#ownLightbox = lb;
    }
    lb.payload = this.#payload;
    lb.open = true;
  }

  #onMouseMove = (e) => {
    if (!this.isViewer) return;
    const g = e.composedPath().find((n) => n?.dataset?.nodeId);
    const id = g?.dataset.nodeId ?? null;
    if (id !== this.#hoverId) this.#applyHover(id);
    if (id) {
      const rect = this.#wrap.getBoundingClientRect();
      const left = Math.max(8, Math.min(rect.width - 300, e.clientX - rect.left + 16));
      this.#tooltipEl.style.left = `${left}px`;
      this.#tooltipEl.style.top = `${e.clientY - rect.top + 22}px`;
    }
  };

  #onMouseLeave = () => {
    if (!this.isViewer) return;
    this.#applyHover(null);
  };

  #applyHover(id) {
    this.#hoverId = id;
    const entry = id ? this.#nodeNodes.get(id) : null;

    // Resalta el nodo y las aristas que lo tocan; atenúa el resto.
    for (const [nodeId, node] of this.#nodeNodes) {
      const active = nodeId === id;
      node.g.classList.toggle('is-active', active);
      node.g.classList.toggle('is-dim', !!id && !active);
      node.box.setAttribute('stroke-width', active ? 2.1 : 1.3);
    }
    for (const [, edge] of this.#edgeNodes) {
      const touches = !!id && (edge.e.from === id || edge.e.to === id);
      edge.g.classList.toggle('is-active', touches);
      edge.g.classList.toggle('is-dim', !!id && !touches);
    }

    this.#turtle?.setPaused(!!id);

    if (!entry) {
      this.#tooltipEl.hidden = true;
      return;
    }
    const n = entry.n;
    this.#tooltipEl.hidden = false;
    this.#tooltipEl.innerHTML = '';
    const title = document.createElement('span');
    title.className = 'dg-tooltip__title';
    title.innerHTML = inlineMdWeb(n.label);
    this.#tooltipEl.appendChild(title);
    if (n.description) {
      const desc = document.createElement('div');
      desc.className = 'dg-tooltip__desc';
      desc.innerHTML = inlineMdWeb(n.description);
      this.#tooltipEl.appendChild(desc);
    }
  }
}

defineElement('is-flowchart', IsFlowchart, 'IsFlowchart');

registerDiagramKind('flowchart', 'is-flowchart');
registerDiagramKind('flow', 'is-flowchart');
registerDiagramKind('graph', 'is-flowchart');

export { IsFlowchart };
