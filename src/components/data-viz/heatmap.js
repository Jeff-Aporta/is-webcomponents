import { adoptCss } from '../_shared/adopt-css.js';
import { withStyleAttrs } from '../_shared/style-attrs.js';
import { niceTicks, scaleLinear, svgEl } from '../_shared/svg-chart-engine.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';

/**
 * <is-heatmap> — Mapa de calor: matriz de celdas coloreadas por valor numérico.
 *
 * Atributos
 *   x-label, y-label      títulos de los ejes
 *   color                 paleta de marca a usar: brand (default) | neutral |
 *                         success | warning | danger | red-blue (divergente)
 *   cell-radius           radio de las esquinas (default 2)
 *   show-values           boolean — escribe el número dentro de cada celda
 *   legend-position       top | bottom | start | end | none   (default right)
 *
 * Datos
 *   <script type="application/json"> con forma
 *   { xLabels: [...], yLabels: [...], data: [[v, v, ...], ...] }
 *   o bien { xLabels, yLabels, points: [{x, y, v}, ...] }
 *
 * Eventos
 *   is-cell-hover   detail: { x, y, value }
 *   is-render
 */
(() => {
  const OBSERVED = ['x-label', 'y-label', 'color', 'cell-radius', 'show-values', 'legend-position'];

  const COLORS = {
    brand:    ['#0f172a', ...intensitySteps('#5b9bff')],
    neutral:  ['#0f172a', ...intensitySteps('#94a3b8')],
    success:  ['#0f172a', ...intensitySteps('#22c55e')],
    warning:  ['#0f172a', ...intensitySteps('#eab308')],
    danger:   ['#0f172a', ...intensitySteps('#ef4444')],
    'red-blue': [...intensitySteps('#3b82f6').reverse(), ...intensitySteps('#ef4444')],
  };

  function intensitySteps(hex) {
    // 5 pasos de opacidad (0.15, 0.3, 0.5, 0.7, 0.9)
    return [0.18, 0.36, 0.55, 0.75, 0.95].map((a) => `color-mix(in srgb, ${hex} ${Math.round(a * 100)}%, var(--is-bg-elev))`);
  }

  class IsHeatmap extends withStyleAttrs(HTMLElement) {
    /** Personalización por atributo (ver `_shared/style-attrs.js`). */
    static styleAttrs = {
    'text-color': { prop: '--is-heatmap-text', onlyColorValues: true },
    'grid-color': { prop: '--is-heatmap-grid-color', onlyColorValues: true },
    };

    static get observedAttributes() { return [...OBSERVED, 'text-color', 'grid-color']; }

    #ro;
    #mo;
    #svg;
    #legendEl;
    #mounted = false;
    #config = null;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = /* html */ `
        <div part="root" class="root" data-legend="end">
          <svg part="canvas" class="chart-svg" role="img" aria-label="Mapa de calor"></svg>
          <div part="legend" class="legend" hidden></div>
        </div>
      `;
      adoptCss(this.shadowRoot, import.meta.url);
      this.#svg = this.shadowRoot.querySelector('.chart-svg');
      this.#legendEl = this.shadowRoot.querySelector('.legend');
      this.#svg.addEventListener('pointermove', (e) => this.#onHover(e));
      this.#svg.addEventListener('pointerleave', () => this.#clearHover());
    }

    connectedCallback() {
      super.connectedCallback();
      this.#mounted = true;
      this.#readJsonSlot();
      this.#mo = new MutationObserver(() => this.#readJsonSlot());
      this.#mo.observe(this, { childList: true, characterData: true, subtree: true });
      this.#ro = new ResizeObserver(() => this.#render());
      this.#ro.observe(this);
      this.#render();
    }

    disconnectedCallback() {
      this.#mounted = false;
      this.#mo?.disconnect();
      this.#ro?.disconnect();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      super.attributeChangedCallback(name, oldVal, newVal);
      if (!this.#mounted || oldVal === newVal) return;
      this.#render();
    }

    get config() { return this.#config; }
    set config(v) { this.#config = v || null; this.#render(); }

    #readJsonSlot() {
      const script = [...this.children].find((c) => c.tagName === 'SCRIPT' && /json/i.test(c.type || ''));
      if (!script) return;
      try {
        this.#config = JSON.parse(script.textContent);
        this.#render();
      } catch { /* noop */ }
    }

    #render() {
      if (!this.#mounted) return;
      const cfg = this.#config || {};
      const xLabels = cfg.xLabels || [];
      const yLabels = cfg.yLabels || [];
      // aceptar {xLabels, yLabels, points: [{x, y, v}]} o matrix
      let matrix;
      if (Array.isArray(cfg.data)) matrix = cfg.data;
      else if (Array.isArray(cfg.points)) {
        matrix = yLabels.map((_, y) => xLabels.map((_, x) => {
          const p = cfg.points.find((pt) => pt.x === xLabels[x] && pt.y === yLabels[y]);
          return p ? p.v : null;
        }));
      }
      matrix = matrix || [];
      const showLegend = !['none'].includes(this.getAttribute('legend-position') || 'end');
      this.shadowRoot.querySelector('.root').dataset.legend = this.getAttribute('legend-position') || 'end';

      const W = Math.max(this.#svg.getBoundingClientRect().width, 1);
      const H = Math.max(this.#svg.getBoundingClientRect().height, 1);
      this.#svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      while (this.#svg.firstChild) this.#svg.firstChild.remove();

      const cs = getComputedStyle(this);
      const text = cs.getPropertyValue('--chart-text').trim() || cs.color;
      const grid = cs.getPropertyValue('--grid-color').trim() || 'rgba(128,128,128,.18)';

      // calcular dominio
      const flat = matrix.flat().filter((v) => Number.isFinite(v));
      if (!flat.length) return;
      const min = Math.min(...flat);
      const max = Math.max(...flat);
      const ticks = niceTicks(min, max, 5);
      const domain = [ticks[0], ticks[ticks.length - 1]];

      const legendW = showLegend ? 70 : 0;
      const labelPadX = (xLabels[0]?.length || 4) * 6 + 12;
      const labelPadY = 18;
      const titleH = 22;
      const xTitleH = this.hasAttribute('x-label') ? 18 : 0;
      const yTitleW = this.hasAttribute('y-label') ? 14 : 0;

      const plot = {
        x: labelPadX + yTitleW,
        y: titleH + labelPadY,
        width: Math.max(W - (labelPadX + yTitleW) - 8 - legendW, 1),
        height: Math.max(H - (titleH + labelPadY) - 8 - xTitleH, 1),
      };
      if (xLabels.length) plot.width = Math.max(plot.width, xLabels.length * 14);
      if (yLabels.length) plot.height = Math.max(plot.height, yLabels.length * 14);

      const cellW = plot.width / Math.max(xLabels.length, 1);
      const cellH = plot.height / Math.max(yLabels.length, 1);
      const radius = Number(this.getAttribute('cell-radius')) || 2;

      // título X
      if (this.hasAttribute('x-label')) {
        const t = svgEl('text', { x: plot.x + plot.width / 2, y: H - 6, 'text-anchor': 'middle', class: 'axis-title' });
        t.textContent = this.getAttribute('x-label');
        t.style.fill = text;
        this.#svg.appendChild(t);
      }
      if (this.hasAttribute('y-label')) {
        const t = svgEl('text', { x: 10, y: plot.y + plot.height / 2, 'text-anchor': 'middle', class: 'axis-title', transform: `rotate(-90 10 ${plot.y + plot.height / 2})` });
        t.textContent = this.getAttribute('y-label');
        t.style.fill = text;
        this.#svg.appendChild(t);
      }
      // labels X (rotadas)
      xLabels.forEach((lb, i) => {
        const t = svgEl('text', { x: plot.x + cellW * i + cellW / 2, y: plot.y - 6, 'text-anchor': 'middle', class: 'tick-label' });
        t.textContent = String(lb);
        t.style.fill = text;
        this.#svg.appendChild(t);
      });
      // labels Y
      yLabels.forEach((lb, i) => {
        const t = svgEl('text', { x: plot.x - 4, y: plot.y + cellH * i + cellH / 2 + 4, 'text-anchor': 'end', class: 'tick-label' });
        t.textContent = String(lb);
        t.style.fill = text;
        this.#svg.appendChild(t);
      });

      // cells
      const paletteName = this.getAttribute('color') || 'brand';
      const palette = COLORS[paletteName] || COLORS.brand;

      matrix.forEach((row, y) => {
        row.forEach((v, x) => {
          if (!Number.isFinite(v)) return;
          const x0 = plot.x + x * cellW;
          const y0 = plot.y + y * cellH;
          const cell = svgEl('rect', {
            x: x0 + 1, y: y0 + 1,
            width: Math.max(cellW - 2, 1),
            height: Math.max(cellH - 2, 1),
            rx: radius, ry: radius,
            fill: colorFor(v, domain, palette),
            'data-x': xLabels[x] ?? x,
            'data-y': yLabels[y] ?? y,
            'data-v': v,
            class: 'cell',
          });
          this.#svg.appendChild(cell);
          if (this.hasAttribute('show-values')) {
            const t = svgEl('text', {
              x: x0 + cellW / 2, y: y0 + cellH / 2 + 4, 'text-anchor': 'middle', class: 'cell-val',
            });
            t.textContent = formatVal(v);
            t.style.fill = (v - domain[0]) / (domain[1] - domain[0] + 1e-9) > 0.5 ? 'var(--is-bg-elev)' : 'var(--is-text)';
            this.#svg.appendChild(t);
          }
        });
      });

      // legend
      this.#renderLegend(domain, palette, W - legendW + 6, plot.y, legendW - 12, plot.height);

      emit(this, 'is-render', { svg: this.#svg });
    }

    #renderLegend(domain, palette, x, y, w, h) {
      if (w <= 12) { this.#legendEl.hidden = true; this.#legendEl.innerHTML = ''; return; }
      this.#legendEl.hidden = false;
      this.#legendEl.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'legend-wrap';
      const grad = document.createElement('div');
      grad.className = 'legend-grad';
      grad.style.background = `linear-gradient(to bottom, ${palette[palette.length - 1]}, ${palette[0]})`;
      wrap.appendChild(grad);
      const ticks = niceTicks(domain[0], domain[1], 4);
      for (const tk of ticks) {
        const lbl = document.createElement('span');
        lbl.className = 'legend-tick';
        lbl.textContent = formatVal(tk);
        wrap.appendChild(lbl);
      }
      this.#legendEl.appendChild(wrap);
    }

    #onHover(e) {
      const cell = e.target.closest('.cell');
      if (!cell) return this.#clearHover();
      cell.classList.add('is-hover');
      const detail = { x: cell.dataset.x, y: cell.dataset.y, value: Number(cell.dataset.v) };
      emit(this, 'is-cell-hover', detail);
    }

    #clearHover() {
      this.#svg.querySelectorAll('.cell.is-hover').forEach((c) => c.classList.remove('is-hover'));
    }
  }

  function colorFor(v, [lo, hi], palette) {
    if (hi === lo) return palette[Math.floor(palette.length / 2)];
    const t = (v - lo) / (hi - lo);
    const idx = Math.min(palette.length - 1, Math.floor(t * palette.length));
    return palette[idx];
  }

  function formatVal(v) {
    if (Math.abs(v) >= 10000) return new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
    if (Number.isInteger(v)) return String(v);
    return Number(v.toFixed(2)).toString();
  }

  defineElement('is-heatmap', IsHeatmap);
})();
