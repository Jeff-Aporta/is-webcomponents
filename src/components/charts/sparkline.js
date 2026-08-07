import { adoptCss } from '../_shared/adopt-css.js';
import { pathLine, pathArea, roundedBarRect } from '../_shared/svg-chart-engine.js';
import { defineElement } from '../_shared/define.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

(() => {
  class IsSparkline extends HTMLElement {
    static get observedAttributes() {
      return ['values', 'data', 'type', 'label', 'variant', 'curve', 'trend'];
    }

    #svg;
    #data = [];
    #mounted = false;
    #ro = null;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.innerHTML = /* html */ `<div part="sparkline" class="wrap"><svg part="canvas" class="chart-svg"></svg></div>`;
      adoptCss(shadow, import.meta.url);
      this.#svg = shadow.querySelector('svg');
    }

    connectedCallback() {
      this.#mounted = true;
      this.#parseValuesAttr();
      this.#ro = new ResizeObserver(() => this.#render());
      this.#ro.observe(this);
      this.#render();
    }

    disconnectedCallback() {
      this.#mounted = false;
      this.#ro?.disconnect();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'values' || name === 'data') this.#parseValuesAttr();
      this.#render();
    }

    get data() { return this.#data; }
    set data(v) {
      this.#data = Array.isArray(v) ? v.map(Number).filter(Number.isFinite) : [];
      this.#render();
    }

    #parseValuesAttr() {
      const raw = this.getAttribute('data') ?? this.getAttribute('values');
      if (raw == null) return;
      this.#data = raw.split(/[\s,]+/).map(Number).filter(Number.isFinite);
    }

    #render() {
      if (!this.#mounted) return;
      const rect = this.getBoundingClientRect();
      const width = Math.max(rect.width, 1);
      const height = Math.max(rect.height, 1);
      this.#svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      while (this.#svg.firstChild) this.#svg.removeChild(this.#svg.firstChild);
      if (!this.#data.length) return;

      const cs = getComputedStyle(this);
      const border = cs.getPropertyValue('--line-color').trim() || '#339af0';
      const fill = cs.getPropertyValue('--fill-color-1').trim() || 'rgba(51,154,240,.35)';
      const lineWidth = Number(cs.getPropertyValue('--line-width').trim()) || 1.5;
      const type = this.getAttribute('type') === 'bar' ? 'bar' : 'line';
      const appearance = this.getAttribute('variant') || 'solid';
      const curve = this.getAttribute('curve') || 'linear';

      // El sparkline usa el rango propio de la serie: forzar el 0 aplanaría
      // series como [100, 102, 101] hasta volverlas una línea recta.
      const dataMin = Math.min(...this.#data);
      const dataMax = Math.max(...this.#data);
      const pad = 2;
      const inner = Math.max(height - pad * 2, 1);

      if (type === 'bar') {
        // Las barras sí se miden desde cero (o desde el mínimo si hay negativos).
        const base = Math.min(dataMin, 0);
        const span = (dataMax - base) || 1;
        const bw = (width - pad * 2) / this.#data.length;
        this.#data.forEach((v, i) => {
          const h = Math.max(((v - base) / span) * inner, 1);
          const x = pad + i * bw;
          const y = height - pad - h;
          const p = document.createElementNS(SVG_NS, 'path');
          p.setAttribute('d', roundedBarRect(x + 1, y, Math.max(bw - 2, 1), h, 2, 'top'));
          p.setAttribute('fill', border);
          this.#svg.appendChild(p);
        });
        return;
      }

      const span = (dataMax - dataMin) || 1;
      const min = dataMin;

      const points = this.#data.map((v, i) => ({
        x: pad + (i / Math.max(this.#data.length - 1, 1)) * (width - pad * 2),
        y: height - pad - ((v - min) / span) * inner,
      }));

      if (appearance !== 'line') {
        const area = document.createElementNS(SVG_NS, 'path');
        area.setAttribute('d', pathArea(points, height - pad, { curve }));
        area.setAttribute('stroke', 'none');
        if (appearance === 'gradient') {
          // El degradado parte del color sólido: con el fill ya translúcido
          // el resultado quedaba casi invisible.
          const gid = `sg${Math.random().toString(36).slice(2)}`;
          const defs = document.createElementNS(SVG_NS, 'defs');
          defs.innerHTML = `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="${border}" stop-opacity="0.35"/>
            <stop offset="1" stop-color="${border}" stop-opacity="0"/>
          </linearGradient>`;
          this.#svg.appendChild(defs);
          area.setAttribute('fill', `url(#${gid})`);
        } else {
          area.setAttribute('fill', fill);
        }
        this.#svg.appendChild(area);
      }

      const line = document.createElementNS(SVG_NS, 'path');
      line.setAttribute('d', pathLine(points, { curve }));
      line.setAttribute('stroke', border);
      line.setAttribute('stroke-width', String(lineWidth));
      line.setAttribute('class', 'spark-line');
      this.#svg.appendChild(line);

      // Punto final: ancla la lectura en el valor más reciente.
      const last = points[points.length - 1];
      const dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('cx', last.x);
      dot.setAttribute('cy', last.y);
      dot.setAttribute('r', String(Math.max(lineWidth, 1.5)));
      dot.setAttribute('fill', border);
      this.#svg.appendChild(dot);
    }
  }

  defineElement('is-sparkline', IsSparkline, 'IsSparkline');
})();
