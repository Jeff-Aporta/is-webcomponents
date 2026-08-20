import { adoptCss } from '../_shared/adopt-css.js';
import { DiagramElementBase } from '../_shared/diagram-element-base.js';
import { resolveUseCaseSpec, computeUseCaseLayout } from './use-case-spec.js';
import { sequenceThemeDark, sequenceThemeLight } from './sequence-spec.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import { edgeStrokeHex, edgeChipFill, edgeChipText } from '../_shared/diagram-edge-style.js';
import { inlineMdWeb } from '../_shared/tk-inline-md.js';
import { registerDiagramKind } from './diagram-kinds.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { svgEl } from '../_shared/svg-chart-engine.js';
import { svgArrowHead } from '../_shared/diagram-arrow.js';

/**
 * <is-use-case-diagram> — diagrama de casos de uso UML en SVG, sin Mermaid.
 *
 *   <is-use-case-diagram>
 *     <script type="application/json">
 *       { "useCase": { "system": { "name": "Portal" }, "actors": [...], "cases": [...], "links": [...] } }
 *     </script>
 *   </is-use-case-diagram>
 *
 * Mismo esqueleto que <is-flowchart>: shadow DOM, slot JSON + MutationObserver,
 * tema por atributo `data-theme`, `color` (inline | viewer), lightbox propio.
 *
 * Atributos: color (inline | viewer), open-on-click
 * Propiedades: payload, spec, layout, hiddenGroups
 * Eventos: is-render, is-open-viewer, is-toggle-group
 */

/** Monigote UML: cabeza, tronco, brazos y piernas dentro de la caja del actor. */
function stickFigure(node, color, external) {
  const g = svgEl('g', { class: 'uc-actor__figure' });
  const cx = node.x + node.w / 2;
  const top = node.y + 4;
  const headR = 7;
  const dash = external ? '4 3' : null;
  g.appendChild(svgEl('circle', {
    cx, cy: top + headR, r: headR, fill: 'none', stroke: color, 'stroke-width': 1.4, 'stroke-dasharray': dash,
  }));
  const bodyTop = top + headR * 2;
  const bodyBottom = bodyTop + 18;
  g.appendChild(svgEl('line', {
    x1: cx, y1: bodyTop, x2: cx, y2: bodyBottom, stroke: color, 'stroke-width': 1.4, 'stroke-dasharray': dash,
  }));
  g.appendChild(svgEl('line', {
    x1: cx - 11, y1: bodyTop + 6, x2: cx + 11, y2: bodyTop + 6, stroke: color, 'stroke-width': 1.4, 'stroke-dasharray': dash,
  }));
  g.appendChild(svgEl('line', {
    x1: cx, y1: bodyBottom, x2: cx - 9, y2: bodyBottom + 12, stroke: color, 'stroke-width': 1.4, 'stroke-dasharray': dash,
  }));
  g.appendChild(svgEl('line', {
    x1: cx, y1: bodyBottom, x2: cx + 9, y2: bodyBottom + 12, stroke: color, 'stroke-width': 1.4, 'stroke-dasharray': dash,
  }));
  return g;
}

/** Punta hueca de generalización (triángulo UML) apuntando al padre. */
function generalizationHead(x1, y1, x2, y2, color) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const size = 9;
  const bx = x2 - ux * size;
  const by = y2 - uy * size;
  const px = -uy * (size / 2);
  const py = ux * (size / 2);
  return svgEl('polygon', {
    points: `${x2},${y2} ${bx + px},${by + py} ${bx - px},${by - py}`,
    fill: 'none', stroke: color, 'stroke-width': 1.3, class: 'uc-link__head',
  });
}

class IsUseCaseDiagram extends DiagramElementBase {
  #hiddenGroups = new Set();
  #nodeNodes = new Map();
  #linkNodes = new Map();
  #hoverId = null;

  constructor() {
    super();
    this.initDiagramShadow('uc-svg', 'uc-tooltip');
    adoptCss(this.shadowRoot, import.meta.url);
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
    const spec = resolveUseCaseSpec(this.payload ?? {});
    this.spec = spec;
    if (!spec) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }
    delete this.wrap.dataset.empty;

