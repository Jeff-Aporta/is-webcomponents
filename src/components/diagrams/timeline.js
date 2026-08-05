import { adoptCss } from '../_shared/adopt-css.js';
import { resolveTimelineSpec, computeTimelineLayout } from './timeline-spec.js';
import { sequenceThemeDark, sequenceThemeLight } from './sequence-spec.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import { inlineMdWeb } from '../_shared/tk-inline-md.js';
import { registerDiagramKind } from './diagram-kinds.js';

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

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v != null) n.setAttribute(k, v);
  }
  return n;
}

class IsTimeline extends HTMLElement {
  static get observedAttributes() { return ['color']; }

  #wrap; #svg; #tooltipEl;
  #payload = null;
  #spec = null;
  #layout = null;
  #mounted = false;
  #mo = null; #themeObs = null;
  #renderQueued = false;
  #hiddenGroups = new Set();
  #eventNodes = new Map();
  #hoverId = null;
  #ownLightbox = null;
  #ro = null;
  #lastWidth = 0;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = /* html */ `
      <div part="base" class="wrap">
        <svg part="canvas" class="tl-svg" xmlns="${SVG_NS}" role="img"></svg>
        <div part="tooltip" class="tl-tooltip dg-tooltip is-rich" hidden></div>
        <div class="slot-hidden"><slot></slot></div>
      </div>
    `;
    adoptCss(shadow, import.meta.url);
    this.#wrap = shadow.querySelector('.wrap');
    this.#svg = shadow.querySelector('.tl-svg');
    this.#tooltipEl = shadow.querySelector('.tl-tooltip');
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
    // Re-layout cuando cambia el ancho del contenedor (fit-width).
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
  set payload(v) { this.#payload = v; this.#hiddenGroups = new Set(); this.#queueRender(); }
  get spec() { return this.#spec; }
  get layout() { return this.#layout; }
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
    const spec = resolveTimelineSpec(this.#payload ?? {});
    this.#spec = spec;
    if (!spec) {
      this.#svg.innerHTML = '';
      this.#wrap.dataset.empty = '';
      return;
    }
    delete this.#wrap.dataset.empty;

    const hidden = this.#hiddenGroups;
    let visible = spec;
    if (hidden.size) {
      const events = spec.events.filter((e) => !e.group || !hidden.has(e.group));
      visible = { ...spec, events };
    }
    if (!visible.events.length) {
      this.#svg.innerHTML = '';
      this.#wrap.dataset.empty = '';
      return;
    }

    const dark = !document.documentElement.classList.contains('theme-light');
    const theme = dark ? sequenceThemeDark() : sequenceThemeLight();
    this.#wrap.dataset.theme = dark ? 'dark' : 'light';

    // `Date.now()` se llama solo aquí (en el componente), nunca dentro del
    // módulo de spec puro, para que el layout siga siendo determinista.
    const availW = this.#wrap.clientWidth || 0;
    const layout = computeTimelineLayout(visible, {
      now: Date.now(),
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
    this.#svg.setAttribute('aria-label', layout.title || 'Línea de tiempo');
    this.#svg.style.cssText = this.isViewer
      ? 'width:100%;height:100%;max-width:none;display:block;margin:0 auto'
      : 'width:100%;max-width:100%;height:auto;display:block;margin:0 auto';
    this.#svg.innerHTML = '';
    this.#eventNodes.clear();
    this.#hoverId = null;

    if (layout.title) {
      const t = svgEl('text', {
        x: W / 2, y: layout.titleY, 'text-anchor': 'middle', fill: theme.text,
        'font-size': '13', 'font-weight': '600', 'font-family': 'Tahoma,Arial,sans-serif',
      });
      t.textContent = layout.title;
      this.#svg.appendChild(t);
    }

    if (layout.groups?.length) this.#buildLegend(layout, theme);
    this.#buildAxis(layout, theme);
    this.#buildEvents(layout, theme);

    this.dispatchEvent(new CustomEvent('is-render', {
      bubbles: true, composed: true, detail: { layout, svg: this.#svg },
    }));
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
    this.#svg.appendChild(g);
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

      this.#svg.appendChild(g);
      this.#eventNodes.set(e.id, { e, g });
    }
  }

  #buildLegend(layout, theme) {
    const g = svgEl('g', { class: 'tl-legend' });
    layout.groups.forEach((grp, gi) => {
      const ly = 18 + gi * 16;
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
    this.#svg.appendChild(g);
  }

  /* ── hover / click ── */

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
      lb.setAttribute('kind', 'timeline');
      lb.addEventListener('is-close', () => lb.remove());
      document.body.appendChild(lb);
      this.#ownLightbox = lb;
    }
    lb.payload = this.#payload;
    lb.open = true;
  }

  #onMouseMove = (e) => {
    if (!this.isViewer) return;
    const g = e.composedPath().find((n) => n?.dataset?.eventId);
    const id = g?.dataset.eventId ?? null;
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
    const entry = id ? this.#eventNodes.get(id) : null;

    for (const [eventId, node] of this.#eventNodes) {
      const active = eventId === id;
      node.g.classList.toggle('is-active', active);
      node.g.classList.toggle('is-dim', !!id && !active);
    }

    if (!entry) {
      this.#tooltipEl.hidden = true;
      return;
    }
    const e = entry.e;
    this.#tooltipEl.hidden = false;
    this.#tooltipEl.innerHTML = '';
    const title = document.createElement('span');
    title.className = 'dg-tooltip__title';
    title.innerHTML = inlineMdWeb(e.label);
    this.#tooltipEl.appendChild(title);
    if (e.desc) {
      const desc = document.createElement('div');
      desc.className = 'dg-tooltip__desc';
      desc.innerHTML = inlineMdWeb(e.desc);
      this.#tooltipEl.appendChild(desc);
    }
  }
}

if (!customElements.get('is-timeline')) customElements.define('is-timeline', IsTimeline);
if (typeof window !== 'undefined') window.IsTimeline = IsTimeline;

registerDiagramKind('timeline', 'is-timeline');

export { IsTimeline };
