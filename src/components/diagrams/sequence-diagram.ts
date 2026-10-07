import { adoptCss, defineElement, emit, emitCancelable } from '../../core/element.js';
import { DiagramElementBase } from '../_shared/diagram-element-base.js';
import { svgArrowHead } from '../_shared/diagram-arrow.js';
import {
  computeSequenceLayout,
  resolveSequenceSpec,
  sequenceMessageTooltipText,
  sequenceThemeDark,
  sequenceThemeLight,
} from './sequence-spec.js';
import type {
  SequenceLayout,
  SequenceLayoutAltBox,
  SequenceLayoutMessage,
  SequenceResolvedSpec,
} from './sequence-spec.js';
import type { SequenceLayoutFragment } from './sequence-spec.schemas.js';
import { hostStyleName, styleThemeFor } from './diagram-styles.js';
import { injectThemeCss, lineColor, paletteColor, pickThemeMode, resolveErTheme, sequencePaint, themeToDiagramTheme } from './theme.js';
import type { ErThemeJson } from './theme.js';
import { readEdgeStyle } from './diagram-vocab.js';
import type { EdgeStyle } from './diagram-vocab.js';
import { styledEdgePath } from '../_shared/diagram-curve.js';
import { SequenceTurtle } from './sequence-turtle.js';
import type { PathTurtle, TurtleMessage, TurtleTheme } from '../_shared/path-turtle.js';
import { TK_DIAGRAM_RADIUS_PX } from '../_shared/diagram-grid.js';
import { svgIconGroup, svgIconBadge, hasIconJsonSugar } from '../_shared/tk-icon-inline.js';
import { pathPoints } from '../_shared/diagram-arrow.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import type { DiagramTheme } from './diagram-types.js';
import { contrastFontColor } from '../_shared/tk-color.js';
import { inlineMdWeb } from '../_shared/tk-inline-md.js';
import { wrapText, buildTspans } from '../_shared/diagram-text-wrap.js';
import type { TSpanSpec } from '../_shared/diagram-text-wrap.js';
import { registerDiagramKind } from './diagram-kinds.js';
import { svgEl } from '../_shared/svg-chart-engine.js';
import type { SequenceMessageSpec } from './sequence-spec.js';
import type { TurtleState, MsgNode, LifelineNode, ActorNode, PartBox } from "./sequence-diagram.schemas.js";

/**
 * <iswc-sequence-diagram> — diagrama de secuencia en SVG, sin Mermaid.
 *
 * Configuración por JSON (idéntica a la del proyecto original): un
 * <script type="application/json"> hijo, o la propiedad `payload`.
 *
 *   <iswc-sequence-diagram>
 *     <script type="application/json">
 *       { "sequence": { "actors": [...], "messages": [...] } }
 *     </script>
 *   </iswc-sequence-diagram>
 *
 * También acepta `{ "preset": "tk1437191" }`.
 *
 * Atributos
 *   color  inline (default) | viewer — viewer activa hover, leyenda clickeable
 *            y auto-animación de la tortuga.
 *
 * Propiedades: payload, spec, layout, turtle, hiddenGroups
 * Eventos: iswc-turtle-state (detail: {playing, idx, total, replay}),
 *          iswc-open-viewer (click en colore inline),
 *          iswc-toggle-group (detail: {id})
 */

const GUIDE_X = 44;
const FONT_UI = 'Tahoma,Arial,sans-serif';
/** Icono de cada tipo de región: el tipo se lee por el icono, no por la palabra. */
const FRAGMENT_ICON: Record<string, string> = {
  par: 'mdi:call-split',
  async: 'mdi:lightning-bolt-outline',
  loop: 'mdi:repeat',
  opt: 'mdi:help-circle-outline',
  alt: 'mdi:source-branch',
  region: 'mdi:shape-outline',
};
const FONT_MONO = 'Consolas,Menlo,monospace';

/** Estado del callback `onState` del motor de tortuga (path-turtle). */

/** Vista cacheada por mensaje, para el hover sin reconstruir el SVG. */

/** Línea vertical de lifeline cacheada (para atenuar las inactivas en hover). */

/** Caja rectangular de actor cacheada (para resaltar origen/destino en hover). */

/** Div dentro de foreignObject con HTML inline (iconos / markdown). */
function foreignHtml(
  x: number, y: number, w: number, h: number,
  className: string, html: string, style?: Partial<CSSStyleDeclaration>,
): SVGForeignObjectElement {
  const fo = svgEl('foreignObject', { x, y, width: w, height: h, overflow: 'visible' });
  const div = document.createElement('div');
  div.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  div.className = className;
  if (style) Object.assign(div.style, style);
  div.innerHTML = html;
  fo.appendChild(div);
  return fo;
}

