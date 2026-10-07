import { adoptCss, defineElement, emit } from '../../core/element.js';
import { DiagramElementBase } from '../_shared/diagram-element-base.js';
import { resolveComponentSpec, computeComponentLayout, packageShapePath, LOLLI_R, HTTP_METHOD_BADGE, CARD_TEXT_X, CARD_STEREO_DY } from './component-spec.js';
import type { ComponentLayout } from './component-spec.js';
import { sequenceThemeDark, sequenceThemeLight } from './sequence-spec.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import {
  edgeStrokeHex, edgeChipFill, edgeChipText, hexMixWhite, RECEIVER_COLOR,
} from '../_shared/diagram-edge-style.js';
import type { DiagramTheme } from './diagram-types.js';
import { registerDiagramKind } from './diagram-kinds.js';
import { svgEl } from '../_shared/svg-chart-engine.js';
import { svgIconGroup } from '../_shared/tk-icon-inline.js';
import { svgArrowHead, pathEndDirection } from '../_shared/diagram-arrow.js';
import type { Caja, Lado, Paquete, Punto } from '../_shared/diagram-tipos.js';
import {
  resolveErTheme,
  pickThemeMode,
  themeToDiagramTheme,
  clusterPalette,
  componentBoxPaint,
  edgePaint,
  injectThemeCss,
  type ErThemeJson,
} from './theme.js';
import type { InterfaceStemPoint, LayoutPackage, AnchorPoint } from "./component-diagram.schemas.js";

/**
 * <iswc-component-diagram> — diagrama de componentes UML en SVG, sin Mermaid.
 *
 * Tres primitivas declaradas por el payload:
 *   - packages: agrupadores (rectángulo InSoft sin pestaña de carpeta);
 *     soporta anidación vía `parent`.
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

const FONT = '"Poppins", "Inter", system-ui, sans-serif';

/** Clave de paleta genérica según rol del paquete (sin nombres de tech). */
function packagePaletteId(p: Paquete): string {
  const blob = `${p.id ?? ''} ${p.name ?? ''} ${p.stereotype ?? ''}`.toLowerCase();
  // Roles genéricos → claves del theme CD (expose|group|service|store|…).
  if (/dsclient|\bds\b|login|jwt.?ext/.test(blob)) return 'external';
  if (/\bdb\b|postgre|mssql|datos|clientesis|store|storage/.test(blob) && !/cdn|cloudflare|\br2\b/.test(blob)) {
    return 'store';
  }
  if (/openai|\bllm\b|vector|service|ia\b/.test(blob)) return 'service';
  if (/\br2\b|cdn|cloudflare|external/.test(blob)) return 'external';
  if (/cliente|app|front|isw|consumidor|expose/.test(blob)) return 'expose';
  if (/api|ayudas|backend|function|http/.test(blob)) return 'expose';
  if (/azure|cloud|group|panel/.test(blob)) return 'group';
  if (/portal|web\b|cool/.test(blob)) return 'cool';
  return String(p.id ?? 'expose').replace(/^pkg-/, '');
}

