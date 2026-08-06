import { adoptCss } from '../_shared/adopt-css.js';
import { resolveMindmapSpec, computeMindmapLayout } from './mindmap-spec.js';
import { sequenceThemeDark, sequenceThemeLight } from './sequence-spec.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import { inlineMdWeb } from '../_shared/tk-inline-md.js';
import { svgIconGroup } from '../_shared/tk-icon-inline.js';
import { registerDiagramKind } from './diagram-kinds.js';

/**
 * <is-mindmap> — mapa mental en SVG, sin Mermaid.
 *
 *   <is-mindmap>
 *     <script type="application/json">
 *       { "mindmap": { "layout": "radial", "nodes": [...] } }
 *     </script>
 *   </is-mindmap>
 *
 * Mismo esqueleto que <is-flowchart>: shadow DOM, slot JSON + MutationObserver,
 * tema por atributo `data-theme`, `color` (inline | viewer), lightbox propio.
 *
 * Atributos: color (inline | viewer), open-on-click
 * Propiedades: payload, spec, layout
 * Eventos: is-render, is-open-viewer
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v != null) n.setAttribute(k, v);
  }
  return n;
}

class IsMindmap extends HTMLElement {
  static get observedAttributes() { return ['color']; }

  #wrap; #svg; #tooltipEl;
  #payload = null;
  #spec = null;
  #layout = null;
  #mounted = false;
  #mo = null; #themeObs = null;
  #renderQueued = false;
  #nodeNodes = new Map();
  #edgeNodes = new Map();
  #hoverId = null;
  #ownLightbox = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = /* html */ `
      <div part="base" class="wrap">
        <svg part="canvas" class="mm-svg" xmlns="${SVG_NS}" role="img"></svg>
        <div part="tooltip" class="mm-tooltip dg-tooltip is-rich" hidden></div>
        <div class="slot-hidden"><slot></slot></div>
      </div>
    `;
    adoptCss(shadow, import.meta.url);
    this.#wrap = shadow.querySelector('.wrap');
    this.#svg = shadow.querySelector('.mm-svg');
    this.#tooltipEl = shadow.querySelector('.mm-tooltip');
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
  set payload(v) { this.#payload = v; this.#queueRender(); }
  get spec() { return this.#spec; }
  get layout() { return this.#layout; }

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
    const spec = resolveMindmapSpec(this.#payload ?? {});
    this.#spec = spec;
    if (!spec) {
      this.#svg.innerHTML = '';
      this.#wrap.dataset.empty = '';
      return;
    }
    delete this.#wrap.dataset.empty;

    const dark = !document.documentElement.classList.contains('theme-light');
    const theme = dark ? sequenceThemeDark() : sequenceThemeLight();
    this.#wrap.dataset.theme = dark ? 'dark' : 'light';

    const layout = computeMindmapLayout(spec);
    this.#layout = layout;
    this.#buildSvg(layout, theme);
    this.#wrap.classList.toggle('is-viewer', this.isViewer);
  }

  #buildSvg(layout, theme) {
    const { width: W, height: H } = layout;
    this.#svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.#svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.#svg.setAttribute('aria-label', layout.title || 'Mapa mental');
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

    this.#buildEdges(layout, theme);
    this.#buildNodes(layout, theme);

    this.dispatchEvent(new CustomEvent('is-render', {
      bubbles: true, composed: true, detail: { layout, svg: this.#svg },
    }));
  }

  #buildEdges(layout, theme) {
    for (const e of layout.edges) {
      const color = (e.hue != null && tkHueToHex(e.hue)) || theme.accent;
      const path = svgEl('path', {
        d: e.path, fill: 'none', stroke: color, 'stroke-width': e.width,
        'stroke-linecap': 'round', class: 'mm-edge',
      });
      path.dataset.edgeId = e.id;
      this.#svg.appendChild(path);
      this.#edgeNodes.set(e.id, { e, path });
    }
  }

  #buildNodes(layout, theme) {
    // Las hojas van primero (por debajo visualmente no aplica en SVG, pero
    // mantener el orden del árbol favorece que el hover de un padre no tape
    // el subrayado de sus hijos).
    for (const n of layout.nodes) {
      const color = (n.hue != null && tkHueToHex(n.hue)) || theme.accent;
      const g = svgEl('g', { class: `mm-node mm-node--${n.kind}` });
      g.dataset.nodeId = n.id;
      if (this.isViewer) g.style.cursor = 'pointer';

      if (n.kind === 'root' || n.kind === 'branch') {
        const rx = n.h / 2;
        g.appendChild(svgEl('rect', {
          x: n.x, y: n.y, width: n.w, height: n.h, rx,
          fill: n.kind === 'root' ? color : 'transparent',
          stroke: color, 'stroke-width': n.kind === 'root' ? 0 : 1.6,
          class: 'mm-node__pill',
        }));
      } else {
        g.appendChild(svgEl('line', {
          x1: n.x, y1: n.y + n.h, x2: n.x + n.w, y2: n.y + n.h,
          stroke: color, 'stroke-width': 1.6, class: 'mm-node__underline',
        }));
      }

      const hasIcon = !!n.icon;
      const padX = hasIcon ? 24 : (n.kind === 'leaf' ? 2 : 10);
      const textLeft = n.x + padX;
      const textRight = n.x + n.w - (n.kind === 'leaf' ? 2 : 10);

      if (hasIcon) {
        g.appendChild(svgIconGroup(n.icon, {
          x: n.x + (n.kind === 'leaf' ? 0 : 8), y: n.y + n.h / 2 - 8, size: 16, hue: n.hue,
        }));
      }

      const textFill = n.kind === 'root' ? (theme.dotText ?? '#fff') : theme.text;
      if (n.label.includes('{{') || /[*`\[]/.test(n.label)) {
        const fo = svgEl('foreignObject', {
          x: textLeft, y: n.y, width: Math.max(textRight - textLeft, 8), height: n.h, overflow: 'visible',
        });
        const div = document.createElement('div');
        div.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
        div.className = 'mm-node-label';
        Object.assign(div.style, {
          display: 'flex', alignItems: 'center',
          justifyContent: n.kind === 'leaf' ? 'flex-start' : 'center',
          width: '100%', height: '100%',
          fontSize: n.kind === 'root' ? '12px' : '11px',
          fontWeight: n.kind === 'leaf' ? '500' : '600',
          fontFamily: 'Tahoma,Arial,sans-serif', color: textFill,
          lineHeight: '1.2', textAlign: n.kind === 'leaf' ? 'left' : 'center',
        });
        div.innerHTML = inlineMdWeb(n.label);
        fo.appendChild(div);
        g.appendChild(fo);
      } else {
        const t = svgEl('text', {
          x: n.kind === 'leaf' ? textLeft : (textLeft + textRight) / 2,
          y: n.y + n.h / 2 + 4,
          'text-anchor': n.kind === 'leaf' ? 'start' : 'middle',
          fill: textFill,
          'font-size': n.kind === 'root' ? '12' : '11',
          'font-weight': n.kind === 'leaf' ? '500' : '600',
          'font-family': 'Tahoma,Arial,sans-serif',
        });
        t.textContent = n.label;
        g.appendChild(t);
      }

      this.#svg.appendChild(g);
      this.#nodeNodes.set(n.id, { n, g });
    }
  }

  /* ── interacción ── */

  #onClick = () => {
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
      lb.setAttribute('kind', 'mindmap');
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

    for (const [nodeId, node] of this.#nodeNodes) {
      const active = nodeId === id;
      node.g.classList.toggle('is-active', active);
      node.g.classList.toggle('is-dim', !!id && !active);
    }
    for (const [, edge] of this.#edgeNodes) {
      const touches = !!id && (edge.e.from === id || edge.e.to === id);
      edge.path.classList.toggle('is-active', touches);
      edge.path.classList.toggle('is-dim', !!id && !touches);
    }

    if (!entry) {
      this.#tooltipEl.hidden = true;
      return;
    }
    const n = entry.n;
    this.#tooltipEl.hidden = false;
    this.#tooltipEl.innerHTML = '';
    const t = document.createElement('span');
    t.className = 'dg-tooltip__title';
    t.innerHTML = inlineMdWeb(n.label);
    this.#tooltipEl.appendChild(t);
    if (n.description) {
      const desc = document.createElement('div');
      desc.className = 'dg-tooltip__desc';
      desc.innerHTML = inlineMdWeb(n.description);
      this.#tooltipEl.appendChild(desc);
    }
  }
}

if (!customElements.get('is-mindmap')) customElements.define('is-mindmap', IsMindmap);
if (typeof window !== 'undefined') window.IsMindmap = IsMindmap;

registerDiagramKind('mindmap', 'is-mindmap');

export { IsMindmap };
