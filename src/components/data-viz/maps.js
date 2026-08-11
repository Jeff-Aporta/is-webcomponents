import { adoptCss } from '../_shared/adopt-css.js';
import { withStyleAttrs } from '../_shared/style-attrs.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { svgEl } from '../_shared/svg-chart-engine.js';

/**
 * <is-maps> — Visualizador geográfico.
 *
 * Modo nativo (default): lienzo SVG que mapea coordenadas (lat, lon) a un
 * viewport interno mediante una proyección equirectangular. Permite
 * marcadores, zoom y pan, todo sin dependencias externas.
 *
 * Modo tile: atributo `engine="tile"` y un `<script type="application/json">`
 * con `{ tileUrl, attribution, zoom, center }` para apuntar a un proveedor
 * (OpenStreetMap, etc.) embebido vía iframe (no requiere libs en este bundle).
 *
 * Atributos
 *   viewbox       cuadro inicial: "minLon,minLat,maxLon,maxLat" (default mundo)
 *   zoom          zoom inicial 1..n para vista controlada por JS
 *   engine        svg | tile
 *   interactive   boolean — false desactiva pan/zoom (mostrar)
 *
 * Marcadores
 *   <is-map-marker lat="4.6" lon="-74.0" label="Bogotá">
 *     <span slot="popup">Capital de Colombia</span>
 *   </is-map-marker>
 *
 * Eventos
 *   is-viewport   detail: { minLon, minLat, maxLon, maxLat }
 *   is-marker-click  detail: { marker }
 */
