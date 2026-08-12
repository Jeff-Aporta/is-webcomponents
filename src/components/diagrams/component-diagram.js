import { adoptCss } from '../_shared/adopt-css.js';
import { DiagramElementBase } from '../_shared/diagram-element-base.js';
import { resolveComponentSpec, computeComponentLayout, packageShapePath } from './component-spec.js';
import { sequenceThemeDark, sequenceThemeLight } from './sequence-spec.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import { registerDiagramKind } from './diagram-kinds.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
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
 *   - interfaces (lollipop): círculo sobre una arista corta perpendicular al
 *     lado del componente. `provided` = círculo lleno (interfaz que el
 *     componente expone), `required` = semicírculo cóncavo (interfaz que
 *     necesita de otro).
 *
 * Las posiciones son EXPLÍCITAS en el payload: el autor decide dónde va cada
 * nodo. Esto replica el flujo de PlantUML/Structurizr y evita el coste y la
 * fragilidad de un auto-layout para diagramas que son, por naturaleza,
 * mapas mentales del sistema.
 *
 * Atributos: color (inline | viewer), open-on-click
 * Propiedades: payload, spec, layout, isViewer
 * Eventos: is-render, is-open-viewer
 */

class IsComponentDiagram extends DiagramElementBase {
  #theme = null;

  constructor() {
    super();
    this.initDiagramShadow('cd-svg', 'cd-tooltip');
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

  renderDiagram() {
    const spec = resolveComponentSpec(this.payload ?? {});
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

    const defs = svgEl('defs');
    defs.innerHTML = `
      <filter id="cd-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="rgb(0 0 0 / 0.18)" />
      </filter>
      <linearGradient id="cd-pkg-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgb(255 246 198 / 0.85)" />
        <stop offset="100%" stop-color="rgb(255 234 167 / 0.85)" />
      </linearGradient>
      <linearGradient id="cd-pkg-fill-green" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgb(220 252 231 / 0.85)" />
        <stop offset="100%" stop-color="rgb(187 247 208 / 0.85)" />
      </linearGradient>
      <linearGradient id="cd-cmp-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgb(255 255 255 / 0.95)" />
        <stop offset="100%" stop-color="rgb(241 245 249 / 0.95)" />
      </linearGradient>
      <marker id="cd-arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill="${theme.accent}" />
      </marker>
      <marker id="cd-arrowhead-realization" viewBox="0 0 12 10" refX="11" refY="5" markerWidth="11" markerHeight="9" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill="white" stroke="${theme.accent}" stroke-width="1.4" />
      </marker>
    `;
    this.svg.appendChild(defs);

    if (layout.title) {
      const t = svgEl('text', {
        x: W / 2, y: layout.titleY, 'text-anchor': 'middle', fill: theme.text,
        'font-size': '14', 'font-weight': '700',
        'font-family': 'Inter,ui-sans-serif,system-ui,sans-serif',
        'letter-spacing': '-0.01em',
      });
      t.textContent = layout.title;
      this.svg.appendChild(t);
    }
    if (layout.subtitle) {
      const t = svgEl('text', {
        x: W / 2, y: layout.subtitleY, 'text-anchor': 'middle', fill: theme.muted,
        'font-size': '11.5', 'font-weight': '500',
        'font-family': 'Inter,ui-sans-serif,system-ui,sans-serif',
      });
      t.textContent = layout.subtitle;
      this.svg.appendChild(t);
    }

    // Packages primero (quedan al fondo), luego edges, luego components e
    // interfaces encima. Mismo orden que PlantUML: la arista no debe tapar la
    // caja del componente.
    this.#buildPackages(layout, theme);
    this.#buildEdges(layout, theme);
    this.#buildInterfaces(layout, theme);
    this.#buildComponents(layout, theme);

    emit(this, 'is-render', { layout, svg: this.svg });
  }

  #buildPackages(layout, theme) {
    for (const p of layout.packages) {
      const g = svgEl('g', { class: 'cd-pkg' });
      const isGreen = (p.hue != null && p.hue >= 90 && p.hue <= 160);
      const fill = (p.hue != null && tkHueToHex(p.hue)) || (isGreen ? 'url(#cd-pkg-fill-green)' : 'url(#cd-pkg-fill)');
      const stroke = (p.hue != null && tkHueToHex(p.hue)) || theme.accent;
      g.appendChild(svgEl('path', {
        d: packageShapePath(p),
        fill, stroke, 'stroke-width': 1.4,
        'stroke-linejoin': 'round', filter: 'url(#cd-shadow)',
      }));
      // Etiqueta del paquete en la pestaña, en cursiva y negrita (UML).
      const tabW = Math.min(56, p.w * 0.4);
      const t = svgEl('text', {
        x: p.x + tabW / 2 + 4, y: p.y + 10, 'text-anchor': 'middle', fill: theme.text,
        'font-size': '10.5', 'font-weight': '700', 'font-style': 'italic',
        'font-family': 'Inter,ui-sans-serif,system-ui,sans-serif',
      });
      t.textContent = p.stereotype ? `«${p.stereotype}» ${p.name}` : p.name;
      g.appendChild(t);
      this.svg.appendChild(g);
    }
  }

