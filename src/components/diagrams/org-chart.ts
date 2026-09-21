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
 *   direction   down (default) | up | right — POR IMPLEMENTAR: el layout es
 *               top-down (los valores up/right no cambian nada hoy)
 *   node-width, node-height  (default 200x78)
 *   gap         espacio entre nodos (default 28)
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
  const OBSERVED = ['direction', 'node-width', 'node-height', 'gap', 'color', 'open-on-click'];
  const MOVE_MS = 300;

  /** Nodo declarado por el autor del organigrama. */
  interface OrgNode {
    id: string;
    title?: string;
    name?: string;
    parent?: string | null;
    photo?: string;
    detail?: string;
    tooltip?: string;
    /** Campos libres del usuario (no tipamos más para no romper payloads
     *  legacy: el consumidor los lee con `getAttribute`/`dataset`). */
    [extra: string]: unknown;
  }

  /** Payload completo: array de nodos u objeto `{ nodes: [...] }`. */
  type OrgPayload = OrgNode[] | { nodes?: OrgNode[] } | null | undefined;

  /** Punto del layout interno (carriles / profundidad). */
  interface LayoutPoint { x: number; y: number; }

  /** Punto del layout externo (coordenadas del SVG ya en píxeles). */
  interface PlacedPoint extends LayoutPoint {
    lane: number;
    depth: number;
  }

  /** Entrada DOM cacheada para reconciliar un nodo. */
  interface NodeEntry {
    g: SVGGElement;
    card: SVGForeignObjectElement;
    wrap: HTMLDivElement;
  }

  /** Iniciales del avatar por defecto (se perdió en la migración a TS y las
   *  tarjetas sin `photo` tiraban ReferenceError en cada render). */
  function initialsOf(name: unknown): string {
    const words = String(name ?? '').trim().split(/\s+/).filter(Boolean);
    const ini = words.slice(0, 2).map((w: string) => w[0] ?? '').join('').toUpperCase();
    return ini || '?';
  }

  class IsOrgChart extends HTMLElement {
    static get observedAttributes(): string[] { return OBSERVED; }
    #mounted = false;
    #nodes: Map<string, OrgNode> = new Map();
    #children: Map<string, string[]> = new Map();
    #root: string | null = null;
    #collapsed: Set<string> = new Set();
    #rawData: OrgNode[] = [];
    #payloadOverride: OrgPayload = null;
    #svg!: SVGSVGElement;
    #rootEl!: HTMLElement;
    #tooltipEl!: HTMLElement;
    #nodeEls: Map<string, NodeEntry> = new Map();
    #edgeEls: Map<string, SVGPathElement> = new Map();
    #lastPos: Map<string, PlacedPoint> = new Map();
    #ownLightbox: (HTMLElement & { payload: unknown; open: boolean }) | null = null;
    #hoverId: string | null = null;

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
      this.#svg = this.shadowRoot!.querySelector<SVGSVGElement>('.canvas')!;
      this.#tooltipEl = this.shadowRoot!.querySelector<HTMLElement>('.oc-tooltip')!;
      this.#rootEl.addEventListener('click', this.#onClick);
      this.#rootEl.addEventListener('mousemove', this.#onMouseMove as EventListener);
      this.#rootEl.addEventListener('mouseleave', this.#onMouseLeave as EventListener);
    }

    connectedCallback(): void {
      this.#mounted = true;
      this.#readData();
      this.#render();
    }

    attributeChangedCallback(): void {
      if (this.#mounted) this.#render();
    }

    get isViewer(): boolean { return this.getAttribute('color') === 'viewer'; }

    get payload(): OrgNode[] { return this.#rawData; }
    set payload(v: OrgPayload) {
      this.#payloadOverride = v;
      if (this.#mounted) {
        this.#readData();
        this.#render();
      }
    }

    expand(id: string): void { this.#collapsed.delete(id); this.#render(); }
    collapse(id: string): void { this.#collapsed.add(id); this.#render(); }
    toggle(id: string): void {
      if (this.#collapsed.has(id)) this.#collapsed.delete(id);
      else this.#collapsed.add(id);
      this.#render();
    }

    #readData(): void {
      this.#nodes = new Map();
      this.#children = new Map();
      let data: OrgNode[] = [];
      const p = this.#payloadOverride;
      if (p != null) {
        if (Array.isArray(p)) data = p;
        else if (Array.isArray(p.nodes)) data = p.nodes;
      } else {
        const script = [...this.children].find((c): c is HTMLScriptElement =>
          c.tagName === 'SCRIPT' && /json/i.test((c as HTMLScriptElement).type || ''));
        if (script) {
          try {
            const parsed: unknown = JSON.parse(script.textContent ?? '');
            data = Array.isArray(parsed) ? (parsed as OrgNode[]) : [];
          } catch { data = []; }
        }
      }
      this.#rawData = data;
      for (const n of data) this.#nodes.set(n.id, n);
      for (const n of data) {
        const parent: string = n.parent ?? '';
        if (!this.#children.has(parent)) this.#children.set(parent, []);
        this.#children.get(parent)!.push(n.id);
      }
      // el primer nodo sin parent es la raíz
      const root = data.find((n) => !n.parent) ?? data[0];
      this.#root = root?.id ?? null;
    }

    #render(): void {
      const nodeW = Number(this.getAttribute('node-width')) || 200;
      const nodeH = Number(this.getAttribute('node-height')) || 78;
      const gap = Number(this.getAttribute('gap')) || 28;

      this.#svg.setAttribute('preserveAspectRatio', 'xMidYMin meet');
      this.#svg.style.cssText = 'width:100%;height:100%;max-width:none;display:block';
      this.#svg.removeAttribute('width');
      this.#svg.removeAttribute('height');
      this.#rootEl.classList.toggle('is-viewer', this.isViewer);

      // Recolectar subárboles visibles (post-collapse)
      const visible = new Set<string>(this.#root ? [this.#root] : []);
      const queue: Array<string | null> = this.#root ? [this.#root] : [];
      while (queue.length) {
        const id = queue.shift()!;
        if (this.#collapsed.has(id)) continue;
        const kids = this.#children.get(id) || [];
        for (const k of kids) {
          if (this.#nodes.has(k)) { visible.add(k); queue.push(k); }
        }
      }

      // Layout por niveles (Reingold-Tilford simplificado: anchura fija por hoja).
      // Cada hoja reclama su propio carril (LEAF_W); cada padre se centra sobre
      // el punto medio de sus hijos. El layout se guarda en ejes "hoja/depth"
      // y se traduce a píxeles según `direction` (down | right | up).
      const layout = new Map<string, LayoutPoint>();
      const LEAF_W = nodeW + gap;
      const LEAF_H = nodeH + 48;
      let leafIndex = 0;

      const place = (id: string, depth: number): LayoutPoint => {
        const kids = (this.#children.get(id) || []).filter((k) => visible.has(k));
        if (!kids.length || this.#collapsed.has(id)) {
          const lane = leafIndex * LEAF_W;
          leafIndex += 1;
          const p: LayoutPoint = { x: lane, y: depth * LEAF_H };
          layout.set(id, p);
          return p;
        }
        const childPos = kids.map((k) => place(k, depth + 1));
        const minX = Math.min(...childPos.map((p) => p.x));
        const maxX = Math.max(...childPos.map((p) => p.x));
        const cx = (minX + maxX) / 2;
        const p: LayoutPoint = { x: cx, y: depth * LEAF_H };
        layout.set(id, p);
        return p;
      };

      if (this.#root && visible.has(this.#root)) place(this.#root, 0);

      // Traducir carriles/profundidades a coordenadas TOP-LEFT según la
      // dirección pedida: down (default) | right | up. Las tarjetas se anclan
      // por su esquina (el <g> se traduce a tx/ty), así que aquí NO se suma
      // nodeW/2 — el margen izquierdo de 60 ya deja sitio a la primera tarjeta.
      const dir = String(this.getAttribute('direction') || 'down');
      const horizontal = dir === 'right';
      const verticalFlip = dir === 'up';
      const vals = [...layout.values()];
      const minLane = vals.length ? Math.min(...vals.map((p) => p.x / LEAF_W)) : 0;
      const depthCount = vals.length ? Math.max(...vals.map((p) => Math.round(p.y / LEAF_H))) + 1 : 1;
      const laneSep = horizontal ? nodeH + gap : nodeW + gap;   // carriles
      const depthSep = horizontal ? nodeW + 48 : nodeH + 48;    // niveles
      const next = new Map<string, PlacedPoint>();
      for (const [id, p] of layout) {
        const lane = p.x / LEAF_W - minLane;
        const depth = Math.round(p.y / LEAF_H);
        const x = horizontal
          ? 60 + depth * depthSep
          : 60 + lane * laneSep;
        const y = horizontal
          ? 60 + lane * laneSep
          : (verticalFlip ? (depthCount - 1 - depth) * depthSep : depth * depthSep);
        next.set(id, { x, y, lane, depth });
      }

      this.#reconcileEdges(next, nodeW, nodeH, visible, horizontal);
      this.#reconcileNodes(next, nodeW, nodeH, visible);

      const maxX = vals.length ? Math.max(...[...next.values()].map((p) => p.x)) : 0;
      const maxY = vals.length ? Math.max(...[...next.values()].map((p) => p.y)) : 0;
      const contentW = Math.max(320, maxX + nodeW + 60);
      const contentH = Math.max(240, maxY + nodeH + 60);
      this.#svg.setAttribute('viewBox', `0 0 ${contentW} ${contentH}`);
      this.#lastPos = next;
    }

    /** Aristas: se re-derivan por clave `parent->hijo`, reconciliando en vez de
     *  recrear, así el CSS `transition: d` las anima cuando cambian de forma. */
    #reconcileEdges(
      layout: Map<string, PlacedPoint>,
      nodeW: number,
      nodeH: number,
      visible: Set<string>,
      horizontal: boolean,
    ): void {
      const seen = new Set<string>();
      for (const [id, pos] of layout) {
        const parent = this.#nodes.get(id)?.parent;
        if (!parent || !visible.has(parent)) continue;
        const key = `${parent}>${id}`;
        seen.add(key);
        const p = layout.get(parent);
        if (!p) continue;
        let d: string;
        if (horizontal) {
          // Derecha: sale del borde derecho del padre y entra por la izquierda.
          const x1 = p.x + nodeW;
          const y1 = p.y + nodeH / 2;
          const x2 = pos.x;
          const y2 = pos.y + nodeH / 2;
          d = `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}`;
        } else {
          // Vertical (down/up): sale del borde inferior del padre y entra por
          // arriba del hijo (las coordenadas ya vienen volteadas para `up`).
          const x1 = p.x + nodeW / 2;
          const y1 = p.y + nodeH;
          const x2 = pos.x + nodeW / 2;
          const y2 = pos.y;
          d = `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}`;
        }
        let path = this.#edgeEls.get(key);
        if (!path) {
          path = svgEl('path', { class: 'edge', fill: 'none', d }) as SVGPathElement;
          path.style.opacity = '0';
          this.#svg.insertBefore(path, this.#svg.firstChild);
          this.#edgeEls.set(key, path);
          requestAnimationFrame(() => { path!.style.opacity = ''; });
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
    #reconcileNodes(
      layout: Map<string, PlacedPoint>,
      nodeW: number,
      nodeH: number,
      visible: Set<string>,
    ): void {
      const seen = new Set<string>();
      for (const [id, pos] of layout) {
        seen.add(id);
        const tx = pos.x;
        const ty = pos.y;
        let entry = this.#nodeEls.get(id);
        if (!entry) {
          entry = this.#createNodeEl(id, nodeW, nodeH);
          this.#svg.appendChild(entry.g);
          this.#nodeEls.set(id, entry);
          const anchor = this.#lastPos.get(this.#nodes.get(id)?.parent ?? '');
          const startTx = anchor ? anchor.x : tx;
          const startTy = anchor ? anchor.y : ty;
          entry.g.style.opacity = '0';
          entry.g.setAttribute('transform', `translate(${startTx}, ${startTy})`);
          // Reflow forzado: sin esto el navegador colapsa el estado inicial
          // y el destino con la posición final en el mismo frame (sin transición).
          void entry.g.getBoundingClientRect();
          requestAnimationFrame(() => {
            entry!.g.style.opacity = '';
            entry!.g.setAttribute('transform', `translate(${tx}, ${ty})`);
          });
        } else {
          entry.g.setAttribute('transform', `translate(${tx}, ${ty})`);
        }
        this.#updateNodeCard(entry, id);
      }

      for (const [id, entry] of this.#nodeEls) {
        if (seen.has(id)) continue;
        const node = this.#nodes.get(id);
        const anchor = this.#lastPos.get(node?.parent ?? '') || this.#lastPos.get(id);
        if (anchor) entry.g.setAttribute('transform', `translate(${anchor.x}, ${anchor.y})`);
        entry.g.style.opacity = '0';
        this.#nodeEls.delete(id);
        const g = entry.g;
        setTimeout(() => g.remove(), MOVE_MS);
      }
    }

    #createNodeEl(id: string, nodeW: number, nodeH: number): NodeEntry {
      const g = svgEl('g', { class: 'node', 'data-id': id }) as SVGGElement;
      const card = svgEl('foreignObject', { x: 0, y: 0, width: nodeW, height: nodeH }) as SVGForeignObjectElement;
      const wrap = document.createElement('div');
      wrap.className = 'card';
      card.appendChild(wrap);
      g.appendChild(card);
      return { g, card, wrap };
    }

    #updateNodeCard(entry: NodeEntry, id: string): void {
      const node = this.#nodes.get(id);
      if (!node) return;
      const hasKids = (this.#children.get(id) || []).length > 0;
      const collapsed = this.#collapsed.has(id);
      const detail = node.detail || node.tooltip || '';
      entry.wrap.innerHTML = `
        ${node.photo ? `<img class="photo" src="${escapeHtml(node.photo)}" alt="">` : `<span class="photo photo--fallback">${escapeHtml(initialsOf(node.name || node.id))}</span>`}
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

    #onClick = (e: PointerEvent): void => {
      const path = e.composedPath();
      const isToggle = (n: EventTarget | null): n is HTMLElement =>
        n instanceof HTMLElement && n.classList.contains('toggle');
      const isNodeG = (n: EventTarget | null): n is HTMLElement =>
        n instanceof HTMLElement && !!n.dataset.id;
      const toggleBtn = path.find(isToggle);
      const nodeG = path.find(isNodeG);
      if (toggleBtn && nodeG) {
        const id = nodeG.dataset.id!;
        this.toggle(id);
        emit(this, 'is-toggle', { id, collapsed: this.#collapsed.has(id) });
        return;
      }
      if (nodeG) {
        const id = nodeG.dataset.id!;
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

    async #openOwnViewer(): Promise<void> {
      await import('./diagram-lightbox.js');
      let lb = this.#ownLightbox;
      if (!lb || !lb.isConnected) {
        lb = document.createElement('is-diagram-lightbox') as HTMLElement & { payload: unknown; open: boolean };
        lb.setAttribute('kind', 'org-chart');
        lb.addEventListener('is-after-hide', () => lb!.remove());
        document.body.appendChild(lb);
        this.#ownLightbox = lb;
      }
      lb.payload = this.#rawData;
      lb.open = true;
    }

    #onMouseMove = (e: PointerEvent): void => {
      const isNodeG = (n: EventTarget | null): n is HTMLElement =>
        n instanceof HTMLElement && !!n.dataset.id;
      const g = e.composedPath().find(isNodeG);
      const id: string | null = g?.dataset.id ?? null;
      if (id !== this.#hoverId) this.#applyHover(id);
      if (id) {
        const rect = this.#rootEl.getBoundingClientRect();
        const left = Math.max(8, Math.min(rect.width - 280, e.clientX - rect.left + 16));
        this.#tooltipEl.style.left = `${left}px`;
        this.#tooltipEl.style.top = `${e.clientY - rect.top + 22}px`;
      }
    };

    #onMouseLeave = (): void => { this.#applyHover(null); };

    #applyHover(id: string | null): void {
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
