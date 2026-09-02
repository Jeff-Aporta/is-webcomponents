import { adoptCss, defineElement, emit } from '../../core/element.js';
import { DiagramElementBase } from '../_shared/diagram-element-base.js';
import { resolveComponentSpec, computeComponentLayout, packageShapePath, packageTabWidth, LOLLI_R, HTTP_METHOD_BADGE } from './component-spec.js';
import { sequenceThemeDark, sequenceThemeLight } from './sequence-spec.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import { edgeStrokeHex, edgeChipFill, edgeChipText } from '../_shared/diagram-edge-style.js';
import { registerDiagramKind } from './diagram-kinds.js';
import { svgEl } from '../_shared/svg-chart-engine.js';
import { svgArrowHead } from '../_shared/diagram-arrow.js';

/**
 * <is-component-diagram> — diagrama de componentes UML en SVG, sin Mermaid.
 *
 * Tres primitivas declaradas por el payload:
 *   - packages: carpetas con pestaña (tab) arriba a la izquierda, hueco de 4px
 *     entre la pestaña y el cuerpo para que se lea como dos piezas.
 *   - components: rectángulos con estereotipo `<<name>>` sobre la etiqueta.
 *     El estereotipo se pinta en cursiva; la etiqueta va en negrita debajo.
 *   - interfaces (lollipop / socket): `provided` = círculo hueco O;
 *     `required` = arco C abierto hacia el par. Juntos forman el conector
 *     UML `-(O-`. Sin esto el PNG solo enseña cajas.
 *
 * Las posiciones del payload son semilla. El empaque (`pack` / `triptych`)
 * dispersa cajas con distancia mínima (`min-gap` o `layout.minGap`).
 *
 * Atributos: color (inline | viewer), open-on-click, min-gap
 * Propiedades: payload, spec, layout, isViewer, minGap
 * Eventos: is-render, is-open-viewer
 */

const FONT = 'Tahoma,Arial,sans-serif';

/** Arco C. `side` nombra abertura: right abre a +X, bottom abre a +Y (hacia el O). */
function requiredSocketPath(cx, cy, r, side) {
  if (side === 'right') return `M${cx},${cy - r} A${r},${r} 0 0 0 ${cx},${cy + r}`;
  if (side === 'left') return `M${cx},${cy - r} A${r},${r} 0 0 1 ${cx},${cy + r}`;
  if (side === 'bottom') return `M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}`;
  return `M${cx - r},${cy} A${r},${r} 0 0 0 ${cx + r},${cy}`;
}

function stemInner(iface, r) {
  switch (iface.side) {
    case 'top':    return { x: iface.cx, y: iface.cy + r };
    case 'bottom': return { x: iface.cx, y: iface.cy - r };
    case 'left':   return { x: iface.cx + r, y: iface.cy };
    case 'right':  return { x: iface.cx - r, y: iface.cy };
    default:       return { x: iface.cx - r, y: iface.cy };
  }
}

class IsComponentDiagram extends DiagramElementBase {
  static get observedAttributes(): string[] {
    return [...DiagramElementBase.observedAttributes, 'min-gap'];
  }

  /** Capa superior con las etiquetas de arista (ver #buildEdges). */
  #etiquetasEdges = null;

  #theme = null;