    // Ocultar un grupo quita sus casos y las relaciones que los tocan.
    const hidden = this.#hiddenGroups;
    let visible = spec;
    if (hidden.size) {
      const cases = spec.cases.filter((c) => !c.group || !hidden.has(c.group));
      const keep = new Set([...cases.map((c) => c.id), ...spec.actors.map((a) => a.id)]);
      visible = { ...spec, cases, links: spec.links.filter((l) => keep.has(l.from) && keep.has(l.to)) };
    }
    if (!visible.cases.length) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }

    const theme = this.isDarkTheme ? sequenceThemeDark() : sequenceThemeLight();
    this.syncThemeAttr();

    const layout = computeUseCaseLayout(visible);
    this.layout = layout;
    this.#buildSvg(layout, theme);
    this.wrap.classList.toggle('is-viewer', this.isViewer);
  }

  #buildSvg(layout, theme) {
    const { width: W, height: H } = layout;
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.setAttribute('aria-label', layout.title || 'Diagrama de casos de uso');
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

    this.#buildSystem(layout, theme);
    if (layout.groups?.length) this.#buildLegend(layout, theme);
    this.#buildLinks(layout, theme);
    this.#buildCases(layout, theme);
    this.#buildActors(layout, theme);

    emit(this, 'is-render', { layout, svg: this.svg });
  }

  #buildSystem(layout, theme) {
    const s = layout.system;
    const g = svgEl('g', { class: 'uc-system' });
    g.appendChild(svgEl('rect', {
      x: s.x, y: s.y, width: s.w, height: s.h, rx: 8,
      fill: theme.altFill, stroke: theme.border, 'stroke-width': 1.2, class: 'uc-system__box',
    }));
    if (s.name) {
      const t = svgEl('text', {
        x: s.labelX, y: s.labelY, 'text-anchor': 'middle', fill: theme.muted,
        'font-size': '11', 'font-weight': '600', 'letter-spacing': '0.03em',
        'font-family': 'Tahoma,Arial,sans-serif', class: 'uc-system__label',
      });
      t.textContent = s.name;
      g.appendChild(t);
    }
    this.svg.appendChild(g);
  }

  #buildLegend(layout, theme) {
    const g = svgEl('g', { class: 'uc-legend' });
    layout.groups.forEach((grp, gi) => {
      const ly = (layout.subtitleY || layout.titleY || 22) + 18 + gi * 16;
      const color = tkHueToHex(grp.hue) ?? theme.accent;
      const off = this.#hiddenGroups.has(grp.id);
      const item = svgEl('g', { class: 'uc-legend__item', opacity: off ? 0.4 : 1 });
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
      const color = edgeStrokeHex(l.hue, theme.accent);
      const dashed = l.kind === 'include' || l.kind === 'extend';
      const g = svgEl('g', { class: `uc-link uc-link--${l.kind}` });
      g.dataset.linkId = l.id;

      g.appendChild(svgEl('path', {
        d: l.path, fill: 'none', stroke: color, 'stroke-width': 1.3,
        'stroke-dasharray': dashed ? '5 4' : null, class: 'uc-link__path',
      }));

      // Asociación: sin punta (UML). Dependencias: punta simple. Generalización: hueca.
      if (dashed) {
        g.appendChild(svgArrowHead({
          d: l.path, tip: { x: l.x2, y: l.y2 }, color, len: 7, halfWidth: 3.5, className: 'uc-link__head',
        }));
      } else if (l.kind === 'generalization') {
        g.appendChild(generalizationHead(l.x1, l.y1, l.x2, l.y2, color));
      }

      const text = l.stereotype ?? l.label;
      if (text) {
        const w = l.labelW ?? (text.length * 5.4 + 8);
        g.appendChild(svgEl('rect', {
          x: l.labelX - w / 2, y: l.labelY - 8, width: w, height: 15, rx: 4,
          fill: edgeChipFill(l.hue), class: 'uc-link__chip',
        }));
        const t = svgEl('text', {
          x: l.labelX, y: l.labelY + 3, 'text-anchor': 'middle', fill: edgeChipText(l.hue, theme.muted),
          'font-size': '9.5', 'font-family': 'Consolas,Menlo,monospace',
        });
        t.textContent = text;
        g.appendChild(t);
      }

      this.svg.appendChild(g);
      this.#linkNodes.set(l.id, { l, g });
    }
  }

  #buildCases(layout, theme) {
    for (const c of layout.cases) {
      const color = (c.hue != null && tkHueToHex(c.hue)) || theme.accent;
      const g = svgEl('g', { class: 'uc-case' });
      g.dataset.nodeId = c.id;
      if (this.isViewer) g.style.cursor = 'pointer';

      g.appendChild(svgEl('ellipse', {
        cx: c.x + c.w / 2, cy: c.y + c.h / 2, rx: c.w / 2, ry: c.h / 2,
        fill: theme.chipFill, stroke: color, 'stroke-width': 1.3, class: 'uc-case__shape',
      }));
      const t = svgEl('text', {
        x: c.x + c.w / 2, y: c.y + c.h / 2 + 4, 'text-anchor': 'middle', fill: theme.text,
        'font-size': '11', 'font-weight': '600', 'font-family': 'Tahoma,Arial,sans-serif',
      });
      t.innerHTML = inlineMdWeb(c.label);
      g.appendChild(t);

      this.svg.appendChild(g);
      this.#nodeNodes.set(c.id, { n: c, g });
    }
  }

  #buildActors(layout, theme) {
    for (const a of layout.actors) {
      const color = (a.hue != null && tkHueToHex(a.hue)) || theme.text;
      const g = svgEl('g', { class: 'uc-actor' });
      g.dataset.nodeId = a.id;
      if (this.isViewer) g.style.cursor = 'pointer';

      g.appendChild(stickFigure(a, color, a.external));
      const t = svgEl('text', {
        x: a.x + a.w / 2, y: a.y + a.h - 2, 'text-anchor': 'middle', fill: theme.text,
        'font-size': '10.5', 'font-weight': '600', 'font-family': 'Tahoma,Arial,sans-serif',
      });
      t.innerHTML = inlineMdWeb(a.label);
      g.appendChild(t);

      this.svg.appendChild(g);
      this.#nodeNodes.set(a.id, { n: a, g });
    }
  }

  /* ── interacción ── */

  #onClick = (e) => {
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
    if (!ev.defaultPrevented) this.openOwnViewer('useCase');
  };

  #onMouseMove = (e) => {
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
    if (n.description) {
      const desc = document.createElement('div');
      desc.className = 'dg-tooltip__desc';
      desc.innerHTML = inlineMdWeb(n.description);
      this.tooltipEl.appendChild(desc);
    }
  }
}

defineElement('is-use-case-diagram', IsUseCaseDiagram, 'IsUseCaseDiagram');

registerDiagramKind('useCase', 'is-use-case-diagram');
registerDiagramKind('usecase', 'is-use-case-diagram');

export { IsUseCaseDiagram };