/** Región de participantes calculada por el layout. */
class IswcSequenceDiagram extends DiagramElementBase {
  #theme: DiagramTheme | null = null;
  /** Tema del estilo (`diagram-style="insoft"` → tema `sequence`), ya fusionado con el modo. */
  #styleTheme: ErThemeJson | null = null;
  #paint: ReturnType<typeof sequencePaint> | null = null;
  /** Tipografía de rótulos (actores, pestañas, leyenda) y de etiquetas de mensaje. */
  #font: string = FONT_UI;
  #labelFont: string = FONT_MONO;
  #edgeStyle: EdgeStyle = 'orthogonal';
  #turtle: PathTurtle | null = null;
  #turtleGroup: SVGGElement | null = null;
  #hiddenGroups: Set<string> = new Set<string>();
  /** id de mensaje → nodos cacheados, para aplicar hover sin reconstruir el SVG. */
  #msgNodes: Map<string, MsgNode> = new Map();
  #lifelineNodes: LifelineNode[] = [];
  #actorNodes: ActorNode[] = [];
  #hoverId: string | null = null;

  constructor() {
    super();
    this.initDiagramShadow('seq-svg', 'seq-tooltip');
    adoptCss(this.shadowRoot!, import.meta.url);
  }

  onDiagramConnected(): void {
    this.wrap.addEventListener('mousemove', this.#onMouseMove as EventListener);
    this.wrap.addEventListener('mouseleave', this.#onMouseLeave as EventListener);
    this.wrap.addEventListener('click', this.#onClick as EventListener);
  }

  onDiagramDisconnected(): void {
    this.#turtle?.destroy();
    this.#turtle = null;
    this.wrap.removeEventListener('mousemove', this.#onMouseMove as EventListener);
    this.wrap.removeEventListener('mouseleave', this.#onMouseLeave as EventListener);
    this.wrap.removeEventListener('click', this.#onClick as EventListener);
  }

  onPayloadChanged(): void { this.#hiddenGroups = new Set(); }

  get turtle(): PathTurtle | null { return this.#turtle; }

  get hiddenGroups(): Set<string> { return this.#hiddenGroups; }
  set hiddenGroups(v: Set<string> | Iterable<string> | null | undefined) {
    this.#hiddenGroups = v instanceof Set ? v : new Set(v ?? []);
    this.queueRender();
  }

  renderDiagram(): void {
    // Los grupos ocultos se filtran del spec (re-diseña sin esas aristas).
    const hidden = this.#hiddenGroups;
    const spec: SequenceResolvedSpec | null = resolveSequenceSpec(this.payload ?? {});
    this.spec = spec;
    if (!spec) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }
    delete this.wrap.dataset.empty;

    const keep = (m: SequenceMessageSpec): boolean => !m.group || !hidden.has(m.group);
    // Con estilo cargado la leyenda se apaga salvo que el payload la pida:
    // el título del grupo va sobre su primera arista.
    const estiloPrevio = styleThemeFor(hostStyleName(this), 'sequence');
    if (spec.legend == null) spec.legend = !estiloPrevio;
    const visibleSpec: SequenceResolvedSpec = hidden.size
      ? {
          ...spec,
          messages: spec.messages ? spec.messages.filter(keep) : undefined,
          preamble: spec.preamble ? spec.preamble.filter(keep) : undefined,
          epilogue: spec.epilogue ? spec.epilogue.filter(keep) : undefined,
          alt: spec.alt
            ? { branches: spec.alt.branches.map((b) => ({ ...b, messages: b.messages.filter(keep) })) }
            : undefined,
        }
      : spec;

    const dark = this.isDarkTheme;
    const base: DiagramTheme = dark ? sequenceThemeDark() : sequenceThemeLight();
    // Estilo por atributo (`diagram-style`), o `theme` heredado / del payload.
    const styleRaw = styleThemeFor(hostStyleName(this), 'sequence')
      ?? (this.getAttribute('theme') ? resolveErTheme(this.getAttribute('theme')) : null)
      ?? resolveErTheme(this.payload);
    const styleTheme = styleRaw && styleRaw.kind === 'sequence' ? pickThemeMode(styleRaw, dark) : null;
    this.#styleTheme = styleTheme;
    this.#paint = styleTheme ? sequencePaint(styleTheme) : null;
    this.#font = styleTheme?.font?.family ?? FONT_UI;
    this.#labelFont = this.#paint?.labelFont ?? (styleTheme ? this.#font : FONT_MONO);
    this.#edgeStyle = readEdgeStyle(this.payload);
    const theme: DiagramTheme = styleTheme ? themeToDiagramTheme(styleTheme, base) : base;
    this.#theme = theme;
    this.syncThemeAttr();
    const layout: SequenceLayout = computeSequenceLayout(visibleSpec, { labelCharW: styleTheme ? 6.9 : 6.1 });
    this.layout = layout;

    this.#buildSvg(layout, theme);
    // El CSS del tema viaja dentro del SVG (tipografía + variables): el
    // export estático sale con Poppins sin depender de la página.
    if (styleTheme) {
      injectThemeCss(this.svg, styleTheme);
      this.svg.setAttribute('data-seq-theme', styleTheme.id);
    } else {
      this.svg.removeAttribute('data-seq-theme');
    }
    this.wrap.classList.toggle('iswc-viewer', this.isViewer);
  }

  #buildSvg(layout: SequenceLayout, theme: DiagramTheme): void {
    const { width: W, height: H, actors, lifelines, messages, altBox, title, subtitle, titleY, subtitleY, groups, legendX, legendColX = [], legendMaxRows = 3 } = layout;

    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.setAttribute('aria-label', title || 'Diagrama de secuencia');
    // El resto del dimensionado vive en la hoja de estilos.
    this.svg.style.cssText = 'width:100%;height:100%;max-width:none;display:block;margin:0 auto';
    this.svg.innerHTML = '';
    this.#msgNodes.clear();
    this.#lifelineNodes = [];
    this.#actorNodes = [];
    this.#hoverId = null;

    const FONT = this.#font;
    if (title) {
      const t = svgEl('text', {
        x: W / 2, y: titleY, 'text-anchor': 'middle', fill: theme.text,
        'font-size': '13', 'font-weight': '600', 'font-family': FONT,
      });
      t.textContent = title;
      this.svg.appendChild(t);
    }
    if (subtitle) {
      const t = svgEl('text', {
        x: W / 2, y: subtitleY, 'text-anchor': 'middle', fill: theme.muted,
        'font-size': '11', 'font-family': FONT,
      });
      t.textContent = subtitle;
      this.svg.appendChild(t);
    }

    if (groups?.length) this.#buildLegend(groups, legendX, theme);
    this.#buildParticipantBoxes((layout as { boxes?: PartBox[] }).boxes ?? [], theme);
    // Regiones detrás de actores y lifelines; las exteriores primero.
    this.#buildFragments([...(layout.fragments ?? [])].sort((a, b) => a.depth - b.depth), theme);
    this.#buildActors(actors, theme);
    this.#buildLifelines(lifelines, theme);
    if (altBox) this.#buildAltBox(altBox, theme);
    this.#buildMessages(messages, altBox, theme);

    // La tortuga se monta al final: debe quedar por encima de las marks.
    this.#turtleGroup = svgEl('g');
    this.svg.appendChild(this.#turtleGroup);
    this.#turtle?.destroy();
    this.#turtle = new SequenceTurtle(this.#turtleGroup as unknown as HTMLElement);
    this.#turtle.setData({
      messages: messages as unknown as readonly TurtleMessage[],
      theme: theme as unknown as TurtleTheme,
      viewW: W,
      viewH: H,
      autoLoop: this.isViewer,
      onState: (state: TurtleState) => {
        emit(this, 'iswc-turtle-state', state);
      },
    });

    emit(this, 'iswc-render', { layout, svg: this.svg });
  }

  #buildLegend(
    groups: NonNullable<SequenceLayout['groups']>,
    legendX: number,
    theme: DiagramTheme,
  ): void {
    const g = svgEl('g', { class: 'seq-legend' });
    // Grid de leyenda: max 3 filas por columna, tantas columnas como entren.
    // `legendColX` (del spec) lleva el ancho de cada columna para que el item
    // nunca se salga de su celda si el nombre es largo. `LEGEND_GAP_X` se
    // replica aquí para el offset entre columnas — si cambia en el spec,
    // sincronizar acá.
    const LEGEND_GAP_X = 20;
    const layoutMeta = this.layout as { legendMaxRows?: number; legendColX?: number[]; subtitleY?: number; titleY?: number } | null;
    const maxRows: number = layoutMeta?.legendMaxRows ?? 3;
    const colWidths: number[] = layoutMeta?.legendColX ?? [];
    const baseY: number = (layoutMeta?.subtitleY || layoutMeta?.titleY || 22) + 18;

    groups.forEach((grp, gi: number) => {
      const col = Math.floor(gi / maxRows);
      const row = gi % maxRows;
      let cx = legendX;
      for (let c = 0; c < col; c++) cx += (colWidths[c] ?? 0) + LEGEND_GAP_X;
      const ly = baseY + row * 16;
      const color = this.#groupColor(grp.color, grp.hue, theme);
      const off = this.#hiddenGroups.has(grp.id);
      const clickable = this.isViewer;

      const item = svgEl('g', {
        class: `seq-legend__item${off ? ' iswc-off' : ''}`,
        opacity: off ? 0.4 : 1,
      });
      if (clickable) {
        item.style.cursor = 'pointer';
        item.dataset.groupId = grp.id;
        item.appendChild(svgEl('rect', {
          x: cx - 2, y: ly - 8, width: grp.name.length * 6 + 26, height: 16, rx: 4, fill: 'transparent',
        }));
      }
      item.appendChild(off
        ? svgEl('circle', { cx: cx + 5, cy: ly, r: 4.5, fill: 'none', stroke: color, 'stroke-width': 1.4 })
        : svgEl('circle', { cx: cx + 5, cy: ly, r: 4.5, fill: color }));
      const label = svgEl('text', {
        x: cx + 16, y: ly + 3.5, fill: theme.muted,
        'font-size': '10', 'font-family': this.#font,
        'text-decoration': off ? 'line-through' : null,
      });
      label.textContent = grp.name;
      item.appendChild(label);
      g.appendChild(item);
    });
    this.svg.appendChild(g);
  }

  #buildActors(actors: SequenceLayout['actors'], theme: DiagramTheme): void {
    for (const a of actors) {
      const bw = a.w;
      const bx = a.x - bw / 2;
      const iconInLabel = hasIconJsonSugar(a.label);
      const iconCx = bx + 18;
      const labelLeft = iconInLabel ? bx + 8 : bx + 32;
      const labelRight = bx + bw - 8;
      const labelCx = (labelLeft + labelRight) / 2;

      const g = svgEl('g', { class: 'seq-actor' });
      const paint = this.#paint;
      const rect = svgEl('rect', {
        x: bx, y: a.y - 16, width: bw, height: 32, rx: paint ? paint.actorRadius : TK_DIAGRAM_RADIUS_PX,
        fill: paint ? paint.actorFill : 'transparent',
        stroke: paint ? paint.actorBorder : theme.border,
        'stroke-width': paint ? 1.5 : 1,
      });
      g.appendChild(rect);

      if (!iconInLabel) {
        g.appendChild(svgIconBadge(a.icon, { cx: iconCx, cy: a.y, size: 24, hue: a.hue, bg: 'circle', bgAlpha: 0.16 }));
      }

      if (a.label.includes('{{')) {
        g.appendChild(foreignHtml(
          labelLeft, a.y - 10, labelRight - labelLeft, 20,
          'seq-actor-label',
          inlineMdWeb(a.label),
          {
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', height: '100%', fontSize: '11px', fontWeight: '600',
            fontFamily: this.#font, color: theme.text, lineHeight: '1',
          },
        ));
      } else {
        const t = svgEl('text', {
          x: labelCx, y: a.y, 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: theme.text,
          'font-size': '11', 'font-weight': '600', 'font-family': this.#font,
        });
        t.textContent = a.label;
        g.appendChild(t);
      }

      this.svg.appendChild(g);
      this.#actorNodes.push({ x: a.x, g: g as SVGGElement, rect: rect as SVGRectElement });
    }
  }

  #buildLifelines(lifelines: SequenceLayout['lifelines'], theme: DiagramTheme): void {
    for (const l of lifelines) {
      const line = svgEl('line', {
        x1: l.x, y1: l.y1, x2: l.x, y2: l.y2,
        stroke: this.#paint?.lifeline ?? theme.grid, 'stroke-width': 1, 'stroke-dasharray': '4 4',
        class: 'seq-lifeline',
      });
      this.svg.appendChild(line);
      this.#lifelineNodes.push({ x: l.x, line: line as SVGLineElement });
    }
  }

  /** Regiones de participantes: caja con título detrás de actores y lifelines. */
  #buildParticipantBoxes(boxes: PartBox[], theme: DiagramTheme): void {
    for (const b of boxes) {
      const g = svgEl('g', { class: 'seq-box' });
      const paint = this.#paint;
      const fill = paletteColor(this.#styleTheme, b.color) ?? b.color ?? theme.altFill;
      g.appendChild(svgEl('rect', {
        x: b.x, y: b.y, width: b.w, height: b.h, rx: paint ? 0 : TK_DIAGRAM_RADIUS_PX,
        fill, 'fill-opacity': b.color ? (paint?.boxOpacity ?? 0.35) : 1,
        stroke: paint ? paint.fragmentBorder : (b.color ?? theme.border), 'stroke-width': paint ? 1.2 : 1.2,
        'stroke-dasharray': '6 4',
      }));
      const t = svgEl('text', {
        x: b.x + 12, y: b.y + 17, fill: theme.text,
        'font-size': '11', 'font-weight': '700', 'font-family': this.#font,
      });
      t.textContent = b.name;
      g.appendChild(t);
      this.svg.appendChild(g);
    }
  }

  /**
   * Fragmento `alt` (UML): marco con pestaña de título, condición de cada
   * rama legible y divisor punteado entre ramas. Acotado a las lifelines que
   * participan (el layout ya calcula x/w).
   */
  #buildAltBox(altBox: SequenceLayoutAltBox, theme: DiagramTheme): void {
    const box = altBox as SequenceLayoutAltBox & { dividers?: number[]; branches?: Array<{ label: string; y: number }> };
    const g = svgEl('g', { class: 'seq-alt' });
    g.appendChild(svgEl('rect', {
      x: box.x, y: box.y, width: box.w, height: box.h, rx: this.#paint ? 0 : TK_DIAGRAM_RADIUS_PX,
      fill: theme.altFill, stroke: theme.altBorder, 'stroke-width': '1.2', 'stroke-dasharray': '6 4',
    }));
    // Pestaña: icono de bifurcación + título (todas las regiones llevan su
    // título en la pestaña; el tipo se lee por el icono).
    const tw = this.#buildTab(g, box.x, box.y, 'mdi:source-branch', box.label, theme.altBorder);
    for (const y of box.dividers ?? []) {
      g.appendChild(svgEl('line', {
        x1: box.x, y1: y, x2: box.x + box.w, y2: y,
        stroke: theme.altBorder, 'stroke-width': 1, 'stroke-dasharray': '6 4',
      }));
    }
    for (const [k, br] of (box.branches ?? []).entries()) {
      const c = svgEl('text', {
        x: k === 0 ? box.x + 10 : box.x + 10, y: br.y, 'dominant-baseline': 'middle', fill: theme.text, 'fill-opacity': 0.75,
        'font-size': '9.5', 'font-style': 'italic', 'font-family': this.#font,
      });
      c.textContent = `[${br.label}]`;
      g.appendChild(c);
    }
    this.svg.appendChild(g);
  }

  /**
   * Pestaña UML (pentágono) con icono y título. Devuelve su ancho para que
   * el llamador acomode lo que va al lado.
   */
  #buildTab(g: SVGElement, x: number, y: number, icon: string, title: string, fill: string, note?: string): number {
    const th = 18;
    // La nota (condición) va dentro de la pestaña como texto secundario.
    const noteW = note ? Math.ceil(note.length * 5.2) + 14 : 0;
    const tw = Math.max(40, 24 + Math.ceil(title.length * 6.2) + 10 + noteW);
    g.appendChild(svgEl('path', {
      d: `M${x},${y} H${x + tw} V${y + th - 6} L${x + tw - 6},${y + th} H${x} Z`,
      fill, stroke: fill,
    }));
    const ink = contrastFontColor(fill);
    g.appendChild(svgIconBadge(icon, { cx: x + 12, cy: y + th / 2, size: 14, color: ink, bg: 'none' }));
    const t = svgEl('text', {
      x: x + 22, y: y + th / 2 + 0.5, 'dominant-baseline': 'middle', fill: ink,
      'font-size': '10', 'font-weight': '700', 'font-family': this.#font,
    });
    t.textContent = title;
    g.appendChild(t);
    if (note) {
      const n = svgEl('text', {
        x: x + 24 + Math.ceil(title.length * 6.2) + 10, y: y + th / 2 + 0.5, 'dominant-baseline': 'middle',
        fill: '#888888', 'font-size': '9', 'font-style': 'italic', 'font-family': this.#font,
      });
      n.textContent = `[${note}]`;
      g.appendChild(n);
    }
    return tw;
  }

  /** Color de un grupo: nombre de paleta/hex del tema > hue > acento. */
  #groupColor(color: string | undefined, hue: number | undefined, theme: DiagramTheme): string {
    return lineColor(this.#styleTheme, color)
      ?? (hue != null ? tkHueToHex(hue) : undefined)
      ?? this.#paint?.messageStroke
      ?? theme.accent;
  }

  /**
   * Regiones horizontales (`fragments`): marco con pestaña UML «kind» y el
   * nombre al lado. El relleno es el color pedido (paleta del tema) con la
   * opacidad del tema; sin color, el relleno de región del tema.
   */
  #buildFragments(fragments: SequenceLayoutFragment[], theme: DiagramTheme): void {
    const paint = this.#paint;
    for (const fr of fragments) {
      const fill = paletteColor(this.#styleTheme, fr.color) ?? fr.color ?? paint?.fragmentFill ?? theme.altFill;
      const stroke = paint?.fragmentBorder ?? theme.altBorder;
      const g = svgEl('g', { class: 'seq-fragment' });
      g.dataset.fragmentId = fr.id;
      g.appendChild(svgEl('rect', {
        x: fr.x, y: fr.y, width: fr.w, height: fr.h, rx: paint ? 0 : TK_DIAGRAM_RADIUS_PX,
        fill, 'fill-opacity': paint?.fragmentOpacity ?? 0.18,
        stroke, 'stroke-width': 1.2, 'stroke-dasharray': '6 4',
      }));
      // Pestaña negra con icono del tipo + título; la condición (si la hay) al lado.
      this.#buildTab(g, fr.x, fr.y, FRAGMENT_ICON[fr.kind] ?? FRAGMENT_ICON.region!, fr.name || fr.kind, stroke, fr.condition);
      this.svg.appendChild(g);
    }
  }

  #buildMessages(
    messages: SequenceLayoutMessage[],
    altBox: SequenceLayoutAltBox | undefined,
    theme: DiagramTheme,
  ): void {
    const paint = this.#paint;
    for (const m of messages) {
      const color = (m.groupColor || m.groupHue != null)
        ? this.#groupColor(m.groupColor, m.groupHue, theme)
        : (paint?.messageStroke ?? theme.accent);
      const g = svgEl('g', { class: 'seq-msg' });
      g.dataset.msgId = m.id;
      if (this.isViewer) g.style.cursor = 'pointer';

      if (m.branchFirst && m.branch && !(altBox as { branches?: unknown } | undefined)?.branches) {
        const t = svgEl('text', {
          x: altBox ? altBox.x + 36 : GUIDE_X + 8, y: m.y - 10, 'dominant-baseline': 'middle', fill: theme.muted,
          'font-size': '9', 'font-family': this.#font,
        });
        t.textContent = `[${m.branch}]`;
        g.appendChild(t);
      }

      const path = svgEl('path', {
        d: styledEdgePath(m.path, this.#edgeStyle, 10), fill: 'none', stroke: color,
        'stroke-width': paint?.messageWidth ?? 1.15,
        'stroke-dasharray': m.kind === 'async' ? '5 3' : null,
        'stroke-linecap': this.#edgeStyle === 'curved' ? 'round' : 'square',
        'stroke-linejoin': this.#edgeStyle === 'curved' ? 'round' : 'miter',
        'vector-effect': 'non-scaling-stroke',
        class: 'seq-msg-path',
      });
      g.appendChild(path);

      // La orientación sale del ÚLTIMO TRAMO REAL del path: cuando el router
      // ortogonal desvía la llegada, una punta fija horizontal quedaba de lado
      // y separada de la línea. Las async llevan la MISMA cabeza triangular
      // que las sync (solo cambia el trazo punteado): el chevron de dos trazos
      // se leía como un triángulo al que le falta un lado.
      const tipX = m.arrowTipX;
      const tipY = m.arrowTipY ?? m.y;
      const wingLen = m.kind === 'async' ? 9 : 7;
      // `svgArrowHead` infiere `className` como `null | undefined` por el
      // default; añadimos la clase CSS al elemento resultante para no
      // depender del tipado del helper compartido (que vive en `_shared`).
      const arrow = svgArrowHead({
        d: m.path,
        tip: { x: tipX, y: tipY },
        color,
        len: wingLen,
        halfWidth: 3.5,
        fallbackDir: { x: m.arrowDir > 0 ? 1 : -1, y: 0 },
      });
      arrow.classList.add('seq-msg-head');
      g.appendChild(arrow);

      // El índice va en el ARRANQUE real del trazo: en un self-loop el path
      // nace arriba y vuelve a la lifeline, así la punta no queda tapada.
      const start = m.kind === 'self' ? (pathPoints(m.path)[0] ?? { x: m.fromX, y: m.y }) : { x: m.fromX, y: m.y };
      const dotG = svgEl('g', { class: 'seq-start' });
      const dot = svgEl('circle', { cx: start.x, cy: start.y, r: 8, fill: color });
      dotG.appendChild(dot);
      const stepText = svgEl('text', {
        x: start.x, y: start.y, 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: contrastFontColor(color),
        'font-size': '9', 'font-weight': '700', 'font-family': this.#font,
      });
      stepText.textContent = String(m.step);
      dotG.appendChild(stepText);
      g.appendChild(dotG);

      if (m.label) {
        // Chip semiopaco: enmascara las lifelines bajo el texto.
        if (paint) {
          // Nota como insignia: fondo pastel del color de la arista, sin borde.
          g.appendChild(svgEl('rect', {
            x: m.labelX, y: m.labelY, width: m.labelW, height: m.labelH, rx: 3,
            fill: paint.labelFill, 'fill-opacity': 0.82,
          }));
          g.appendChild(svgEl('rect', {
            x: m.labelX, y: m.labelY, width: m.labelW, height: m.labelH, rx: 3,
            fill: color, 'fill-opacity': 0.16,
          }));
        } else {
          g.appendChild(svgEl('rect', {
            x: m.labelX, y: m.labelY, width: m.labelW, height: m.labelH, rx: 4, fill: theme.chipFill,
          }));
        }
      }

      const labelNode = this.#buildMessageLabel(m, theme, color);
      if (labelNode) g.appendChild(labelNode);

      // Dirección de salida del trazo (para un self, el lado del lazo).
      const dir = m.kind === 'self'
        ? ((pathPoints(m.path)[1]?.x ?? m.fromX + 1) >= m.fromX ? 1 : -1)
        : (m.toX >= m.fromX ? 1 : -1);
      // Icono del grupo junto al índice, al lado contrario de la arista, con
      // fondo circular translúcido: el color solo no basta para leer el grupo.
      if (m.groupIcon) {
        g.appendChild(svgIconBadge(m.groupIcon, {
          cx: start.x - dir * 20, cy: start.y, size: 20, color, bg: 'circle', bgAlpha: 0.16,
        }));
      }
      // Título del grupo como rótulo centrado bajo el par icono + índice:
      // texto auxiliar, pequeño y atenuado para no robar protagonismo.
      if (m.groupTitle) {
        // Fondo que enmascara la lifeline bajo el rótulo (nada cruza un texto).
        const tw = Math.ceil(m.groupTitle.length * 4.6) + 8;
        g.appendChild(svgEl('rect', {
          x: start.x - dir * 10 - tw / 2, y: start.y + 15, width: tw, height: 12, rx: 2,
          fill: color, 'fill-opacity': 0.16,
        }));
        const t = svgEl('text', {
          x: start.x - dir * 10, y: start.y + 21, 'dominant-baseline': 'middle', fill: color, 'fill-opacity': 0.7,
          'text-anchor': 'middle',
          'font-size': '8', 'font-weight': '600', 'font-family': this.#font, 'letter-spacing': '0.03em',
        });
        t.textContent = m.groupTitle;
        g.appendChild(t);
      }

      this.svg.appendChild(g);
      this.#msgNodes.set(m.id, {
        m,
        g: g as SVGGElement,
        path: path as SVGPathElement,
        arrow,
        dot: dot as SVGCircleElement,
        labelNode,
      });
    }
  }

  #buildMessageLabel(m: SequenceLayoutMessage, theme: DiagramTheme, color?: string): SVGElement | null {
    if (!m.label) return null;
    // Con estilo, el texto de la nota lleva el color de su arista.
    const ink = this.#paint && color ? color : (this.#paint?.labelText ?? theme.muted);
    if (m.label.includes('{{')) {
      return foreignHtml(
        m.labelX, m.labelY, m.labelW, m.labelH,
        'seq-label',
        inlineMdWeb(m.label),
        {
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', height: '100%', fontSize: '10px',
          fontFamily: this.#labelFont, color: ink,
          lineHeight: '1.2', textAlign: 'center',
        },
      );
    }
    // Wrap con el helper compartido: el chip rectangular tiene ancho/alto fijo
    // (m.labelW/m.labelH), así que por defecto usamos ellipsis si el texto no
    // cabe — los chips de mensaje no pueden crecer verticalmente (romperían
    // la rejilla de la secuencia). El caller puede sobreescribir con
    // `m.overflow` si quiere un comportamiento distinto.
    // `SequenceLayoutMessage` no declara `overflow` (lo añade el spec si lo
    // quiere); casteamos para leer el override opcional sin tocar la firma.
    const rawOverflow = (m as { overflow?: string }).overflow;
    const overflow: 'grow' | 'ellipsis' =
      (rawOverflow === 'grow' || rawOverflow === 'ellipsis') ? rawOverflow : 'ellipsis';
    const result = wrapText({
      text: m.label,
      maxWidth: m.labelW,
      maxHeight: m.labelH,
      fontSize: 10,
      fontFamily: this.#labelFont,
      overflow,
      // Chip compacto: con el padding por defecto (8) un chip de 2 líneas
      // (30 px) solo admitía 1 y truncaba con «…».
      paddingX: 8,
      paddingY: 3,
    });
    const tspans: TSpanSpec[] = buildTspans(
      result.lines,
      m.labelX, m.labelY, m.labelW, m.labelH,
      'middle', 10, 1.2,
    );
    const t = svgEl('text', {
      fill: ink, 'font-size': '10', 'font-family': this.#labelFont,
      class: 'seq-label-text',
    });
    for (const span of tspans) {
      const ts = svgEl('tspan', {
        x: span.x, y: span.y,
        ...(span.dy != null ? { dy: span.dy } : {}),
            ...(span.textAnchor != null ? { 'text-anchor': span.textAnchor } : {}),
            ...(span.dominantBaseline != null ? { 'dominant-baseline': span.dominantBaseline } : {}),
      });
      ts.textContent = span.text;
      t.appendChild(ts);
    }
    return t;
  }

  /* ── hover ───────────────────────────────────────────────────────── */

  #onClick = (e: PointerEvent): void => {
    if (this.isViewer) {
      const item = e.composedPath().find((n: EventTarget | null) => (n as HTMLElement | undefined)?.dataset?.groupId);
      if (item) {
        emitCancelable(this, 'iswc-toggle-group', { id: (item as HTMLElement).dataset.groupId });
      }
      return;
    }
    // Preview inline: entrar al visor con 1 clic / 1 tap. Es opt-in: sin
    // `open-on-click` el clic no hace nada y tampoco se anuncia
    // `iswc-open-viewer`, que prometeria una apertura que no ocurre.
    if (!this.hasAttribute('open-on-click')) return;
    const ev = new CustomEvent('iswc-open-viewer', {
      bubbles: true, composed: true, cancelable: true, detail: { payload: this.payload },
    });
    this.dispatchEvent(ev);
    // Si nadie lo intercepta (preventDefault), abre el visor por su cuenta.
    if (!ev.defaultPrevented) this.openOwnViewer('sequence');
  };

  #onMouseMove = (e: PointerEvent): void => {
    if (!this.isViewer) return;
    const g = e.composedPath().find((n: EventTarget | null) => (n as HTMLElement | undefined)?.dataset?.msgId);
    const id: string | null = (g as HTMLElement | undefined)?.dataset.msgId ?? null;
    if (id !== this.#hoverId) this.#applyHover(id);
    if (id) this.#positionTooltip(e);
  };

  #onMouseLeave = (_e: MouseEvent): void => {
    if (!this.isViewer) return;
    this.#applyHover(null);
  };

  #applyHover(id: string | null): void {
    this.#hoverId = id;
    const entry = id ? this.#msgNodes.get(id) : null;
    const hovered = entry?.m ?? null;
    const theme = this.#theme;
    if (!theme) return;
    const hiColor = hovered && (hovered.groupColor || hovered.groupHue != null)
      ? this.#groupColor(hovered.groupColor, hovered.groupHue, theme)
      : theme.accent;

    this.wrap.classList.toggle('iswc-hover-msg', !!id);

    for (const [msgId, node] of this.#msgNodes) {
      const active = msgId === id;
      node.g.classList.toggle('iswc-active', active);
      node.g.classList.toggle('iswc-dim', !!id && !active);
      const base = this.#paint?.messageWidth ?? 1.15;
      node.path.setAttribute('stroke-width', String(active ? base + 0.6 : base));
      // La cabeza es un <polygon> relleno (sync y async): no tiene trazo que
      // engrosar, el realce lo lleva la línea.
      node.dot.setAttribute('r', String(active ? 9 : 8));
      if (node.labelNode?.classList?.contains('seq-label-text')) {
        if (!this.#paint) node.labelNode.setAttribute('fill', active ? theme.text : theme.muted);
        node.labelNode.setAttribute('font-weight', active ? '600' : '400');
      }
    }

    for (const { x, line } of this.#lifelineNodes) {
      const involved = !!hovered && (hovered.fromX === x || hovered.toX === x);
      line.setAttribute('stroke', involved ? hiColor : (this.#paint?.lifeline ?? theme.grid));
      line.setAttribute('stroke-width', String(involved ? 1.6 : 1));
      line.setAttribute('opacity', String(id && !involved ? 0.3 : 1));
    }

    for (const { x, g, rect } of this.#actorNodes) {
      const active = !!hovered && (hovered.fromX === x || hovered.toX === x);
      const dim = !!id && !active;
      g.classList.toggle('iswc-active', !!active);
      g.setAttribute('opacity', String(dim ? 0.32 : 1));
      rect.setAttribute('stroke', active ? theme.accent : (this.#paint?.actorBorder ?? theme.border));
      rect.setAttribute('stroke-width', String(active ? 1.8 : (this.#paint ? 1.5 : 1)));
    }

    // La tortuga se congela mientras se inspecciona un mensaje.
    this.#turtle?.setPaused(!!id);

    if (!hovered) {
      this.tooltipEl.hidden = true;
      return;
    }
    this.#renderTooltip(hovered);
  }

  #renderTooltip(m: SequenceLayoutMessage): void {
    const tip = this.tooltipEl;
    tip.hidden = false;
    tip.innerHTML = '';

    const head = document.createElement('span');
    head.className = 'dg-tooltip__title';
    const step = document.createElement('span');
    step.className = 'dg-tooltip__step';
    step.textContent = `${m.step}.`;
    head.appendChild(step);
    const label = document.createElement('span');
    label.innerHTML = inlineMdWeb(m.label);
    head.appendChild(label);
    tip.appendChild(head);

    const text = sequenceMessageTooltipText(m);
    if (text) {
      const desc = document.createElement('div');
      desc.className = 'dg-tooltip__desc';
      desc.innerHTML = inlineMdWeb(text);
      tip.appendChild(desc);
    }
  }

  /** Sigue al cursor pero SIEMPRE por debajo de la fila, para no tapar el dot ni la flecha. */
  #positionTooltip(e: PointerEvent): void {
    const rect = this.wrap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const left = Math.max(8, Math.min((rect.width || 320) - 300, x + 16));
    this.tooltipEl.style.left = `${left}px`;
    this.tooltipEl.style.top = `${y + 26}px`;
  }
}

defineElement('iswc-sequence-diagram', IswcSequenceDiagram, 'IswcSequenceDiagram');

registerDiagramKind('sequence', 'iswc-sequence-diagram');
registerDiagramKind('sequence-diagram', 'iswc-sequence-diagram');

export { IswcSequenceDiagram };