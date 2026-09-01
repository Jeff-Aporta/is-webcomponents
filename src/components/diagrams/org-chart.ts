import { adoptCss, defineElement, emit } from '../../core/element.js';
import { escapeHtml } from '../_shared/dom-utils.js';
import { registerDiagramKind } from './diagram-kinds.js';
import { svgEl } from '../_shared/svg-chart-engine.js';

/**
 * <is-org-chart> — Organigrama. Layout jerárquico top-down, a partir de un árbol.
 *
 * Datos
 *   <script type="application/json">
 *   [
 *     { "id": "ceo", "title": "CEO", "name": "Carolina Méndez", "photo": "https://…", "parent": null },
 *     { "id": "cto", "title": "CTO", "name": "Pedro Castaño",  "parent": "ceo" },
 *     ...
 *   ]
 *   </script>
 *
 * Cada nodo acepta además `detail` (o `tooltip`): texto largo mostrado al
 * pasar el cursor sobre la tarjeta, encima del `title` nativo del navegador.
 *
 * Atributos
 *   direction   down (default) | up | right
 *   node-width, node-height  (default 200x80)
 *   gap         espacio entre nodos (default 24)
 *   color       inline (default) | viewer — lo fija el visor, no a mano
 *   open-on-click  clic en el fondo (fuera de una tarjeta) abre <is-diagram-lightbox>
 *
 * Propiedades
 *   payload     array de nodos (alternativa al <script> hijo) u objeto { nodes: [...] }
 *
 * API
 *   org.expand(id)  / .collapse(id)  / .toggle(id)
 *
 * Eventos
 *   is-select       detail: { id, node }
 *   is-toggle       detail: { id, collapsed }
 *   is-open-viewer  detail: { payload } — cancelable; clic en el fondo con open-on-click
 */
