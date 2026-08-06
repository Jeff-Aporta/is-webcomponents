import { adoptCss } from '../_shared/adopt-css.js';
import { escapeHtml } from '../_shared/dom-utils.js';

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
 * Atributos
 *   direction   down (default) | up | right
 *   node-width, node-height  (default 200x80)
 *   gap         espacio entre nodos (default 24)
 *
 * API
 *   org.expand(id)  / .collapse(id)  / .toggle(id)
 *
 * Eventos
 *   is-select  detail: { id }
 */
(() => {
  const OBSERVED = ['direction', 'node-width', 'node-height', 'gap'];

  class IsOrgChart extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }
    #mounted = false;
    #nodes = new Map();
    #children = new Map();
    #root = null;
    #collapsed = new Set();
    #svg;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = /* html */ `
        <div part="root" class="root">
          <svg part="canvas" class="canvas" role="tree"></svg>
        </div>
      `;
      adoptCss(this.shadowRoot, import.meta.url);
      this.#svg = this.shadowRoot.querySelector('.canvas');
    }

    connectedCallback() {
      this.#mounted = true;
      this.#readData();
      this.#render();
    }

    attributeChangedCallback() {
      if (this.#mounted) this.#render();
    }

    expand(id)  { this.#collapsed.delete(id); this.#render(); }
    collapse(id) { this.#collapsed.add(id); this.#render(); }
    toggle(id) { this.#collapsed.has(id) ? this.#collapsed.delete(id) : this.#collapsed.add(id); this.#render(); }

    #readData() {
      this.#nodes = new Map();
      this.#children = new Map();
      const script = [...this.children].find((c) => c.tagName === 'SCRIPT' && /json/i.test(c.type || ''));
      if (!script) return;
      let data = [];
      try { data = JSON.parse(script.textContent); } catch {}
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

      this.#svg.innerHTML = '';
      this.#svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      this.#svg.style.cssText = 'width:100%;height:100%;max-width:none;display:block';
      this.#svg.removeAttribute('width');
      this.#svg.removeAttribute('height');

      // Recolectar subárboles visibles (post-collapse)
      const visible = new Set([this.#root]);
      const queue = [this.#root];
      while (queue.length) {
        const id = queue.shift();
        if (this.#collapsed.has(id)) continue;
        const kids = this.#children.get(id) || [];
        for (const k of kids) { if (this.#nodes.has(k)) { visible.add(k); queue.push(k); } }
      }

      // Layout por niveles (Reingold-Tilford simplificado: anchura fija por hoja)
      const layout = new Map();
      const LEAF_W = nodeW + gap;
      const LEAF_H = nodeH + 48;

      function place(id, depth) {
        const kids = (this.#children.get(id) || []).filter((k) => visible.has(k));
        if (!kids.length || this.#collapsed.has(id)) {
          layout.set(id, { x: 0, y: depth * LEAF_H });
          return layout.get(id);
        }
        const childPos = kids.map((k) => place.call(this, k, depth + 1));
        const minX = Math.min(...childPos.map((p) => p.x));
        const maxX = Math.max(...childPos.map((p) => p.x));
        const cx = (minX + maxX) / 2;
        layout.set(id, { x: cx, y: depth * LEAF_H });
        return layout.get(id);
      }

      if (this.#root && visible.has(this.#root)) place.call(this, this.#root, 0);

      // Normalizar a coordenadas positivas
      const offsets = [...layout.values()].map((p) => p.x);
      const min = offsets.length ? Math.min(...offsets) : 0;
      const max = offsets.length ? Math.max(...offsets) : 0;
      const baseX = 60 - min;

      // Render edges primero
      for (const [id, pos] of layout) {
        const parent = this.#nodes.get(id)?.parent;
        if (!parent || !visible.has(parent)) continue;
        const p = layout.get(parent);
        const x1 = baseX + p.x;
        const y1 = p.y + nodeH;
        const x2 = baseX + pos.x;
        const y2 = pos.y;
        const path = svgEl('path', {
          d: `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}`,
          class: 'edge',
          fill: 'none',
        });
        this.#svg.appendChild(path);
      }

      // Nodos
      for (const [id, pos] of layout) {
        const node = this.#nodes.get(id);
        const x = baseX + pos.x - nodeW / 2;
        const y = pos.y;
        const g = svgEl('g', { class: 'node', 'data-id': id, transform: `translate(${x}, ${y})` });
        const card = svgEl('foreignObject', { x: 0, y: 0, width: nodeW, height: nodeH });
        const wrap = document.createElement('div');
        wrap.className = 'card';
        wrap.innerHTML = `
          ${node.photo ? `<img class="photo" src="${node.photo}" alt="">` : `<span class="photo photo--fallback">${initialsOf(node.name || node.id)}</span>`}
          <div class="meta">
            <b class="name">${escapeHtml(node.name || node.id)}</b>
            <small class="title">${escapeHtml(node.title || '')}</small>
          </div>
          ${(this.#children.get(id) || []).length ? `<button class="toggle" type="button" aria-label="${this.#collapsed.has(id) ? 'Expandir' : 'Plegar'}">${this.#collapsed.has(id) ? '+' : '−'}</button>` : ''}
        `;
        card.appendChild(wrap);
        g.appendChild(card);
        wrap.addEventListener('click', (e) => {
          const t = e.target;
          if (t.classList.contains('toggle')) {
            this.toggle(id);
            this.dispatchEvent(new CustomEvent('is-toggle', { bubbles: true, composed: true, detail: { id, collapsed: this.#collapsed.has(id) } }));
          } else {
            this.dispatchEvent(new CustomEvent('is-select', { bubbles: true, composed: true, detail: { id, node } }));
          }
        });
        this.#svg.appendChild(g);
      }

      const maxY = offsets.length ? Math.max(...[...layout.values()].map((p) => p.y)) : 0;
      const contentW = Math.max(320, baseX + max + nodeW / 2 + 60);
      const contentH = Math.max(240, maxY + nodeH + 60);
      this.#svg.setAttribute('viewBox', `0 0 ${contentW} ${contentH}`);
    }
  }

  function svgEl(tag, attrs) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null) n.setAttribute(k, v);
    return n;
  }
  function initialsOf(name) {
    return String(name).split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }

  if (!customElements.get('is-org-chart')) customElements.define('is-org-chart', IsOrgChart);
})();
