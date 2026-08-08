import { adoptCss } from '../_shared/adopt-css.js';
import { DiagramElementBase } from '../_shared/diagram-element-base.js';
import { resolveBlockSpec, computeBlockLayout, blockShapePath } from './block-spec.js';
import { sequenceThemeDark, sequenceThemeLight } from './sequence-spec.js';
import { SequenceTurtle } from './sequence-turtle.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import { inlineMdWeb } from '../_shared/tk-inline-md.js';
import { svgIconGroup } from '../_shared/tk-icon-inline.js';
import { registerDiagramKind } from './diagram-kinds.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { svgEl } from '../_shared/svg-chart-engine.js';
import { svgArrowHead } from '../_shared/diagram-arrow.js';

/**
 * <is-block-diagram> — diagrama de bloques en SVG, sin Mermaid.
 *
 * Configuración por JSON, igual que <is-flowchart>:
 *
 *   <is-block-diagram>
 *     <script type="application/json">
 *       { "blockDiagram": { "columns": 3, "blocks": [...], "edges": [...] } }
 *     </script>
 *   </is-block-diagram>
 *
 * A diferencia del flujo, aquí los bloques se ubican en una rejilla explícita
 * (columnas fijas + `span`), no en capas node-link.
 *
 * Atributos: color (inline | viewer), open-on-click
 * Propiedades: payload, spec, layout, turtle, hiddenGroups
 * Eventos: is-render, is-turtle-state, is-open-viewer, is-toggle-group
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

class IsBlockDiagram extends DiagramElementBase {
  #theme = null;
  #turtle = null;
  #hiddenGroups = new Set();
  #blockNodes = new Map();
  #edgeNodes = new Map();
  #hoverId = null;

  constructor() {
    super();
    this.initDiagramShadow('block-svg', 'block-tooltip');
    adoptCss(this.shadowRoot, import.meta.url);
  }

  onDiagramConnected() {
    this.wrap.addEventListener('mousemove', this.#onMouseMove);
    this.wrap.addEventListener('mouseleave', this.#onMouseLeave);
    this.wrap.addEventListener('click', this.#onClick);
  }

  onDiagramDisconnected() {
    this.#turtle?.destroy();
    this.#turtle = null;
    this.wrap.removeEventListener('mousemove', this.#onMouseMove);
    this.wrap.removeEventListener('mouseleave', this.#onMouseLeave);
    this.wrap.removeEventListener('click', this.#onClick);
  }

  onPayloadChanged() { this.#hiddenGroups = new Set(); }

  get turtle() { return this.#turtle; }
  get hiddenGroups() { return this.#hiddenGroups; }
  set hiddenGroups(v) {
    this.#hiddenGroups = v instanceof Set ? v : new Set(v || []);
    this.queueRender();
  }

  renderDiagram() {
    const spec = resolveBlockSpec(this.payload ?? {});
    this.spec = spec;
    if (!spec) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }
    delete this.wrap.dataset.empty;

    // Ocultar un grupo quita sus bloques y las aristas que los tocan.
    const hidden = this.#hiddenGroups;
    let visible = spec;
    if (hidden.size) {
      const blocks = spec.blocks.filter((b) => !b.group || !hidden.has(b.group));
      const keep = new Set(blocks.map((b) => b.id));
      visible = { ...spec, blocks, edges: spec.edges.filter((e) => keep.has(e.from) && keep.has(e.to)) };
    }
    if (!visible.blocks.length) {
      this.svg.innerHTML = '';
      this.wrap.dataset.empty = '';
      return;
    }

    const dark = this.isDarkTheme;
    const theme = dark ? sequenceThemeDark() : sequenceThemeLight();
    this.#theme = theme;
    this.syncThemeAttr();

    const layout = computeBlockLayout(visible);
    this.layout = layout;
    this.#buildSvg(layout, theme);
    this.wrap.classList.toggle('is-viewer', this.isViewer);
  }

  #buildSvg(layout, theme) {
    const { width: W, height: H } = layout;
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.setAttribute('aria-label', layout.title || 'Diagrama de bloques');
    this.svg.style.cssText = 'width:100%;height:100%;max-width:none;display:block;margin:0 auto';
    this.svg.innerHTML = '';

    // Definiciones: sombras reutilizables para bloques y aristas.
    const defs = svgEl('defs');
    defs.innerHTML = /* html */ `
      <filter id="bd-block-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="rgb(0 0 0 / 0.28)" />
      </filter>
      <filter id="bd-block-shadow-active" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgb(0 0 0 / 0.34)" />
      </filter>
      <linearGradient id="bd-block-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgb(255 255 255 / 0.06)" />
        <stop offset="100%" stop-color="rgb(0 0 0 / 0.10)" />
      </linearGradient>
      <linearGradient id="bd-block-fill-light" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgb(255 255 255 / 0.85)" />
        <stop offset="100%" stop-color="rgb(248 250 255 / 0.85)" />
      </linearGradient>
    `;
    this.svg.appendChild(defs);

    this.#blockNodes.clear();
    this.#edgeNodes.clear();
    this.#hoverId = null;

    if (layout.title) {
      const t = svgEl('text', {
        x: W / 2, y: layout.titleY, 'text-anchor': 'middle', fill: theme.text,
        'font-size': '14', 'font-weight': '700', 'font-family': 'Inter,ui-sans-serif,system-ui,sans-serif',
        'letter-spacing': '-0.01em',
      });
      t.textContent = layout.title;
      this.svg.appendChild(t);
    }
    if (layout.subtitle) {
      const t = svgEl('text', {
        x: W / 2, y: layout.subtitleY, 'text-anchor': 'middle', fill: theme.muted,
        'font-size': '11.5', 'font-family': 'Inter,ui-sans-serif,system-ui,sans-serif',
        'font-weight': '500',
      });
      t.textContent = layout.subtitle;
      this.svg.appendChild(t);
    }

    if (layout.groups?.length) this.#buildLegend(layout, theme);
    this.#buildEdges(layout, theme);
    this.#buildBlocks(layout, theme);

    const turtleGroup = svgEl('g');
    this.svg.appendChild(turtleGroup);
    this.#turtle?.destroy();
    this.#turtle = new SequenceTurtle(turtleGroup);
    this.#turtle.setData({
      messages: layout.edges.map((e, i) => ({
        path: e.path, step: i + 1, log: e.label || '', groupHue: undefined,
      })),
      theme,
      viewW: W,
      viewH: H,
      autoLoop: this.isViewer,
      onState: (state) => emit(this, 'is-turtle-state', state),
    });

    emit(this, 'is-render', { layout, svg: this.svg });
  }

  #buildLegend(layout, theme) {
    const g = svgEl('g', { class: 'block-legend' });
    layout.groups.forEach((grp, gi) => {
      const ly = (layout.subtitleY || layout.titleY || 22) + 20 + gi * 20;
      const color = tkHueToHex(grp.hue) ?? theme.accent;
      const off = this.#hiddenGroups.has(grp.id);
      const item = svgEl('g', { class: 'block-legend__item', opacity: off ? 0.4 : 1 });
      if (this.isViewer) {
        item.style.cursor = 'pointer';
        item.dataset.groupId = grp.id;
        item.appendChild(svgEl('rect', {
          x: layout.legendX - 6, y: ly - 11, width: grp.name.length * 6.5 + 32, height: 20, rx: 6, fill: 'transparent',
        }));
      }
      // Dot con halo suave para que destaque sobre el gradiente del wrap.
      const halo = svgEl('circle', {
        cx: layout.legendX + 6, cy: ly, r: 7, fill: color, opacity: 0.18,
      });
      item.appendChild(halo);
      item.appendChild(off
        ? svgEl('circle', { cx: layout.legendX + 6, cy: ly, r: 4.5, fill: 'none', stroke: color, 'stroke-width': 1.6 })
        : svgEl('circle', { cx: layout.legendX + 6, cy: ly, r: 4.5, fill: color }));
      const label = svgEl('text', {
        x: layout.legendX + 18, y: ly + 3.8, fill: theme.text,
        'font-size': '11', 'font-weight': '600',
        'font-family': 'Inter,ui-sans-serif,system-ui,sans-serif',
        'text-decoration': off ? 'line-through' : null,
        opacity: 0.82,
      });
      label.textContent = grp.name;
      item.appendChild(label);
      g.appendChild(item);
    });
    this.svg.appendChild(g);
  }

  #buildEdges(layout, theme) {
    const dark = this.wrap.dataset.theme === 'dark';
    const haloColor = dark ? 'rgb(0 0 0 / 0.45)' : 'rgb(15 23 42 / 0.18)';
    for (const e of layout.edges) {
      const color = theme.accent;
      const g = svgEl('g', { class: 'block-edge' });
      g.dataset.edgeId = e.id;

      // Halo/sombra bajo la línea para separarla del fondo del wrap.
      const halo = svgEl('path', {
        d: e.path, fill: 'none', stroke: haloColor, 'stroke-width': 3.2,
        'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        opacity: 0.55,
      });
      const path = svgEl('path', {
        d: e.path, fill: 'none', stroke: color, 'stroke-width': 1.6,
        'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        class: 'block-edge__path',
      });
      g.appendChild(halo);
      g.appendChild(path);

      // La orientación sale del último tramo REAL del path: el ángulo del
      // layout supone el lado de entrada planificado, que no siempre es por
      // donde el A* acaba llegando.
      const head = svgArrowHead({
        d: e.path,
        tip: { x: e.arrowTipX, y: e.arrowTipY },
        color,
        len: 9,
        halfWidth: 4.5,
        className: 'block-edge__head',
      });
      g.appendChild(head);

      if (e.label) {
        const pad = 6;
        const w = e.label.length * 6 + pad * 2;
        const chipH = 18;
        const chipY = e.labelY - chipH / 2;
        // Halo del chip para que la etiqueta flote sobre la arista.
        g.appendChild(svgEl('rect', {
          x: e.labelX - w / 2, y: chipY, width: w, height: chipH, rx: chipH / 2,
          fill: haloColor, opacity: 0.6,
        }));
        g.appendChild(svgEl('rect', {
          x: e.labelX - w / 2, y: chipY, width: w, height: chipH, rx: chipH / 2,
          fill: theme.chipFill, stroke: color, 'stroke-width': 0.8, 'stroke-opacity': 0.4,
          class: 'block-edge__chip',
        }));
        const t = svgEl('text', {
          x: e.labelX, y: e.labelY + 3.8, 'text-anchor': 'middle', fill: theme.text,
          'font-size': '10.5', 'font-weight': '600',
          'font-family': 'Inter,ui-sans-serif,system-ui,sans-serif',
          'letter-spacing': '0.01em',
        });
        t.textContent = e.label;
        g.appendChild(t);
      }

      this.svg.appendChild(g);
      this.#edgeNodes.set(e.id, { e, g, path });
    }
  }

  #buildBlocks(layout, theme) {
    const dark = this.wrap.dataset.theme === 'dark';
    const fillId = dark ? 'bd-block-fill' : 'bd-block-fill-light';
    for (const b of layout.blocks) {
      const color = (b.hue != null && tkHueToHex(b.hue)) || theme.accent;
      const g = svgEl('g', { class: 'block-node' });
      g.dataset.blockId = b.id;
      g.style.color = color; // permite usar currentColor en filter drop-shadow
      if (this.isViewer) g.style.cursor = 'pointer';

      // Sombra base + fill + tinte de color muy sutil + borde + glow interior.
      const shadow = svgEl('path', {
        d: blockShapePath(b.shape, b.x, b.y, b.w, b.h),
        fill: 'rgb(0 0 0 / 0.18)', stroke: 'none',
        transform: `translate(0, 1.5)`,
        filter: 'url(#bd-block-shadow)',
      });
      const box = svgEl('path', {
        d: blockShapePath(b.shape, b.x, b.y, b.w, b.h),
        fill: `url(#${fillId})`, stroke: color, 'stroke-width': 1.6,
        'stroke-linejoin': 'round', class: 'block-node__box',
      });
      g.appendChild(shadow);
      g.appendChild(box);

      const hasIcon = !!b.icon;
      const iconSize = 22;
      const padX = hasIcon ? iconSize + 18 : 16;
      const textLeft = b.x + padX;
      const textRight = b.x + b.w - 14;
      const iconY = b.y + b.h / 2 - iconSize / 2;

      if (hasIcon) {
        // Halo del icono para que destaque sobre el fill del bloque.
        const iconBg = svgEl('rect', {
          x: b.x + 12, y: iconY - 2, width: iconSize + 6, height: iconSize + 4,
          rx: 6, fill: color, opacity: 0.14,
        });
        g.appendChild(iconBg);
        g.appendChild(svgIconGroup(b.icon, {
          x: b.x + 15, y: iconY, size: iconSize, hue: b.hue,
        }));
      }

      if (b.label.includes('{{') || /[*`\[]/.test(b.label)) {
        const fo = svgEl('foreignObject', {
          x: textLeft, y: b.y, width: Math.max(textRight - textLeft, 8), height: b.h, overflow: 'visible',
        });
        const div = document.createElement('div');
        div.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
        div.className = 'block-node-label';
        Object.assign(div.style, {
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', height: '100%', fontSize: '12px', fontWeight: '600',
          fontFamily: 'Inter,ui-sans-serif,system-ui,sans-serif', color: theme.text,
          lineHeight: '1.25', textAlign: 'center',
          letterSpacing: '-0.005em',
        });
        div.innerHTML = inlineMdWeb(b.label);
        fo.appendChild(div);
        g.appendChild(fo);
      } else {
        const t = svgEl('text', {
          x: (textLeft + textRight) / 2, y: b.y + b.h / 2 + 4.5, 'text-anchor': 'middle',
          fill: theme.text, 'font-size': '12', 'font-weight': '600',
          'font-family': 'Inter,ui-sans-serif,system-ui,sans-serif',
          'letter-spacing': '-0.005em',
        });
        t.textContent = b.label;
        g.appendChild(t);
      }

      this.svg.appendChild(g);
      this.#blockNodes.set(b.id, { b, g, box });
    }
  }

  /* ── hover ── */

  #onClick = (e) => {
    if (this.isViewer) {
      const item = e.composedPath().find((x) => x?.dataset?.groupId);
      if (item) {
        emit(this, 'is-toggle-group', { id: item.dataset.groupId });
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
    if (!ev.defaultPrevented) this.openOwnViewer('blockDiagram');
  };

  #onMouseMove = (e) => {
    if (!this.isViewer) return;
    const g = e.composedPath().find((n) => n?.dataset?.blockId);
    const id = g?.dataset.blockId ?? null;
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
    const entry = id ? this.#blockNodes.get(id) : null;

    for (const [blockId, node] of this.#blockNodes) {
      const active = blockId === id;
      node.g.classList.toggle('is-active', active);
      node.g.classList.toggle('is-dim', !!id && !active);
      node.box.setAttribute('stroke-width', active ? 2.4 : 1.6);
    }
    for (const [, edge] of this.#edgeNodes) {
      const touches = !!id && (edge.e.from === id || edge.e.to === id);
      edge.g.classList.toggle('is-active', touches);
      edge.g.classList.toggle('is-dim', !!id && !touches);
    }

    this.#turtle?.setPaused(!!id);

    if (!entry) {
      this.tooltipEl.hidden = true;
      return;
    }
    const b = entry.b;
    this.tooltipEl.hidden = false;
    this.tooltipEl.innerHTML = '';
    const title = document.createElement('span');
    title.className = 'dg-tooltip__title';
    title.innerHTML = inlineMdWeb(b.label);
    this.tooltipEl.appendChild(title);
  }
}

defineElement('is-block-diagram', IsBlockDiagram, 'IsBlockDiagram');

registerDiagramKind('block', 'is-block-diagram');
registerDiagramKind('blockDiagram', 'is-block-diagram');

export { IsBlockDiagram };
