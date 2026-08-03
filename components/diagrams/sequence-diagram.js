import { adoptCss } from '../_shared/adopt-css.js';
import {
  computeSequenceLayout,
  resolveSequenceSpec,
  sequenceMessageTooltipText,
  sequenceThemeDark,
  sequenceThemeLight,
} from './sequence-spec.js';
import { SequenceTurtle } from './sequence-turtle.js';
import { TK_DIAGRAM_RADIUS_PX } from '../_shared/diagram-grid.js';
import { svgIconGroup, hasIconJsonSugar } from '../_shared/tk-icon-inline.js';
import { tkHueToHex } from '../_shared/tk-hue.js';
import { contrastFontColor } from '../_shared/tk-color.js';
import { inlineMdWeb } from '../_shared/tk-inline-md.js';
import { registerDiagramKind } from './diagram-kinds.js';

/**
 * <is-sequence-diagram> — diagrama de secuencia en SVG, sin Mermaid.
 *
 * Configuración por JSON (idéntica a la del proyecto original): un
 * <script type="application/json"> hijo, o la propiedad `payload`.
 *
 *   <is-sequence-diagram>
 *     <script type="application/json">
 *       { "sequence": { "actors": [...], "messages": [...] } }
 *     </script>
 *   </is-sequence-diagram>
 *
 * También acepta `{ "preset": "tk1437191" }`.
 *
 * Atributos
 *   color  inline (default) | viewer — viewer activa hover, leyenda clickeable
 *            y auto-animación de la tortuga.
 *
 * Propiedades: payload, spec, layout, turtle, hiddenGroups
 * Eventos: is-turtle-state (detail: {playing, idx, total, replay}),
 *          is-open-viewer (click en colore inline),
 *          is-toggle-group (detail: {id})
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const GUIDE_X = 44;

function svgEl(tag, attrs = {}) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v != null) n.setAttribute(k, v);
  }
  return n;
}

/** Div dentro de foreignObject con HTML inline (iconos / markdown). */
function foreignHtml(x, y, w, h, className, html, style) {
  const fo = svgEl('foreignObject', { x, y, width: w, height: h, overflow: 'visible' });
  const div = document.createElement('div');
  div.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  div.className = className;
  if (style) Object.assign(div.style, style);
  div.innerHTML = html;
  fo.appendChild(div);
  return fo;
}

class IsSequenceDiagram extends HTMLElement {
  static get observedAttributes() { return ['color']; }

