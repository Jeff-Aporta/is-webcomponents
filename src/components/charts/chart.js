import { adoptCss } from '../_shared/adopt-css.js';
import { withStyleAttrs } from '../_shared/style-attrs.js';
import { scaleLinear, scaleBand, niceTicks, svgEl } from '../_shared/svg-chart-engine.js';
import { getCategoricalColors, getFillColors } from '../_shared/chart-palette.js';
import { PathTurtle } from '../_shared/path-turtle.js';
import { registerDiagramKind } from '../diagrams/diagram-kinds.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { setStringAttr } from '../_shared/reflect.js';

/**
 * <is-chart> — motor de charts en SVG, sin dependencias.
 *
 * Consumo compatible con Chart.js: `config` (propiedad) o <script type="application/json">
 * hijo, con la forma `{ type, data: { labels, datasets }, options }`.
 *
 * Los atributos del elemento tienen precedencia sobre `options` cuando están presentes.
 *
 * Atributos: type, label, legend-position, index-axis, min, max, grid,
 *            stacked, without-animation, without-legend, without-tooltip, x-label, y-label
 * Propiedades: config, svg, chart (alias de svg)
 * Evento: is-render
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

const OBSERVED = [
  'type', 'label', 'legend-position', 'index-axis', 'min', 'max', 'grid',
  'stacked', 'without-animation', 'without-legend', 'without-tooltip',
  'x-label', 'y-label', 'color',
];

const RADIAL_TYPES = new Set(['pie', 'doughnut', 'polarArea', 'radar']);
/** Tipos cuya leyenda enumera las etiquetas (rebanadas), no los datasets. */
const SLICE_TYPES = new Set(['pie', 'doughnut', 'polarArea']);

/** drawMarks por tipo — lo llenan los elementos tipados; permite <is-chart type="..."> genérico. */
const MARK_REGISTRY = Object.create(null);

const compactFmt = new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 });
const plainFmt = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

/** Etiquetas de eje/tooltip legibles: 1.2M en vez de 1200000. */
function formatValue(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return String(v ?? '');
  return Math.abs(v) >= 10000 ? compactFmt.format(v) : plainFmt.format(v);
}

function numOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Lee un valor de dataset, que puede ser número o `{x, y}` / `{x, y, r}`. */
function valueOf(point) {
  if (point && typeof point === 'object') return Number(point.y);
  return Number(point);
}

function isNumericXY(datasets) {
  const first = datasets.find((d) => Array.isArray(d.data) && d.data.length)?.data?.[0];
  return !!first && typeof first === 'object' && 'x' in first;
}

class IsChart extends withStyleAttrs(HTMLElement) {
    /** Personalización por atributo (ver `_shared/style-attrs.js`). */
    static styleAttrs = {
      'text-color': { prop: '--chart-text', onlyColorValues: true },
      'muted-color': { prop: '--chart-muted', onlyColorValues: true },
      surface: { prop: '--chart-surface', onlyColorValues: true },
      'grid-color': { prop: '--is-chart-grid-color', onlyColorValues: true },
      'axis-color': { prop: '--chart-axis-color', onlyColorValues: true },
      'bar-radius': '--chart-bar-radius',
      'bar-gap': '--chart-bar-gap',
      'line-width': '--chart-line-width',
      'point-radius': '--chart-point-radius',
      'slice-gap': '--chart-slice-gap',
      'doughnut-ratio': '--chart-doughnut-ratio',
      'tick-size': '--chart-tick-size',
      'legend-size': '--chart-legend-size',
      'title-size': '--chart-title-size',
      'tooltip-size': '--chart-tooltip-size',
      // Slots de paleta: los consumen las variantes radiales (radar,
      // polar-area) además de las series de is-chart.
      'fill-1': { prop: '--fill-color-1', onlyColorValues: true },
      'fill-2': { prop: '--fill-color-2', onlyColorValues: true },
      'fill-3': { prop: '--fill-color-3', onlyColorValues: true },
      'fill-4': { prop: '--fill-color-4', onlyColorValues: true },
      'fill-5': { prop: '--fill-color-5', onlyColorValues: true },
      'fill-6': { prop: '--fill-color-6', onlyColorValues: true },
    };

  static get observedAttributes() { return [...OBSERVED, ...IsChart.styleAttrNames]; }
  static fixedType = null;
  static styleModuleUrl = null;
  static drawMarks = null;

