import { adoptCss, defineElement, emit, emitCancelable } from '../../core/element.js';
import { DiagramElementBase } from '../_shared/diagram-element-base.js';
import { resolveClassSpec, computeClassLayout } from './class-spec.js';
import { sequenceThemeDark, sequenceThemeLight } from './sequence-spec.js';
import { SequenceTurtle } from './sequence-turtle.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import { edgeStrokeHex, edgeChipFill, edgeChipText } from '../_shared/diagram-edge-style.js';
import { inlineMdWeb, applySvgTextContent } from '../_shared/tk-inline-md.js';
import { wrapText, buildTspans } from '../_shared/diagram-text-wrap.js';
import { registerDiagramKind } from './diagram-kinds.js';
import { svgEl } from '../_shared/svg-chart-engine.js';
import type { ClassLayout, ClassLayoutEdge, ClassLayoutNode, ClassLayoutSection, DiagramGroup, DiagramTheme } from "./diagram-types.schemas.js";
import type { TurtleTheme } from "../_shared/path-turtle.schemas.js";

/**
 * <iswc-class-diagram> — diagrama de clases UML en SVG, sin Mermaid.
 *
 * Configuración por JSON, igual que <iswc-flowchart>:
 *
 *   <iswc-class-diagram>
 *     <script type="application/json">
 *       { "classDiagram": { "direction": "TB", "classes": [...], "relations": [...] } }
 *     </script>
 *   </iswc-class-diagram>
 *
 * Atributos: color (inline | viewer), open-on-click
 * Propiedades: payload, spec, layout, turtle, hiddenGroups
 * Eventos: iswc-render, iswc-turtle-state, iswc-open-viewer, iswc-toggle-group
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Tinta legible sobre `hex`: oscura sobre claros, blanca sobre oscuros. */
function inkOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#FFFFFF';
  const n = parseInt(m[1]!, 16);
  const lum = 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return lum > 150 ? '#1F2937' : '#FFFFFF';
}

/** Color del glifo de visibilidad UML (+ público, - privado, # protegido, ~ paquete). */
const VISIBILIDAD: Record<string, string> = { '+': '#16A34A', '-': '#DC2626', '#': '#D97706', '~': '#2563EB' };

class IswcClassDiagram extends DiagramElementBase {
  #theme: DiagramTheme | null = null;
  #turtle: SequenceTurtle | null = null;
  #hiddenGroups: Set<string> = new Set();
  #nodeNodes = new Map<string, { n: ClassLayoutNode; g: SVGGElement; box: SVGElement }>();
  #edgeNodes = new Map<string, { e: ClassLayoutEdge; g: SVGGElement; path: SVGElement }>();
  #hoverId: string | null = null;

