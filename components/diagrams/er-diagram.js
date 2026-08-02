import { adoptCss } from '../_shared/adopt-css.js';
import { resolveErSpec, computeErLayout, entityBoxPath, ER_HEADER_H, ER_ROW_H } from './er-spec.js';
import { sequenceThemeDark, sequenceThemeLight } from './sequence-spec.js';
import { SequenceTurtle } from './sequence-turtle.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import { inlineMdWeb } from '../_shared/tk-inline-md.js';
import { registerDiagramKind } from './diagram-kinds.js';

/**
 * <is-er-diagram> — diagrama entidad-relación en SVG, sin Mermaid.
 *
 * Configuración por JSON, igual que <is-flowchart>:
 *
 *   <is-er-diagram>
 *     <script type="application/json">
 *       { "erDiagram": { "entities": [...], "relations": [...] } }
 *     </script>
 *   </is-er-diagram>
 *
 * Atributos: color (inline | viewer), without-viewer
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

class IsErDiagram extends HTMLElement {
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
  #entityNodes = new Map();
  #relNodes = new Map();
  #hoverId = null;
  #ownLightbox = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = /* html */ `
      <div part="base" class="wrap">
        <svg part="canvas" class="er-svg" xmlns="${SVG_NS}" role="img"></svg>
        <div part="tooltip" class="er-tooltip dg-tooltip is-rich" hidden></div>
        <div class="slot-hidden"><slot></slot></div>
      </div>
    `;
    adoptCss(shadow, import.meta.url);
    this.#wrap = shadow.querySelector('.wrap');
    this.#svg = shadow.querySelector('.er-svg');
    this.#tooltipEl = shadow.querySelector('.er-tooltip');
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
    const spec = resolveErSpec(this.#payload ?? {});
    this.#spec = spec;
    if (!spec) {
      this.#svg.innerHTML = '';
      this.#wrap.dataset.empty = '';
      return;
    }
    delete this.#wrap.dataset.empty;

    // Ocultar un grupo quita sus entidades y las relaciones que las tocan.
    const hidden = this.#hiddenGroups;
    let visible = spec;
    if (hidden.size) {
      const entities = spec.entities.filter((e) => !e.group || !hidden.has(e.group));
      const keep = new Set(entities.map((e) => e.id));
      visible = { ...spec, entities, relations: spec.relations.filter((r) => keep.has(r.from) && keep.has(r.to)) };
    }
    if (!visible.entities.length) {
      this.#svg.innerHTML = '';
      this.#wrap.dataset.empty = '';
      return;
    }

    const dark = !document.documentElement.classList.contains('theme-light');
    const theme = dark ? sequenceThemeDark() : sequenceThemeLight();
    this.#theme = theme;
    this.#wrap.dataset.theme = dark ? 'dark' : 'light';

    const layout = computeErLayout(visible);
    this.#layout = layout;
    this.#buildSvg(layout, theme);
    this.#wrap.classList.toggle('is-viewer', this.isViewer);
  }

  #buildSvg(layout, theme) {
    const { width: W, height: H } = layout;
    this.#svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.#svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.#svg.setAttribute('aria-label', layout.title || 'Diagrama entidad-relación');
    this.#svg.style.cssText = this.isViewer
      ? 'width:100%;height:100%;max-width:none;display:block;margin:0 auto'
      : `width:100%;max-width:${W}px;height:auto;display:block;margin:0 auto`;
    this.#svg.innerHTML = '';
    this.#entityNodes.clear();
    this.#relNodes.clear();
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
    this.#buildRelations(layout, theme);
    this.#buildEntities(layout, theme);

    const turtleGroup = svgEl('g');
    this.#svg.appendChild(turtleGroup);
    this.#turtle?.destroy();
    this.#turtle = new SequenceTurtle(turtleGroup);
    this.#turtle.setData({
      messages: layout.relations.map((r, i) => ({
        path: r.path, step: i + 1, log: r.label || '', groupHue: undefined,
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
    const g = svgEl('g', { class: 'er-legend' });
    layout.groups.forEach((grp, gi) => {
      const ly = 18 + gi * 16;
      const color = tkHueToHex(grp.hue) ?? theme.accent;
      const off = this.#hiddenGroups.has(grp.id);
      const item = svgEl('g', { class: 'er-legend__item', opacity: off ? 0.4 : 1 });
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

  #buildRelations(layout, theme) {
    for (const r of layout.relations) {
      const color = theme.accent;
      const g = svgEl('g', { class: 'er-rel' });
      g.dataset.relId = r.id;

      const path = svgEl('path', {
        d: r.path, fill: 'none', stroke: color, 'stroke-width': 1.3,
        'stroke-dasharray': r.identifying ? null : '6 4',
        'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        class: 'er-rel__path',
      });
      g.appendChild(path);

      g.appendChild(this.#buildMark(r.fromMark, color));
      g.appendChild(this.#buildMark(r.toMark, color));

      if (r.label) {
        const pad = 4;
        const w = r.label.length * 5.6 + pad * 2;
        g.appendChild(svgEl('rect', {
          x: r.labelX - w / 2, y: r.labelY - 8, width: w, height: 16, rx: 4,
          fill: theme.chipFill, class: 'er-rel__chip',
        }));
        const t = svgEl('text', {
          x: r.labelX, y: r.labelY + 3.5, 'text-anchor': 'middle', fill: theme.muted,
          'font-size': '10', 'font-family': 'Consolas,Menlo,monospace',
        });
        t.textContent = r.label;
        g.appendChild(t);
      }

      this.#svg.appendChild(g);
      this.#relNodes.set(r.id, { r, g, path });
    }
  }

  /** Marca de cardinalidad (pata de gallo / tick / círculo) en un extremo de relación. */
  #buildMark(mark, color) {
    const g = svgEl('g', {
      class: 'er-rel__mark',
      transform: `translate(${mark.x},${mark.y}) rotate(${mark.angle})`,
    });
    g.appendChild(svgEl('path', { d: mark.path, stroke: color, fill: 'none', 'stroke-width': 1.3 }));
    if (mark.circle) {
      g.appendChild(svgEl('circle', {
        cx: mark.circle.cx, cy: mark.circle.cy, r: mark.circle.r,
        stroke: color, fill: 'var(--er-circle-fill, #10141a)', 'stroke-width': 1.3,
      }));
    }
    return g;
  }

  #buildEntities(layout, theme) {
    for (const e of layout.entities) {
      const color = (e.hue != null && tkHueToHex(e.hue)) || theme.accent;
      const g = svgEl('g', { class: 'er-entity' });
      g.dataset.entityId = e.id;
      if (this.isViewer) g.style.cursor = 'pointer';

      const box = svgEl('path', {
        d: entityBoxPath(e.x, e.y, e.w, e.h),
        fill: theme.chipFill, stroke: color, 'stroke-width': 1.3,
        'stroke-linejoin': 'round', class: 'er-entity__box',
      });
      g.appendChild(box);

      // Encabezado con tinte del hue del grupo (esquinas superiores ligeramente
      // insertas: aproxima el redondeo de la caja sin necesitar un clip-path aparte).
      const headerFill = e.hue != null ? `hsla(${e.hue},65%,55%,0.22)` : theme.chipFill;
      g.appendChild(svgEl('rect', {
        x: e.x + 1, y: e.y + 1, width: e.w - 2, height: ER_HEADER_H - 1, rx: 6,
        fill: headerFill, class: 'er-entity__header',
      }));
      const nameT = svgEl('text', {
        x: e.x + e.w / 2, y: e.y + ER_HEADER_H / 2 + 4, 'text-anchor': 'middle',
        fill: theme.text, 'font-size': '11', 'font-weight': '700',
        'font-family': 'Tahoma,Arial,sans-serif',
      });
      nameT.textContent = e.name;
      g.appendChild(nameT);

      e.attributes.forEach((a, i) => {
        const ry = e.y + ER_HEADER_H + i * ER_ROW_H + ER_ROW_H / 2 + 4;
        let leftX = e.x + 10;
        if (a.key) {
          const badge = svgEl('text', {
            x: leftX, y: ry, fill: color, 'font-size': '9', 'font-weight': '700',
            'font-family': 'Consolas,Menlo,monospace',
          });
          badge.textContent = a.key;
          g.appendChild(badge);
          leftX += 20;
        }
        const nameEl = svgEl('text', {
          x: leftX, y: ry, fill: theme.text, 'font-size': '10.5',
          'font-family': 'Tahoma,Arial,sans-serif',
        });
        nameEl.textContent = a.name;
        g.appendChild(nameEl);

        if (a.type) {
          const typeEl = svgEl('text', {
            x: e.x + e.w - 10, y: ry, 'text-anchor': 'end', fill: theme.muted,
            'font-size': '9.5', 'font-family': 'Consolas,Menlo,monospace',
          });
          typeEl.textContent = a.type;
          g.appendChild(typeEl);
        }
      });

      this.#svg.appendChild(g);
      this.#entityNodes.set(e.id, { e, g, box });
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
      lb.setAttribute('kind', 'erDiagram');
      lb.addEventListener('is-close', () => lb.remove());
      document.body.appendChild(lb);
      this.#ownLightbox = lb;
    }
    lb.payload = this.#payload;
    lb.open = true;
  }

  #onMouseMove = (e) => {
    if (!this.isViewer) return;
    const g = e.composedPath().find((n) => n?.dataset?.entityId);
    const id = g?.dataset.entityId ?? null;
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
    const entry = id ? this.#entityNodes.get(id) : null;

    for (const [entityId, node] of this.#entityNodes) {
      const active = entityId === id;
      node.g.classList.toggle('is-active', active);
      node.g.classList.toggle('is-dim', !!id && !active);
      node.box.setAttribute('stroke-width', active ? 2.1 : 1.3);
    }
    for (const [, rel] of this.#relNodes) {
      const touches = !!id && (rel.r.from === id || rel.r.to === id);
      rel.g.classList.toggle('is-active', touches);
      rel.g.classList.toggle('is-dim', !!id && !touches);
    }

    this.#turtle?.setPaused(!!id);

    if (!entry) {
      this.#tooltipEl.hidden = true;
      return;
    }
    const e = entry.e;
    this.#tooltipEl.hidden = false;
    this.#tooltipEl.innerHTML = '';
    const title = document.createElement('span');
    title.className = 'dg-tooltip__title';
    title.innerHTML = inlineMdWeb(e.name);
    this.#tooltipEl.appendChild(title);
    if (e.attributes.length) {
      const desc = document.createElement('div');
      desc.className = 'dg-tooltip__desc';
      desc.innerHTML = e.attributes
        .map((a) => `${a.key ? `<b>${a.key}</b> ` : ''}${inlineMdWeb(a.name)}${a.type ? ` <i>${a.type}</i>` : ''}`)
        .join('<br>');
      this.#tooltipEl.appendChild(desc);
    }
  }
}

if (!customElements.get('is-er-diagram')) customElements.define('is-er-diagram', IsErDiagram);
if (typeof window !== 'undefined') window.IsErDiagram = IsErDiagram;

registerDiagramKind('er', 'is-er-diagram');
registerDiagramKind('erDiagram', 'is-er-diagram');

export { IsErDiagram };