  constructor() {
    super();
    this.initDiagramShadow('cd-svg', 'cd-tooltip');
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

  get minGap() {
    const n = Number(this.getAttribute('min-gap'));
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  set minGap(v) {
    if (v == null || v === '') this.removeAttribute('min-gap');
    else this.setAttribute('min-gap', String(v));
  }

  renderDiagram() {
    const spec = resolveComponentSpec(this.payload ?? {}, { minGap: this.minGap });
    this.spec = spec;
    if (!spec) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }
    delete this.wrap.dataset.empty;

    const dark = this.isDarkTheme;
    this.#theme = dark ? sequenceThemeDark() : sequenceThemeLight();
    this.syncThemeAttr();

    const layout = computeComponentLayout(spec);
    this.layout = layout;
    this.#buildSvg(layout, this.#theme);
    this.wrap.classList.toggle('is-viewer', this.isViewer);
  }

  #buildSvg(layout, theme) {
    const { width: W, height: H } = layout;
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.setAttribute('aria-label', layout.title || 'Diagrama de componentes');
    this.svg.style.cssText = 'width:100%;height:100%;max-width:none;display:block;margin:0 auto';
    this.svg.innerHTML = '';

    if (layout.title) {
      const t = svgEl('text', {
        x: W / 2, y: layout.titleY, 'text-anchor': 'middle', fill: theme.text,
        'font-size': '13', 'font-weight': '600', 'font-family': FONT,
      });
      t.textContent = layout.title;
      this.svg.appendChild(t);
    }
    if (layout.subtitle) {
      const t = svgEl('text', {
        x: W / 2, y: layout.subtitleY, 'text-anchor': 'middle', fill: theme.muted,
        'font-size': '11', 'font-family': FONT,
      });
      t.textContent = layout.subtitle;
      this.svg.appendChild(t);
    }

    // Paquetes (fondo) → cajas → aristas → lollipops O/C → etiquetas encima,
    // para que el conector UML no quede tapado por las cajas.
    this.#buildPackages(layout, theme);
    this.#buildComponents(layout, theme);
    this.#etiquetasEdges = svgEl('g', { class: 'cd-edge-labels' });
    this.#buildEdges(layout, theme);
    this.#buildInterfaces(layout, theme);
    this.svg.appendChild(this.#etiquetasEdges);

    emit(this, 'is-render', { layout, svg: this.svg });
  }

  #buildPackages(layout, theme) {
    for (const p of layout.packages) {
      const g = svgEl('g', { class: 'cd-pkg' });
      const color = (p.hue != null && tkHueToHex(p.hue)) || theme.accent;
      // Mismo lenguaje que el cajón de grupo del `<is-er-diagram>`: el tono
      // tiñe apenas el fondo y vive en el borde. El relleno saturado anterior
      // convertía el paquete en un bloque de color que se comía a los
      // componentes de dentro — que son justo lo que hay que leer.
      g.appendChild(svgEl('path', {
        d: packageShapePath(p),
        fill: p.hue != null ? `hsla(${p.hue},60%,50%,0.06)` : 'none',
        stroke: color,
        'stroke-width': 1.1,
        'stroke-dasharray': '2 5',
        'stroke-linejoin': 'miter',
      }));
      // Etiqueta del paquete en la pestaña, en cursiva y negrita (UML), en el
      // color del grupo: es lo que ata el paquete con sus componentes.
      // Título del grupo: caja sólida para que las aristas no lo tapen.
      const tb = p.titleBox;
      const label = p.stereotype ? `«${p.stereotype}» ${p.name}` : p.name;
      if (tb) {
        g.appendChild(svgEl('rect', {
          x: tb.x, y: tb.y, width: tb.w, height: tb.h, rx: 4,
          fill: 'var(--cd-title-fill, #ffffff)',
          stroke: color,
          'stroke-width': 0.8,
        }));
      }
      const t = svgEl('text', {
        x: (tb?.x ?? p.x) + 8, y: (tb?.y ?? p.y) + (tb ? tb.h * 0.7 : 10),
        'text-anchor': 'start',
        fill: color,
        'font-size': '11', 'font-weight': '700', 'font-style': 'italic',
        'letter-spacing': '0.04em',
        'font-family': FONT,
      });
      t.textContent = label;
      g.appendChild(t);
      this.svg.appendChild(g);
    }
  }