  constructor() {
    super();
    this.initDiagramShadow('cls-svg', 'cls-tooltip');
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

  get turtle(): SequenceTurtle | null { return this.#turtle; }
  get hiddenGroups(): Set<string> { return this.#hiddenGroups; }
  set hiddenGroups(v: Set<string> | Iterable<string> | null | undefined) {
    this.#hiddenGroups = v instanceof Set ? v : new Set(v || []);
    this.queueRender();
  }

  renderDiagram() {
    const spec = resolveClassSpec(this.payload ?? {});
    this.spec = spec;
    if (!spec) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }
    delete this.wrap.dataset.empty;

    // Ocultar un grupo quita sus clases y las relaciones que las tocan.
    const hidden = this.#hiddenGroups;
    let visible = spec;
    if (hidden.size) {
      const classes = spec.classes.filter((c) => !c.group || !hidden.has(c.group));
      const keep = new Set(classes.map((c) => c.id));
      visible = { ...spec, classes, relations: spec.relations.filter((r) => keep.has(r.from) && keep.has(r.to)) };
    }
    if (!visible.classes.length) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }

    const dark = this.isDarkTheme;
    const theme: DiagramTheme = dark ? sequenceThemeDark() : sequenceThemeLight();
    this.#theme = theme;
    this.syncThemeAttr();

    const layout = computeClassLayout(visible);
    this.layout = layout;
    this.#buildSvg(layout, theme);
    this.wrap.classList.toggle('iswc-viewer', this.isViewer);
  }

  #buildSvg(layout: ClassLayout, theme: DiagramTheme) {
    const { width: W, height: H } = layout;
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.setAttribute('aria-label', layout.title || 'Diagrama de clases');
    this.svg.style.cssText = 'width:100%;height:100%;max-width:none;display:block;margin:0 auto';
    this.svg.innerHTML = '';
    this.#nodeNodes.clear();
    this.#edgeNodes.clear();
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

    if (layout.groups?.length) this.#buildLegend(layout, theme);
    if (layout.packages?.length) this.#buildPackages(layout, theme);
    this.#buildEdges(layout, theme);
    if (layout.boxStyle === 'card') this.#buildCards(layout, theme);
    else if (layout.boxStyle === 'vp') this.#buildVpBoxes(layout);
    else this.#buildNodes(layout, theme);

    const turtleGroup = svgEl('g');
    this.svg.appendChild(turtleGroup);
    this.#turtle?.destroy();
    this.#turtle = new SequenceTurtle(turtleGroup as unknown as HTMLElement);
    // La tortuga recorre las relaciones en orden; reutiliza el motor de secuencia.
    this.#turtle.setData({
      messages: layout.edges.map((e, i: number) => ({
        path: e.path, step: i + 1, log: e.label || '', groupHue: e.hue,
      })),
      theme: theme as unknown as TurtleTheme,
      viewW: W,
      viewH: H,
      autoLoop: this.isViewer,
      onState: (state: unknown) => emit(this, 'iswc-turtle-state', state),
    });

    emit(this, 'iswc-render', { layout, svg: this.svg });
  }

  #buildLegend(layout: ClassLayout, theme: DiagramTheme) {
    const g = svgEl('g', { class: 'cls-legend' });
    (layout.groups as DiagramGroup[]).forEach((grp: DiagramGroup, gi: number) => {
      const ly = (layout.subtitleY || layout.titleY || 22) + 18 + gi * 16;
      const color = tkHueToHex(grp.hue) ?? theme.accent;
      const off = this.#hiddenGroups.has(grp.id);
      const item = svgEl('g', { class: 'cls-legend__item', opacity: off ? 0.4 : 1 });
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

  /** Decoración en la punta target: triángulo hueco (herencia/realización). */
  #targetTriangle(e: ClassLayoutEdge, color: string, hollow: boolean) {
    return svgEl('polygon', {
      // +10 % sobre el glifo original; en card/vp relleno del color de la arista.
      points: '0,0 -13.2,-6.6 -13.2,6.6',
      fill: hollow && !this.layout?.packages?.length ? (this.#theme?.chipFill ?? '#0d1b2a') : color,
      stroke: color,
      'stroke-width': 1.2,
      transform: `translate(${e.targetTipX},${e.targetTipY}) rotate(${e.targetAngle})`,
      class: 'cls-rel__head',
    });
  }

  /** Decoración en la punta target: flecha abierta (asociación/dependencia). */
  #targetArrowOpen(e: ClassLayoutEdge, color: string) {
    return svgEl('polyline', {
      points: '-9.9,-5.5 0,0 -9.9,5.5',
      fill: 'none',
      stroke: color,
      'stroke-width': 1.3,
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round',
      transform: `translate(${e.targetTipX},${e.targetTipY}) rotate(${e.targetAngle})`,
      class: 'cls-rel__head',
    });
  }

  /** Decoración en la punta source: diamante (composición rellena / agregación hueca). */
  #sourceDiamond(e: ClassLayoutEdge, color: string, hollow: boolean) {
    return svgEl('polygon', {
      points: '0,0 -8.8,-5.5 -17.6,0 -8.8,5.5',
      fill: hollow ? (this.#theme?.chipFill ?? '#0d1b2a') : color,
      stroke: color,
      'stroke-width': 1.2,
      transform: `translate(${e.sourceTipX},${e.sourceTipY}) rotate(${e.sourceAngle})`,
      class: 'cls-rel__head',
    });
  }

  #buildEdges(layout: ClassLayout, theme: DiagramTheme) {
    for (const e of layout.edges) {
      const color = e.color ?? edgeStrokeHex(e.hue, theme.accent);
      const g = svgEl('g', { class: 'cls-rel' });
      g.dataset.edgeId = e.id;

      const dashed = e.kind === 'dependency' || e.kind === 'realization';
      const path = svgEl('path', {
        d: e.path, fill: 'none', stroke: color, 'stroke-width': 1.3,
        'stroke-dasharray': dashed ? '6 4' : null, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        class: 'cls-rel__path',
      });
      g.appendChild(path);

      switch (e.noTip ? 'none' : e.kind) {
        case 'none':
          break;
        case 'inheritance':
          g.appendChild(this.#targetTriangle(e, color, true));
          break;
        case 'realization':
          g.appendChild(this.#targetTriangle(e, color, true));
          break;
        case 'composition':
          g.appendChild(this.#sourceDiamond(e, color, false));
          g.appendChild(this.#targetArrowOpen(e, color));
          break;
        case 'aggregation':
          g.appendChild(this.#sourceDiamond(e, color, true));
          g.appendChild(this.#targetArrowOpen(e, color));
          break;
        case 'dependency':
          g.appendChild(this.#targetArrowOpen(e, color));
          break;
        default: // association
          g.appendChild(this.#targetArrowOpen(e, color));
      }

      if (e.label) {
        const pad = 4;
        const w = e.labelW ?? (e.label.length * 5.6 + pad * 2);
        g.appendChild(svgEl('rect', {
          x: e.labelX - w / 2, y: e.labelY - 8, width: w, height: 16, rx: 4,
          fill: edgeChipFill(e.hue), class: 'cls-rel__chip',
        }));
        const t = svgEl('text', {
          x: e.labelX, y: e.labelY + 3.5, 'text-anchor': 'middle', fill: edgeChipText(e.hue, theme.muted),
          'font-size': '10', 'font-family': 'Consolas,Menlo,monospace',
        });
        t.textContent = e.label;
        g.appendChild(t);
      }

      this.svg.appendChild(g);
      this.#edgeNodes.set(e.id, { e, g, path });
    }
  }

  #buildNodes(layout: ClassLayout, theme: DiagramTheme) {
    for (const n of layout.nodes) {
      const color = (n.hue != null && tkHueToHex(n.hue)) || theme.accent;
      const g = svgEl('g', { class: 'cls-node' });
      g.dataset.nodeId = n.id;
      if (this.isViewer) g.style.cursor = 'pointer';

      const box = svgEl('rect', {
        x: n.x, y: n.y, width: n.w, height: n.h, rx: 4,
        fill: theme.chipFill, stroke: color, 'stroke-width': 1.3,
        class: 'cls-node__box',
      });
      g.appendChild(box);

      for (const dy of n.dividerYs) {
        g.appendChild(svgEl('line', {
          x1: n.x, y1: n.y + dy, x2: n.x + n.w, y2: n.y + dy,
          stroke: color, 'stroke-width': 1, class: 'cls-node__divider',
        }));
      }

      for (const section of n.sections) {
        if (section.type === 'header') {
          const midY = n.y + section.h / 2;
          if (n.stereotype) {
            // Stereotype: linea pequena arriba (centrada en y=11).
            const st = svgEl('text', {
              x: n.x + n.w / 2, y: n.y + 11, 'text-anchor': 'middle',
              'dominant-baseline': 'middle', fill: theme.muted,
              'font-size': '9.5', 'font-family': 'Tahoma,Arial,sans-serif',
            });
            st.textContent = n.stereotype;
            g.appendChild(st);
            // Nombre: ocupa el resto del header (debajo del stereotype).
            // El espacio va desde y = 18 hasta y = section.h - 4 (centrado en su mitad).
            const nameTop = n.y + 18;
            const nameHeight = section.h - 18 - 4;
            const result = wrapText({
              text: n.name,
              maxWidth: n.w - 12,
              maxHeight: nameHeight,
              fontSize: 11.5,
              fontFamily: 'Tahoma,Arial,sans-serif',
              overflow: 'grow',
            });
            const tspans = buildTspans(
              result.lines,
              n.x + 6, nameTop, n.w - 12, nameHeight,
              'middle', 11.5, 1.2,
            );
            const nameT = svgEl('text', {
              fill: theme.text, 'font-weight': '700', 'font-family': 'Tahoma,Arial,sans-serif',
              'font-size': '11.5',
            });
            for (const span of tspans) {
              const ts = svgEl('tspan', {
                x: span.x, y: span.y,
                ...(span.dy != null ? { dy: span.dy } : {}),
            ...(span.textAnchor != null ? { 'text-anchor': span.textAnchor } : {}),
            ...(span.dominantBaseline != null ? { 'dominant-baseline': span.dominantBaseline } : {}),
              });
              ts.textContent = span.text;
              nameT.appendChild(ts);
            }
            g.appendChild(nameT);
          } else {
            // Wrap del nombre de clase si es largo.
            const result = wrapText({
              text: n.name,
              maxWidth: n.w - 12,
              maxHeight: section.h - 8,
              fontSize: 11.5,
              fontFamily: 'Tahoma,Arial,sans-serif',
              overflow: 'grow',
            });
            const tspans = buildTspans(
              result.lines,
              n.x + 6, n.y, n.w - 12, section.h,
              'middle', 11.5, 1.2,
            );
            const nameT = svgEl('text', {
              fill: theme.text, 'font-weight': '700', 'font-family': 'Tahoma,Arial,sans-serif',
              'font-size': '11.5',
            });
            for (const span of tspans) {
              const ts = svgEl('tspan', {
                x: span.x, y: span.y,
                ...(span.dy != null ? { dy: span.dy } : {}),
            ...(span.textAnchor != null ? { 'text-anchor': span.textAnchor } : {}),
            ...(span.dominantBaseline != null ? { 'dominant-baseline': span.dominantBaseline } : {}),
              });
              ts.textContent = span.text;
              nameT.appendChild(ts);
            }
            g.appendChild(nameT);
          }
          continue;
        }
        section.rows.forEach((row, ri: number) => {
          const t = svgEl('text', {
            x: n.x + 8, y: n.y + section.y + ri * 16 + 8, 'dominant-baseline': 'middle', fill: theme.text,
            'font-size': '10.5', 'font-family': 'Consolas,Menlo,monospace',
          });
          g.appendChild(t);
          applySvgTextContent(t, row);
        });
      }

      this.svg.appendChild(g);
      this.#nodeNodes.set(n.id, { n, g, box });
    }
  }

  /**
   * Paquetes UML (modo paquetes): franja con relleno de paleta, borde de
   * tinta y rótulo en la esquina superior izquierda. Se pintan de afuera
   * hacia adentro para que el hijo quede encima del padre.
   */
  #buildPackages(layout: ClassLayout, theme: DiagramTheme) {
    const g = svgEl('g', { class: 'cls-pkgs' });
    if (layout.boxStyle === 'vp') {
      this.#buildVpPackages(layout, g);
      this.svg.appendChild(g);
      return;
    }
    for (const p of layout.packages ?? []) {
      g.appendChild(svgEl('rect', {
        x: p.x, y: p.y, width: p.w, height: p.h, rx: 0,
        fill: p.palette ?? (p.depth % 2 ? '#F3F4F6' : '#E5E7EB'),
        stroke: '#1F2937', 'stroke-width': p.depth ? 1 : 1.4,
        class: 'cls-pkg',
      }));
      const t = svgEl('text', {
        x: p.x + 10, y: p.y + 17, 'text-anchor': 'start', fill: theme.text ?? '#111827',
        'font-size': p.depth ? '11' : '12', 'font-weight': '700', 'font-style': 'italic',
        'letter-spacing': '0.03em', 'font-family': 'Poppins,Tahoma,Arial,sans-serif',
      });
      t.textContent = p.stereotype ? `«${p.stereotype}» ${p.name}` : p.name;
      g.appendChild(t);
    }
    this.svg.appendChild(g);
  }

  /**
   * Clase como tarjeta: cuerpo blanco con sombra y borde del acento,
   * cabecera llena del acento con «estereotipo» y nombre, y miembros con
   * glifo de visibilidad de color. El blanco contrasta con cualquier
   * paquete; el color queda en la cabecera, el borde y las aristas que emite.
   */
  #buildCards(layout: ClassLayout, theme: DiagramTheme) {
    const FONT = 'Poppins,Tahoma,Arial,sans-serif';
    const MONO = 'Consolas,Menlo,monospace';
    for (const n of layout.nodes) {
      const accent = n.color ?? ((n.hue != null && tkHueToHex(n.hue)) || theme.accent);
      const ink = inkOn(accent);
      const g = svgEl('g', { class: 'cls-node cls-node--card' });
      g.dataset.nodeId = n.id;
      if (this.isViewer) g.style.cursor = 'pointer';
      const rx = 8;
      const header = n.sections.find((sec) => sec.type === 'header');
      const hh = header?.h ?? 24;

      g.appendChild(svgEl('rect', {
        x: n.x + 2, y: n.y + 3, width: n.w, height: n.h, rx, fill: 'rgba(15,23,42,0.16)',
      }));
      const box = svgEl('rect', {
        x: n.x, y: n.y, width: n.w, height: n.h, rx,
        fill: '#FFFFFF', stroke: accent, 'stroke-width': 1.4, class: 'cls-node__box',
      });
      g.appendChild(box);
      // Cabecera: esquinas superiores redondeadas, inferiores rectas.
      g.appendChild(svgEl('path', {
        d: `M${n.x},${n.y + hh} V${n.y + rx} Q${n.x},${n.y} ${n.x + rx},${n.y} H${n.x + n.w - rx} `
          + `Q${n.x + n.w},${n.y} ${n.x + n.w},${n.y + rx} V${n.y + hh} Z`,
        fill: accent, class: 'cls-node__header',
      }));
      const cx = n.x + n.w / 2;
      if (n.stereotype) {
        const st = svgEl('text', {
          x: cx, y: n.y + 12, 'text-anchor': 'middle', fill: ink, opacity: 0.85,
          'font-size': '9.5', 'font-style': 'italic', 'font-family': FONT,
        });
        st.textContent = `«${n.stereotype}»`;
        g.appendChild(st);
      }
      const nameT = svgEl('text', {
        x: cx, y: n.y + (n.stereotype ? hh - 9 : hh / 2 + 4), 'text-anchor': 'middle', fill: ink,
        'font-size': '12', 'font-weight': '700', 'font-family': FONT,
      });
      nameT.textContent = n.name;
      g.appendChild(nameT);

      n.sections.forEach((sec, si) => {
        if (sec.type === 'header') return;
        if (si > 1) {
          g.appendChild(svgEl('line', {
            x1: n.x + 8, y1: n.y + sec.y, x2: n.x + n.w - 8, y2: n.y + sec.y,
            stroke: '#E5E7EB', 'stroke-width': 1, class: 'cls-node__divider',
          }));
        }
        sec.rows.forEach((row, ri) => {
          const y = n.y + sec.y + 6 + ri * 16 + 8;
          const vis = row.trim().charAt(0);
          const color = VISIBILIDAD[vis];
          const texto = color ? row.trim().slice(1).trim() : row;
          if (color) {
            g.appendChild(svgEl('circle', { cx: n.x + 12, cy: y, r: 3.2, fill: color }));
          }
          const t = svgEl('text', {
            x: n.x + (color ? 20 : 10), y, 'dominant-baseline': 'middle',
            fill: sec.type === 'methods' ? '#1F2937' : '#374151',
            'font-size': '10.5', 'font-family': MONO,
          });
          g.appendChild(t);
          applySvgTextContent(t, texto);
        });
      });

      this.svg.appendChild(g);
      this.#nodeNodes.set(n.id, { n, g, box });
    }
  }


  /**
   * Paquetes estilo Visual Paradigm / InSoft: carpeta con pestaña corta a la
   * izquierda, borde negro fino y rótulo centrado en la franja superior.
   */
  #buildVpPackages(layout: ClassLayout, g: SVGGElement) {
    const TAB_W = 56;
    const TAB_H = 12;
    for (const p of layout.packages ?? []) {
      const fill = p.palette ?? (p.depth % 2 ? '#7ACFF4' : '#FFFFC1');
      g.appendChild(svgEl('rect', {
        x: p.x, y: p.y, width: Math.min(TAB_W, p.w / 3), height: TAB_H,
        fill, stroke: '#000000', 'stroke-width': 1, class: 'cls-pkg__tab',
      }));
      g.appendChild(svgEl('rect', {
        x: p.x, y: p.y + TAB_H, width: p.w, height: p.h - TAB_H,
        fill, stroke: '#000000', 'stroke-width': 1, class: 'cls-pkg',
      }));
      const izquierda = p.titleAlign === 'left';
      const t = svgEl('text', {
        x: izquierda ? p.x + Math.min(TAB_W, p.w / 3) + 12 : p.x + p.w / 2, y: p.y + TAB_H + 15,
        'text-anchor': izquierda ? 'start' : 'middle', fill: '#000000',
        'font-size': '12', 'font-family': 'Tahoma,Arial,sans-serif',
      });
      t.textContent = p.stereotype ? `«${p.stereotype}» ${p.name}` : p.name;
      g.appendChild(t);
    }
  }

  /**
   * Clase estilo Visual Paradigm / InSoft: caja recta con relleno pastel del
   * paquete, borde negro fino, «estereotipo» y nombre en negrita centrados,
   * y compartimentos separados por línea negra. La visibilidad se escribe
   * con el símbolo UML (+ - # ~) como prefijo, en negro.
   */
  #buildVpBoxes(layout: ClassLayout) {
    const FONT = 'Tahoma,Arial,sans-serif';
    for (const n of layout.nodes) {
      const g = svgEl('g', { class: 'cls-node cls-node--vp' });
      g.dataset.nodeId = n.id;
      if (this.isViewer) g.style.cursor = 'pointer';
      const box = svgEl('rect', {
        x: n.x, y: n.y, width: n.w, height: n.h,
        fill: n.fill ?? '#BCFFBB', stroke: '#000000', 'stroke-width': 1, class: 'cls-node__box',
      });
      g.appendChild(box);
      for (const dy of n.dividerYs) {
        g.appendChild(svgEl('line', {
          x1: n.x, y1: n.y + dy, x2: n.x + n.w, y2: n.y + dy,
          stroke: '#000000', 'stroke-width': 1, class: 'cls-node__divider',
        }));
      }
      const cx = n.x + n.w / 2;
      const header = n.sections.find((sec) => sec.type === 'header');
      const hh = header?.h ?? 24;
      if (n.stereotype) {
        const st = svgEl('text', {
          x: cx, y: n.y + 13, 'text-anchor': 'middle', fill: '#000000',
          'font-size': '10.5', 'font-family': FONT,
        });
        st.textContent = `«${n.stereotype}»`;
        g.appendChild(st);
      }
      const nameT = svgEl('text', {
        x: cx, y: n.y + (n.stereotype ? hh - 8 : hh / 2 + 4), 'text-anchor': 'middle', fill: '#000000',
        'font-size': '11.5', 'font-weight': '700', 'font-family': FONT,
      });
      nameT.textContent = n.name;
      g.appendChild(nameT);
      for (const sec of n.sections) {
        if (sec.type === 'header') continue;
        sec.rows.forEach((row, ri) => {
          const t = svgEl('text', {
            x: n.x + 8, y: n.y + sec.y + 6 + ri * 16 + 8, 'dominant-baseline': 'middle', fill: '#000000',
            'font-size': '10.5', 'font-family': FONT,
          });
          g.appendChild(t);
          applySvgTextContent(t, row.replace(/^\s*([+\-#~])\s*/, '$1 '));
        });
      }
      this.svg.appendChild(g);
      this.#nodeNodes.set(n.id, { n, g, box });
    }
  }


  /* ── hover ── */

  #onClick = (e: PointerEvent) => {
    if (this.isViewer) {
      const item = e.composedPath().find((x) => (x as HTMLElement | undefined)?.dataset?.groupId);
      if (item) {
        emitCancelable(this, 'iswc-toggle-group', { id: (item as HTMLElement).dataset.groupId });
      }
      return;
    }
    // El visor es opt-in: sin `open-on-click` el clic no hace nada y tampoco
    // se anuncia `iswc-open-viewer`, que prometeria una apertura que no ocurre.
    if (!this.hasAttribute('open-on-click')) return;
    const ev = new CustomEvent('iswc-open-viewer', {
      bubbles: true, composed: true, cancelable: true, detail: { payload: this.payload },
    });
    this.dispatchEvent(ev);
    if (!ev.defaultPrevented) this.openOwnViewer('classDiagram');
  };

  #onMouseMove = (e: PointerEvent) => {
    if (!this.isViewer) return;
    const g = e.composedPath().find((n) => (n as HTMLElement | undefined)?.dataset?.nodeId);
    const id = (g as HTMLElement | undefined)?.dataset.nodeId ?? null;
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
    const entry = id ? this.#nodeNodes.get(id) : null;

    // Resalta la clase y las relaciones que la tocan; atenúa el resto.
    for (const [nodeId, node] of this.#nodeNodes) {
      const active = nodeId === id;
      node.g.classList.toggle('iswc-active', active);
      node.g.classList.toggle('iswc-dim', !!id && !active);
      node.box.setAttribute('stroke-width', String(active ? 2.1 : 1.3));
    }
    for (const [, edge] of this.#edgeNodes) {
      const touches = !!id && (edge.e.from === id || edge.e.to === id);
      edge.g.classList.toggle('iswc-active', touches);
      edge.g.classList.toggle('iswc-dim', !!id && !touches);
    }

    this.#turtle?.setPaused(!!id);

    if (!entry) {
      this.tooltipEl.hidden = true;
      return;
    }
    const n = entry.n;
    this.tooltipEl.hidden = false;
    this.tooltipEl.innerHTML = '';
    const title = document.createElement('span');
    title.className = 'dg-tooltip__title';
    title.innerHTML = inlineMdWeb(n.name);
    this.tooltipEl.appendChild(title);
    if (n.description) {
      const desc = document.createElement('div');
      desc.className = 'dg-tooltip__desc';
      desc.innerHTML = inlineMdWeb(n.description);
      this.tooltipEl.appendChild(desc);
    }
  }
}

defineElement('iswc-class-diagram', IswcClassDiagram, 'IswcClassDiagram');

registerDiagramKind('class', 'iswc-class-diagram');
registerDiagramKind('classDiagram', 'iswc-class-diagram');

export { IswcClassDiagram };
