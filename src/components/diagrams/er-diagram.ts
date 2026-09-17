import { adoptCss, defineElement, emit, emitCancelable } from '../../core/element.js';
import { DiagramElementBase } from '../_shared/diagram-element-base.js';
import { resolveErSpec, computeErLayout, entityBoxPath, ER_HEADER_H, ER_ROW_H } from './er-spec.js';
import { sequenceThemeDark, sequenceThemeLight } from './sequence-spec.js';
import { SequenceTurtle } from './sequence-turtle.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import { edgeStrokeHex, edgeChipFill, edgeChipText } from '../_shared/diagram-edge-style.js';
import { inlineMdWeb } from '../_shared/tk-inline-md.js';
import { wrapText, buildTspans } from '../_shared/diagram-text-wrap.js';
import { registerDiagramKind } from './diagram-kinds.js';
import { svgEl } from '../_shared/svg-chart-engine.js';
import type { DiagramGroup, DiagramTheme, ErLayout, ErLayoutEdge, ErLayoutEdgeMark, ErLayoutEntity } from './diagram-types.js';

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
 * Atributos: color (inline | viewer), open-on-click
 * Propiedades: payload, spec, layout, turtle, hiddenGroups
 * Eventos: is-render, is-turtle-state, is-open-viewer, is-toggle-group
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

// CSS embebido para animación de aristas dashed. Sobrevive a la exportación del
// SVG porque vive dentro del propio <svg>. Se desactiva automáticamente cuando
// el usuario tiene prefers-reduced-motion: reduce.
const iswcAnimDashCss = `
.iswc-anim-edge-dashed {
  stroke-dasharray: 6 4;
  animation: iswc-dash-march 1.6s linear infinite;
}
@keyframes iswc-dash-march {
  from { stroke-dashoffset: 0; }
  to   { stroke-dashoffset: -20; }
}
@media (prefers-reduced-motion: reduce) {
  .iswc-anim-edge-dashed { animation: none !important; }
}
`;

class IsErDiagram extends DiagramElementBase {
  #theme: DiagramTheme | null = null;
  #turtle: SequenceTurtle | null = null;
  #hiddenGroups: Set<string> = new Set();
  #entityNodes = new Map<string, { e: ErLayoutEntity; g: SVGGElement; box: SVGPathElement }>();
  #relNodes = new Map<string, { r: ErLayoutEdge; g: SVGGElement; path: SVGPathElement }>();
  #hoverId: string | null = null;

  constructor() {
    super();
    this.initDiagramShadow('er-svg', 'er-tooltip');
    adoptCss(this.shadowRoot!, import.meta.url);
  }

