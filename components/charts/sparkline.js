import { adoptCss } from '../_shared/adopt-css.js';
import { loadChartJs } from '../_shared/chart-js.js';

/**
 * <is-sparkline> — mini chart inline (estilo WA).
 *
 * Atributos: data | values, type (line|bar), appearance (solid|gradient|line),
 *            curve (linear|natural|step), trend (positive|negative|neutral), label
 */

(() => {
  function resolveColor(el, prop, fallback) {
    const raw = getComputedStyle(el).getPropertyValue(prop).trim() || fallback;
    if (!raw.includes('var(') && !raw.includes('color-mix(')) return raw;
    const probe = document.createElement('span');
    probe.style.color = raw;
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    el.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved && resolved !== 'rgba(0, 0, 0, 0)' ? resolved : fallback;
  }

  class IsSparkline extends HTMLElement {
    static get observedAttributes() {
      return ['values', 'data', 'type', 'label', 'appearance', 'curve', 'trend'];
    }

    #canvas;
    #chart = null;
    #data = [];
    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.innerHTML = /* html */ `<div part="sparkline" class="wrap"><canvas part="canvas"></canvas></div>`;
      adoptCss(shadow, import.meta.url);
      this.#canvas = shadow.querySelector('canvas');
    }

    connectedCallback() {
      this.#mounted = true;
      this.#parseValuesAttr();
      this.#render();
    }

    disconnectedCallback() {
      this.#mounted = false;
      this.#chart?.destroy();
      this.#chart = null;
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

    get chart() { return this.#chart; }

    #parseValuesAttr() {
      const raw = this.getAttribute('data') ?? this.getAttribute('values');
      if (raw == null) return;
      this.#data = raw.split(/[\s,]+/).map(Number).filter(Number.isFinite);
    }

    async #render() {
      if (!this.#mounted) return;
      const Chart = await loadChartJs();
      if (!this.#mounted) return;

      const fill = resolveColor(this, '--fill-color-1', 'rgba(51,154,240,.35)');
      const border = resolveColor(this, '--border-color-1', '#339af0')
        || resolveColor(this, '--line-color', '#339af0');
      const type = this.getAttribute('type') === 'bar' ? 'bar' : 'line';
      const appearance = this.getAttribute('appearance') || 'solid';
      const curve = this.getAttribute('curve') || 'linear';
      const label = this.getAttribute('label') || '';
      const lineWidth = Number(getComputedStyle(this).getPropertyValue('--line-width').trim()) || 1.5;

      let tension = 0.35;
      if (curve === 'linear') tension = 0;
      else if (curve === 'natural') tension = 0.4;
      else if (curve === 'step') tension = 0;

      const fillArea = appearance !== 'line' && type === 'line';
      let bg = fill;
      if (appearance === 'gradient' && type === 'line') {
        const ctx = this.#canvas.getContext('2d');
        const g = ctx.createLinearGradient(0, 0, 0, this.#canvas.height || 24);
        g.addColorStop(0, fill);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        bg = g;
      }

      this.#chart?.destroy();
      this.#chart = new Chart(this.#canvas, {
        type,
        data: {
          labels: this.#data.map((_, i) => String(i + 1)),
          datasets: [{
            label,
            data: this.#data,
            backgroundColor: type === 'bar' ? fill : bg,
            borderColor: border,
            borderWidth: lineWidth,
            pointRadius: 0,
            tension: curve === 'step' ? 0 : tension,
            stepped: curve === 'step',
            fill: fillArea,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: { legend: { display: false }, tooltip: { enabled: true } },
          scales: {
            x: { display: false },
            y: { display: false },
          },
        },
      });
    }
  }

  if (!customElements.get('is-sparkline')) customElements.define('is-sparkline', IsSparkline);
  if (typeof window !== 'undefined') window.IsSparkline = IsSparkline;
})();