/** Iniciales del avatar de tarjeta: dos palabras, o inicial + siguiente mayúscula. */
function cardInitials(name: string): string {
  const words = String(name).split(/[\s·/._\-()×]+/).filter((w) => /[A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/.test(w));
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase();
  // Convención de clase `TNombre`: la T no distingue (todas la llevan).
  const w = (words[0] ?? '?').replace(/^T(?=[A-ZÁÉÍÓÚÑ])/, '');
  const upper = w.slice(1).match(/[A-ZÁÉÍÓÚÑ]/)?.[0];
  return (w[0]! + (upper ?? w[1] ?? '')).toUpperCase();
}

/** Tinta legible sobre `hex`: negro sobre claros, blanco sobre oscuros. */
function inkOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#FFFFFF';
  const n = parseInt(m[1]!, 16);
  const lum = 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return lum > 150 ? '#1F2937' : '#FFFFFF';
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
    if (fromAttr) {
      const id = fromAttr.trim().toLowerCase();
      // CD usa paleta propia; "insoft" apunta a insoft-cd.
      if (id === 'insoft') return resolveErTheme('insoft-cd') ?? resolveErTheme('insoft');
      return resolveErTheme(fromAttr);
    }
    const fromPayload = resolveErTheme(this.payload);
    if (fromPayload?.id === 'insoft') return resolveErTheme('insoft-cd') ?? fromPayload;
    return fromPayload;
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
    this.svg.style.fontFamily = fontFamily;

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
    const cd = styleTheme ? componentBoxPaint(styleTheme) : null;
    for (const rawP of layout.packages) {
      const p = rawP as LayoutPackage;
      const g = svgEl('g', { class: 'cd-pkg' });
      if (layout.boxStyle === 'vp') {
        this.#paintVpPackage(g, p, styleTheme ? clusterPalette(styleTheme, packagePaletteId(p)).fill : '#FFFFC1', styleTheme);
        this.svg.appendChild(g);
        continue;
      }
      let fill: string;
      let stroke: string;
      let strokeWidth: number;
      let dash: string | null;
      let titleFill: string;
      if (styleTheme) {
        const pal = clusterPalette(styleTheme, packagePaletteId(p));
        // Paleta explícita del paquete (payload): clave del theme o "#hex".
        const key = (p as { palette?: string }).palette;
        fill = (key?.startsWith('#') ? key : key && styleTheme.cluster?.palettes?.[key]) || pal.fill;
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
        d: packageShapePath(p, { noTab: cd?.noPackageTab ?? Boolean(styleTheme) }),
        fill,
        stroke,
        'stroke-width': strokeWidth,
        'stroke-dasharray': dash,
        'stroke-linejoin': 'miter',
      }));
      const tb = p.titleBox;
      const label = p.stereotype ? `«${p.stereotype}» ${p.name ?? ''}` : (p.name ?? '');
      const noTab = cd?.noPackageTab ?? Boolean(styleTheme);
      // InSoft: título sin fondo ni caja (solo tinta).
      if (!noTab && tb && (cd ? cd.titleBackground : !styleTheme)) {
        g.appendChild(svgEl('rect', {
          x: tb.x, y: tb.y, width: tb.w, height: tb.h, rx: styleTheme ? 0 : 4,
          fill: '#FFFFFF',
          stroke,
          'stroke-width': styleTheme ? 1.5 : 0.8,
        }));
      }
      // Sin pestaña: título dentro, arriba-izquierda (no centrado, no caja).
      const tx = noTab ? p.x + 10 : (tb?.x ?? p.x) + 8;
      const ty = noTab ? p.y + 16 : (tb?.y ?? p.y) + (tb ? tb.h * 0.7 : 14);
      const t = svgEl('text', {
        x: tx, y: ty,
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
    const cd = styleTheme ? componentBoxPaint(styleTheme) : null;
    for (const rawE of layout.edges) {
      const e = rawE as typeof rawE & {
        labelX?: number;
        labelY?: number;
        labelW?: number;
      };
      if (!e.path) continue;
      const ballSocket = Boolean(e.fromInterface && e.toInterface) || e.kind === 'assembly';
      // Color por arista (hex) > hue > stroke del theme.
      const color = (e as { color?: string }).color
        || (ep
          ? (e.hue != null ? edgeStrokeHex(e.hue, ep.stroke) : ep.stroke)
          : edgeStrokeHex(e.hue, theme.accent));
      const g = svgEl('g', { class: 'cd-edge' });
      const dashed = !ballSocket && (e.kind === 'dependency' || e.kind === 'realization');
      // butt: round pinta medio círculo DENTRO de la caja en el arranque
      // ("Inicia dentro"). El trazo nace en el borde y sale limpio.
      const path = svgEl('path', {
        d: e.path, fill: 'none', stroke: color,
        'stroke-width': ep?.strokeWidth ?? 1.35,
        'stroke-linejoin': 'round', 'stroke-linecap': 'butt',
        'stroke-dasharray': dashed ? (ep?.dasharray || '6 4') : null,
        class: 'cd-edge__path',
      });
      g.appendChild(path);
      if (!ballSocket) {
        const dir = pathEndDirection(e.path);
        // Remate `arrow`: la punta toca la cara del destino.
        const back = layout.connector === 'arrow' ? 0 : 8;
        // VP: remate 10 % más grande, del color de la arista.
        const escala = layout.boxStyle === 'vp' ? 1.1 : 1;
        const tipX = e.toX - dir.x * back;
        const tipY = e.toY - dir.y * back;
        const head = svgArrowHead({
          d: e.path,
          tip: { x: tipX, y: tipY },
          color,
          len: 7 * escala,
          halfWidth: 3.5 * escala,
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
    const cd = styleTheme ? componentBoxPaint(styleTheme) : null;
    const ep = styleTheme ? edgePaint(styleTheme) : null;
    const lolliFill = cd?.lollipop ?? '#7ACFF4';
    // Contorno O/C y stem = arista oscura; relleno O = color expositor (cian).
    const stroke = ep?.stroke ?? (styleTheme ? theme.accent : theme.accent);
    // InSoft: -( expone (provided→C), -O consume (required→O). UML clásico = al revés.
    const invert = cd?.invertAssembly === true;
    for (const iface of layout.interfaces) {
      const g = svgEl('g', { class: 'cd-iface' });
      g.dataset.ifaceId = iface.id;
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
      // provided = expone; required = consume. Glifo según invertAssembly.
      const drawSocket = invert ? iface.kind === 'provided' : iface.kind === 'required';
      if (drawSocket) {
        g.appendChild(svgEl('path', {
          d: requiredSocketPath(iface.cx, iface.cy, r, iface.side),
          fill: 'none', stroke, 'stroke-width': 1.3,
          'stroke-linecap': 'round',
        }));
      } else {
        g.appendChild(svgEl('circle', {
          cx: iface.cx, cy: iface.cy, r,
          fill: lolliFill,
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
    const paint = styleTheme ? componentBoxPaint(styleTheme) : null;
    for (const c of layout.components) {
      const g = svgEl('g', { class: 'cd-cmp' });
      g.dataset.cmpId = c.id;
      const ownColor = (c as { color?: string }).color;
      // #C1BFFF (huérfano / solo-receptor): sólido, sin lavar con blanco.
      const lilac = !!ownColor
        && ownColor.replace(/^#/, '').toUpperCase()
          === RECEIVER_COLOR.replace(/^#/, '').toUpperCase();
      // Lila (huérfano / solo-receptor): relleno lila + borde negro del theme;
      // con stroke = ownColor el borde desaparecía sobre el relleno.
      const stroke = (lilac ? ((styleTheme as { orphan?: { border?: string } } | null)?.orphan?.border ?? '#000000') : '')
        || ownColor
        || paint?.border
        || ((c.hue != null && tkHueToHex(c.hue)) || theme.accent);
      if (layout.boxStyle === 'card') {
        this.#paintCard(g, c, ownColor || paint?.border || theme.accent, theme, fontFamily);
        this.svg.appendChild(g);
        continue;
      }
      if (layout.boxStyle === 'vp') {
        this.#paintVpComponent(g, c, (c as { fill?: string }).fill ?? (ownColor ? hexMixWhite(ownColor, 0.62) : '#BCFFBB'));
        this.svg.appendChild(g);
        continue;
      }
      const fill = ownColor
        ? (lilac ? ownColor : hexMixWhite(ownColor, 0.88))
        : (paint?.fill ?? theme.chipFill);
      const rx = paint?.radius ?? 6;
      g.appendChild(svgEl('rect', {
        x: c.x, y: c.y, width: c.w, height: c.h, rx,
        fill, stroke, 'stroke-width': paint?.borderWidth ?? 1.3,
      }));
      if (c.stereotype) {
        const headerFill = ownColor
          ? (lilac ? ownColor : hexMixWhite(ownColor, 0.78))
          : (paint?.headerFill
            ?? (c.hue != null ? `hsla(${c.hue},65%,55%,0.22)` : theme.chipFill));
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
        // EP: fondo transparente; borde blanco semitransparente (theme.epBorder).
        const epTransparent = paint?.epRowTransparent !== false;
        g.appendChild(svgEl('rect', {
          x: b.x, y: b.y, width: b.w, height: b.h, rx: styleTheme ? 0 : 4,
          fill: epTransparent ? 'none' : (paint?.epFill ?? 'none'),
          stroke: paint?.epBorder ?? (styleTheme ? 'rgba(255,255,255,0.55)' : (paint?.border ?? theme.border ?? 'rgba(0,0,0,0.08)')),
          'stroke-width': styleTheme ? 1.2 : 0.6,
        }));
        let textX = b.x + 6;
        const methods = b.methods?.length ? b.methods : [];
        methods.forEach((method, mi) => {
          const badge = HTTP_METHOD_BADGE[method] ?? { fill: '#6b7280', text: '#fff' };
          const bx = b.x + 3 + mi * (b.badgeW + 2);
          g.appendChild(svgEl('rect', {
            x: bx, y: b.y + 2.5, width: b.badgeW, height: b.h - 5, rx: styleTheme ? 0 : 3,
            fill: badge.fill,
          }));
          const mt = svgEl('text', {
            x: bx + b.badgeW / 2, y: b.y + b.h / 2 + 3.2, 'text-anchor': 'middle',
            fill: badge.text, 'font-size': '7.5', 'font-weight': '700', 'font-family': fontFamily,
          });
          mt.textContent = method;
          g.appendChild(mt);
          textX = bx + b.badgeW + 5;
        });
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

  /**
   * Tarjeta de organigrama (`layout.boxStyle: 'card'`): fondo blanco con
   * sombra, borde y avatar en el color del componente, nombre en negrita y
   * estereotipo debajo. El blanco contrasta con cualquier paleta de
   * agrupador; el color queda en el borde y el avatar, donde se lee.
   */
  #paintCard(
    g: SVGGElement,
    c: ComponentLayout['components'][number] & Caja & { id: string; name?: string; stereotype?: string; icon?: string },
    accent: string,
    theme: DiagramTheme,
    fontFamily: string,
  ): void {
    const rx = 10;
    g.appendChild(svgEl('rect', {
      x: c.x + 2, y: c.y + 3, width: c.w, height: c.h, rx,
      fill: 'rgba(15,23,42,0.14)',
    }));
    g.appendChild(svgEl('rect', {
      x: c.x, y: c.y, width: c.w, height: c.h, rx,
      fill: '#FFFFFF', stroke: accent, 'stroke-width': 1.4,
    }));
    const r = 15;
    const cx = c.x + 8 + r;
    const cy = c.y + c.h / 2;
    g.appendChild(svgEl('circle', { cx, cy, r, fill: accent }));
    if (c.icon) {
      // Foto de perfil: icono Iconify del catálogo local, en la tinta legible.
      const size = 18;
      g.appendChild(svgIconGroup(c.icon, { x: cx - size / 2, y: cy - size / 2, size, color: inkOn(accent) }));
    } else {
      const ini = svgEl('text', {
        x: cx, y: cy + 3.6, 'text-anchor': 'middle',
        fill: inkOn(accent), 'font-size': '10', 'font-weight': '700',
        'font-family': fontFamily,
      });
      ini.textContent = cardInitials(c.name ?? c.id);
      g.appendChild(ini);
    }
    const tx = c.x + CARD_TEXT_X;
    const t = svgEl('text', {
      x: tx, y: c.labelY ?? cy + 4, 'text-anchor': 'start',
      fill: theme.text, 'font-size': '11', 'font-weight': '700',
      'font-family': fontFamily,
    });
    const lineas: string[] = c.lines ?? (c.name ? [c.name] : []);
    const lineHeight = c.lineHeight ?? 13;
    lineas.forEach((linea, i) => {
      const ts = svgEl('tspan', { x: tx, dy: i === 0 ? 0 : lineHeight });
      ts.textContent = linea;
      t.appendChild(ts);
    });
    g.appendChild(t);
    if (c.stereotype) {
      const st = svgEl('text', {
        x: tx, y: (c.labelY ?? cy) + (lineas.length - 1) * lineHeight + CARD_STEREO_DY,
        'text-anchor': 'start', fill: theme.muted, 'font-size': '9.5', 'font-style': 'italic',
        'font-family': fontFamily,
      });
      st.textContent = c.stereotype;
      g.appendChild(st);
    }
  }

  /**
   * Paquete estilo Visual Paradigm / InSoft: carpeta con pestaña corta a la
   * izquierda, borde negro de 1 px y rótulo centrado (o junto a la pestaña
   * si centrado taparía la vertical de un hijo directo).
   */
  #paintVpPackage(g: SVGGElement, p: LayoutPackage, fallbackFill: string, styleTheme: unknown): void {
    const key = (p as { palette?: string }).palette;
    const palettes = (styleTheme as { cluster?: { palettes?: Record<string, string> } } | null)?.cluster?.palettes;
    const fill = (key?.startsWith('#') ? key : key && palettes?.[key]) || fallbackFill;
    const TAB_W = Math.min(56, p.w / 3);
    const TAB_H = 12;
    g.appendChild(svgEl('rect', {
      x: p.x, y: p.y, width: TAB_W, height: TAB_H, fill, stroke: '#000000', 'stroke-width': 1,
    }));
    g.appendChild(svgEl('rect', {
      x: p.x, y: p.y + TAB_H, width: p.w, height: p.h - TAB_H, fill, stroke: '#000000', 'stroke-width': 1,
    }));
    const centro = (p as { titleCenter?: boolean }).titleCenter === true;
    const t = svgEl('text', {
      x: centro ? p.x + p.w / 2 : p.x + TAB_W + 12, y: p.y + TAB_H + 15,
      'text-anchor': centro ? 'middle' : 'start', fill: '#000000',
      'font-size': '12', 'font-family': 'Tahoma,Arial,sans-serif',
    });
    t.textContent = p.stereotype ? `«${p.stereotype}» ${p.name ?? ''}` : (p.name ?? '');
    g.appendChild(t);
  }

  /**
   * Componente estilo Visual Paradigm / InSoft: caja recta pastel con borde
   * negro, «estereotipo» y nombre en negrita centrados, y arriba a la derecha
   * el icono del componente (Iconify) o el glifo UML de componente.
   */
  #paintVpComponent(
    g: SVGGElement,
    c: ComponentLayout['components'][number] & Caja & { id: string; name?: string; stereotype?: string; icon?: string },
    fill: string,
  ): void {
    const FONT = 'Tahoma,Arial,sans-serif';
    g.appendChild(svgEl('rect', {
      x: c.x, y: c.y, width: c.w, height: c.h, fill, stroke: '#000000', 'stroke-width': 1,
    }));
    const ix = c.x + c.w - 22;
    const iy = c.y + 6;
    if (c.icon) {
      g.appendChild(svgIconGroup(c.icon, { x: ix, y: iy, size: 15, color: '#1F2937' }));
    } else {
      g.appendChild(svgEl('rect', { x: ix + 3, y: iy, width: 11, height: 14, fill: 'none', stroke: '#000000', 'stroke-width': 0.9 }));
      g.appendChild(svgEl('rect', { x: ix, y: iy + 3, width: 6, height: 3, fill, stroke: '#000000', 'stroke-width': 0.9 }));
      g.appendChild(svgEl('rect', { x: ix, y: iy + 8, width: 6, height: 3, fill, stroke: '#000000', 'stroke-width': 0.9 }));
    }
    const cx = c.x + (c.w - 18) / 2;
    if (c.stereotype) {
      const st = svgEl('text', {
        x: cx, y: (c.labelY ?? c.y + c.h / 2) - 15, 'text-anchor': 'middle', fill: '#000000',
        'font-size': '10.5', 'font-family': FONT,
      });
      st.textContent = `«${c.stereotype}»`;
      g.appendChild(st);
    }
    const t = svgEl('text', {
      x: cx, y: c.labelY ?? c.y + c.h / 2 + 4, 'text-anchor': 'middle', fill: '#000000',
      'font-size': '11.5', 'font-weight': '700', 'font-family': FONT,
    });
    const lineas: string[] = c.lines ?? (c.name ? [c.name] : []);
    const lh = c.lineHeight ?? 13;
    lineas.forEach((linea, i) => {
      const ts = svgEl('tspan', { x: cx, dy: i === 0 ? 0 : lh });
      ts.textContent = linea;
      t.appendChild(ts);
    });
    g.appendChild(t);
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