  onDiagramConnected() {
    this.wrap.addEventListener('mousemove', this.#onMouseMove as EventListener);
    this.wrap.addEventListener('mouseleave', this.#onMouseLeave as EventListener);
    this.wrap.addEventListener('click', this.#onClick as EventListener);
  }

  onDiagramDisconnected() {
    this.#turtle?.destroy();
    this.#turtle = null;
    this.wrap.removeEventListener('mousemove', this.#onMouseMove as EventListener);
    this.wrap.removeEventListener('mouseleave', this.#onMouseLeave as EventListener);
    this.wrap.removeEventListener('click', this.#onClick as EventListener);
  }

  onPayloadChanged() { this.#hiddenGroups = new Set(); }

  get turtle() { return this.#turtle; }
  get hiddenGroups() { return this.#hiddenGroups; }
  set hiddenGroups(v) {
    this.#hiddenGroups = v instanceof Set ? v : new Set(v || []);
    this.queueRender();
  }

  renderDiagram() {
    const spec = resolveErSpec(this.payload ?? {});
    this.spec = spec;
    if (!spec) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }
    delete this.wrap.dataset.empty;

    // Ocultar un grupo quita sus entidades y las relaciones que las tocan.
    const hidden = this.#hiddenGroups;
    let visible = spec;
    if (hidden.size) {
      const entities = spec.entities.filter((e) => !e.group || !hidden.has(e.group));
      const keep = new Set(entities.map((e) => e.id));
      visible = { ...spec, entities, relations: spec.relations.filter((r) => keep.has(r.from) && keep.has(r.to)) };
    }
    if (!visible.entities.length) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }

    const dark = this.isDarkTheme;
    const theme: DiagramTheme = dark ? sequenceThemeDark() : sequenceThemeLight();
    this.#theme = theme;
    this.syncThemeAttr();

    const layout = computeErLayout(visible);
    this.layout = layout;
    this.#buildSvg(layout, theme);
    this.wrap.classList.toggle('is-viewer', this.isViewer);
  }

  #buildSvg(layout: ErLayout, theme: DiagramTheme) {
    const { width: W, height: H } = layout;
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.setAttribute('aria-label', layout.title || 'Diagrama entidad-relación');
    this.svg.style.cssText = 'width:100%;height:100%;max-width:none;display:block;margin:0 auto';
    this.svg.innerHTML = '';
    this.#entityNodes.clear();
    this.#relNodes.clear();
    this.#hoverId = null;

    // Activación de animación CSS: opt-in via atributo `animation="trace"` o
    // via meta.animation="trace" en el payload. El estilo se embebe en el <svg>
    // para que sobreviva a la exportación. Por defecto está apagado.
    const traceFromAttr = this.hasAttribute('animation') && this.getAttribute('animation') === 'trace';
    const specMeta = (this.spec as { meta?: { animation?: 'trace' | 'none' } } | null)?.meta;
    const traceFromMeta = !!layout.relations?.length && specMeta?.animation === 'trace';
    const traceEnabled = !!(traceFromAttr || traceFromMeta);
    if (traceEnabled) {
      this.svg.setAttribute('data-animation', 'trace');
      // Inyectar <style> embebido una sola vez por render
      if (!this.svg.querySelector(':scope > style[data-iswc-anim]')) {
        const style = svgEl('style', { 'data-iswc-anim': '1' });
        style.textContent = iswcAnimDashCss;
        this.svg.insertBefore(style, this.svg.firstChild);
      }
    }

    if (layout.titleLines?.length || layout.title) {
      const lines = layout.titleLines?.length ? layout.titleLines : [layout.title].filter((l): l is string => !!l);
      const t = svgEl('text', {
        x: W / 2, y: layout.titleY, 'text-anchor': 'middle', fill: theme.text,
        'font-size': '13', 'font-weight': '600', 'font-family': 'Tahoma,Arial,sans-serif',
      });
      lines.forEach((line, i) => {
        const ts = svgEl('tspan', { x: W / 2, dy: i === 0 ? 0 : 16 });
        ts.textContent = line;
        t.appendChild(ts);
      });
      this.svg.appendChild(t);
    }
    if (layout.subtitleLines?.length || layout.subtitle) {
      const lines = layout.subtitleLines?.length ? layout.subtitleLines : [layout.subtitle].filter((l): l is string => !!l);
      const t = svgEl('text', {
        x: W / 2, y: layout.subtitleY, 'text-anchor': 'middle', fill: theme.muted,
        'font-size': '11', 'font-family': 'Tahoma,Arial,sans-serif',
      });
      lines.forEach((line, i) => {
        const ts = svgEl('tspan', { x: W / 2, dy: i === 0 ? 0 : 14 });
        ts.textContent = line;
        t.appendChild(ts);
      });
      this.svg.appendChild(t);
    }

    if (layout.groups?.length) this.#buildLegend(layout, theme);
    // Los cajones van primero: son el fondo sobre el que se pintan aristas y cajas.
    this.#buildClusters(layout, theme);
    this.#buildRelations(layout, theme);
    this.#buildEntities(layout, theme);

    const turtleGroup = svgEl('g');
    this.svg.appendChild(turtleGroup);
    this.#turtle?.destroy();
    this.#turtle = new SequenceTurtle(turtleGroup as unknown as HTMLElement);
    this.#turtle.setData({
      messages: layout.relations.map((r, i: number) => ({
        path: r.path, step: i + 1, log: r.label || '', groupHue: undefined,
      })),
      theme,
      viewW: W,
      viewH: H,
      autoLoop: this.isViewer,
      onState: (state: unknown) => emit(this, 'is-turtle-state', state),
    });

    emit(this, 'is-render', { layout, svg: this.svg });
  }

  /** Cajón por grupo: marco tenue + cabecera con el nombre del agrupador. */
  #buildClusters(layout: ErLayout, theme: DiagramTheme) {
    for (const c of layout.clusters ?? []) {
      const color = (c.hue != null && tkHueToHex(c.hue)) || theme.accent;
      const g = svgEl('g', { class: 'er-cluster' });
      if (c.id) g.dataset.clusterId = c.id;

      g.appendChild(svgEl('rect', {
        x: c.x, y: c.y, width: c.w, height: c.h, rx: 12,
        fill: c.hue != null ? `hsla(${c.hue},60%,50%,0.06)` : 'none',
        stroke: color, 'stroke-width': 1.1, 'stroke-dasharray': '2 5',
        class: 'er-cluster__box',
      }));

      if (c.name) {
        const t = svgEl('text', {
          x: c.x + 14, y: c.y + 18, fill: color,
          'font-size': '11', 'font-weight': '700', 'letter-spacing': '0.04em',
          'font-family': 'Tahoma,Arial,sans-serif', class: 'er-cluster__title',
        });
        t.textContent = c.name;
        g.appendChild(t);
      }

      this.svg.appendChild(g);
    }
  }

  #buildLegend(layout: ErLayout, theme: DiagramTheme) {
    const g = svgEl('g', { class: 'er-legend' });
    layout.groups!.forEach((grp: DiagramGroup, gi: number) => {
      const ly = (layout.legendY ?? ((layout.subtitleY || layout.titleY || 22) + 18)) + gi * 16;
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
    this.svg.appendChild(g);
  }

  #buildRelations(layout: ErLayout, theme: DiagramTheme) {
    const traceEnabled = this.hasAttribute('animation') && this.getAttribute('animation') === 'trace';
    for (const r of layout.relations) {
      const color = (r.style && r.style.stroke) || edgeStrokeHex(r.hue, theme.accent);
      const g = svgEl('g', { class: 'er-rel' });
      g.dataset.relId = r.id;
      g.dataset.route = r.route ?? 'orthogonal';

      // dashStyle: 'solid' | 'dashed' | 'dotted' | undefined (default identifying-based)
      const isIdentifying = r.identifying !== false; // true por defecto
      let dashAttr = null;
      if (r.dashStyle === 'dashed') dashAttr = '6 4';
      else if (r.dashStyle === 'dotted') dashAttr = '2 4';
      else if (r.dashStyle === 'solid') dashAttr = null;
      else if (!isIdentifying) dashAttr = '6 4';

      const isAnimatable = r.dashStyle === 'dashed' || (!isIdentifying && r.dashStyle !== 'solid');
      const animClass = (traceEnabled && isAnimatable) ? ' iswc-anim-edge-dashed' : '';

      const width = (r.style && Number.isFinite(r.style.strokeWidth))
        ? r.style.strokeWidth
        : (r.width ?? 1.3);
      const path = svgEl('path', {
        d: r.path, fill: 'none', stroke: color, 'stroke-width': width,
        'stroke-dasharray': dashAttr,
        'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        class: `er-rel__path${animClass}`,
      });
      g.appendChild(path);

      g.appendChild(this.#buildMark(r.fromMark, color));
      g.appendChild(this.#buildMark(r.toMark, color));

      if (r.label) {
        const pad = 4;
        const w = r.labelW ?? (r.label.length * 5.6 + pad * 2);
        g.appendChild(svgEl('rect', {
          x: r.labelX - w / 2, y: r.labelY - 8, width: w, height: 16, rx: 4,
          fill: edgeChipFill(r.hue), class: 'er-rel__chip',
        }));
        const t = svgEl('text', {
          x: r.labelX, y: r.labelY + 3.5, 'text-anchor': 'middle', fill: edgeChipText(r.hue, theme.muted),
          'font-size': '10', 'font-family': 'Consolas,Menlo,monospace',
        });
        t.textContent = r.label;
        g.appendChild(t);
      }

      this.svg.appendChild(g);
      this.#relNodes.set(r.id, { r, g, path });
    }
  }

  /** Marca de cardinalidad (pata de gallo / tick / círculo) en un extremo de relación. */
  #buildMark(mark: ErLayoutEdgeMark, color: string) {
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

  #buildEntities(layout: ErLayout, theme: DiagramTheme) {
    for (const e of layout.entities) {
      const st = e.style ?? {};
      const color = st.stroke || ((e.hue != null && tkHueToHex(e.hue)) || theme.accent);
      const g = svgEl('g', { class: 'er-entity' });
      g.dataset.entityId = e.id;
      if (this.isViewer) g.style.cursor = 'pointer';

      const fill = st.fill || theme.chipFill;
      const opacity = typeof st.opacity === 'number' ? st.opacity : null;
      const radius = typeof st.radius === 'number' ? st.radius : 8;
      const strokeWidth = typeof st.strokeWidth === 'number' ? st.strokeWidth : 1.3;
      const box = svgEl('path', {
        d: entityBoxPath(e.x, e.y, e.w, e.h, radius),
        fill, stroke: color, 'stroke-width': strokeWidth,
        ...(opacity != null ? { opacity: String(opacity) } : {}),
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
      // Wrap del nombre de la entidad si es largo.
      const entityResult = wrapText({
        text: e.name,
        maxWidth: e.w - 12,
        maxHeight: ER_HEADER_H - 4,
        fontSize: 11,
        fontFamily: 'Tahoma,Arial,sans-serif',
        overflow: 'grow',
      });
      const entityTspans = buildTspans(
        entityResult.lines,
        e.x + 6, e.y, e.w - 12, ER_HEADER_H,
        'middle', 11, 1.2,
      );
      for (const span of entityTspans) {
        const ts = svgEl('tspan', {
          x: span.x, y: span.y,
          ...(span.dy != null ? { dy: span.dy } : {}),
        });
        ts.textContent = span.text;
        nameT.appendChild(ts);
      }
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

      this.svg.appendChild(g);
      this.#entityNodes.set(e.id, { e, g, box });
    }
  }

  /* ── hover ── */

  #onClick = (e: PointerEvent) => {
    if (this.isViewer) {
      const item = e.composedPath().find((x) => (x as HTMLElement | undefined)?.dataset?.groupId);
      if (item) {
        emitCancelable(this, 'is-toggle-group', { id: (item as HTMLElement).dataset.groupId });
      }
      return;
    }
    // El visor es opt-in: sin `open-on-click` el clic no hace nada y tampoco
    // se anuncia `is-open-viewer`, que prometeria una apertura que no ocurre.
    if (!this.hasAttribute('open-on-click')) return;
    const ev = new CustomEvent('is-open-viewer', {
      bubbles: true, composed: true, cancelable: true, detail: { payload: this.payload },
    });
    this.dispatchEvent(ev);
    if (!ev.defaultPrevented) this.openOwnViewer('erDiagram');
  };

  #onMouseMove = (e: PointerEvent) => {
    if (!this.isViewer) return;
    const g = e.composedPath().find((n) => (n as HTMLElement | undefined)?.dataset?.entityId);
    const id = (g as HTMLElement | undefined)?.dataset.entityId ?? null;
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

  #applyHover(id: string | null) {
    this.#hoverId = id;
    const entry = id ? this.#entityNodes.get(id) : null;

    for (const [entityId, node] of this.#entityNodes) {
      const active = entityId === id;
      node.g.classList.toggle('is-active', active);
      node.g.classList.toggle('is-dim', !!id && !active);
      node.box.setAttribute('stroke-width', String(active ? 2.1 : 1.3));
    }
    for (const [, rel] of this.#relNodes) {
      const touches = !!id && (rel.r.from === id || rel.r.to === id);
      rel.g.classList.toggle('is-active', touches);
      rel.g.classList.toggle('is-dim', !!id && !touches);
    }

    this.#turtle?.setPaused(!!id);

    if (!entry) {
      this.tooltipEl.hidden = true;
      return;
    }
    const e = entry.e;
    this.tooltipEl.hidden = false;
    this.tooltipEl.innerHTML = '';
    const title = document.createElement('span');
    title.className = 'dg-tooltip__title';
    title.innerHTML = inlineMdWeb(e.name);
    this.tooltipEl.appendChild(title);
    if (e.attributes.length) {
      const desc = document.createElement('div');
      desc.className = 'dg-tooltip__desc';
      desc.innerHTML = e.attributes
        .map((a) => `${a.key ? `<b>${a.key}</b> ` : ''}${inlineMdWeb(a.name)}${a.type ? ` <i>${a.type}</i>` : ''}`)
        .join('<br>');
      this.tooltipEl.appendChild(desc);
    }
  }
}

defineElement('is-er-diagram', IsErDiagram, 'IsErDiagram');

registerDiagramKind('er', 'is-er-diagram');
registerDiagramKind('erDiagram', 'is-er-diagram');

export { IsErDiagram };