  #buildEdges(layout, theme) {
    for (const e of layout.edges) {
      if (!e.path) continue;
      const g = svgEl('g', { class: 'cd-edge' });
      const dashed = e.kind === 'dependency';
      const useRealization = e.kind === 'realization';
      const marker = useRealization ? 'url(#cd-arrowhead-realization)' : 'url(#cd-arrowhead)';
      const halo = svgEl('path', {
        d: e.path, fill: 'none', stroke: 'rgb(255 255 255 / 0.85)', 'stroke-width': 4,
        'stroke-linejoin': 'round', 'stroke-linecap': 'round',
      });
      const path = svgEl('path', {
        d: e.path, fill: 'none', stroke: theme.accent, 'stroke-width': 1.6,
        'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        'stroke-dasharray': dashed ? '5 4' : null,
        'marker-end': marker,
      });
      g.appendChild(halo);
      g.appendChild(path);
      if (e.label) {
        const mx = (e.fromX + e.toX) / 2;
        const my = (e.fromY + e.toY) / 2;
        const w = e.label.length * 6 + 14;
        g.appendChild(svgEl('rect', {
          x: mx - w / 2, y: my - 9, width: w, height: 18, rx: 9,
          fill: 'white', stroke: theme.accent, 'stroke-width': 0.8, opacity: 0.92,
        }));
        const t = svgEl('text', {
          x: mx, y: my + 3.8, 'text-anchor': 'middle', fill: theme.text,
          'font-size': '10.5', 'font-weight': '600',
          'font-family': 'Inter,ui-sans-serif,system-ui,sans-serif',
        });
        t.textContent = e.label;
        g.appendChild(t);
      }
      this.svg.appendChild(g);
    }
  }

  #buildInterfaces(layout, theme) {
    for (const iface of layout.interfaces) {
      const g = svgEl('g', { class: 'cd-iface' });
      g.dataset.ifaceId = iface.id;
      // Línea perpendicular del círculo al componente (el "palito" del lollipop).
      const comp = layout.components.find((c) => c.id === iface.component);
      if (comp) {
        let cx2, cy2;
        switch (iface.side) {
          case 'top':    cx2 = comp.x + iface.offset; cy2 = comp.y; break;
          case 'bottom': cx2 = comp.x + iface.offset; cy2 = comp.y + comp.h; break;
          case 'left':   cx2 = comp.x; cy2 = comp.y + iface.offset; break;
          case 'right':
          default:       cx2 = comp.x + comp.w; cy2 = comp.y + iface.offset; break;
        }
        g.appendChild(svgEl('line', {
          x1: iface.cx, y1: iface.cy, x2: cx2, y2: cy2,
          stroke: theme.accent, 'stroke-width': 1.6,
        }));
      }
      // Provided = círculo lleno; required = semicírculo cóncavo (cup).
      if (iface.kind === 'required') {
        // Media circunferencia abierta hacia el componente.
        const r = 7;
        const startAngle = iface.side === 'right' ? -Math.PI / 2 : iface.side === 'left' ? Math.PI / 2 : iface.side === 'bottom' ? 0 : Math.PI;
        const x1 = iface.cx + r * Math.cos(startAngle);
        const y1 = iface.cy + r * Math.sin(startAngle);
        const x2 = iface.cx + r * Math.cos(startAngle + Math.PI);
        const y2 = iface.cy + r * Math.sin(startAngle + Math.PI);
        g.appendChild(svgEl('path', {
          d: `M${x1},${y1} A${r},${r} 0 1 1 ${x2},${y2}`,
          fill: 'white', stroke: theme.accent, 'stroke-width': 1.6,
        }));
      } else {
        g.appendChild(svgEl('circle', {
          cx: iface.cx, cy: iface.cy, r: 7, fill: theme.accent,
          stroke: 'white', 'stroke-width': 1.2,
        }));
      }
      // Etiqueta del lollipop, en cursiva como en UML.
      if (iface.name) {
        const t = svgEl('text', {
          x: iface.cx, y: iface.cy + (iface.side === 'bottom' ? 22 : iface.side === 'top' ? -10 : 4),
          'text-anchor': iface.side === 'right' ? 'start' : iface.side === 'left' ? 'end' : 'middle',
          fill: theme.text, 'font-size': '10.5', 'font-style': 'italic',
          'font-family': 'Inter,ui-sans-serif,system-ui,sans-serif',
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
      const shadow = svgEl('rect', {
        x: c.x, y: c.y + 1.5, width: c.w, height: c.h, rx: 6,
        fill: 'rgb(0 0 0 / 0.12)', stroke: 'none',
        filter: 'url(#cd-shadow)',
      });
      const box = svgEl('rect', {
        x: c.x, y: c.y, width: c.w, height: c.h, rx: 6,
        fill: 'url(#cd-cmp-fill)', stroke, 'stroke-width': 1.6,
      });
      g.appendChild(shadow);
      g.appendChild(box);
      if (c.stereotype) {
        const stereo = svgEl('text', {
          x: c.x + c.w / 2, y: c.y + 12, 'text-anchor': 'middle',
          fill: theme.muted, 'font-size': '9.5', 'font-style': 'italic',
          'font-family': 'Inter,ui-sans-serif,system-ui,sans-serif',
        });
        stereo.textContent = `«${c.stereotype}»`;
        g.appendChild(stereo);
      }
      const t = svgEl('text', {
        x: c.x + c.w / 2, y: c.labelY, 'text-anchor': 'middle',
        fill: theme.text, 'font-size': '11.5', 'font-weight': '700',
        'font-family': 'Inter,ui-sans-serif,system-ui,sans-serif',
        'letter-spacing': '-0.005em',
      });
      t.textContent = c.name;
      g.appendChild(t);
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