  #wrap; #svg; #legendEl; #tooltipEl;
  #config = null;
  #mounted = false;
  #ro = null; #mo = null; #themeObs = null;
  #fixedType = null;
  #renderQueued = false;
  #hits = [];
  #hiddenSeries = new Set();
  #hiddenSlices = new Set();
  #marksGroup = null;
  #overlay = null;
  #activeHit = null;
  #tooltipEnabled = true;
  #turtle = null;
  #turtleGroup = null;
  #ownLightbox = null;

  constructor() {
    super();
    this.#fixedType = this.constructor.fixedType || null;
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = /* html */ `
      <div part="base" class="wrap">
        <svg part="canvas" class="chart-svg" role="img"></svg>
        <div part="legend" class="legend" hidden></div>
        <div part="tooltip" class="tooltip dg-tooltip" hidden role="status"></div>
        <div class="slot-hidden"><slot></slot></div>
      </div>
    `;
    adoptCss(shadow, this.constructor.styleModuleUrl || import.meta.url);
    this.#wrap = shadow.querySelector('.wrap');
    this.#svg = shadow.querySelector('.chart-svg');
    this.#legendEl = shadow.querySelector('.legend');
    this.#tooltipEl = shadow.querySelector('.tooltip');
    this.#svg.addEventListener('pointermove', (e) => this.#onPointerMove(e));
    this.#svg.addEventListener('pointerleave', () => this.#clearHover());
  }