  #buildEdges(layout, theme) {
    // Varias aristas que salen del mismo componente tienen su punto medio
    // casi en la misma banda. Las chips se colocan en el layout como actores
    // (`placeEdgeActors`): no se pisan entre sí ni a las cajas.
    for (const e of layout.edges) {
      if (!e.path) continue;
      const color = edgeStrokeHex(e.hue, theme.accent);
      const g = svgEl('g', { class: 'cd-edge' });
      const ballSocket = Boolean(e.fromInterface && e.toInterface) || e.kind === 'assembly';
      const dashed = !ballSocket && (e.kind === 'dependency' || e.kind === 'realization');
      const path = svgEl('path', {
        d: e.path, fill: 'none', stroke: color, 'stroke-width': 1.35,
        'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        'stroke-dasharray': dashed ? '6 4' : null,
        class: 'cd-edge__path',
      });
      g.appendChild(path);
      if (!ballSocket) {
        g.appendChild(svgArrowHead({
          d: e.path,
          tip: { x: e.toX, y: e.toY },
          color,
          className: 'cd-edge__arrow',
        }));
      }
      if (e.label) {
        const mx = e.labelX ?? (e.fromX + e.toX) / 2;
        const my = e.labelY ?? (e.fromY + e.toY) / 2;
        const w = e.labelW ?? (e.label.length * 5.6 + 8);
        const etiqueta = svgEl('g', { class: 'cd-edge__label' });
        const hue = e.hue ?? 205;
        etiqueta.appendChild(svgEl('rect', {
          x: mx - w / 2, y: my - 8, width: w, height: 16, rx: 4,
          fill: edgeChipFill(hue), class: 'cd-edge__chip',
        }));
        const t = svgEl('text', {
          x: mx, y: my + 3.5, 'text-anchor': 'middle', fill: edgeChipText(hue, theme.muted),
          'font-size': '10', 'font-family': FONT,
        });
        t.textContent = e.label;
        etiqueta.appendChild(t);
        this.#etiquetasEdges.appendChild(etiqueta);
      }
      this.svg.appendChild(g);
    }
  }

  #buildInterfaces(layout, theme) {
    const r = LOLLI_R;
    for (const iface of layout.interfaces) {
      const g = svgEl('g', { class: 'cd-iface' });
      g.dataset.ifaceId = iface.id;
      const stroke = (iface.hue != null && tkHueToHex(iface.hue, 48, 30)) || theme.accent;
      const comp = layout.components.find((c) => c.id === iface.component);
      if (comp && !iface.docked) {
        let bx, by;
        switch (iface.side) {
          case 'top':    bx = comp.x + iface.offset; by = comp.y; break;
          case 'bottom': bx = comp.x + iface.offset; by = comp.y + comp.h; break;
          case 'left':   bx = comp.x; by = comp.y + iface.offset; break;
          case 'right':
          default:       bx = comp.x + comp.w; by = comp.y + iface.offset; break;
        }
        const inner = stemInner(iface, r);
        g.appendChild(svgEl('line', {
          x1: inner.x, y1: inner.y, x2: bx, y2: by,
          stroke, 'stroke-width': 1.3,
        }));
      }
      if (iface.kind === 'required') {
        g.appendChild(svgEl('path', {
          d: requiredSocketPath(iface.cx, iface.cy, r, iface.side),
          fill: 'none', stroke, 'stroke-width': 1.3,
          'stroke-linecap': 'round',
        }));
      } else {
        g.appendChild(svgEl('circle', {
          cx: iface.cx, cy: iface.cy, r,
          fill: 'var(--cd-circle-fill, #ffffff)',
          stroke, 'stroke-width': 1.3,
        }));
      }
      if (iface.name) {
        const dx = iface.side === 'right' ? r + 5 : iface.side === 'left' ? -(r + 5) : 0;
        const dy = iface.side === 'bottom' ? r + 12 : iface.side === 'top' ? -(r + 4) : 4;
        const t = svgEl('text', {
          x: iface.cx + dx, y: iface.cy + dy,
          'text-anchor': iface.side === 'right' ? 'start' : iface.side === 'left' ? 'end' : 'middle',
          fill: theme.muted, 'font-size': '10', 'font-style': 'italic',
          'font-family': FONT,
        });
        t.textContent = `«${iface.name}»`;
        g.appendChild(t);
      }
      this.svg.appendChild(g);
    }
  }

  #buildComponents(layout, theme) {
    for (const c of layout.components) {
      const g = svgEl('g', { class: 'cd-cmp' });
      g.dataset.cmpId = c.id;
      const stroke = (c.hue != null && tkHueToHex(c.hue)) || theme.accent;
      g.appendChild(svgEl('rect', {
        x: c.x, y: c.y, width: c.w, height: c.h, rx: 6,
        fill: theme.chipFill, stroke, 'stroke-width': 1.3,
      }));
      if (c.stereotype) {
        const headerFill = c.hue != null ? `hsla(${c.hue},65%,55%,0.22)` : theme.chipFill;
        g.appendChild(svgEl('rect', {
          x: c.x + 1, y: c.y + 1, width: c.w - 2, height: 15, rx: 5,
          fill: headerFill,
        }));
        const stereo = svgEl('text', {
          x: c.x + c.w / 2, y: c.y + 12, 'text-anchor': 'middle',
          fill: theme.muted, 'font-size': '9.5', 'font-style': 'italic',
          'font-family': FONT,
        });
        stereo.textContent = `«${c.stereotype}»`;
        g.appendChild(stereo);
      }
      const t = svgEl('text', {
        x: c.x + c.w / 2, y: c.labelY, 'text-anchor': 'middle',
        fill: theme.text, 'font-size': '11', 'font-weight': '700',
        'font-family': FONT,
      });
      // Una línea por tspan: el nombre real de un componente rara vez cabe en
      // el ancho de su caja (ver wrapLabel en component-spec.js).
      const lineas = c.lines ?? [c.name];
      lineas.forEach((linea, i) => {
        const ts = svgEl('tspan', { x: c.x + c.w / 2, dy: i === 0 ? 0 : (c.lineHeight ?? 13) });
        ts.textContent = linea;
        t.appendChild(ts);
      });
      g.appendChild(t);
      for (const b of c.itemBubbles ?? []) {
        g.appendChild(svgEl('rect', {
          x: b.x, y: b.y, width: b.w, height: b.h, rx: 4,
          fill: theme.chipFillSoft ?? theme.chipFill, stroke: theme.border ?? 'rgba(0,0,0,0.08)',
          'stroke-width': 0.6,
        }));
        let textX = b.x + 6;
        if (b.method) {
          const badge = HTTP_METHOD_BADGE[b.method] ?? { fill: '#6b7280', text: '#fff' };
          g.appendChild(svgEl('rect', {
            x: b.x + 3, y: b.y + 2.5, width: b.badgeW, height: b.h - 5, rx: 3,
            fill: badge.fill,
          }));
          const mt = svgEl('text', {
            x: b.x + 3 + b.badgeW / 2, y: b.y + b.h / 2 + 3.2, 'text-anchor': 'middle',
            fill: badge.text, 'font-size': '7.5', 'font-weight': '700', 'font-family': FONT,
          });
          mt.textContent = b.method;
          g.appendChild(mt);
          textX = b.x + 8 + b.badgeW;
        }
        const pt = svgEl('text', {
          x: textX, y: b.y + b.h / 2 + 3.4, 'text-anchor': 'start',
          fill: theme.text, 'font-size': '9', 'font-family': FONT,
        });
        pt.textContent = b.path;
        g.appendChild(pt);
      }
      this.svg.appendChild(g);
    }
  }

  /* ── eventos viewer ── */

  #onClick = () => {
    if (!this.hasAttribute('open-on-click')) return;
    const ev = new CustomEvent('is-open-viewer', {
      bubbles: true, composed: true, cancelable: true, detail: { payload: this.payload },
    });
    this.dispatchEvent(ev);
    if (!ev.defaultPrevented) this.openOwnViewer('componentDiagram');
  };

  #onMouseMove = () => { /* placeholder para tooltip por nodo */ };
  #onMouseLeave = () => { this.tooltipEl.hidden = true; };
}

defineElement('is-component-diagram', IsComponentDiagram, 'IsComponentDiagram');
registerDiagramKind('component', 'is-component-diagram');
registerDiagramKind('componentDiagram', 'is-component-diagram');

export { IsComponentDiagram };
