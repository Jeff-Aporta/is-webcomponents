import { adoptCss } from '../_shared/adopt-css.js';
import { loadChartJs } from '../_shared/chart-js.js';

/**
 * <is-chart> — wrapper themed sobre Chart.js.
 *
 * Datos: propiedad `config` o <script type="application/json"> hijo.
 *
 * Atributos
 *   type, label, legend-position, index-axis, min, max, grid,
 *   stacked, without-animation, without-legend, without-tooltip,
 *   x-label, y-label
 *
 * Propiedad: chart (instancia Chart.js), config, plugins
 * CSS: --fill-color-1..6, --border-color-1..6, --grid-color
 */

(() => {
  const OBSERVED = [
    'type', 'label', 'legend-position', 'index-axis', 'min', 'max', 'grid',
    'stacked', 'without-animation', 'without-legend', 'without-tooltip',
    'x-label', 'y-label',
  ];

  const FILL_KEYS = [1, 2, 3, 4, 5, 6].map((i) => `--fill-color-${i}`);
  const BORDER_KEYS = [1, 2, 3, 4, 5, 6].map((i) => `--border-color-${i}`);
  const FALLBACK_BORDER = ['#339af0', '#e64980', '#40c057', '#fab005', '#7950f2', '#fd7e14'];
  const FALLBACK_FILL = [
    'rgba(51, 154, 240, 0.4)',
    'rgba(230, 73, 128, 0.4)',
    'rgba(64, 192, 87, 0.4)',
    'rgba(250, 176, 5, 0.4)',
    'rgba(121, 80, 242, 0.4)',
    'rgba(253, 126, 20, 0.4)',
  ];

  function deepMerge(a, b) {
    if (!b) return a ? structuredClone(a) : {};
    if (!a) return structuredClone(b);
    const out = Array.isArray(a) ? [...a] : { ...a };
    for (const [k, v] of Object.entries(b)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
        out[k] = deepMerge(out[k], v);
      } else {
        out[k] = Array.isArray(v) ? [...v] : v;
      }
    }
    return out;
  }

  function resolveCssColor(el, value, fallback) {
    if (typeof value !== 'string' || !value) return fallback;
    if (!value.includes('var(') && !value.includes('color-mix(')) return value;
    const probe = document.createElement('span');
    probe.style.color = value;
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    el.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    if (!resolved || resolved === 'rgba(0, 0, 0, 0)' || resolved === 'transparent') return fallback;
    return resolved;
  }

  function paintColors(el, datasets, chartType) {
    if (!datasets?.length) return datasets;
    const cs = getComputedStyle(el);
    const fillsRaw = FILL_KEYS.map((k) => cs.getPropertyValue(k).trim()).filter(Boolean);
    const bordersRaw = BORDER_KEYS.map((k) => cs.getPropertyValue(k).trim()).filter(Boolean);
    const fills = fillsRaw.length ? fillsRaw : FALLBACK_FILL;
    const borders = bordersRaw.length ? bordersRaw : FALLBACK_BORDER;
    const sliceTypes = new Set(['pie', 'doughnut', 'polarArea']);
    const pointTypes = new Set(['radar', 'line', 'scatter', 'bubble']);
    const pointRadius = Number(cs.getPropertyValue('--point-radius').trim()) || 3;
    const lineWidth = Number(cs.getPropertyValue('--line-border-width').trim()) || 2;
    const arcWidth = Number(cs.getPropertyValue('--border-width').trim()) || 1;

    return datasets.map((ds, i) => {
      const next = { ...ds };
      const n = Array.isArray(next.data) ? next.data.length : 0;
      const useSlices = sliceTypes.has(chartType) && n > 1;
      const fillFb = FALLBACK_FILL[i % FALLBACK_FILL.length];
      const borderFb = FALLBACK_BORDER[i % FALLBACK_BORDER.length];

      if (next.backgroundColor == null) {
        if (useSlices) {
          next.backgroundColor = Array.from({ length: n }, (_, j) =>
            resolveCssColor(el, fills[j % fills.length], FALLBACK_FILL[j % FALLBACK_FILL.length]));
        } else {
          next.backgroundColor = resolveCssColor(el, fills[i % fills.length], fillFb);
        }
      } else if (typeof next.backgroundColor === 'string') {
        next.backgroundColor = resolveCssColor(el, next.backgroundColor, fillFb);
      } else if (Array.isArray(next.backgroundColor)) {
        next.backgroundColor = next.backgroundColor.map((c, j) =>
          resolveCssColor(el, c, FALLBACK_FILL[j % FALLBACK_FILL.length]));
      }

      if (next.borderColor == null) {
        if (useSlices) {
          next.borderColor = Array.from({ length: n }, (_, j) =>
            resolveCssColor(el, borders[j % borders.length], FALLBACK_BORDER[j % FALLBACK_BORDER.length]));
        } else {
          next.borderColor = resolveCssColor(el, borders[i % borders.length], borderFb);
        }
      } else if (typeof next.borderColor === 'string') {
        next.borderColor = resolveCssColor(el, next.borderColor, borderFb);
      } else if (Array.isArray(next.borderColor)) {
        next.borderColor = next.borderColor.map((c, j) =>
          resolveCssColor(el, c, FALLBACK_BORDER[j % FALLBACK_BORDER.length]));
      }

      if (chartType === 'radar' && next.fill == null) next.fill = true;
      if (pointTypes.has(chartType)) {
        if (next.pointBackgroundColor == null) next.pointBackgroundColor = next.borderColor;
        if (next.pointBorderColor == null) next.pointBorderColor = next.borderColor;
        if (next.pointRadius == null) next.pointRadius = pointRadius;
        if (next.borderWidth == null) next.borderWidth = chartType === 'radar' || chartType === 'line' ? lineWidth : arcWidth;
      } else if (next.borderWidth == null && (sliceTypes.has(chartType) || chartType === 'bar')) {
        next.borderWidth = arcWidth;
      }

      return next;
    });
  }

  class IsChart extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }
    static fixedType = null;
    /** URL del módulo cuya hermana .css se adopta; typed charts pueden override. */
    static styleModuleUrl = null;

    #canvas;
    #chart = null;
    #config = null;
    #plugins = [];
    #mounted = false;
    #ro = null;
    #mo = null;
    #themeObs = null;
    #fixedType = null;
    #renderQueued = false;

    constructor() {
      super();
      this.#fixedType = this.constructor.fixedType || null;
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.innerHTML = /* html */ `
        <div part="base" class="wrap">
          <canvas part="canvas"></canvas>
          <div class="slot-hidden"><slot></slot></div>
        </div>
      `;
      adoptCss(shadow, this.constructor.styleModuleUrl || import.meta.url);
      this.#canvas = shadow.querySelector('canvas');
    }

    connectedCallback() {
      this.#mounted = true;
      if (this.#fixedType && !this.hasAttribute('type')) this.setAttribute('type', this.#fixedType);
      this.#readJsonSlot();
      this.#mo = new MutationObserver(() => this.#readJsonSlot());
      this.#mo.observe(this, { childList: true, characterData: true, subtree: true });
      this.#ro = new ResizeObserver(() => this.#chart?.resize());
      this.#ro.observe(this);
      this.#watchTheme();
      this.#queueRender();
    }

    disconnectedCallback() {
      this.#mounted = false;
      this.#ro?.disconnect();
      this.#mo?.disconnect();
      this.#themeObs?.disconnect();
      this.#destroy();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      this.#queueRender();
    }

    get chart() { return this.#chart; }

    get config() { return this.#config; }
    set config(v) {
      this.#config = v;
      this.#queueRender();
    }

    get plugins() { return this.#plugins; }
    set plugins(v) {
      this.#plugins = Array.isArray(v) ? v : [];
      this.#queueRender();
    }

    get type() {
      return this.getAttribute('type') || this.#fixedType || 'bar';
    }
    set type(v) {
      if (this.#fixedType) return;
      v == null || v === '' ? this.removeAttribute('type') : this.setAttribute('type', v);
    }

    async updateComplete() {
      await this.#queueRender();
    }

    #watchTheme() {
      const root = document.documentElement;
      this.#themeObs = new MutationObserver(() => this.#queueRender());
      this.#themeObs.observe(root, { attributes: true, attributeFilter: ['class', 'data-theme', 'data-palette'] });
    }

    #readJsonSlot() {
      const script = [...this.children].find((c) => c.tagName === 'SCRIPT' && /json/i.test(c.type || ''));
      if (!script) return;
      try {
        this.#config = JSON.parse(script.textContent.trim());
        this.#queueRender();
      } catch {
        /* ignore invalid JSON until fixed */
      }
    }

    #queueRender() {
      if (this.#renderQueued) return this.#renderQueued;
      this.#renderQueued = (async () => {
        await Promise.resolve();
        try {
          await this.#render();
        } finally {
          this.#renderQueued = false;
        }
      })();
      return this.#renderQueued;
    }

    #destroy() {
      if (this.#chart) {
        this.#chart.destroy();
        this.#chart = null;
      }
    }

    #buildOptions(userOptions = {}) {
      const cs = getComputedStyle(this);
      const text = cs.getPropertyValue('--chart-text').trim() || cs.color;
      const grid = cs.getPropertyValue('--grid-color').trim() || 'rgba(128,128,128,.25)';
      const legendPos = this.getAttribute('legend-position') || 'top';
      const indexAxis = this.getAttribute('index-axis') || 'x';
      const gridMode = this.getAttribute('grid') || 'both';
      const stacked = this.hasAttribute('stacked');
      const withoutAnim = this.hasAttribute('without-animation');
      const withoutLegend = this.hasAttribute('without-legend');
      const withoutTooltip = this.hasAttribute('without-tooltip');
      const xLabel = this.getAttribute('x-label');
      const yLabel = this.getAttribute('y-label');
      const minAttr = this.getAttribute('min');
      const maxAttr = this.getAttribute('max');
      const min = minAttr != null && minAttr !== '' ? Number(minAttr) : null;
      const max = maxAttr != null && maxAttr !== '' ? Number(maxAttr) : null;
      const label = this.getAttribute('label');

      const showXGrid = gridMode === 'both' || gridMode === 'x';
      const showYGrid = gridMode === 'both' || gridMode === 'y';

      const valueAxis = indexAxis === 'y' ? 'x' : 'y';
      const scales = {
        x: {
          stacked,
          title: { display: !!xLabel, text: xLabel || '', color: text },
          ticks: { color: text },
          grid: { display: showXGrid, color: grid },
          border: { color: grid },
        },
        y: {
          stacked,
          title: { display: !!yLabel, text: yLabel || '', color: text },
          ticks: { color: text },
          grid: { display: showYGrid, color: grid },
          border: { color: grid },
        },
      };
      if (min != null && Number.isFinite(min)) scales[valueAxis].min = min;
      if (max != null && Number.isFinite(max)) scales[valueAxis].max = max;

      const radialTypes = new Set(['pie', 'doughnut', 'polarArea', 'radar']);
      const type = this.type;
      const useScales = !radialTypes.has(type);

      const defaults = {
        responsive: true,
        maintainAspectRatio: false,
        animation: withoutAnim ? false : undefined,
        indexAxis,
        plugins: {
          legend: {
            display: !withoutLegend,
            position: legendPos === 'start' ? 'left' : legendPos === 'end' ? 'right' : legendPos,
            labels: { color: text },
          },
          tooltip: { enabled: !withoutTooltip },
          title: label ? { display: true, text: label, color: text } : undefined,
        },
        scales: useScales ? scales : undefined,
      };

      return deepMerge(defaults, userOptions);
    }

    async #render() {
      if (!this.#mounted || !this.#canvas) return;
      await Promise.all(
        [...this.shadowRoot.querySelectorAll('link[rel="stylesheet"]')].map((link) =>
          link.sheet
            ? Promise.resolve()
            : new Promise((resolve) => {
                link.addEventListener('load', resolve, { once: true });
                link.addEventListener('error', resolve, { once: true });
              }),
        ),
      );
      if (!this.#mounted) return;
      const Chart = await loadChartJs();
      if (!this.#mounted) return;

      const raw = this.#config ? structuredClone(this.#config) : { data: { labels: [], datasets: [] } };
      const type = this.#fixedType || raw.type || this.type || 'bar';
      if (this.#fixedType) raw.type = this.#fixedType;

      if (raw.data?.datasets) {
        raw.data.datasets = paintColors(this, raw.data.datasets, type);
      }

      const options = this.#buildOptions(raw.options || {});
      const cfg = {
        type,
        data: raw.data || { labels: [], datasets: [] },
        options,
        plugins: [...(this.#plugins || []), ...(raw.plugins || [])],
      };

      this.#destroy();
      this.#chart = new Chart(this.#canvas, cfg);
      this.dispatchEvent(new CustomEvent('is-render', { bubbles: true, composed: true, detail: { chart: this.#chart } }));
    }
  }

  /**
   * Factory for typed chart elements.
   * @param {string} [styleModuleUrl] — módulo cuya hermana .css se adopta (default: chart.css)
   */
  function defineTypedChart(tag, fixedType, styleModuleUrl) {
    class Typed extends IsChart {
      static fixedType = fixedType;
      static styleModuleUrl = styleModuleUrl || null;
    }
    if (!customElements.get(tag)) customElements.define(tag, Typed);
    const exportName = tag.replace(/^is-/, 'Is').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (typeof window !== 'undefined') window[exportName] = Typed;
    return Typed;
  }

  if (!customElements.get('is-chart')) customElements.define('is-chart', IsChart);
  if (typeof window !== 'undefined') {
    window.IsChart = IsChart;
    window.__isDefineTypedChart = defineTypedChart;
  }
})();