  #wrap; #svg; #tooltipEl;
  #payload = null;
  #spec = null;
  #layout = null;
  #theme = null;
  #turtle = null;
  #turtleGroup = null;
  #mounted = false;
  #mo = null; #themeObs = null; #ro = null;
  #renderQueued = false;
  #hiddenGroups = new Set();
  /** id de mensaje → nodos cacheados, para aplicar hover sin reconstruir el SVG. */
  #msgNodes = new Map();
  #lifelineNodes = [];
  #actorNodes = [];
  #hoverId = null;
  #ownLightbox = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = /* html */ `
      <div part="base" class="wrap">
        <svg part="canvas" class="seq-svg" xmlns="${SVG_NS}" role="img"></svg>
        <div part="tooltip" class="seq-tooltip dg-tooltip is-rich" hidden></div>
        <div class="slot-hidden"><slot></slot></div>
      </div>
    `;
    adoptCss(shadow, import.meta.url);
    this.#wrap = shadow.querySelector('.wrap');
    this.#svg = shadow.querySelector('.seq-svg');
    this.#tooltipEl = shadow.querySelector('.seq-tooltip');
  }

  connectedCallback() {
    this.#mounted = true;
    // Las etiquetas con {{iconify}} rinden <is-icon> dentro de foreignObject.
    this.#readJsonSlot();
    this.#mo = new MutationObserver(() => this.#readJsonSlot());
    this.#mo.observe(this, { childList: true, characterData: true, subtree: true });
    this.#themeObs = new MutationObserver(() => this.#queueRender());
    this.#themeObs.observe(document.documentElement, {
      attributes: true, attributeFilter: ['class', 'data-theme', 'data-palette'],
    });
    this.#wrap.addEventListener('mousemove', this.#onMouseMove);
    this.#wrap.addEventListener('mouseleave', this.#onMouseLeave);
    this.#wrap.addEventListener('click', this.#onClick);
    this.#queueRender();
  }

  disconnectedCallback() {
    this.#mounted = false;
    this.#mo?.disconnect();
    this.#themeObs?.disconnect();
    this.#ro?.disconnect();
    this.#turtle?.destroy();
    this.#turtle = null;
    this.#wrap.removeEventListener('mousemove', this.#onMouseMove);
    this.#wrap.removeEventListener('mouseleave', this.#onMouseLeave);
    this.#wrap.removeEventListener('click', this.#onClick);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this.#mounted || oldVal === newVal) return;
    this.#queueRender();
  }

  get isViewer() { return this.getAttribute('color') === 'viewer'; }

  get payload() { return this.#payload; }
  set payload(v) {
    this.#payload = v;
    this.#hiddenGroups = new Set();
    this.#queueRender();
  }

  get spec() { return this.#spec; }
  get layout() { return this.#layout; }
  get turtle() { return this.#turtle; }

  get hiddenGroups() { return this.#hiddenGroups; }
  set hiddenGroups(v) {
    this.#hiddenGroups = v instanceof Set ? v : new Set(v || []);
    this.#queueRender();
  }

  async updateComplete() { await this.#queueRender(); }

  #readJsonSlot() {
    const script = [...this.children].find((c) => c.tagName === 'SCRIPT' && /json/i.test(c.type || ''));
    if (!script) return;
    try {
      this.#payload = JSON.parse(script.textContent.trim());
      this.#queueRender();
    } catch { /* JSON inválido: conserva el último payload válido */ }
  }

  #queueRender() {
    if (this.#renderQueued) return this.#renderQueued;
    this.#renderQueued = (async () => {
      await Promise.resolve();
      try { this.#render(); } finally { this.#renderQueued = false; }
    })();
    return this.#renderQueued;
  }

  #render() {
    if (!this.#mounted) return;

    // Los grupos ocultos se filtran del spec (re-diseña sin esas aristas).
    const hidden = this.#hiddenGroups;
    const spec = resolveSequenceSpec(this.#payload ?? {});
    this.#spec = spec;
    if (!spec) {
      this.#svg.innerHTML = '';
      this.#wrap.dataset.empty = '';
      return;
    }
    delete this.#wrap.dataset.empty;

    const keep = (m) => !m.group || !hidden.has(m.group);
    const visibleSpec = hidden.size
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

    const dark = !document.documentElement.classList.contains('theme-light');
    const theme = dark ? sequenceThemeDark() : sequenceThemeLight();
    this.#theme = theme;
    this.#wrap.dataset.theme = dark ? 'dark' : 'light';
    const layout = computeSequenceLayout(visibleSpec);
    this.#layout = layout;

    this.#buildSvg(layout, theme);
    this.#wrap.classList.toggle('is-viewer', this.isViewer);
  }

  #buildSvg(layout, theme) {
    const { width: W, height: H, actors, lifelines, messages, altBox, title, subtitle, titleY, subtitleY, groups, legendX } = layout;

    this.#svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.#svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.#svg.setAttribute('aria-label', title || 'Diagrama de secuencia');
    // El resto del dimensionado vive en la hoja de estilos.
    this.#svg.style.maxWidth = this.isViewer ? '' : `${W}px`;
    this.#svg.innerHTML = '';
    this.#msgNodes.clear();
    this.#lifelineNodes = [];
    this.#actorNodes = [];
    this.#hoverId = null;

    if (title) {
      const t = svgEl('text', {
        x: W / 2, y: titleY, 'text-anchor': 'middle', fill: theme.text,
        'font-size': '13', 'font-weight': '600', 'font-family': 'Tahoma,Arial,sans-serif',
      });
      t.textContent = title;
      this.#svg.appendChild(t);
    }
    if (subtitle) {
      const t = svgEl('text', {
        x: W / 2, y: subtitleY, 'text-anchor': 'middle', fill: theme.muted,
        'font-size': '11', 'font-family': 'Tahoma,Arial,sans-serif',
      });
      t.textContent = subtitle;
      this.#svg.appendChild(t);
    }

    if (groups?.length) this.#buildLegend(groups, legendX, theme);
    this.#buildActors(actors, theme);
    this.#buildLifelines(lifelines, theme);
    if (altBox) this.#buildAltBox(altBox, theme);
    this.#buildMessages(messages, altBox, theme);

    // La tortuga se monta al final: debe quedar por encima de las marks.
    this.#turtleGroup = svgEl('g');
    this.#svg.appendChild(this.#turtleGroup);
    this.#turtle?.destroy();
    this.#turtle = new SequenceTurtle(this.#turtleGroup);
    this.#turtle.setData({
      messages,
      theme,
      viewW: W,
      viewH: H,
      autoLoop: this.isViewer,
      onState: (state) => {
        this.dispatchEvent(new CustomEvent('is-turtle-state', {
          bubbles: true, composed: true, detail: state,
        }));
      },
    });

    this.dispatchEvent(new CustomEvent('is-render', {
      bubbles: true, composed: true, detail: { layout, svg: this.#svg },
    }));
  }

  #buildLegend(groups, legendX, theme) {
    const g = svgEl('g', { class: 'seq-legend' });
    groups.forEach((grp, gi) => {
      const ly = 18 + gi * 16;
      const color = tkHueToHex(grp.hue) ?? theme.accent;
      const off = this.#hiddenGroups.has(grp.id);
      const clickable = this.isViewer;

      const item = svgEl('g', {
        class: `seq-legend__item${off ? ' is-off' : ''}`,
        opacity: off ? 0.4 : 1,
      });
      if (clickable) {
        item.style.cursor = 'pointer';
        item.dataset.groupId = grp.id;
        // Zona de click generosa sobre todo el renglón de la leyenda.
        item.appendChild(svgEl('rect', {
          x: legendX - 2, y: ly - 8, width: grp.name.length * 6 + 26, height: 16, rx: 4, fill: 'transparent',
        }));
      }
      item.appendChild(off
        ? svgEl('circle', { cx: legendX + 5, cy: ly, r: 4.5, fill: 'none', stroke: color, 'stroke-width': 1.4 })
        : svgEl('circle', { cx: legendX + 5, cy: ly, r: 4.5, fill: color }));
      const label = svgEl('text', {
        x: legendX + 16, y: ly + 3.5, fill: theme.muted,
        'font-size': '10', 'font-family': 'Tahoma,Arial,sans-serif',
        'text-decoration': off ? 'line-through' : null,
      });
      label.textContent = grp.name;
      item.appendChild(label);
      g.appendChild(item);
    });
    this.#svg.appendChild(g);
  }

  #buildActors(actors, theme) {
    for (const a of actors) {
      const bw = a.w;
      const bx = a.x - bw / 2;
      const iconInLabel = hasIconJsonSugar(a.label);
      const iconCx = bx + 18;
      const labelLeft = iconInLabel ? bx + 8 : bx + 32;
      const labelRight = bx + bw - 8;
      const labelCx = (labelLeft + labelRight) / 2;

      const g = svgEl('g', { class: 'seq-actor' });
      const rect = svgEl('rect', {
        x: bx, y: a.y - 16, width: bw, height: 32, rx: TK_DIAGRAM_RADIUS_PX,
        fill: 'transparent', stroke: theme.border, 'stroke-width': 1,
      });
      g.appendChild(rect);

      if (!iconInLabel) {
        const fill = tkHueToHex(a.hue) ?? '#64748b';
        g.appendChild(svgEl('circle', { cx: iconCx, cy: a.y, r: 16 * 0.74, fill, opacity: 0.16 }));
        g.appendChild(svgIconGroup(a.icon, {
          x: iconCx - 8, y: a.y - 8, size: 16, hue: a.hue,
        }));
      }

      if (a.label.includes('{{')) {
        g.appendChild(foreignHtml(
          labelLeft, a.y - 10, labelRight - labelLeft, 20,
          'seq-actor-label',
          inlineMdWeb(a.label),
          {
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', height: '100%', fontSize: '11px', fontWeight: '600',
            fontFamily: 'Tahoma,Arial,sans-serif', color: theme.text, lineHeight: '1',
          },
        ));
      } else {
        const t = svgEl('text', {
          x: labelCx, y: a.y + 4, 'text-anchor': 'middle', fill: theme.text,
          'font-size': '11', 'font-weight': '600', 'font-family': 'Tahoma,Arial,sans-serif',
        });
        t.textContent = a.label;
        g.appendChild(t);
      }

      this.#svg.appendChild(g);
      this.#actorNodes.push({ x: a.x, g, rect });
    }
  }

  #buildLifelines(lifelines, theme) {
    for (const l of lifelines) {
      const line = svgEl('line', {
        x1: l.x, y1: l.y1, x2: l.x, y2: l.y2,
        stroke: theme.grid, 'stroke-width': 1, 'stroke-dasharray': '4 4',
        class: 'seq-lifeline',
      });
      this.#svg.appendChild(line);
      this.#lifelineNodes.push({ x: l.x, line });
    }
  }

  #buildAltBox(altBox, theme) {
    const g = svgEl('g', { class: 'seq-alt' });
    g.appendChild(svgEl('rect', {
      x: altBox.x, y: altBox.y, width: altBox.w, height: altBox.h, rx: TK_DIAGRAM_RADIUS_PX,
      fill: theme.altFill, stroke: theme.altBorder, 'stroke-width': '1.2', 'stroke-dasharray': '5 4',
    }));
    const t = svgEl('text', {
      x: altBox.x + 10, y: altBox.y + 14, fill: theme.muted,
      'font-size': '10', 'font-weight': '600', 'font-family': 'Tahoma,Arial,sans-serif',
    });
    t.textContent = altBox.label;
    g.appendChild(t);
    this.#svg.appendChild(g);
  }

  #buildMessages(messages, altBox, theme) {
    for (const m of messages) {
      const color = (m.groupHue != null && tkHueToHex(m.groupHue)) || theme.accent;
      const g = svgEl('g', { class: 'seq-msg' });
      g.dataset.msgId = m.id;
      if (this.isViewer) g.style.cursor = 'pointer';

      if (m.branchFirst && m.branch) {
        const t = svgEl('text', {
          x: altBox ? altBox.x + 36 : GUIDE_X + 8, y: m.y - 10, fill: theme.muted,
          'font-size': '9', 'font-family': 'Tahoma,Arial,sans-serif',
        });
        t.textContent = `[${m.branch}]`;
        g.appendChild(t);
      }

      const path = svgEl('path', {
        d: m.path, fill: 'none', stroke: color, 'stroke-width': 1.15,
        'stroke-dasharray': m.kind === 'async' ? '5 3' : null,
        'stroke-linecap': 'square', 'stroke-linejoin': 'miter',
        'vector-effect': 'non-scaling-stroke',
        class: 'seq-msg-path',
      });
      g.appendChild(path);

      // Punta horizontal según la dirección del último tramo.
      const tipX = m.arrowTipX;
      const tipY = m.arrowTipY ?? m.y;
      const head = m.arrowDir > 0
        ? `${tipX},${tipY} ${tipX - 7},${tipY - 3.5} ${tipX - 7},${tipY + 3.5}`
        : `${tipX},${tipY} ${tipX + 7},${tipY - 3.5} ${tipX + 7},${tipY + 3.5}`;
      const arrow = m.kind === 'async'
        ? svgEl('polyline', { points: head, fill: 'none', stroke: color, 'stroke-width': 1.15, 'stroke-linejoin': 'miter', class: 'seq-msg-head' })
        : svgEl('polygon', { points: head, fill: color, class: 'seq-msg-head' });
      g.appendChild(arrow);

      const dotG = svgEl('g', { class: 'seq-start' });
      const dot = svgEl('circle', { cx: m.fromX, cy: m.y, r: 8, fill: color });
      dotG.appendChild(dot);
      const stepText = svgEl('text', {
        x: m.fromX, y: m.y + 3.2, 'text-anchor': 'middle', fill: contrastFontColor(color),
        'font-size': '9', 'font-weight': '700', 'font-family': 'Tahoma,Arial,sans-serif',
      });
      stepText.textContent = String(m.step);
      dotG.appendChild(stepText);
      g.appendChild(dotG);

      if (m.label) {
        // Chip semiopaco: enmascara las lifelines bajo el texto.
        g.appendChild(svgEl('rect', {
          x: m.labelX, y: m.labelY, width: m.labelW, height: m.labelH, rx: 4, fill: theme.chipFill,
        }));
      }

      const labelNode = this.#buildMessageLabel(m, theme);
      if (labelNode) g.appendChild(labelNode);

      this.#svg.appendChild(g);
      this.#msgNodes.set(m.id, { m, g, path, arrow, dot, labelNode });
    }
  }

  #buildMessageLabel(m, theme) {
    if (!m.label) return null;
    if (m.label.includes('{{')) {
      return foreignHtml(
        m.labelX, m.labelY, m.labelW, m.labelH,
        'seq-label',
        inlineMdWeb(m.label),
        {
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', height: '100%', fontSize: '10px',
          fontFamily: 'Consolas, Menlo, monospace', color: theme.muted,
          lineHeight: '1.2', textAlign: 'center',
        },
      );
    }
    const t = svgEl('text', {
      x: m.labelX + m.labelW / 2, y: m.labelY + 13, 'text-anchor': 'middle',
      fill: theme.muted, 'font-size': '10', 'font-family': 'Consolas,Menlo,monospace',
      class: 'seq-label-text',
    });
    t.textContent = m.label;
    return t;
  }

  /* ── hover ───────────────────────────────────────────────────────── */

  #onClick = (e) => {
    if (this.isViewer) {
      const item = e.composedPath().find((n) => n?.dataset?.groupId);
      if (item) {
        this.dispatchEvent(new CustomEvent('is-toggle-group', {
          bubbles: true, composed: true, detail: { id: item.dataset.groupId },
        }));
      }
      return;
    }
    // Preview inline: entrar al visor con 1 clic / 1 tap. Es opt-in: sin
    // `open-on-click` el clic no hace nada y tampoco se anuncia
    // `is-open-viewer`, que prometeria una apertura que no ocurre.
    if (!this.hasAttribute('open-on-click')) return;
    const ev = new CustomEvent('is-open-viewer', {
      bubbles: true, composed: true, cancelable: true, detail: { payload: this.#payload },
    });
    this.dispatchEvent(ev);
    // Si nadie lo intercepta (preventDefault), abre el visor por su cuenta.
    if (!ev.defaultPrevented) this.#openOwnViewer();
  };

  /** Lightbox propio, cargado bajo demanda para no crear un ciclo de imports. */
  async #openOwnViewer() {
    await import('./diagram-lightbox.js');
    let lb = this.#ownLightbox;
    if (!lb || !lb.isConnected) {
      lb = document.createElement('is-diagram-lightbox');
      lb.setAttribute('kind', 'sequence');
      lb.addEventListener('is-close', () => lb.remove());
      document.body.appendChild(lb);
      this.#ownLightbox = lb;
    }
    lb.payload = this.#payload;
    lb.open = true;
  }

  #onMouseMove = (e) => {
    if (!this.isViewer) return;
    const g = e.composedPath().find((n) => n?.dataset?.msgId);
    const id = g?.dataset.msgId ?? null;
    if (id !== this.#hoverId) this.#applyHover(id);
    if (id) this.#positionTooltip(e);
  };

  #onMouseLeave = () => {
    if (!this.isViewer) return;
    this.#applyHover(null);
  };

  #applyHover(id) {
    this.#hoverId = id;
    const entry = id ? this.#msgNodes.get(id) : null;
    const hovered = entry?.m ?? null;
    const theme = this.#theme;
    const hiColor = hovered?.groupHue != null ? tkHueToHex(hovered.groupHue) || theme.accent : theme.accent;

    this.#wrap.classList.toggle('is-hover-msg', !!id);

    for (const [msgId, node] of this.#msgNodes) {
      const active = msgId === id;
      node.g.classList.toggle('is-active', active);
      node.g.classList.toggle('is-dim', !!id && !active);
      node.path.setAttribute('stroke-width', active ? 1.75 : 1.15);
      if (node.arrow.tagName === 'polyline') node.arrow.setAttribute('stroke-width', active ? 1.75 : 1.15);
      node.dot.setAttribute('r', active ? 9 : 8);
      if (node.labelNode?.classList?.contains('seq-label-text')) {
        node.labelNode.setAttribute('fill', active ? theme.text : theme.muted);
        node.labelNode.setAttribute('font-weight', active ? '600' : '400');
      }
    }

    for (const { x, line } of this.#lifelineNodes) {
      const involved = hovered && (hovered.fromX === x || hovered.toX === x);
      line.setAttribute('stroke', involved ? hiColor : theme.grid);
      line.setAttribute('stroke-width', involved ? 1.6 : 1);
      line.setAttribute('opacity', id && !involved ? 0.3 : 1);
    }

    for (const { x, g, rect } of this.#actorNodes) {
      const active = hovered && (hovered.fromX === x || hovered.toX === x);
      const dim = !!id && !active;
      g.classList.toggle('is-active', !!active);
      g.setAttribute('opacity', dim ? 0.32 : 1);
      rect.setAttribute('stroke', active ? theme.accent : theme.border);
      rect.setAttribute('stroke-width', active ? 1.4 : 1);
    }

    // La tortuga se congela mientras se inspecciona un mensaje.
    this.#turtle?.setPaused(!!id);

    if (!hovered) {
      this.#tooltipEl.hidden = true;
      return;
    }
    this.#renderTooltip(hovered);
  }

  #renderTooltip(m) {
    const tip = this.#tooltipEl;
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
  #positionTooltip(e) {
    const rect = this.#wrap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const left = Math.max(8, Math.min((rect.width || 320) - 300, x + 16));
    this.#tooltipEl.style.left = `${left}px`;
    this.#tooltipEl.style.top = `${y + 26}px`;
  }
}

if (!customElements.get('is-sequence-diagram')) {
  customElements.define('is-sequence-diagram', IsSequenceDiagram);
}
if (typeof window !== 'undefined') window.IsSequenceDiagram = IsSequenceDiagram;

registerDiagramKind('sequence', 'is-sequence-diagram');
registerDiagramKind('sequence-diagram', 'is-sequence-diagram');

export { IsSequenceDiagram };
