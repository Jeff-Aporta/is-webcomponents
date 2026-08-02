import { adoptCss } from '../_shared/adopt-css.js';
import { resolveTreemapSpec, computeTreemapLayout } from './treemap-spec.js';
import { sequenceThemeDark, sequenceThemeLight } from '../diagrams/sequence-spec.js';
import { tkHueToCss } from '../_shared/tk-hue.js';
import { inlineMdWeb } from '../_shared/tk-inline-md.js';
import { registerDiagramKind } from '../diagrams/diagram-kinds.js';

/**
 * <is-treemap> — treemap anidado en SVG (algoritmo squarified), sin librerías.
 *
 *   <is-treemap>
 *     <script type="application/json">
 *       { "treemap": { "nodes": [{ "id":"inv", "label":"Inventario", "value":3200 }] } }
 *     </script>
 *   </is-treemap>
 *
 * Mismo esqueleto que <is-flowchart> / <is-mindmap>: shadow DOM, slot JSON +
 * MutationObserver, tema por atributo `data-theme`, `color` (inline | viewer),
 * lightbox propio.
 *
 * Atributos: color (inline | viewer), without-viewer
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

function fmtValue(v) {
  return new Intl.NumberFormat('es-CO').format(Math.round(v));
}

class IsTreemap extends HTMLElement {
  static get observedAttributes() { return ['color']; }

  #wrap; #svg; #tooltipEl;
  #payload = null;
  #spec = null;
  #layout = null;
  #mounted = false;
  #mo = null; #themeObs = null;
  #renderQueued = false;
  #nodeNodes = new Map();
  #hoverId = null;
  #ownLightbox = null;
  #ro = null;
  #lastWidth = 0;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = /* html */ `
      <div part="base" class="wrap">
        <svg part="canvas" class="tm-svg" xmlns="${SVG_NS}" role="img"></svg>
        <div part="tooltip" class="tm-tooltip dg-tooltip is-rich" hidden></div>
        <div class="slot-hidden"><slot></slot></div>
      </div>
    `;
    adoptCss(shadow, import.meta.url);
    this.#wrap = shadow.querySelector('.wrap');
    this.#svg = shadow.querySelector('.tm-svg');
    this.#tooltipEl = shadow.querySelector('.tm-tooltip');
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
    if (typeof ResizeObserver !== 'undefined') {
      this.#ro = new ResizeObserver(() => {
        const w = this.#wrap.clientWidth;
        if (w && Math.abs(w - this.#lastWidth) > 4) {
          this.#lastWidth = w;
          this.#queueRender();
        }
      });
      this.#ro.observe(this.#wrap);
    }
    this.#queueRender();
  }

  disconnectedCallback() {
    this.#mounted = false;
    this.#mo?.disconnect();
    this.#themeObs?.disconnect();
    this.#ro?.disconnect();
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
    const spec = resolveTreemapSpec(this.#payload ?? {});
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
    // El tema del secuencia no trae un color de superficie real (`panel` es
    // 'transparent'); lo leemos del sistema para usarlo como gap entre
    // tesela — igual que pie/doughnut usan `--chart-surface` como separador
    // en vez del propio color de cada porción.
    const cs = getComputedStyle(this);
    theme.surface = cs.getPropertyValue('--is-bg-elev').trim() || (dark ? '#1c2128' : '#ffffff');
    theme.headerTint = dark ? 'rgba(0,0,0,.22)' : 'rgba(0,0,0,.10)';

    const availW = this.#wrap.clientWidth || 0;
    const layout = computeTreemapLayout(spec, {
      width: availW > 80 ? Math.max(160, availW - 8) : undefined,
    });
    this.#lastWidth = availW;
    this.#layout = layout;
    this.#buildSvg(layout, theme);
    this.#wrap.classList.toggle('is-viewer', this.isViewer);
  }

  #buildSvg(layout, theme) {
    const { width: W, height: H } = layout;
    this.#svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.#svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.#svg.setAttribute('aria-label', layout.title || 'Treemap');
    this.#svg.style.cssText = this.isViewer
      ? 'width:100%;height:100%;max-width:none;display:block;margin:0 auto'
      : 'width:100%;max-width:100%;height:auto;display:block;margin:0 auto';
    this.#svg.innerHTML = '';
    this.#nodeNodes.clear();
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

    this.#buildNodes(layout, theme);

    this.dispatchEvent(new CustomEvent('is-render', {
      bubbles: true, composed: true, detail: { layout, svg: this.#svg },
    }));
  }

  #buildNodes(layout, theme) {
    // Orden pre-order: el rect del padre se pinta primero y los hijos lo tapan,
    // dejando visible solo la franja superior como rótulo del contenedor.
    for (const n of layout.nodes) {
      const fill = (n.hue != null && tkHueToCss(n.hue, 62, n.lightness)) || theme.accent;
      const g = svgEl('g', { class: 'tm-node' });
      g.dataset.nodeId = n.id;
      if (this.isViewer) g.style.cursor = 'pointer';

      // El gap entre teselas usa el color de SUPERFICIE (como pie/doughnut
      // separan sus rebanadas), no el tono propio del nodo — así se leen
      // como tiles distintos en vez de un bloque continuo del mismo color.
      const rx = Math.min(3, n.w / 2, n.h / 2);
      g.appendChild(svgEl('rect', {
        x: n.x, y: n.y, width: n.w, height: n.h, rx,
        fill, stroke: theme.surface, 'stroke-width': 2, class: 'tm-node__rect',
      }));

      // Franja de cabecera del contenedor: un tinte propio (no solo texto en
      // negrita sobre el mismo color) para que se lea como encabezado y no
      // como parte plana del relleno.
      if (n.hasChildren) {
        const headerH = Math.min(14, n.h);
        g.appendChild(svgEl('rect', {
          x: n.x + 1, y: n.y + 1, width: Math.max(n.w - 2, 0), height: Math.max(headerH - 2, 0),
          fill: theme.headerTint, class: 'tm-node__header',
        }));
      }

      if (n.showLabel) {
        const t = svgEl('text', {
          x: n.x + 6, y: n.y + (n.hasChildren ? 10 : n.h / 2 + 4),
          fill: theme.dotText ?? '#fff', 'font-size': n.hasChildren ? '10' : '11',
          'font-weight': n.hasChildren ? '700' : '600',
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
    const ev = new CustomEvent('is-open-viewer', {
      bubbles: true, composed: true, cancelable: true, detail: { payload: this.#payload },
    });
    this.dispatchEvent(ev);
    if (!ev.defaultPrevented && !this.hasAttribute('without-viewer')) this.#openOwnViewer();
  };

  async #openOwnViewer() {
    await import('../diagrams/diagram-lightbox.js');
    let lb = this.#ownLightbox;
    if (!lb || !lb.isConnected) {
      lb = document.createElement('is-diagram-lightbox');
      lb.setAttribute('kind', 'treemap');
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
    const row = document.createElement('div');
    row.className = 'dg-tooltip__row';
    row.innerHTML = `<span>${fmtValue(n.value)}</span><span class="dg-tooltip__value">${n.percent.toFixed(1)}%</span>`;
    this.#tooltipEl.appendChild(row);
  }
}

if (!customElements.get('is-treemap')) customElements.define('is-treemap', IsTreemap);
if (typeof window !== 'undefined') window.IsTreemap = IsTreemap;

registerDiagramKind('treemap', 'is-treemap');

export { IsTreemap };
