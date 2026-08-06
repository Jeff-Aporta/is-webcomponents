import { adoptCss } from '../_shared/adopt-css.js';
import { resolveClassSpec, computeClassLayout } from './class-spec.js';
import { sequenceThemeDark, sequenceThemeLight } from './sequence-spec.js';
import { SequenceTurtle } from './sequence-turtle.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import { inlineMdWeb } from '../_shared/tk-inline-md.js';
import { registerDiagramKind } from './diagram-kinds.js';

/**
 * <is-class-diagram> — diagrama de clases UML en SVG, sin Mermaid.
 *
 * Configuración por JSON, igual que <is-flowchart>:
 *
 *   <is-class-diagram>
 *     <script type="application/json">
 *       { "classDiagram": { "direction": "TB", "classes": [...], "relations": [...] } }
 *     </script>
 *   </is-class-diagram>
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

class IsClassDiagram extends HTMLElement {
  static get observedAttributes() { return ['color']; }

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

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = /* html */ `
      <div part="base" class="wrap">
        <svg part="canvas" class="cls-svg" xmlns="${SVG_NS}" role="img"></svg>
        <div part="tooltip" class="cls-tooltip dg-tooltip is-rich" hidden></div>
        <div class="slot-hidden"><slot></slot></div>
      </div>
    `;
    adoptCss(shadow, import.meta.url);
    this.#wrap = shadow.querySelector('.wrap');
    this.#svg = shadow.querySelector('.cls-svg');
    this.#tooltipEl = shadow.querySelector('.cls-tooltip');
  }

  connectedCallback() {
    this.#mounted = true;
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
    const spec = resolveClassSpec(this.#payload ?? {});
    this.#spec = spec;
    if (!spec) {
      this.#svg.innerHTML = '';
      this.#wrap.dataset.empty = '';
      return;
    }
    delete this.#wrap.dataset.empty;

    // Ocultar un grupo quita sus clases y las relaciones que las tocan.
    const hidden = this.#hiddenGroups;
    let visible = spec;
    if (hidden.size) {
      const classes = spec.classes.filter((c) => !c.group || !hidden.has(c.group));
      const keep = new Set(classes.map((c) => c.id));
      visible = { ...spec, classes, relations: spec.relations.filter((r) => keep.has(r.from) && keep.has(r.to)) };
    }
    if (!visible.classes.length) {
      this.#svg.innerHTML = '';
      this.#wrap.dataset.empty = '';
      return;
    }

    const dark = !document.documentElement.classList.contains('theme-light');
    const theme = dark ? sequenceThemeDark() : sequenceThemeLight();
    this.#theme = theme;
    this.#wrap.dataset.theme = dark ? 'dark' : 'light';

    const layout = computeClassLayout(visible);
    this.#layout = layout;
    this.#buildSvg(layout, theme);
    this.#wrap.classList.toggle('is-viewer', this.isViewer);
  }

  #buildSvg(layout, theme) {
    const { width: W, height: H } = layout;
    this.#svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.#svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.#svg.setAttribute('aria-label', layout.title || 'Diagrama de clases');
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
    // La tortuga recorre las relaciones en orden; reutiliza el motor de secuencia.
    this.#turtle.setData({
      messages: layout.edges.map((e, i) => ({
        path: e.path, step: i + 1, log: e.label || '', groupHue: e.hue,
      })),
      theme,
      viewW: W,
      viewH: H,
      autoLoop: this.isViewer,
      onState: (state) => this.dispatchEvent(new CustomEvent('is-turtle-state', {
        bubbles: true, composed: true, detail: state,
      })),
    });

    this.dispatchEvent(new CustomEvent('is-render', {
      bubbles: true, composed: true, detail: { layout, svg: this.#svg },
    }));
  }

  #buildLegend(layout, theme) {
    const g = svgEl('g', { class: 'cls-legend' });
    layout.groups.forEach((grp, gi) => {
      const ly = (layout.subtitleY || layout.titleY || 22) + 18 + gi * 16;
      const color = tkHueToHex(grp.hue) ?? theme.accent;
      const off = this.#hiddenGroups.has(grp.id);
      const item = svgEl('g', { class: 'cls-legend__item', opacity: off ? 0.4 : 1 });
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

  /** Decoración en la punta target: triángulo hueco (herencia/realización). */
  #targetTriangle(e, color, hollow) {
    return svgEl('polygon', {
      points: '0,0 -12,-6 -12,6',
      fill: hollow ? (this.#theme?.chipFill ?? '#0d1b2a') : color,
      stroke: color,
      'stroke-width': 1.2,
      transform: `translate(${e.targetTipX},${e.targetTipY}) rotate(${e.targetAngle})`,
      class: 'cls-rel__head',
    });
  }

  /** Decoración en la punta target: flecha abierta (asociación/dependencia). */
  #targetArrowOpen(e, color) {
    return svgEl('polyline', {
      points: '-9,-5 0,0 -9,5',
      fill: 'none',
      stroke: color,
      'stroke-width': 1.3,
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round',
      transform: `translate(${e.targetTipX},${e.targetTipY}) rotate(${e.targetAngle})`,
      class: 'cls-rel__head',
    });
  }

  /** Decoración en la punta source: diamante (composición rellena / agregación hueca). */
  #sourceDiamond(e, color, hollow) {
    return svgEl('polygon', {
      points: '0,0 -8,-5 -16,0 -8,5',
      fill: hollow ? (this.#theme?.chipFill ?? '#0d1b2a') : color,
      stroke: color,
      'stroke-width': 1.2,
      transform: `translate(${e.sourceTipX},${e.sourceTipY}) rotate(${e.sourceAngle})`,
      class: 'cls-rel__head',
    });
  }

  #buildEdges(layout, theme) {
    for (const e of layout.edges) {
      const color = (e.hue != null && tkHueToHex(e.hue)) || theme.accent;
      const g = svgEl('g', { class: 'cls-rel' });
      g.dataset.edgeId = e.id;

      const dashed = e.kind === 'dependency' || e.kind === 'realization';
      const path = svgEl('path', {
        d: e.path, fill: 'none', stroke: color, 'stroke-width': 1.3,
        'stroke-dasharray': dashed ? '6 4' : null, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        class: 'cls-rel__path',
      });
      g.appendChild(path);

      switch (e.kind) {
        case 'inheritance':
          g.appendChild(this.#targetTriangle(e, color, true));
          break;
        case 'realization':
          g.appendChild(this.#targetTriangle(e, color, true));
          break;
        case 'composition':
          g.appendChild(this.#sourceDiamond(e, color, false));
          g.appendChild(this.#targetArrowOpen(e, color));
          break;
        case 'aggregation':
          g.appendChild(this.#sourceDiamond(e, color, true));
          g.appendChild(this.#targetArrowOpen(e, color));
          break;
        case 'dependency':
          g.appendChild(this.#targetArrowOpen(e, color));
          break;
        default: // association
          g.appendChild(this.#targetArrowOpen(e, color));
      }

      if (e.label) {
        const pad = 4;
        const w = e.label.length * 5.6 + pad * 2;
        g.appendChild(svgEl('rect', {
          x: e.labelX - w / 2, y: e.labelY - 8, width: w, height: 16, rx: 4,
          fill: theme.chipFill, class: 'cls-rel__chip',
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
      const g = svgEl('g', { class: 'cls-node' });
      g.dataset.nodeId = n.id;
      if (this.isViewer) g.style.cursor = 'pointer';

      const box = svgEl('rect', {
        x: n.x, y: n.y, width: n.w, height: n.h, rx: 4,
        fill: theme.chipFill, stroke: color, 'stroke-width': 1.3,
        class: 'cls-node__box',
      });
      g.appendChild(box);

      for (const dy of n.dividerYs) {
        g.appendChild(svgEl('line', {
          x1: n.x, y1: n.y + dy, x2: n.x + n.w, y2: n.y + dy,
          stroke: color, 'stroke-width': 1, class: 'cls-node__divider',
        }));
      }

      for (const section of n.sections) {
        if (section.type === 'header') {
          const midY = n.y + section.h / 2;
          if (n.stereotype) {
            const st = svgEl('text', {
              x: n.x + n.w / 2, y: n.y + 13, 'text-anchor': 'middle', fill: theme.muted,
              'font-size': '9.5', 'font-family': 'Tahoma,Arial,sans-serif',
            });
            st.textContent = n.stereotype;
            g.appendChild(st);
            const nameT = svgEl('text', {
              x: n.x + n.w / 2, y: n.y + section.h - 8, 'text-anchor': 'middle', fill: theme.text,
              'font-size': '11.5', 'font-weight': '700', 'font-family': 'Tahoma,Arial,sans-serif',
            });
            nameT.textContent = n.name;
            g.appendChild(nameT);
          } else {
            const nameT = svgEl('text', {
              x: n.x + n.w / 2, y: midY + 4, 'text-anchor': 'middle', fill: theme.text,
              'font-size': '11.5', 'font-weight': '700', 'font-family': 'Tahoma,Arial,sans-serif',
            });
            nameT.textContent = n.name;
            g.appendChild(nameT);
          }
          continue;
        }
        section.rows.forEach((row, ri) => {
          const t = svgEl('text', {
            x: n.x + 8, y: n.y + section.y + 6 + ri * 16 + 10.5, fill: theme.text,
            'font-size': '10.5', 'font-family': 'Consolas,Menlo,monospace',
          });
          t.innerHTML = inlineMdWeb(row);
          g.appendChild(t);
        });
      }

      this.#svg.appendChild(g);
      this.#nodeNodes.set(n.id, { n, g, box });
    }
  }

  /* ── hover ── */

  #onClick = (e) => {
    if (this.isViewer) {
      const item = e.composedPath().find((x) => x?.dataset?.groupId);
      if (item) {
        this.dispatchEvent(new CustomEvent('is-toggle-group', {
          bubbles: true, composed: true, detail: { id: item.dataset.groupId },
        }));
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

  async #openOwnViewer() {
    await import('./diagram-lightbox.js');
    let lb = this.#ownLightbox;
    if (!lb || !lb.isConnected) {
      lb = document.createElement('is-diagram-lightbox');
      lb.setAttribute('kind', 'class');
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

    // Resalta la clase y las relaciones que la tocan; atenúa el resto.
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
    title.innerHTML = inlineMdWeb(n.name);
    this.#tooltipEl.appendChild(title);
    if (n.description) {
      const desc = document.createElement('div');
      desc.className = 'dg-tooltip__desc';
      desc.innerHTML = inlineMdWeb(n.description);
      this.#tooltipEl.appendChild(desc);
    }
  }
}

if (!customElements.get('is-class-diagram')) customElements.define('is-class-diagram', IsClassDiagram);
if (typeof window !== 'undefined') window.IsClassDiagram = IsClassDiagram;

registerDiagramKind('class', 'is-class-diagram');
registerDiagramKind('classDiagram', 'is-class-diagram');

export { IsClassDiagram };
