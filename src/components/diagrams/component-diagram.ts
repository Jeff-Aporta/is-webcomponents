import { adoptCss, defineElement, emit } from '../../core/element.js';
import { DiagramElementBase } from '../_shared/diagram-element-base.js';
import { resolveComponentSpec, computeComponentLayout, packageShapePath, LOLLI_R, HTTP_METHOD_BADGE } from './component-spec.js';
import type { ComponentLayout } from './component-spec.js';
import { sequenceThemeDark, sequenceThemeLight } from './sequence-spec.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import { edgeStrokeHex, edgeChipFill, edgeChipText } from '../_shared/diagram-edge-style.js';
import type { DiagramTheme } from './diagram-types.js';
import { registerDiagramKind } from './diagram-kinds.js';
import { svgEl } from '../_shared/svg-chart-engine.js';
import { svgArrowHead, pathEndDirection } from '../_shared/diagram-arrow.js';
import type { Caja, Lado, Paquete, Punto } from '../_shared/diagram-tipos.js';
import {
  resolveErTheme,
  pickThemeMode,
  themeToDiagramTheme,
  clusterPalette,
  entityPaint,
  edgePaint,
  injectThemeCss,
  type ErThemeJson,
} from './theme.js';
import type { InterfaceStemPoint, LayoutPackage, AnchorPoint } from "./component-diagram.schemas.js";

/**
 * <iswc-component-diagram> — diagrama de componentes UML en SVG, sin Mermaid.
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
 * Atributos: color (inline | viewer), open-on-click, min-gap, theme (insoft)
 * Propiedades: payload, spec, layout, isViewer, minGap
 * Eventos: iswc-render, iswc-open-viewer
 */

const FONT = 'Tahoma,Arial,sans-serif';

/** Clave de paleta InSoft según id/nombre del paquete. */
function packagePaletteId(p: Paquete): string {
  const blob = `${p.id ?? ''} ${p.name ?? ''} ${p.stereotype ?? ''}`.toLowerCase();
  if (/cliente|app|front|isw|consumidor/.test(blob)) return 'apps';
  if (/openai|llm|\bia\b/.test(blob)) return 'openai';
  if (/dsclient|login|jwt.?ext/.test(blob)) return 'ds';
  if (/\br2\b|storage|cloudflare|cdn/.test(blob)) return 'r2';
  if (/\bdb\b|postgre|mssql|datos/.test(blob)) return 'db';
  if (/azure/.test(blob)) return 'azure';
  if (/api|ayudas|backend|function|http/.test(blob)) return 'api';
  return String(p.id ?? 'oper').replace(/^pkg-/, '');
}

/** Arco C. `side` nombra abertura: right abre a +X, bottom abre a +Y (hacia el O). */
function requiredSocketPath(cx: number, cy: number, r: number, side: Lado): string {
  if (side === 'right') return `M${cx},${cy - r} A${r},${r} 0 0 0 ${cx},${cy + r}`;
  if (side === 'left') return `M${cx},${cy - r} A${r},${r} 0 0 1 ${cx},${cy + r}`;
  if (side === 'bottom') return `M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}`;
  return `M${cx - r},${cy} A${r},${r} 0 0 0 ${cx + r},${cy}`;
}

/** Forma del círculo O y la C (conector UML `-(O-`). */

function stemInner(iface: { cx: number; cy: number; side: Lado }, r: number): InterfaceStemPoint {
  switch (iface.side) {
    case 'top':    return { x: iface.cx, y: iface.cy + r };
    case 'bottom': return { x: iface.cx, y: iface.cy - r };
    case 'left':   return { x: iface.cx + r, y: iface.cy };
    case 'right':  return { x: iface.cx - r, y: iface.cy };
    default:       return { x: iface.cx - r, y: iface.cy };
  }
}

/** Paquete con la `titleBox` añadida por `computeComponentLayout`. */

/** Punto anchor de una arista. */