  connectedCallback() {
    super.connectedCallback();
    this.#mounted = true;
    if (this.#fixedType && !this.hasAttribute('type')) this.setAttribute('type', this.#fixedType);
    this.#readJsonSlot();
    this.#mo = new MutationObserver(() => this.#readJsonSlot());
    this.#mo.observe(this, { childList: true, characterData: true, subtree: true });
    this.#ro = new ResizeObserver(() => this.#queueRender());
    this.#ro.observe(this);
    this.#watchTheme();
    this.#wrap.addEventListener('click', this.#onHostClick);
    this.#queueRender();
  }

  disconnectedCallback() {
    this.#mounted = false;
    this.#ro?.disconnect();
    this.#mo?.disconnect();
    this.#themeObs?.disconnect();
    this.#turtle?.destroy();
    this.#turtle = null;
    this.#wrap.removeEventListener('click', this.#onHostClick);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    super.attributeChangedCallback(name, oldVal, newVal);
    if (!this.#mounted || oldVal === newVal) return;
    this.#queueRender();
  }

  get svg() { return this.#svg; }
  /** Alias histórico: antes exponía la instancia de Chart.js. */
  get chart() { return this.#svg; }
  /** Alias de `config`: así el visor monta charts y diagramas por igual. */
  get payload() { return this.#config; }
  set payload(v) { this.config = v; }

  get isViewer() { return this.getAttribute('color') === 'viewer'; }
  get turtle() { return this.#turtle; }

  get config() { return this.#config; }
  set config(v) { this.#config = v; this.#hiddenSeries.clear(); this.#hiddenSlices.clear(); this.#queueRender(); }
  get type() { return this.getAttribute('type') || this.#fixedType || 'bar'; }
  set type(v) {
    if (this.#fixedType) return;
    setStringAttr(this, 'type', v);
  }

  async updateComplete() { await this.#queueRender(); }

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
    } catch { /* ignore invalid JSON until fixed */ }
  }

  #queueRender() {
    if (this.#renderQueued) return this.#renderQueued;
    this.#renderQueued = (async () => {
      await Promise.resolve();
      try { this.#render(); } finally { this.#renderQueued = false; }
    })();
    return this.#renderQueued;
  }

  /**
   * Resuelve las opciones efectivas. Precedencia: atributo del elemento >
   * `config.options` (forma Chart.js) > default.
   */
  #resolveOptions(userOptions, type) {
    const o = userOptions || {};
    const scales = o.scales || {};
    const plugins = o.plugins || {};
    const attr = (name) => (this.hasAttribute(name) ? this.getAttribute(name) : null);

    const indexAxis = attr('index-axis') ?? o.indexAxis ?? 'x';
    const horizontal = indexAxis === 'y';
    const valueAxisKey = horizontal ? 'x' : 'y';
    const valueScale = scales[valueAxisKey] || {};
    const catScale = scales[horizontal ? 'y' : 'x'] || {};

    const legendPlugin = plugins.legend || {};
    const titlePlugin = plugins.title || {};
    const tooltipPlugin = plugins.tooltip || {};

    const legendDisplay = this.hasAttribute('without-legend')
      ? false
      : legendPlugin.display !== undefined ? !!legendPlugin.display : null; // null = auto

    const rawMin = attr('min') ?? valueScale.min;
    const rawMax = attr('max') ?? valueScale.max;

    return {
      type,
      horizontal,
      stacked: this.hasAttribute('stacked') || !!valueScale.stacked || !!catScale.stacked,
      gridMode: attr('grid') ?? 'auto',
      min: rawMin === '' || rawMin == null ? null : numOr(rawMin, null),
      max: rawMax === '' || rawMax == null ? null : numOr(rawMax, null),
      beginAtZero: valueScale.beginAtZero !== false,
      animate: !this.hasAttribute('without-animation') && o.animation !== false,
      tooltip: !this.hasAttribute('without-tooltip') && tooltipPlugin.enabled !== false,
      legendDisplay,
      legendPosition: attr('legend-position') ?? legendPlugin.position ?? 'top',
      title: attr('label') ?? (titlePlugin.display === false ? null : titlePlugin.text ?? null),
      xLabel: attr('x-label') ?? scales.x?.title?.text ?? null,
      yLabel: attr('y-label') ?? scales.y?.title?.text ?? null,
      doughnutRatio: o.cutout != null ? parseFloat(o.cutout) / 100 : null,
    };
  }

  /** Colores por índice ORIGINAL de dataset, honrando overrides --border-color-N. */
  #resolveColors(count) {
    const cs = getComputedStyle(this);
    const base = getCategoricalColors(this, count);
    const baseFills = getFillColors(this, count);
    const colors = [];
    const fills = [];
    for (let i = 0; i < count; i++) {
      const borderOverride = cs.getPropertyValue(`--border-color-${i + 1}`).trim();
      const fillOverride = cs.getPropertyValue(`--fill-color-${i + 1}`).trim();
      colors.push(borderOverride || base[i % base.length]);
      fills.push(fillOverride || (borderOverride ? borderOverride : baseFills[i % baseFills.length]));
    }
    return { colors, fills };
  }

  #render() {
    if (!this.#mounted) return;

    const raw = this.#config || {};
    const type = this.#fixedType || raw.type || this.type;
    const data = raw.data || { labels: [], datasets: [] };
    const allDatasets = Array.isArray(data.datasets) ? data.datasets : [];
    const labels = Array.isArray(data.labels) ? data.labels : [];
    const opts = this.#resolveOptions(raw.options, type);

    const isRadial = RADIAL_TYPES.has(type);
    const isSlice = SLICE_TYPES.has(type);

    // Leyenda: en pie/doughnut/polarArea enumera las etiquetas; en el resto, los datasets.
    const legendEntries = isSlice
      ? labels.map((lb, i) => ({ label: String(lb), index: i, hidden: this.#hiddenSlices.has(i) }))
      : allDatasets.map((ds, i) => ({ label: ds.label || `Serie ${i + 1}`, index: i, hidden: this.#hiddenSeries.has(i) }));
    const autoLegend = legendEntries.length > 1;
    const showLegend = opts.legendDisplay === null ? autoLegend : opts.legendDisplay;

    this.#wrap.dataset.legend = showLegend ? opts.legendPosition : 'none';
    this.#wrap.dataset.theme = document.documentElement.classList.contains('theme-light') ? 'light' : 'dark';
    this.#wrap.classList.toggle('animate', opts.animate);
    this.#wrap.classList.toggle('is-viewer', this.isViewer);
    this.#tooltipEnabled = opts.tooltip;

    const { colors, fills } = this.#resolveColors(Math.max(isSlice ? labels.length : allDatasets.length, 1));

    // La leyenda debe existir antes de medir el SVG: ocupa espacio en el flex.
    if (showLegend) this.#renderLegend(legendEntries, colors, isSlice);
    else { this.#legendEl.hidden = true; this.#legendEl.innerHTML = ''; }

    const rect = this.#svg.getBoundingClientRect();
    const width = Math.max(rect.width, 1);
    const height = Math.max(rect.height, 1);
    this.#svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // El viewBox va 1:1 con los pixeles, asi que el SVG NO escala: al crecer,
    // el chart se re-maqueta en vez de ampliarse. Los tamanos de texto son em
    // sobre el font-size del host, que no cambia, de modo que en el visor a
    // pantalla completa las etiquetas quedaban diminutas frente a un grafico
    // 4x mas grande. Se ata el font-size base del SVG a su propia geometria
    // para que el texto sea proporcional al tamano de presentacion.
    // Exponente < 1 para amortiguar: crecer lineal dispara el texto en el visor.
    const basis = Math.min(width, height);
    const fontPx = Math.max(11, Math.min(26, 13 * (basis / 220) ** 0.55));
    this.#svg.style.fontSize = `${fontPx.toFixed(2)}px`;
    // La leyenda es HTML fuera del SVG: sin esto se queda diminuta en el visor.
    // Se aplica el mismo 0.75 de `--chart-legend-size`, que este inline pisa.
    this.#legendEl.style.fontSize = `${(fontPx * 0.75).toFixed(2)}px`;
    while (this.#svg.firstChild) this.#svg.removeChild(this.#svg.firstChild);
    this.#hits = [];
    this.#activeHit = null;

    const cs = getComputedStyle(this);
    const text = cs.getPropertyValue('--chart-text').trim() || cs.color;
    const grid = cs.getPropertyValue('--grid-color').trim() || 'rgba(128,128,128,.25)';
    const surface = cs.getPropertyValue('--chart-surface').trim() || 'transparent';

    const visibleDatasets = allDatasets
      .map((ds, i) => ({ ...ds, __i: i }))
      .filter((ds) => !this.#hiddenSeries.has(ds.__i));

    // Slices ocultos se filtran conservando el índice original para el color.
    const sliceMask = isSlice ? labels.map((_, i) => !this.#hiddenSlices.has(i)) : null;

    const hasData = visibleDatasets.some((d) => Array.isArray(d.data) && d.data.length);
    if (!hasData) {
      const t = svgEl('text', {
        x: width / 2, y: height / 2, 'text-anchor': 'middle', 'dominant-baseline': 'middle', class: 'empty',
      });
      t.textContent = 'Sin datos';
      this.#svg.appendChild(t);
      emit(this, 'is-render', { svg: this.#svg });
      return;
    }

    const titleH = opts.title ? 22 : 0;
    const margin = isRadial
      ? { top: titleH + 4, right: 8, bottom: 8, left: 8 }
      : {
          top: titleH + 8,
          right: 12,
          bottom: 26 + (opts.xLabel ? 18 : 0),
          left: 48 + (opts.yLabel ? 16 : 0),
        };
    if (isRadial && type === 'radar') {
      // Las etiquetas radiales necesitan aire alrededor del polígono.
      margin.right = 56; margin.left = 56; margin.bottom = 28; margin.top = titleH + 24;
    }
    if (!isRadial && opts.horizontal) {
      // Con barras horizontales el eje de categoría queda a la izquierda:
      // reserva ancho para la etiqueta más larga, sin comerse el plot.
      const longest = labels.reduce((max, lb) => Math.max(max, String(lb).length), 0);
      margin.left = Math.min(Math.max(longest * 6.5 + 16, 48), width * 0.4) + (opts.yLabel ? 16 : 0);
    }

    const plot = {
      x: margin.left,
      y: margin.top,
      width: Math.max(width - margin.left - margin.right, 1),
      height: Math.max(height - margin.top - margin.bottom, 1),
    };

    if (opts.title) {
      const t = svgEl('text', { x: width / 2, y: 15, 'text-anchor': 'middle', class: 'chart-title' });
      t.textContent = opts.title;
      this.#svg.appendChild(t);
    }

    const axesGroup = svgEl('g', { class: 'axes' });
    const group = svgEl('g', { class: 'marks' });
    const overlay = svgEl('g', { class: 'overlay' });
    this.#svg.appendChild(axesGroup);
    this.#svg.appendChild(group);
    this.#svg.appendChild(overlay);
    this.#marksGroup = group;
    this.#overlay = overlay;

    const style = {
      barRadius: numOr(cs.getPropertyValue('--chart-bar-radius').trim(), 4),
      barGap: numOr(cs.getPropertyValue('--chart-bar-gap').trim(), 2),
      lineWidth: numOr(cs.getPropertyValue('--chart-line-width').trim(), 2),
      pointRadius: numOr(cs.getPropertyValue('--chart-point-radius').trim(), 3),
      sliceGap: numOr(cs.getPropertyValue('--chart-slice-gap').trim(), 2),
    };

    const ctx = {
      svg: this.#svg, group, plot, width, height,
      data: { labels, datasets: visibleDatasets },
      sliceMask,
      colors, fills, text, grid, surface, style,
      opts,
      fmt: formatValue,
      addHit: (hit) => this.#hits.push(hit),
      scaleLinear, scaleBand, niceTicks,
    };

    // Se resuelve antes de los ejes: un tipo puede declarar su propio dominio
    // (la cascada, por ejemplo, se mide sobre el acumulado, no sobre los deltas).
    const drawMarks = this.constructor.drawMarks || MARK_REGISTRY[type];
    ctx.drawMarks = drawMarks;

    if (isRadial) {
      const pad = type === 'radar' ? 0 : 4;
      ctx.radial = {
        cx: plot.x + plot.width / 2,
        cy: plot.y + plot.height / 2,
        rMax: Math.max(Math.min(plot.width, plot.height) / 2 - pad, 4),
        innerRatio: opts.doughnutRatio ?? numOr(cs.getPropertyValue('--chart-doughnut-ratio').trim(), 0.62),
      };
    } else {
      this.#drawAxes(ctx, axesGroup, visibleDatasets);
    }

    if (typeof drawMarks === 'function') drawMarks(ctx);

    if (opts.animate) this.#primeLineAnimation(group);
    this.#mountTurtle(group, width, height, text);

    emit(this, 'is-render', { svg: this.#svg });
  }

  /**
   * Tortuga sobre las líneas dibujadas. Solo aplica donde hay un trazo que
   * recorrer (line/area/radar); en barras o rebanadas no hay ruta y se omite.
   */
  #mountTurtle(group, width, height, text) {
    const lines = [...group.querySelectorAll('.mark-line, .mark-radar')];
    this.#turtle?.destroy();
    this.#turtle = null;
    this.#turtleGroup?.remove();
    this.#turtleGroup = null;
    if (!lines.length) {
      emit(this, 'is-turtle-state', { playing: false, idx: 0, total: 0, replay: 0 });
      return;
    }

    this.#turtleGroup = svgEl('g');
    this.#svg.appendChild(this.#turtleGroup);
    this.#turtle = new PathTurtle(this.#turtleGroup);
    this.#turtle.setData({
      messages: lines.map((path, i) => ({
        path: path.getAttribute('d'),
        step: i + 1,
        log: path.dataset.seriesLabel || '',
        color: path.getAttribute('stroke'),
      })),
      theme: { accent: text },
      viewW: width,
      viewH: height,
      autoLoop: this.isViewer,
      onState: (state) => emit(this, 'is-turtle-state', state),
    });
  }

  /** Clic en colore inline: abre el visor a pantalla completa. */
  #onHostClick = () => {
    if (this.isViewer || !this.hasAttribute('open-on-click')) return;
    const ev = new CustomEvent('is-open-viewer', {
      bubbles: true, composed: true, cancelable: true, detail: { payload: this.#config },
    });
    this.dispatchEvent(ev);
    if (!ev.defaultPrevented) this.#openOwnViewer();
  };

  async #openOwnViewer() {
    await import('../diagrams/diagram-lightbox.js');
    let lb = this.#ownLightbox;
    if (!lb || !lb.isConnected) {
      lb = document.createElement('is-diagram-lightbox');
      lb.setAttribute('kind', this.type);
      lb.addEventListener('is-after-hide', () => lb.remove());
      document.body.appendChild(lb);
      this.#ownLightbox = lb;
    }
    // El visor monta <is-chart> genérico: el tipo debe viajar en el payload.
    lb.payload = { ...this.#config, type: this.type };
    lb.open = true;
  }

  /** Prepara el trazo progresivo de las líneas (dasharray = longitud del path). */
  #primeLineAnimation(group) {
    for (const path of group.querySelectorAll('.mark-line, .mark-radar')) {
      const len = typeof path.getTotalLength === 'function' ? path.getTotalLength() : 0;
      if (!len) continue;
      path.style.setProperty('--dash', String(len));
      path.style.strokeDasharray = String(len);
    }
  }

  #drawAxes(ctx, axesGroup, datasets) {
    const { plot, opts } = ctx;
    const horizontal = opts.horizontal;
    const numeric = isNumericXY(datasets);

    // --- Escala de valor -------------------------------------------------
    let values;
    if (opts.stacked && !numeric) {
      const len = ctx.data.labels.length;
      const totalsUp = new Array(len).fill(0);
      const totalsDown = new Array(len).fill(0);
      datasets.forEach((d) => d.data.forEach((raw, i) => {
        const v = valueOf(raw) || 0;
        if (v >= 0) totalsUp[i] += v; else totalsDown[i] += v;
      }));
      values = [...totalsUp, ...totalsDown];
    } else if (typeof ctx.drawMarks?.domainValues === 'function') {
      // El tipo sabe mejor que nadie qué rango ocupa realmente en el eje.
      values = ctx.drawMarks.domainValues(datasets, ctx.data.labels, opts).filter(Number.isFinite);
    } else {
      values = datasets.flatMap((d) => d.data.map(valueOf)).filter(Number.isFinite);
    }

    const dataMin = values.length ? Math.min(...values) : 0;
    const dataMax = values.length ? Math.max(...values) : 1;
    const vMin = opts.min ?? (opts.beginAtZero ? Math.min(0, dataMin) : dataMin);
    const vMax = opts.max ?? Math.max(dataMax, opts.beginAtZero ? 0 : dataMax);
    const vTicks = niceTicks(vMin, vMax, 5);
    const vDomain = [
      opts.min ?? vTicks[0],
      opts.max ?? vTicks[vTicks.length - 1],
    ];
    const vRange = horizontal
      ? [plot.x, plot.x + plot.width]
      : [plot.y + plot.height, plot.y];
    const vScale = scaleLinear(vDomain, vRange);

    // Grid: por defecto sólo el eje de valor (menos ruido).
    const mode = opts.gridMode;
    const valueGrid = mode === 'auto' || mode === 'both' || mode === (horizontal ? 'x' : 'y');
    const catGrid = mode === 'both' || mode === (horizontal ? 'y' : 'x');

    for (const tv of vTicks) {
      if (tv < vDomain[0] || tv > vDomain[1]) continue;
      const p = vScale(tv);
      if (valueGrid) {
        const line = horizontal
          ? svgEl('line', { x1: p, x2: p, y1: plot.y, y2: plot.y + plot.height, class: 'grid-line' })
          : svgEl('line', { x1: plot.x, x2: plot.x + plot.width, y1: p, y2: p, class: 'grid-line' });
        if (tv === 0 && vDomain[0] < 0) line.dataset.zero = 'true';
        axesGroup.appendChild(line);
      }
      const t = horizontal
        ? svgEl('text', { x: p, y: plot.y + plot.height + 16, 'text-anchor': 'middle', class: 'tick-label' })
        : svgEl('text', { x: plot.x - 10, y: p, 'text-anchor': 'end', 'dominant-baseline': 'middle', class: 'tick-label' });
      t.textContent = formatValue(tv);
      axesGroup.appendChild(t);
    }

    // --- Escala de categoría ---------------------------------------------
    if (numeric) {
      const xs = datasets.flatMap((d) => d.data.map((p) => Number(p.x))).filter(Number.isFinite);
      const xTicks = niceTicks(Math.min(...xs), Math.max(...xs), 5);
      const xScale = scaleLinear([xTicks[0], xTicks[xTicks.length - 1]], [plot.x, plot.x + plot.width]);
      for (const tv of xTicks) {
        const x = xScale(tv);
        const line = svgEl('line', { x1: x, x2: x, y1: plot.y, y2: plot.y + plot.height, class: 'grid-line' });
        axesGroup.appendChild(line);
        const t = svgEl('text', { x, y: plot.y + plot.height + 16, 'text-anchor': 'middle', class: 'tick-label' });
        t.textContent = formatValue(tv);
        axesGroup.appendChild(t);
      }
      ctx.numeric = true;
      ctx.xScale = xScale;
      ctx.yScale = vScale;
    } else {
      const labels = ctx.data.labels;
      const catRange = horizontal ? [plot.y, plot.y + plot.height] : [plot.x, plot.x + plot.width];
      const band = scaleBand(labels.length, catRange, 0.28);
      const maxLabelChars = Math.max(6, Math.floor(band.step / 7));
      labels.forEach((lb, i) => {
        const c = band.start(i) + band.bandwidth / 2;
        if (catGrid) {
          const line = horizontal
            ? svgEl('line', { x1: plot.x, x2: plot.x + plot.width, y1: c, y2: c, class: 'grid-line' })
            : svgEl('line', { x1: c, x2: c, y1: plot.y, y2: plot.y + plot.height, class: 'grid-line' });
          axesGroup.appendChild(line);
        }
        const raw = String(lb);
        const shown = horizontal || raw.length <= maxLabelChars ? raw : `${raw.slice(0, maxLabelChars - 1)}…`;
        const t = horizontal
          ? svgEl('text', { x: plot.x - 10, y: c, 'text-anchor': 'end', 'dominant-baseline': 'middle', class: 'tick-label' })
          : svgEl('text', { x: c, y: plot.y + plot.height + 16, 'text-anchor': 'middle', class: 'tick-label' });
        t.textContent = shown;
        if (shown !== raw) {
          const title = document.createElementNS(SVG_NS, 'title');
          title.textContent = raw;
          t.appendChild(title);
        }
        axesGroup.appendChild(t);
      });
      ctx.band = band;
      ctx.numeric = false;
    }

    // Línea base del eje de valor.
    const zeroPos = vScale(Math.max(vDomain[0], Math.min(0, vDomain[1])));
    const baseline = horizontal
      ? svgEl('line', { x1: zeroPos, x2: zeroPos, y1: plot.y, y2: plot.y + plot.height, class: 'axis-line' })
      : svgEl('line', { x1: plot.x, x2: plot.x + plot.width, y1: zeroPos, y2: zeroPos, class: 'axis-line' });
    axesGroup.appendChild(baseline);

    if (opts.xLabel) {
      const t = svgEl('text', {
        x: plot.x + plot.width / 2, y: plot.y + plot.height + 38, 'text-anchor': 'middle', class: 'axis-title',
      });
      t.textContent = opts.xLabel;
      axesGroup.appendChild(t);
    }
    if (opts.yLabel) {
      const t = svgEl('text', {
        x: 12, y: plot.y + plot.height / 2, 'text-anchor': 'middle', class: 'axis-title',
        transform: `rotate(-90 12 ${plot.y + plot.height / 2})`,
      });
      t.textContent = opts.yLabel;
      axesGroup.appendChild(t);
    }

    ctx.vScale = vScale;
    ctx.vDomain = vDomain;
    ctx.horizontal = horizontal;
    /** Mapea (categoría, valor) a coordenadas de pantalla según la orientación. */
    ctx.pt = horizontal ? (c, v) => ({ x: v, y: c }) : (c, v) => ({ x: c, y: v });
  }

  #renderLegend(entries, colors, isSlice) {
    this.#legendEl.hidden = false;
    this.#legendEl.innerHTML = '';
    for (const entry of entries) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'legend-item dg-legend-item';
      item.dataset.index = String(entry.index);
      item.setAttribute('aria-pressed', String(!entry.hidden));

      const swatch = document.createElement('span');
      swatch.className = 'legend-swatch dg-swatch dg-swatch--square';
      swatch.style.background = colors[entry.index % colors.length];
      item.appendChild(swatch);

      const labelEl = document.createElement('span');
      labelEl.className = 'legend-label dg-legend-label';
      labelEl.textContent = entry.label;
      item.appendChild(labelEl);

      item.addEventListener('click', () => {
        const set = isSlice ? this.#hiddenSlices : this.#hiddenSeries;
        if (set.has(entry.index)) set.delete(entry.index); else set.add(entry.index);
        this.#queueRender();
      });
      this.#legendEl.appendChild(item);
    }
  }

  #onPointerMove(e) {
    if (!this.#hits.length) return this.#clearHover();
    const rect = this.#svg.getBoundingClientRect();
    const vb = this.#svg.viewBox.baseVal;
    if (!vb || !rect.width || !rect.height) return;
    const px = (e.clientX - rect.left) * (vb.width / rect.width);
    const py = (e.clientY - rect.top) * (vb.height / rect.height);

    // 1. Geometria real: si el puntero esta sobre una mark, esa mark gana.
    //    El modelo de proximidad de abajo registra cada hit como un PUNTO con
    //    radio, lo que deja zonas muertas en marks grandes: un sector ancho de
    //    doughnut se extiende mucho mas alla de su centroide, asi que el borde
    //    del sector quedaba fuera del radio y no hacia hover aun estando
    //    claramente dentro de la figura. Lo mismo con barras altas.
    //    El listener vive en el mismo shadow root que las marks, asi que
    //    `e.target` no sufre retargeting y apunta a la mark real.
    let best = null;
    const markEl = e.target instanceof Element ? e.target.closest('.mark') : null;
    if (markEl) best = this.#hits.find((h) => h.el === markEl) || null;

    // 2. Proximidad como respaldo. Para line/scatter SI es el modelo correcto:
    //    el cursor casi nunca esta encima del punto, se busca el mas cercano.
    if (!best) {
      let bestDist = Infinity;
      for (const h of this.#hits) {
        const d = Math.hypot(h.x - px, h.y - py);
        if (d < bestDist && d <= (h.radius || 24)) { bestDist = d; best = h; }
      }
    }
    if (!best) return this.#clearHover();
    if (best !== this.#activeHit) this.#applyHover(best);

    if (this.#tooltipEnabled) {
      const wrapRect = this.#wrap.getBoundingClientRect();
      this.#showTooltip(best, e.clientX - wrapRect.left, e.clientY - wrapRect.top, wrapRect);
    }
  }

  #applyHover(hit) {
    this.#activeHit = hit;
    if (!this.#marksGroup) return;
    this.#marksGroup.dataset.hover = '';
    for (const el of this.#marksGroup.querySelectorAll('.mark[data-active]')) el.removeAttribute('data-active');
    if (hit.el) hit.el.setAttribute('data-active', '');
    this.#drawCrosshair(hit);
  }

  #drawCrosshair(hit) {
    if (!this.#overlay) return;
    this.#overlay.innerHTML = '';
    if (!hit.crosshair) return;
    const { x1, y1, x2, y2 } = hit.crosshair;
    this.#overlay.appendChild(svgEl('line', { x1, y1, x2, y2, class: 'crosshair' }));
  }

  #clearHover() {
    this.#activeHit = null;
    if (this.#marksGroup) {
      delete this.#marksGroup.dataset.hover;
      for (const el of this.#marksGroup.querySelectorAll('.mark[data-active]')) el.removeAttribute('data-active');
    }
    if (this.#overlay) this.#overlay.innerHTML = '';
    this.#tooltipEl.hidden = true;
  }

  #showTooltip(hit, x, y, wrapRect) {
    const tip = this.#tooltipEl;
    tip.hidden = false;
    tip.innerHTML = '';

    if (hit.title) {
      const title = document.createElement('div');
      title.className = 'dg-tooltip__title';
      title.textContent = hit.title;
      tip.appendChild(title);
    }

    const row = document.createElement('div');
    row.className = 'dg-tooltip__row';
    const swatch = document.createElement('span');
    swatch.className = 'dg-swatch';
    swatch.style.background = hit.color;
    row.appendChild(swatch);
    const name = document.createElement('span');
    name.textContent = hit.label || '';
    row.appendChild(name);
    const value = document.createElement('span');
    value.className = 'dg-tooltip__value';
    value.textContent = hit.display ?? formatValue(hit.value);
    row.appendChild(value);
    tip.appendChild(row);

    // Clampea dentro del componente para que no se corte en los bordes.
    const tipRect = tip.getBoundingClientRect();
    const maxX = wrapRect.width - tipRect.width - 4;
    const maxY = wrapRect.height - tipRect.height - 4;
    const left = Math.max(4, Math.min(x + 14, maxX));
    const top = Math.max(4, Math.min(y - tipRect.height - 10, maxY));
    tip.style.transform = `translate(${left}px, ${top}px)`;
  }
}

/**
 * Registra un elemento con tipo fijo.
 * @param {string} tag
 * @param {string} fixedType
 * @param {(ctx: object) => void} drawMarks
 * @param {string} [styleModuleUrl]
 */
function defineTypedChart(tag, fixedType, drawMarks, styleModuleUrl) {
  if (typeof drawMarks === 'function') MARK_REGISTRY[fixedType] = drawMarks;
  class Typed extends IsChart {
    static fixedType = fixedType;
    static drawMarks = drawMarks;
    static styleModuleUrl = styleModuleUrl || null;
  }
  return defineElement(tag, Typed, true);
}

defineElement('is-chart', IsChart, 'IsChart');
for (const kind of ['chart', 'bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea', 'scatter', 'bubble']) {
  registerDiagramKind(kind, 'is-chart');
}

if (typeof window !== 'undefined') window.__isDefineTypedChart = defineTypedChart;

export { IsChart, defineTypedChart, formatValue };