(() => {
  const OBSERVED = ['direction', 'node-width', 'node-height', 'gap', 'color'];
  const MOVE_MS = 300;

  class IsOrgChart extends HTMLElement {
    static get observedAttributes(): string[] { return OBSERVED; }
    #mounted = false;
    #nodes = new Map();
    #children = new Map();
    #root = null;
    #collapsed = new Set();
    #rawData = null;
    #payloadOverride = null;
    #svg!: HTMLElement;
    #rootEl!: HTMLElement;
    #tooltipEl!: HTMLElement;
    #nodeEls = new Map();
    #edgeEls = new Map();
    #lastPos = new Map();
    #ownLightbox = null;
    #hoverId = null;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot!.innerHTML = /* html */ `
        <div part="root" class="root">
          <svg part="canvas" class="canvas" role="tree"></svg>
          <div part="tooltip" class="oc-tooltip dg-tooltip is-rich" hidden></div>
        </div>
      `;
      adoptCss(this.shadowRoot!, import.meta.url);
      this.#rootEl = this.shadowRoot!.querySelector<HTMLElement>('.root')!;
      this.#svg = this.shadowRoot!.querySelector<HTMLElement>('.canvas')!;
      this.#tooltipEl = this.shadowRoot!.querySelector<HTMLElement>('.oc-tooltip')!;
      this.#rootEl.addEventListener('click', this.#onClick);
      this.#rootEl.addEventListener('mousemove', this.#onMouseMove);
      this.#rootEl.addEventListener('mouseleave', this.#onMouseLeave);
    }

    connectedCallback(): void {
      this.#mounted = true;
      this.#readData();
      this.#render();
    }

    attributeChangedCallback() {
      if (this.#mounted) this.#render();
    }

    get isViewer() { return this.getAttribute('color') === 'viewer'; }

    get payload() { return this.#rawData; }
    set payload(v) {
      this.#payloadOverride = v;
      if (this.#mounted) {
        this.#readData();
        this.#render();
      }
    }

    expand(id)  { this.#collapsed.delete(id); this.#render(); }
    collapse(id) { this.#collapsed.add(id); this.#render(); }
    toggle(id) { this.#collapsed.has(id) ? this.#collapsed.delete(id) : this.#collapsed.add(id); this.#render(); }

    #readData() {
      this.#nodes = new Map();
      this.#children = new Map();
      let data = [];
      if (this.#payloadOverride != null) {
        const p = this.#payloadOverride;
        data = Array.isArray(p) ? p : (Array.isArray(p?.nodes) ? p.nodes : []);
      } else {
        const script = [...this.children].find((c) => c.tagName === 'SCRIPT' && /json/i.test(c.type || ''));
        if (script) { try { data = JSON.parse(script.textContent); } catch { data = []; } }
      }
      this.#rawData = data;
      data.forEach((n) => this.#nodes.set(n.id, n));
      data.forEach((n) => {
        if (!this.#children.has(n.parent)) this.#children.set(n.parent, []);
        this.#children.get(n.parent).push(n.id);
      });
      // el primer nodo sin parent es la raíz
      this.#root = (data.find((n) => !n.parent) || data[0])?.id || null;
    }

    #render() {
      const nodeW = Number(this.getAttribute('node-width')) || 200;
      const nodeH = Number(this.getAttribute('node-height')) || 78;
      const gap = Number(this.getAttribute('gap')) || 28;

      this.#svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      this.#svg.style.cssText = 'width:100%;height:100%;max-width:none;display:block';
      this.#svg.removeAttribute('width');
      this.#svg.removeAttribute('height');
      this.#rootEl.classList.toggle('is-viewer', this.isViewer);

      // Recolectar subárboles visibles (post-collapse)
      const visible = new Set([this.#root]);
      const queue = [this.#root];
      while (queue.length) {
        const id = queue.shift();
        if (this.#collapsed.has(id)) continue;
        const kids = this.#children.get(id) || [];
        for (const k of kids) { if (this.#nodes.has(k)) { visible.add(k); queue.push(k); } }
      }

      // Layout por niveles (Reingold-Tilford simplificado: anchura fija por hoja).
      // Cada hoja reclama su propio carril horizontal (LEAF_W); cada padre se
      // centra sobre el punto medio de sus hijos.
      const layout = new Map();
      const LEAF_W = nodeW + gap;
      const LEAF_H = nodeH + 48;
      let leafIndex = 0;

      const place = (id, depth: number) => {
        const kids = (this.#children.get(id) || []).filter((k) => visible.has(k));
        if (!kids.length || this.#collapsed.has(id)) {
          const x = leafIndex * LEAF_W;
          leafIndex += 1;
          layout.set(id, { x, y: depth * LEAF_H });
          return layout.get(id);
        }
        const childPos = kids.map((k) => place(k, depth + 1));
        const minX = Math.min(...childPos.map((p) => p.x));
        const maxX = Math.max(...childPos.map((p) => p.x));
        const cx = (minX + maxX) / 2;
        layout.set(id, { x: cx, y: depth * LEAF_H });
        return layout.get(id);
      };

      if (this.#root && visible.has(this.#root)) place(this.#root, 0);

      // Normalizar a coordenadas positivas
      const offsets = [...layout.values()].map((p) => p.x);
      const min = offsets.length ? Math.min(...offsets) : 0;
      const max = offsets.length ? Math.max(...offsets) : 0;
      const baseX = 60 - min;

      this.#reconcileEdges(layout, baseX, nodeH, visible);
      this.#reconcileNodes(layout, baseX, nodeW, nodeH, visible);

      const maxY = offsets.length ? Math.max(...[...layout.values()].map((p) => p.y)) : 0;
      const contentW = Math.max(320, baseX + max + nodeW / 2 + 60);
      const contentH = Math.max(240, maxY + nodeH + 60);
      this.#svg.setAttribute('viewBox', `0 0 ${contentW} ${contentH}`);
    }

    /** Aristas: se re-derivan por clave `parent->hijo`, reconciliando en vez de
     *  recrear, así el CSS `transition: d` las anima cuando cambian de forma. */
    #reconcileEdges(layout, baseX, nodeH, visible) {
      const seen = new Set();
      for (const [id, pos] of layout) {
        const parent = this.#nodes.get(id)?.parent;
        if (!parent || !visible.has(parent)) continue;
        const key = `${parent}>${id}`;
        seen.add(key);
        const p = layout.get(parent);
        const x1 = baseX + p.x;
        const y1 = p.y + nodeH;
        const x2 = baseX + pos.x;
        const y2 = pos.y;
        const d = `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}`;
        let path = this.#edgeEls.get(key);
        if (!path) {
          path = svgEl('path', { class: 'edge', fill: 'none', d });
          path.style.opacity = '0';
          this.#svg.insertBefore(path, this.#svg.firstChild);
          this.#edgeEls.set(key, path);
          requestAnimationFrame(() => { path.style.opacity = ''; });
        } else {
          path.setAttribute('d', d);
          path.style.opacity = '';
        }
      }
      for (const [key, path] of this.#edgeEls) {
        if (seen.has(key)) continue;
        this.#edgeEls.delete(key);
        path.style.opacity = '0';
        setTimeout(() => path.remove(), MOVE_MS);
      }
    }

    /** Nodos: se reconcilian por id y se anima `transform` (CSS transition)
     *  para que expandir/plegar reacomode las tarjetas en vez de saltar. */
    #reconcileNodes(layout, baseX, nodeW: number, nodeH, visible) {
      const seen = new Set();
      const nextPos = new Map();
      for (const [id, pos] of layout) {
        const cx = baseX + pos.x;
        const cy = pos.y;
        nextPos.set(id, { cx, cy });
        seen.add(id);
        const tx = cx - nodeW / 2;
        const ty = cy;

        let entry = this.#nodeEls.get(id);
        if (!entry) {
          entry = this.#createNodeEl(id, nodeW, nodeH);
          this.#svg.appendChild(entry.g);
          this.#nodeEls.set(id, entry);
          const anchor = this.#lastPos.get(this.#nodes.get(id)?.parent);
          const startTx = (anchor ? anchor.cx : cx) - nodeW / 2;
          const startTy = anchor ? anchor.cy : cy;
          entry.g.style.opacity = '0';
          entry.g.setAttribute('transform', `translate(${startTx}, ${startTy})`);
          // Reflow forzado: sin esto el navegador colapsa el estado inicial
          // y el destino con la posición final en el mismo frame (sin transición).
          void entry.g.getBoundingClientRect();
          requestAnimationFrame(() => {
            entry.g.style.opacity = '';
            entry.g.setAttribute('transform', `translate(${tx}, ${ty})`);
          });
        } else {
          entry.g.setAttribute('transform', `translate(${tx}, ${ty})`);
        }
        this.#updateNodeCard(entry, id);
      }

      for (const [id, entry] of this.#nodeEls) {
        if (seen.has(id)) continue;
        const node = this.#nodes.get(id);
        const anchor = this.#lastPos.get(node?.parent) || this.#lastPos.get(id);
        if (anchor) entry.g.setAttribute('transform', `translate(${anchor.cx - nodeW / 2}, ${anchor.cy})`);
        entry.g.style.opacity = '0';
        this.#nodeEls.delete(id);
        const g = entry.g;
        setTimeout(() => g.remove(), MOVE_MS);
      }

      this.#lastPos = nextPos;
    }

    #createNodeEl(id, nodeW, nodeH) {
      const g = svgEl('g', { class: 'node', 'data-id': id });
      const card = svgEl('foreignObject', { x: 0, y: 0, width: nodeW, height: nodeH });
      const wrap = document.createElement('div');
      wrap.className = 'card';
      card.appendChild(wrap);
      g.appendChild(card);
      return { g, card, wrap };
    }

    #updateNodeCard(entry, id) {
      const node = this.#nodes.get(id);
      if (!node) return;
      const hasKids = (this.#children.get(id) || []).length > 0;
      const collapsed = this.#collapsed.has(id);
      const detail = node.detail || node.tooltip || '';
      entry.wrap.innerHTML = `
        ${node.photo ? `<img class="photo" src="${node.photo}" alt="">` : `<span class="photo photo--fallback">${initialsOf(node.name || node.id)}</span>`}
        <div class="meta">
          <b class="name">${escapeHtml(node.name || node.id)}</b>
          <small class="title">${escapeHtml(node.title || '')}</small>
        </div>
        ${hasKids ? `<button class="toggle" type="button" aria-label="${collapsed ? 'Expandir' : 'Plegar'}">${collapsed ? '+' : '−'}</button>` : ''}
      `;
      if (detail) entry.wrap.title = detail;
      else entry.wrap.removeAttribute('title');
    }

    /* ── interacción: delegada en `.root`, así sobrevive a la reconciliación ── */

    #onClick = (e: PointerEvent) => {
      const path = e.composedPath();
      const toggleBtn = path.find((n) => n?.classList?.contains?.('toggle'));
      const nodeG = path.find((n) => n?.dataset?.id);
      if (toggleBtn && nodeG) {
        const id = nodeG.dataset.id;
        this.toggle(id);
        emit(this, 'is-toggle', { id, collapsed: this.#collapsed.has(id) });
        return;
      }
      if (nodeG) {
        const id = nodeG.dataset.id;
        emit(this, 'is-select', { id, node: this.#nodes.get(id) });
        return;
      }
      // Clic en el fondo (fuera de cualquier tarjeta): el visor es opt-in, sin
      // `open-on-click` no hace nada y tampoco anuncia `is-open-viewer`.
      if (this.isViewer || !this.hasAttribute('open-on-click')) return;
      const ev = new CustomEvent('is-open-viewer', {
        bubbles: true, composed: true, cancelable: true, detail: { payload: this.#rawData },
      });
      this.dispatchEvent(ev);
      if (!ev.defaultPrevented) this.#openOwnViewer();
    };

    async #openOwnViewer() {
      await import('./diagram-lightbox.js');
      let lb = this.#ownLightbox;
      if (!lb || !lb.isConnected) {
        lb = document.createElement('is-diagram-lightbox');
        lb.setAttribute('kind', 'org-chart');
        lb.addEventListener('is-after-hide', () => lb.remove());
        document.body.appendChild(lb);
        this.#ownLightbox = lb;
      }
      lb.payload = this.#rawData;
      lb.open = true;
    }

    #onMouseMove = (e: PointerEvent) => {
      const g = e.composedPath().find((n) => n?.dataset?.id);
      const id = g?.dataset.id ?? null;
      if (id !== this.#hoverId) this.#applyHover(id);
      if (id) {
        const rect = this.#rootEl.getBoundingClientRect();
        const left = Math.max(8, Math.min(rect.width - 280, e.clientX - rect.left + 16));
        this.#tooltipEl.style.left = `${left}px`;
        this.#tooltipEl.style.top = `${e.clientY - rect.top + 22}px`;
      }
    };

    #onMouseLeave = () => this.#applyHover(null);

    #applyHover(id) {
      this.#hoverId = id;
      const node = id ? this.#nodes.get(id) : null;
      const detail = node ? (node.detail || node.tooltip || '') : '';
      if (!node || !detail) {
        this.#tooltipEl.hidden = true;
        return;
      }
      this.#tooltipEl.hidden = false;
      this.#tooltipEl.innerHTML = '';
      const title = document.createElement('span');
      title.className = 'dg-tooltip__title';
      title.textContent = node.title ? `${node.name || node.id} · ${node.title}` : (node.name || node.id);
      this.#tooltipEl.appendChild(title);
      const desc = document.createElement('div');
      desc.className = 'dg-tooltip__desc';
      desc.textContent = detail;
      this.#tooltipEl.appendChild(desc);
    }
  }

  defineElement('is-org-chart', IsOrgChart, 'IsOrgChart');

  registerDiagramKind('org-chart', 'is-org-chart');
})();