class IswcComponentDiagram extends DiagramElementBase {
  static get observedAttributes(): string[] {
    return [...DiagramElementBase.observedAttributes, 'min-gap', 'theme'];
  }

  /** Capa superior con las etiquetas de arista (ver #buildEdges). */
  #etiquetasEdges: SVGGElement | null = null;

  #theme: DiagramTheme | null = null;
  #styleTheme: ErThemeJson | null = null;

  constructor() {
    super();
    this.initDiagramShadow('cd-svg', 'cd-tooltip');
    adoptCss(this.shadowRoot!, import.meta.url);
  }

  onDiagramConnected(): void {
    this.wrap.addEventListener('mousemove', this.#onMouseMove);
    this.wrap.addEventListener('mouseleave', this.#onMouseLeave);
    this.wrap.addEventListener('click', this.#onClick);
  }

  onDiagramDisconnected(): void {
    this.wrap.removeEventListener('mousemove', this.#onMouseMove);
    this.wrap.removeEventListener('mouseleave', this.#onMouseLeave);
    this.wrap.removeEventListener('click', this.#onClick);
  }

  get minGap(): number | null {
    const n = Number(this.getAttribute('min-gap'));
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  set minGap(v: number | string | null | undefined) {
    if (v == null || v === '') this.removeAttribute('min-gap');
    else this.setAttribute('min-gap', String(v));
  }

  /** Tema InSoft (mismo JSON que ER). Attr `theme` o `componentDiagram.theme`. */
  #resolveStyleTheme(): ErThemeJson | null {
    const fromAttr = this.getAttribute('theme');
    if (fromAttr) return resolveErTheme(fromAttr);
    return resolveErTheme(this.payload);
  }

  renderDiagram(): void {
    const spec = resolveComponentSpec(this.payload ?? {}, { minGap: this.minGap });
    this.spec = spec;
    if (!spec) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }
    delete this.wrap.dataset.empty;

    const dark = this.isDarkTheme;
    const styleThemeRaw = this.#resolveStyleTheme();
    const styleTheme = styleThemeRaw ? pickThemeMode(styleThemeRaw, dark) : null;
    this.#styleTheme = styleTheme;
    this.#theme = styleTheme
      ? themeToDiagramTheme(styleTheme, dark ? sequenceThemeDark() : sequenceThemeLight())
      : (dark ? sequenceThemeDark() : sequenceThemeLight());
    this.syncThemeAttr();

    const layout: ComponentLayout = computeComponentLayout(spec);
    this.layout = layout;
    this.#buildSvg(layout, this.#theme);
    this.wrap.classList.toggle('iswc-viewer', this.isViewer);
  }

  #buildSvg(layout: ComponentLayout, theme: DiagramTheme): void {
    const { width: W, height: H } = layout;
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.setAttribute('aria-label', layout.title || 'Diagrama de componentes');
    this.svg.style.cssText = 'width:100%;height:100%;max-width:none;display:block;margin:0 auto';
    this.svg.innerHTML = '';

    const fontFamily = this.#styleTheme?.font?.family ?? FONT;
    if (this.#styleTheme) {
      this.svg.setAttribute('data-cd-theme', this.#styleTheme.id);
      injectThemeCss(this.svg, this.#styleTheme);
      if (this.#styleTheme.canvas?.background) {
        this.svg.style.background = this.#styleTheme.canvas.background;
      }
    } else {
      this.svg.removeAttribute('data-cd-theme');
    }

    if (layout.title) {
      const t = svgEl('text', {
        x: W / 2, y: layout.titleY, 'text-anchor': 'middle', fill: theme.text,
        'font-size': '13', 'font-weight': '600', 'font-family': fontFamily,
      });
      t.textContent = layout.title;
      this.svg.appendChild(t);
    }
    if (layout.subtitle) {
      const t = svgEl('text', {
        x: W / 2, y: layout.subtitleY, 'text-anchor': 'middle', fill: theme.muted,
        'font-size': '11', 'font-family': fontFamily,
      });
      t.textContent = layout.subtitle;
      this.svg.appendChild(t);
    }

    this.#buildPackages(layout, theme, fontFamily);
    this.#buildComponents(layout, theme, fontFamily);
    this.#etiquetasEdges = svgEl('g', { class: 'cd-edge-labels' });
    this.#buildEdges(layout, theme, fontFamily);
    this.#buildInterfaces(layout, theme, fontFamily);
    if (this.#etiquetasEdges) this.svg.appendChild(this.#etiquetasEdges);

    emit(this, 'iswc-render', { layout, svg: this.svg });
  }

  #buildPackages(layout: ComponentLayout, theme: DiagramTheme, fontFamily: string): void {
    const styleTheme = this.#styleTheme;
    for (const rawP of layout.packages) {
      const p = rawP as LayoutPackage;
      const g = svgEl('g', { class: 'cd-pkg' });
      let fill: string;
      let stroke: string;
      let strokeWidth: number;
      let dash: string | null;
      let titleFill: string;
      if (styleTheme) {
        const pal = clusterPalette(styleTheme, packagePaletteId(p));
        fill = pal.fill;
        stroke = pal.border;
        strokeWidth = styleTheme.cluster?.borderWidth ?? 1.5;
        const da = styleTheme.cluster?.dasharray;
        dash = da == null || da === '' ? null : da;
        titleFill = styleTheme.cluster?.titleFill ?? '#000000';
      } else {
        const color = (p.hue != null && tkHueToHex(p.hue)) || theme.accent;
        fill = p.hue != null ? `hsla(${p.hue},60%,50%,0.06)` : 'none';
        stroke = color;
        strokeWidth = 1.1;
        dash = '2 5';
        titleFill = color;
      }
      g.appendChild(svgEl('path', {
        d: packageShapePath(p),
        fill,
        stroke,
        'stroke-width': strokeWidth,
        'stroke-dasharray': dash,
        'stroke-linejoin': 'miter',
      }));
      const tb = p.titleBox;
      const label = p.stereotype ? `«${p.stereotype}» ${p.name ?? ''}` : (p.name ?? '');
      if (tb) {
        g.appendChild(svgEl('rect', {
          x: tb.x, y: tb.y, width: tb.w, height: tb.h, rx: styleTheme ? 0 : 4,
          fill: '#FFFFFF',
          stroke,
          'stroke-width': styleTheme ? 1.5 : 0.8,
        }));
      }
      const t = svgEl('text', {
        x: (tb?.x ?? p.x) + 8, y: (tb?.y ?? p.y) + (tb ? tb.h * 0.7 : 10),
        'text-anchor': 'start',
        fill: titleFill,
        'font-size': '11', 'font-weight': '700', 'font-style': 'italic',
        'letter-spacing': '0.04em',
        'font-family': fontFamily,
      });
      t.textContent = label || '';
      g.appendChild(t);
      this.svg.appendChild(g);
    }
  }

  #buildEdges(layout: ComponentLayout, theme: DiagramTheme, fontFamily: string): void {
    const styleTheme = this.#styleTheme;
    const ep = styleTheme ? edgePaint(styleTheme) : null;
    for (const rawE of layout.edges) {
      const e = rawE as typeof rawE & {
        labelX?: number;
        labelY?: number;
        labelW?: number;
      };
      if (!e.path) continue;
      const color = ep
        ? (e.hue != null ? edgeStrokeHex(e.hue, ep.stroke) : ep.stroke)
        : edgeStrokeHex(e.hue, theme.accent);
      const g = svgEl('g', { class: 'cd-edge' });
      const ballSocket = Boolean(e.fromInterface && e.toInterface) || e.kind === 'assembly';
      const dashed = !ballSocket && (e.kind === 'dependency' || e.kind === 'realization');
      const path = svgEl('path', {
        d: e.path, fill: 'none', stroke: color,
        'stroke-width': ep?.strokeWidth ?? 1.35,
        'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        'stroke-dasharray': dashed ? (ep?.dasharray || '6 4') : null,
        class: 'cd-edge__path',
      });
      g.appendChild(path);
      if (!ballSocket) {
        const dir = pathEndDirection(e.path);
        const back = 8;
        const tipX = e.toX - dir.x * back;
        const tipY = e.toY - dir.y * back;
        const head = svgArrowHead({
          d: e.path,
          tip: { x: tipX, y: tipY },
          color,
        });
        head.classList.add('cd-edge__arrow');
        g.appendChild(head);
      }
      if (e.label && !(ep?.hideLabels)) {
        const mx = e.labelX ?? (e.fromX + e.toX) / 2;
        const my = e.labelY ?? (e.fromY + e.toY) / 2;
        const w = e.labelW ?? (e.label.length * 5.6 + 8);
        const etiqueta = svgEl('g', { class: 'cd-edge__label' });
        const hue = e.hue ?? 205;
        etiqueta.appendChild(svgEl('rect', {
          x: mx - w / 2, y: my - 8, width: w, height: 16, rx: styleTheme ? 0 : 4,
          fill: edgeChipFill(hue), class: 'cd-edge__chip',
        }));
        const t = svgEl('text', {
          x: mx, y: my + 3.5, 'text-anchor': 'middle', fill: edgeChipText(hue, theme.muted),
          'font-size': '10', 'font-family': fontFamily,
        });
        t.textContent = e.label;
        etiqueta.appendChild(t);
        if (this.#etiquetasEdges) this.#etiquetasEdges.appendChild(etiqueta);
      }
      this.svg.appendChild(g);
    }
  }

  #buildInterfaces(layout: ComponentLayout, theme: DiagramTheme, fontFamily: string): void {
    const r = LOLLI_R;
    const styleTheme = this.#styleTheme;
    const accent = styleTheme ? (edgePaint(styleTheme).stroke) : theme.accent;
    for (const iface of layout.interfaces) {
      const g = svgEl('g', { class: 'cd-iface' });
      g.dataset.ifaceId = iface.id;
      const stroke = (iface.hue != null && tkHueToHex(iface.hue, 48, 30)) || accent;
      const comp = layout.components.find((c) => c.id === iface.component);
      if (comp && !iface.docked) {
        let bx: number;
        let by: number;
        switch (iface.side) {
          case 'top':    bx = comp.x + iface.offset; by = comp.y; break;
          case 'bottom': bx = comp.x + iface.offset; by = comp.y + comp.h; break;
          case 'left':   bx = comp.x; by = comp.y + iface.offset; break;
          case 'right':
          default:       bx = comp.x + comp.w; by = comp.y + iface.offset; break;
        }
        const inner: AnchorPoint = stemInner({ cx: iface.cx, cy: iface.cy, side: iface.side }, r);
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
          'font-family': fontFamily,
        });
        t.textContent = `«${iface.name}»`;
        g.appendChild(t);
      }
      this.svg.appendChild(g);
    }
  }

  #buildComponents(layout: ComponentLayout, theme: DiagramTheme, fontFamily: string): void {
    const styleTheme = this.#styleTheme;
    const paint = styleTheme ? entityPaint(styleTheme, false) : null;
    for (const c of layout.components) {
      const g = svgEl('g', { class: 'cd-cmp' });
      g.dataset.cmpId = c.id;
      const stroke = paint?.border ?? ((c.hue != null && tkHueToHex(c.hue)) || theme.accent);
      const fill = paint?.fill ?? theme.chipFill;
      const rx = paint?.radius ?? 6;
      g.appendChild(svgEl('rect', {
        x: c.x, y: c.y, width: c.w, height: c.h, rx,
        fill, stroke, 'stroke-width': paint?.borderWidth ?? 1.3,
      }));
      if (c.stereotype) {
        const headerFill = paint?.headerFill
          ?? (c.hue != null ? `hsla(${c.hue},65%,55%,0.22)` : theme.chipFill);
        g.appendChild(svgEl('rect', {
          x: c.x + 1, y: c.y + 1, width: c.w - 2, height: 15, rx: Math.max(0, rx - 1),
          fill: headerFill,
        }));
        const stereo = svgEl('text', {
          x: c.x + c.w / 2, y: c.y + 12, 'text-anchor': 'middle',
          fill: theme.muted, 'font-size': '9.5', 'font-style': 'italic',
          'font-family': fontFamily,
        });
        stereo.textContent = `«${c.stereotype}»`;
        g.appendChild(stereo);
      }
      const t = svgEl('text', {
        x: c.x + c.w / 2, y: c.labelY ?? c.y + c.h / 2 + 4, 'text-anchor': 'middle',
        fill: theme.text, 'font-size': '11', 'font-weight': '700',
        'font-family': fontFamily,
      });
      const lineas: string[] = c.lines ?? (c.name ? [c.name] : []);
      const lineHeight: number = c.lineHeight ?? 13;
      lineas.forEach((linea: string, i: number) => {
        const ts = svgEl('tspan', { x: c.x + c.w / 2, dy: i === 0 ? 0 : lineHeight });
        ts.textContent = linea;
        t.appendChild(ts);
      });
      g.appendChild(t);
      const bubbles = c.itemBubbles ?? [];
      for (const b of bubbles) {
        g.appendChild(svgEl('rect', {
          x: b.x, y: b.y, width: b.w, height: b.h, rx: styleTheme ? 0 : 4,
          fill: theme.chipFillSoft ?? '#FFFFFF', stroke: paint?.border ?? theme.border ?? 'rgba(0,0,0,0.08)',
          'stroke-width': 0.6,
        }));
        let textX = b.x + 6;
        if (b.method) {
          const badge = HTTP_METHOD_BADGE[b.method] ?? { fill: '#6b7280', text: '#fff' };
          g.appendChild(svgEl('rect', {
            x: b.x + 3, y: b.y + 2.5, width: b.badgeW, height: b.h - 5, rx: styleTheme ? 0 : 3,
            fill: badge.fill,
          }));
          const mt = svgEl('text', {
            x: b.x + 3 + b.badgeW / 2, y: b.y + b.h / 2 + 3.2, 'text-anchor': 'middle',
            fill: badge.text, 'font-size': '7.5', 'font-weight': '700', 'font-family': fontFamily,
          });
          mt.textContent = b.method;
          g.appendChild(mt);
          textX = b.x + 8 + b.badgeW;
        }
        const pt = svgEl('text', {
          x: textX, y: b.y + b.h / 2 + 3.4, 'text-anchor': 'start',
          fill: theme.text, 'font-size': '9', 'font-family': fontFamily,
        });
        pt.textContent = b.path;
        g.appendChild(pt);
      }
      this.svg.appendChild(g);
    }
  }

  /* ── eventos viewer ── */

  #onClick = (_e: MouseEvent): void => {
    if (!this.hasAttribute('open-on-click')) return;
    const ev = new CustomEvent('iswc-open-viewer', {
      bubbles: true, composed: true, cancelable: true, detail: { payload: this.payload },
    });
    this.dispatchEvent(ev);
    if (!ev.defaultPrevented) this.openOwnViewer('componentDiagram');
  };

  #onMouseMove = (): void => { /* placeholder para tooltip por nodo */ };
  #onMouseLeave = (): void => { this.tooltipEl.hidden = true; };
}

defineElement('iswc-component-diagram', IswcComponentDiagram, 'IswcComponentDiagram');
registerDiagramKind('component', 'iswc-component-diagram');
registerDiagramKind('componentDiagram', 'iswc-component-diagram');

export { IswcComponentDiagram };
