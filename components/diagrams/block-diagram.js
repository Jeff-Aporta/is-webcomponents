import { adoptCss } from '../_shared/adopt-css.js';
import { resolveBlockSpec, computeBlockLayout, blockShapePath } from './block-spec.js';
import { sequenceThemeDark, sequenceThemeLight } from './sequence-spec.js';
import { SequenceTurtle } from './sequence-turtle.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import { inlineMdWeb } from '../_shared/tk-inline-md.js';
import { svgIconGroup } from '../_shared/tk-icon-inline.js';
import { registerDiagramKind } from './diagram-kinds.js';

/**
 * <is-block-diagram> — diagrama de bloques en SVG, sin Mermaid.
 *
 * Configuración por JSON, igual que <is-flowchart>:
 *
 *   <is-block-diagram>
 *     <script type="application/json">
 *       { "blockDiagram": { "columns": 3, "blocks": [...], "edges": [...] } }
 *     </script>
 *   </is-block-diagram>
 *
 * A diferencia del flujo, aquí los bloques se ubican en una rejilla explícita
 * (columnas fijas + `span`), no en capas node-link.
 *
 * Atributos: variant (inline | viewer), without-viewer
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

class IsBlockDiagram extends HTMLElement {
  static get observedAttributes() { return ['variant']; }

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
  #blockNodes = new Map();
  #edgeNodes = new Map();
  #hoverId = null;
  #ownLightbox = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = /* html */ `
      <div part="base" class="wrap">
        <svg part="canvas" class="block-svg" xmlns="${SVG_NS}" role="img"></svg>
        <div part="tooltip" class="block-tooltip dg-tooltip is-rich" hidden></div>
        <div class="slot-hidden"><slot></slot></div>
      </div>
    `;
    adoptCss(shadow, import.meta.url);
    this.#wrap = shadow.querySelector('.wrap');
    this.#svg = shadow.querySelector('.block-svg');
    this.#tooltipEl = shadow.querySelector('.block-tooltip');
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

  get isViewer() { return this.getAttribute('variant') === 'viewer'; }
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
    const spec = resolveBlockSpec(this.#payload ?? {});
    this.#spec = spec;
    if (!spec) {
      this.#svg.innerHTML = '';
      this.#wrap.dataset.empty = '';
      return;
    }
    delete this.#wrap.dataset.empty;

    // Ocultar un grupo quita sus bloques y las aristas que los tocan.
    const hidden = this.#hiddenGroups;
    let visible = spec;
    if (hidden.size) {
      const blocks = spec.blocks.filter((b) => !b.group || !hidden.has(b.group));
      const keep = new Set(blocks.map((b) => b.id));
      visible = { ...spec, blocks, edges: spec.edges.filter((e) => keep.has(e.from) && keep.has(e.to)) };
    }
    if (!visible.blocks.length) {
      this.#svg.innerHTML = '';
      this.#wrap.dataset.empty = '';
      return;
    }

    const dark = !document.documentElement.classList.contains('theme-light');
    const theme = dark ? sequenceThemeDark() : sequenceThemeLight();
    this.#theme = theme;
    this.#wrap.dataset.theme = dark ? 'dark' : 'light';

    const layout = computeBlockLayout(visible);
    this.#layout = layout;
    this.#buildSvg(layout, theme);
    this.#wrap.classList.toggle('is-viewer', this.isViewer);
  }

  #buildSvg(layout, theme) {
    const { width: W, height: H } = layout;
    this.#svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.#svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.#svg.setAttribute('aria-label', layout.title || 'Diagrama de bloques');
    this.#svg.style.cssText = this.isViewer
      ? 'width:100%;height:100%;max-width:none;display:block;margin:0 auto'
      : `width:100%;max-width:${W}px;height:auto;display:block;margin:0 auto`;
    this.#svg.innerHTML = '';
    this.#blockNodes.clear();
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
    this.#buildBlocks(layout, theme);

    const turtleGroup = svgEl('g');
    this.#svg.appendChild(turtleGroup);
    this.#turtle?.destroy();
    this.#turtle = new SequenceTurtle(turtleGroup);
    this.#turtle.setData({
      messages: layout.edges.map((e, i) => ({
        path: e.path, step: i + 1, log: e.label || '', groupHue: undefined,
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
    const g = svgEl('g', { class: 'block-legend' });
    layout.groups.forEach((grp, gi) => {
      const ly = 18 + gi * 16;
      const color = tkHueToHex(grp.hue) ?? theme.accent;
      const off = this.#hiddenGroups.has(grp.id);
      const item = svgEl('g', { class: 'block-legend__item', opacity: off ? 0.4 : 1 });
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
      const color = theme.accent;
      const g = svgEl('g', { class: 'block-edge' });
      g.dataset.edgeId = e.id;

      const path = svgEl('path', {
        d: e.path, fill: 'none', stroke: color, 'stroke-width': 1.3,
        'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        class: 'block-edge__path',
      });
      g.appendChild(path);

      g.appendChild(svgEl('polygon', {
        points: '0,0 -8,-4 -8,4',
        fill: color,
        transform: `translate(${e.arrowTipX},${e.arrowTipY}) rotate(${e.arrowAngle})`,
        class: 'block-edge__head',
      }));

      if (e.label) {
        const pad = 4;
        const w = e.label.length * 5.6 + pad * 2;
        g.appendChild(svgEl('rect', {
          x: e.labelX - w / 2, y: e.labelY - 8, width: w, height: 16, rx: 4,
          fill: theme.chipFill, class: 'block-edge__chip',
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

  #buildBlocks(layout, theme) {
    for (const b of layout.blocks) {
      const color = (b.hue != null && tkHueToHex(b.hue)) || theme.accent;
      const g = svgEl('g', { class: 'block-node' });
      g.dataset.blockId = b.id;
      if (this.isViewer) g.style.cursor = 'pointer';

      const box = svgEl('path', {
        d: blockShapePath(b.shape, b.x, b.y, b.w, b.h),
        fill: theme.chipFill, stroke: color, 'stroke-width': 1.3,
        'stroke-linejoin': 'round', class: 'block-node__box',
      });
      g.appendChild(box);

      const hasIcon = !!b.icon;
      const padX = hasIcon ? 26 : 10;
      const textLeft = b.x + padX;
      const textRight = b.x + b.w - 10;

      if (hasIcon) {
        g.appendChild(svgIconGroup(b.icon, {
          x: b.x + 8, y: b.y + b.h / 2 - 8, size: 16, hue: b.hue,
        }));
      }

      if (b.label.includes('{{') || /[*`\[]/.test(b.label)) {
        const fo = svgEl('foreignObject', {
          x: textLeft, y: b.y, width: Math.max(textRight - textLeft, 8), height: b.h, overflow: 'visible',
        });
        const div = document.createElement('div');
        div.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
        div.className = 'block-node-label';
        Object.assign(div.style, {
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', height: '100%', fontSize: '11px', fontWeight: '600',
          fontFamily: 'Tahoma,Arial,sans-serif', color: theme.text,
          lineHeight: '1.2', textAlign: 'center',
        });
        div.innerHTML = inlineMdWeb(b.label);
        fo.appendChild(div);
        g.appendChild(fo);
      } else {
        const t = svgEl('text', {
          x: (textLeft + textRight) / 2, y: b.y + b.h / 2 + 4, 'text-anchor': 'middle',
          fill: theme.text, 'font-size': '11', 'font-weight': '600',
          'font-family': 'Tahoma,Arial,sans-serif',
        });
        t.textContent = b.label;
        g.appendChild(t);
      }

      this.#svg.appendChild(g);
      this.#blockNodes.set(b.id, { b, g, box });
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
    const ev = new CustomEvent('is-open-viewer', {
      bubbles: true, composed: true, cancelable: true, detail: { payload: this.#payload },
    });
    this.dispatchEvent(ev);
    if (!ev.defaultPrevented && !this.hasAttribute('without-viewer')) this.#openOwnViewer();
  };

  async #openOwnViewer() {
    await import('./diagram-lightbox.js');
    let lb = this.#ownLightbox;
    if (!lb || !lb.isConnected) {
      lb = document.createElement('is-diagram-lightbox');
      lb.setAttribute('kind', 'blockDiagram');
      lb.addEventListener('is-close', () => lb.remove());
      document.body.appendChild(lb);
      this.#ownLightbox = lb;
    }
    lb.payload = this.#payload;
    lb.open = true;
  }

  #onMouseMove = (e) => {
    if (!this.isViewer) return;
    const g = e.composedPath().find((n) => n?.dataset?.blockId);
    const id = g?.dataset.blockId ?? null;
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
    const entry = id ? this.#blockNodes.get(id) : null;

    for (const [blockId, node] of this.#blockNodes) {
      const active = blockId === id;
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
    const b = entry.b;
    this.#tooltipEl.hidden = false;
    this.#tooltipEl.innerHTML = '';
    const title = document.createElement('span');
    title.className = 'dg-tooltip__title';
    title.innerHTML = inlineMdWeb(b.label);
    this.#tooltipEl.appendChild(title);
  }
}

if (!customElements.get('is-block-diagram')) customElements.define('is-block-diagram', IsBlockDiagram);
if (typeof window !== 'undefined') window.IsBlockDiagram = IsBlockDiagram;

registerDiagramKind('block', 'is-block-diagram');
registerDiagramKind('blockDiagram', 'is-block-diagram');

export { IsBlockDiagram };
