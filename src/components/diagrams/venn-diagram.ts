import { adoptCss, defineElement, emit } from '../../core/element.js';
import { DiagramElementBase } from '../_shared/diagram-element-base.js';
import { resolveVennSpec, computeVennLayout } from './venn-spec.js';
import { sequenceThemeDark, sequenceThemeLight } from './sequence-spec.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import { inlineMdWeb } from '../_shared/tk-inline-md.js';
import { registerDiagramKind } from './diagram-kinds.js';
import { svgEl } from '../_shared/svg-chart-engine.js';

/**
 * <is-venn-diagram> — diagrama de Venn (2 o 3 conjuntos) en SVG, sin Mermaid.
 *
 *   <is-venn-diagram>
 *     <script type="application/json">
 *       { "venn": { "sets": [...], "regions": [{ "sets": ["a","b"], "label": "Ambos" }] } }
 *     </script>
 *   </is-venn-diagram>
 *
 * Mismo esqueleto que <is-flowchart>: shadow DOM, slot JSON + MutationObserver,
 * tema por atributo `data-theme`, `color` (inline | viewer), lightbox propio.
 *
 * Atributos: color (inline | viewer), open-on-click
 * Propiedades: payload, spec, layout
 * Eventos: is-render, is-open-viewer
 */

class IsVennDiagram extends DiagramElementBase {
  #circleNodes = new Map();
  #regionNodes = new Map();
  #hoverId = null;

  constructor() {
    super();
    this.initDiagramShadow('vn-svg', 'vn-tooltip');
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

  renderDiagram() {
    const spec = resolveVennSpec(this.payload ?? {});
    this.spec = spec;
    if (!spec) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }
    delete this.wrap.dataset.empty;

    const theme = this.isDarkTheme ? sequenceThemeDark() : sequenceThemeLight();
    this.syncThemeAttr();

    const layout = computeVennLayout(spec);
    this.layout = layout;
    this.#buildSvg(layout, theme);
    this.wrap.classList.toggle('is-viewer', this.isViewer);
  }

  #buildSvg(layout, theme) {
    const { width: W, height: H } = layout;
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.setAttribute('aria-label', layout.title || 'Diagrama de Venn');
    this.svg.style.cssText = 'width:100%;height:100%;max-width:none;display:block;margin:0 auto';
    this.svg.innerHTML = '';
    this.#circleNodes.clear();
    this.#regionNodes.clear();
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

    this.#buildCircles(layout, theme);
    this.#buildRegions(layout, theme);

    emit(this, 'is-render', { layout, svg: this.svg });
  }

  #buildCircles(layout, theme) {
    for (const c of layout.circles) {
      const color = tkHueToHex(c.hue) ?? theme.accent;
      const g = svgEl('g', { class: 'vn-set' });
      g.dataset.setId = c.id;
      if (this.isViewer) g.style.cursor = 'pointer';

      // Relleno translúcido: la intersección se ve por superposición, sin
      // recortes ni máscaras — así el orden de los conjuntos no importa.
      g.appendChild(svgEl('circle', {
        cx: c.cx, cy: c.cy, r: c.r, fill: color, 'fill-opacity': 0.22,
        stroke: color, 'stroke-width': 1.4, class: 'vn-set__circle',
      }));

      const t = svgEl('text', {
        x: c.labelX, y: c.labelY, 'text-anchor': 'middle', fill: theme.text,
        'font-size': '11', 'font-weight': '600', 'font-family': 'Tahoma,Arial,sans-serif',
        class: 'vn-set__label',
      });
      t.innerHTML = inlineMdWeb(c.label);
      g.appendChild(t);

      this.svg.appendChild(g);
      this.#circleNodes.set(c.id, { c, g });
    }
  }

  #buildRegions(layout, theme) {
    for (const r of layout.regions) {
      if (!r.label && r.value == null) continue;
      const g = svgEl('g', { class: 'vn-region' });
      g.dataset.regionId = r.id;

      const text = r.label ?? '';
      if (text) {
        const t = svgEl('text', {
          x: r.x, y: r.y, 'text-anchor': 'middle', fill: theme.text,
          'font-size': '10.5', 'font-family': 'Tahoma,Arial,sans-serif',
          class: 'vn-region__label',
        });
        t.innerHTML = inlineMdWeb(text);
        g.appendChild(t);
      }
      if (r.value != null) {
        const v = svgEl('text', {
          x: r.x, y: r.y + (text ? 14 : 0), 'text-anchor': 'middle', fill: theme.muted,
          'font-size': '10', 'font-family': 'Consolas,Menlo,monospace',
          class: 'vn-region__value',
        });
        v.textContent = String(r.value);
        g.appendChild(v);
      }

      this.svg.appendChild(g);
      this.#regionNodes.set(r.id, { r, g });
    }
  }

  /* ── interacción ── */

  #onClick = () => {
    // El visor es opt-in: sin `open-on-click` el clic no hace nada y tampoco
    // se anuncia `is-open-viewer`, que prometeria una apertura que no ocurre.
    if (!this.hasAttribute('open-on-click')) return;
    const ev = new CustomEvent('is-open-viewer', {
      bubbles: true, composed: true, cancelable: true, detail: { payload: this.payload },
    });
    this.dispatchEvent(ev);
    if (!ev.defaultPrevented) this.openOwnViewer('venn');
  };

  #onMouseMove = (e: PointerEvent) => {
    if (!this.isViewer) return;
    const g = e.composedPath().find((n) => n?.dataset?.setId);
    const id = g?.dataset.setId ?? null;
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
    const entry = id ? this.#circleNodes.get(id) : null;

    for (const [setId, node] of this.#circleNodes) {
      const active = setId === id;
      node.g.classList.toggle('is-active', active);
      node.g.classList.toggle('is-dim', !!id && !active);
    }
    // Una región se resalta cuando el conjunto activo participa en ella.
    for (const [, region] of this.#regionNodes) {
      const touches = !!id && region.r.sets.includes(id);
      region.g.classList.toggle('is-active', touches);
      region.g.classList.toggle('is-dim', !!id && !touches);
    }

    if (!entry) {
      this.tooltipEl.hidden = true;
      return;
    }
    const c = entry.c;
    this.tooltipEl.hidden = false;
    this.tooltipEl.innerHTML = '';
    const title = document.createElement('span');
    title.className = 'dg-tooltip__title';
    title.innerHTML = inlineMdWeb(c.label);
    this.tooltipEl.appendChild(title);
    if (c.description) {
      const desc = document.createElement('div');
      desc.className = 'dg-tooltip__desc';
      desc.innerHTML = inlineMdWeb(c.description);
      this.tooltipEl.appendChild(desc);
    }
  }
}

defineElement('is-venn-diagram', IsVennDiagram, 'IsVennDiagram');

registerDiagramKind('venn', 'is-venn-diagram');

export { IsVennDiagram };