(() => {
  const OBSERVED = ['viewbox', 'zoom', 'engine', 'interactive'];

  class IsMaps extends withStyleAttrs(HTMLElement) {
    /** Personalización por atributo (ver `_shared/style-attrs.js`). */
    static styleAttrs = {
    'grid-color': { prop: '--is-maps-grid-color', onlyColorValues: true },
    'meridian-color': { prop: '--is-maps-meridian-color', onlyColorValues: true },
    };

    static get observedAttributes() { return [...OBSERVED, 'grid-color', 'meridian-color']; }
    #mounted = false;
    #vp = { minLon: -180, minLat: -85, maxLon: 180, maxLat: 85 };
    #onWinPointerUp;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = /* html */ `
        <div part="root" class="root">
          <div class="zoom-info"></div>
          <div part="canvas" class="canvas"></div>
        </div>
      `;
      adoptCss(this.shadowRoot, import.meta.url);
      this.#canvas = this.shadowRoot.querySelector('.canvas');
      this.#zoomInfo = this.shadowRoot.querySelector('.zoom-info');
      this.#canvas.addEventListener('wheel', (e) => this.#onWheel(e), { passive: false });
      this.#canvas.addEventListener('pointerdown', (e) => this.#onDown(e));
      this.#canvas.addEventListener('pointermove', (e) => this.#onMove(e));
      this.#canvas.addEventListener('pointerup', (e) => this.#onUp(e));
      this.#onWinPointerUp = () => this.#endDrag();
    }

    connectedCallback() {
      super.connectedCallback();
      this.#mounted = true;
      this.#readViewbox();
      this.#render();
      this.#syncMarkers();
      window.addEventListener('pointerup', this.#onWinPointerUp);
    }

    disconnectedCallback() {
      this.#mounted = false;
      window.removeEventListener('pointerup', this.#onWinPointerUp);
    }

    attributeChangedCallback(name, oldVal, newVal) {
      super.attributeChangedCallback(name, oldVal, newVal);
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'viewbox') this.#readViewbox();
      this.#render();
    }

    #readViewbox() {
      const v = this.getAttribute('viewbox');
      if (!v) return;
      const parts = v.split(',').map(Number);
      if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return;
      const [a, b, c, d] = parts;
      this.#vp = { minLon: Math.min(a, c), maxLon: Math.max(a, c), minLat: Math.min(b, d), maxLat: Math.max(b, d) };
    }

    #engine() { return this.getAttribute('engine') || 'svg'; }

    #render() {
      this.#canvas.innerHTML = '';
      const engine = this.#engine();
      if (engine === 'tile') {
        this.#renderTile();
        return;
      }
      this.#renderSvg();
    }

    #renderTile() {
      const script = [...this.children].find((c) => c.tagName === 'SCRIPT' && /json/i.test(c.type || ''));
      let cfg = {};
      try { cfg = script ? JSON.parse(script.textContent) : {}; } catch {}
      const url = cfg.tileUrl || 'https://www.openstreetmap.org/export/embed.html';
      const iframe = document.createElement('iframe');
      iframe.className = 'tile-iframe';
      iframe.loading = 'lazy';
      iframe.title = 'Mapa';
      const params = [];
      if (cfg.bbox) params.push(`bbox=${cfg.bbox}`);
      if (typeof cfg.zoom === 'number') params.push(`zoom=${cfg.zoom}`);
      if (cfg.center) params.push(`center=${cfg.center}`);
      params.push('layer=mapnik');
      iframe.src = url + (url.includes('?') ? '&' : '?') + params.join('&');
      this.#canvas.appendChild(iframe);
      if (cfg.attribution) {
        const attr = document.createElement('small');
        attr.className = 'attribution';
        attr.innerHTML = cfg.attribution;
        this.#canvas.appendChild(attr);
      }
    }

    #renderSvg() {
      const W = Math.max(this.#canvas.clientWidth, 320);
      const H = Math.max(this.#canvas.clientHeight, 240);
      const svg = svgEl('svg', { class: 'map', width: W, height: H, viewBox: `0 0 ${W} ${H}` });
      this.#canvas.appendChild(svg);
      // caja informativa del viewport
      const info = svgEl('text', { x: 8, y: 16, class: 'vp-text' });
      info.textContent = `${this.#vp.minLon.toFixed(2)},${this.#vp.minLat.toFixed(2)} → ${this.#vp.maxLon.toFixed(2)},${this.#vp.maxLat.toFixed(2)}`;
      svg.appendChild(info);
      // rejilla
      const g = 12, gs = 5;
      for (let i = 1; i < gs; i++) {
        svg.appendChild(svgEl('line', { x1: (W * i) / gs, x2: (W * i) / gs, y1: 0, y2: H, class: 'grid' }));
        svg.appendChild(svgEl('line', { x1: 0, x2: W, y1: (H * i) / gs, y2: (H * i) / gs, class: 'grid' }));
      }
      // paralelos/meridianos cada g grados
      for (let lat = Math.floor(this.#vp.minLat / g) * g; lat <= this.#vp.maxLat; lat += g) {
        const y = this.#project(lat, this.#vp.minLon, W, H).y;
        svg.appendChild(svgEl('line', { x1: 0, x2: W, y1: y, y2: y, class: 'meridian' }));
        svg.appendChild(svgEl('text', { x: 4, y: y - 2, class: 'tick' })).textContent = `${lat}°`;
      }
      for (let lon = Math.floor(this.#vp.minLon / g) * g; lon <= this.#vp.maxLon; lon += g) {
        const x = this.#project(this.#vp.minLat, lon, W, H).x;
        svg.appendChild(svgEl('line', { x1: x, x2: x, y1: 0, y2: H, class: 'meridian' }));
        svg.appendChild(svgEl('text', { x: x + 4, y: 12, class: 'tick' })).textContent = `${lon}°`;
      }
      // markers
      this.#syncMarkers();
      this.#emit();
    }

    #project(lat, lon, W, H) {
      const x = ((lon - this.#vp.minLon) / (this.#vp.maxLon - this.#vp.minLon)) * W;
      // invertir lat (Y crece hacia abajo)
      const y = (1 - (lat - this.#vp.minLat) / (this.#vp.maxLat - this.#vp.minLat)) * H;
      return { x, y };
    }

    #syncMarkers() {
      const svg = this.shadowRoot.querySelector('svg.map');
      if (!svg) return;
      const W = +svg.getAttribute('width');
      const H = +svg.getAttribute('height');
      const markers = [...this.querySelectorAll(':scope > is-map-marker')];
      for (const m of markers) {
        const lat = Number(m.getAttribute('lat'));
        const lon = Number(m.getAttribute('lon'));
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        const p = this.#project(lat, lon, W, H);
        const c = svgEl('circle', { cx: p.x, cy: p.y, r: 6, class: 'marker' });
        c.addEventListener('click', () => emit(this, 'is-marker-click', { marker: m }));
        svg.appendChild(c);
        const label = m.getAttribute('label');
        if (label) {
          const t = svgEl('text', { x: p.x + 8, y: p.y + 4, class: 'marker-label' });
          t.textContent = label;
          svg.appendChild(t);
        }
      }
    }

    #onWheel(e) {
      if (this.#engine() !== 'svg' || !this.hasAttribute('interactive')) return;
      e.preventDefault();
      const z = Math.exp(-e.deltaY * 0.001);
      const W = this.#canvas.clientWidth;
      const H = this.#canvas.clientHeight;
      // punto actual bajo cursor → en mapa
      const r = this.#canvas.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      const lonAt = this.#vp.minLon + (mx / W) * (this.#vp.maxLon - this.#vp.minLon);
      const latAt = this.#vp.maxLat - (my / H) * (this.#vp.maxLat - this.#vp.minLat);
      const w = this.#vp.maxLon - this.#vp.minLon;
      const h = this.#vp.maxLat - this.#vp.minLat;
      const newW = w * z;
      const newH = h * z;
      const fracX = (lonAt - this.#vp.minLon) / w;
      const fracY = (this.#vp.maxLat - latAt) / h;
      this.#vp = {
        minLon: lonAt - fracX * newW,
        maxLon: lonAt + (1 - fracX) * newW,
        minLat: latAt - (1 - fracY) * newH,
        maxLat: latAt + fracY * newH,
      };
      this.#render();
    }

    #onDown(e) {
      if (this.#engine() !== 'svg' || !this.hasAttribute('interactive')) return;
      this.#drag = { x: e.clientX, y: e.clientY, start: { ...this.#vp } };
      this.#canvas.style.cursor = 'grabbing';
    }
    #onMove(e) {
      if (!this.#drag) return;
      const W = this.#canvas.clientWidth;
      const H = this.#canvas.clientHeight;
      const dx = e.clientX - this.#drag.x;
      const dy = e.clientY - this.#drag.y;
      const w = this.#drag.start.maxLon - this.#drag.start.minLon;
      const h = this.#drag.start.maxLat - this.#drag.start.minLat;
      this.#vp = {
        minLon: this.#drag.start.minLon - (dx / W) * w,
        maxLon: this.#drag.start.maxLon - (dx / W) * w,
        minLat: this.#drag.start.minLat + (dy / H) * h,
        maxLat: this.#drag.start.maxLat + (dy / H) * h,
      };
      this.#render();
    }
    #onUp() { this.#endDrag(); }
    #endDrag() { this.#drag = null; this.#canvas.style.cursor = ''; }
    #drag = null;

    #emit() {
      emit(this, 'is-viewport', { ...this.#vp });
    }

    #canvas;
    #zoomInfo;
  }

  defineElement('is-maps', IsMaps);

  class IsMapMarker extends HTMLElement {
    static get observedAttributes() { return ['lat', 'lon', 'label']; }
    connectedCallback() { /* re-sincroniza el padre cuando entra */ }
  }
  defineElement('is-map-marker', IsMapMarker);
})();
