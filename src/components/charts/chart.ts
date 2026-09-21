import { adoptCss, defineElement, emit } from '../../core/element.js';
import { withStyleAttrs } from '../../core/attrs.js';

import { scaleLinear, scaleBand, niceTicks, svgEl } from '../_shared/svg-chart-engine.js';
import { getCategoricalColors, getFillColors } from '../_shared/chart-palette.js';
import { PathTurtle } from '../_shared/path-turtle.js';
import { registerDiagramKind } from '../diagrams/diagram-kinds.js';
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

/**
 * Forma del factory `defineTypedChart` (se exporta más abajo). Los wrappers
 * <is-bar-chart>, <is-pie-chart>, etc. lo invocan vía `window.__isDefineTypedChart`
 * como guarda de carga para registrar su tipo fijo y su `drawMarks`.
 */
export type TypedChartFactory = ((
  tag: string,
  fixedType: string,
  drawMarks: (ctx: ChartCtx) => void,
  styleModuleUrl?: string,
) => typeof IsChart);

declare global {
  interface Window {
    /**
     * Factory expuesto por <is-chart> para que los wrappers tipados
     * (bar, pie, line, …) se autoregistren. Opcional: si <is-chart>
     * aún no cargó, el wrapper sale sin hacer nada.
     */
    __isDefineTypedChart?: TypedChartFactory;
  }
}

const OBSERVED = [
  'type', 'label', 'legend-position', 'index-axis', 'min', 'max', 'grid',
  'stacked', 'without-animation', 'without-legend', 'without-tooltip',
  'x-label', 'y-label', 'color', 'open-on-click',
];

const RADIAL_TYPES = new Set(['pie', 'doughnut', 'polarArea', 'radar']);
/** Tipos cuya leyenda enumera las etiquetas (rebanadas), no los datasets. */
const SLICE_TYPES = new Set(['pie', 'doughnut', 'polarArea']);

// Tipos de Chart.js-compatibles que consume este componente.
type ChartDataPoint = number | { x?: number; y: number; r?: number };
type ChartDataset = {
  label?: string;
  data: ChartDataPoint[];
  [key: string]: unknown;
};
type ChartConfig = {
  type?: string;
  data?: {
    labels?: string[];
    datasets?: ChartDataset[];
  };
  options?: Record<string, unknown>;
};
type LegendEntry = { label: string; index: number; hidden: boolean };
type HitRecord = {
  el?: Element | null;
  x: number;
  y: number;
  radius?: number;
  title?: string;
  label?: string;
  value?: number | string;
  display?: string;
  color?: string;
  crosshair?: { x1: number; y1: number; x2: number; y2: number };
};
type ResolvedOptions = {
  type: string;
  horizontal: boolean;
  stacked: boolean;
  gridMode: string | null;
  min: number | null;
  max: number | null;
  beginAtZero: boolean;
  animate: boolean;
  tooltip: boolean;
  legendDisplay: boolean | null;
  legendPosition: string;
  title: string | null;
  xLabel: string | null;
  yLabel: string | null;
  doughnutRatio: number | null;
};
type DrawMarksFn = ((ctx: ChartCtx) => void) & {
  domainValues?: (datasets: ChartDataset[], labels: string[], opts: ResolvedOptions) => number[];
};

type ChartCtx = {
  svg: HTMLElement;
  group: SVGGElement;
  plot: { x: number; y: number; width: number; height: number };
  width: number;
  height: number;
  data: { labels: string[]; datasets: ChartDataset[] };
  sliceMask: boolean[] | null;
  colors: string[];
  fills: string[];
  text: string;
  grid: string;
  surface: string;
  style: {
    barRadius: number;
    barGap: number;
    lineWidth: number;
    pointRadius: number;
    sliceGap: number;
  };
  opts: ResolvedOptions;
  fmt: (v: number) => string;
  addHit: (hit: HitRecord) => void;
  scaleLinear: typeof scaleLinear;
  scaleBand: typeof scaleBand;
  niceTicks: typeof niceTicks;
  drawMarks?: DrawMarksFn | null;
  radial?: { cx: number; cy: number; rMax: number; innerRatio: number };
  numeric?: boolean;
  xScale?: (v: number) => number;
  yScale?: (v: number) => number;
  band?: { step: number; bandwidth: number; start: (i: number) => number };
  vScale?: (v: number) => number;
  vDomain?: [number, number];
  horizontal?: boolean;
  pt?: (c: number, v: number) => { x: number; y: number };
};

/** drawMarks por tipo — lo llenan los elementos tipados; permite <is-chart type="..."> genérico. */
const MARK_REGISTRY: Record<string, (ctx: ChartCtx) => void> = Object.create(null) as Record<string, (ctx: ChartCtx) => void>;

const compactFmt = new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 });
const plainFmt = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

/** Etiquetas de eje/tooltip legibles: 1.2M en vez de 1200000. */
function formatValue(v: number): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return String(v ?? '');
  return Math.abs(v) >= 10000 ? compactFmt.format(v) : plainFmt.format(v);
}

function numOr(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Lee un valor de dataset, que puede ser número o `{x, y}` / `{x, y, r}`. */
function valueOf(point: ChartDataPoint): number {
  if (point && typeof point === 'object') return Number(point.y);
  return Number(point);
}

function isNumericXY(datasets: ChartDataset[]): boolean {
  const first = datasets.find((d) => Array.isArray(d.data) && d.data.length)?.data?.[0];
  return !!first && typeof first === 'object' && 'x' in first;
}

class IsChart extends withStyleAttrs(HTMLElement) {
    /** Personalización por atributo (ver `core/attrs.ts`). */
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

  static get observedAttributes(): string[] { return [...OBSERVED, ...IsChart.styleAttrNames]; }
  static fixedType: string | null = null;
  static styleModuleUrl: string | null = null;
  static drawMarks: ((ctx: ChartCtx) => void) | null = null;

  #wrap!: HTMLElement;
  #svg!: HTMLElement;
  #legendEl!: HTMLElement;
  #tooltipEl!: HTMLElement;
  #srStatusEl!: HTMLElement;
  #srSignature: string = '';
  #config: ChartConfig | null = null;
  #mounted: boolean = false;
  #ro: ResizeObserver | null = null;
  #mo: MutationObserver | null = null;
  #themeObs: MutationObserver | null = null;
  #fixedType: string | null = null;
  #renderQueued: boolean = false;
  #hits: HitRecord[] = [];
  #hiddenSeries: Set<number> = new Set();
  #hiddenSlices: Set<number> = new Set();
  #marksGroup: SVGGElement | null = null;
  #overlay: SVGGElement | null = null;
  #activeHit: HitRecord | null = null;
  #tooltipEnabled: boolean = true;
  #turtle: PathTurtle | null = null;
  #turtleGroup: SVGGElement | null = null;
  #ownLightbox: HTMLElement | null = null;

  constructor() {
    super();
    this.#fixedType = (this.constructor as typeof IsChart).fixedType || null;
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = /* html */ `
      <div part="base" class="wrap">
        <svg part="canvas" class="chart-svg" role="img" aria-busy="true"></svg>
        <div part="legend" class="legend" hidden></div>
        <div part="tooltip" class="tooltip dg-tooltip" hidden role="status"></div>
        <div part="sr-status" class="sr-status" aria-live="polite" aria-atomic="true"></div>
        <div class="slot-hidden"><slot></slot></div>
      </div>
    `;
    adoptCss(shadow, (this.constructor as typeof IsChart).styleModuleUrl || import.meta.url);
    this.#wrap = shadow.querySelector<HTMLElement>('.wrap') as HTMLElement;
    this.#svg = shadow.querySelector<HTMLElement>('.chart-svg') as HTMLElement;
    this.#legendEl = shadow.querySelector<HTMLElement>('.legend') as HTMLElement;
    this.#tooltipEl = shadow.querySelector<HTMLElement>('.tooltip') as HTMLElement;
    this.#srStatusEl = shadow.querySelector<HTMLElement>('.sr-status') as HTMLElement;
    this.#svg.addEventListener('pointermove', (e: Event) => this.#onPointerMove(e as PointerEvent));
    this.#svg.addEventListener('pointerleave', () => this.#clearHover());
  }

  connectedCallback(): void {
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

  disconnectedCallback(): void {
    this.#mounted = false;
    this.#ro?.disconnect();
    this.#mo?.disconnect();
    this.#themeObs?.disconnect();
    this.#turtle?.destroy();
    this.#turtle = null;
    this.#wrap.removeEventListener('click', this.#onHostClick);
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    super.attributeChangedCallback(name, oldVal, newVal);
    if (!this.#mounted || oldVal === newVal) return;
    this.#queueRender();
  }

  get svg(): HTMLElement { return this.#svg; }
  /** Alias histórico: antes exponía la instancia de Chart.js. */
  get chart(): HTMLElement { return this.#svg; }
  /** Alias de `config`: así el visor monta charts y diagramas por igual. */
  get payload(): ChartConfig | null { return this.#config; }
  set payload(v: ChartConfig | null) { this.config = v; }

  get isViewer(): boolean { return this.getAttribute('color') === 'viewer'; }
  get turtle(): PathTurtle | null { return this.#turtle; }

  get config(): ChartConfig | null { return this.#config; }
  set config(v: ChartConfig | null) {
    this.#config = v;
    this.#hiddenSeries.clear();
    this.#hiddenSlices.clear();
    this.#queueRender();
  }
  get type(): string { return this.getAttribute('type') || this.#fixedType || 'bar'; }
  set type(v: string) {
    if (this.#fixedType) return;
    setStringAttr(this, 'type', v);
  }

  async updateComplete(): Promise<void> { await this.#queueRender(); }

  #watchTheme(): void {
    const root = document.documentElement;
    this.#themeObs = new MutationObserver(() => this.#queueRender());
    this.#themeObs.observe(root, { attributes: true, attributeFilter: ['class', 'data-theme', 'data-palette'] });
  }

  #readJsonSlot(): void {
    const script = [...this.children].find((c) => c.tagName === 'SCRIPT' && /json/i.test((c as HTMLScriptElement).type || ''));
    if (!script) return;
    try {
      this.#config = JSON.parse(script.textContent?.trim() ?? '') as ChartConfig;
      this.#queueRender();
    } catch { /* ignore invalid JSON until fixed */ }
  }

  #queueRender(): Promise<void> {
    if (this.#renderQueued) return Promise.resolve();
    this.#renderQueued = true;
    return Promise.resolve().then(() => {
      try { this.#render(); } finally { this.#renderQueued = false; }
    });
  }

  /**
   * Resuelve las opciones efectivas. Precedencia: atributo del elemento >
   * `config.options` (forma Chart.js) > default.
   */
  #resolveOptions(userOptions: Record<string, unknown> | undefined, type: string): ResolvedOptions {
    const o = userOptions || {};
    const scales = (o.scales as Record<string, Record<string, unknown>>) || {};
    const plugins = (o.plugins as Record<string, Record<string, unknown>>) || {};
    const attr = (name: string): string | null => (this.hasAttribute(name) ? this.getAttribute(name) : null);

    const indexAxis = attr('index-axis') ?? (o.indexAxis as string) ?? 'x';
    const horizontal = indexAxis === 'y';
    const valueAxisKey = horizontal ? 'x' : 'y';
    const valueScale = scales[valueAxisKey] || {};
    const catScale = scales[horizontal ? 'y' : 'x'] || {};

    const legendPlugin = plugins.legend || {};
    const titlePlugin = plugins.title || {};
    const tooltipPlugin = plugins.tooltip || {};

    const legendDisplay: boolean | null = this.hasAttribute('without-legend')
      ? false
      : (legendPlugin.display !== undefined ? !!legendPlugin.display : null); // null = auto

    const rawMin = attr('min') ?? (valueScale.min as string | number | null | undefined);
    const rawMax = attr('max') ?? (valueScale.max as string | number | null | undefined);

    return {
      type,
      horizontal,
      stacked: this.hasAttribute('stacked') || !!valueScale.stacked || !!catScale.stacked,
      gridMode: attr('grid') ?? 'auto',
      min: rawMin === '' || rawMin == null ? null : numOr(rawMin, 0),
      max: rawMax === '' || rawMax == null ? null : numOr(rawMax, 0),
      beginAtZero: valueScale.beginAtZero !== false,
      animate: !this.hasAttribute('without-animation') && o.animation !== false,
      tooltip: !this.hasAttribute('without-tooltip') && tooltipPlugin.enabled !== false,
      legendDisplay,
      legendPosition: attr('legend-position') ?? (legendPlugin.position as string) ?? 'top',
      title: attr('label') ?? (titlePlugin.display === false ? null : (titlePlugin.text as string) ?? null),
      xLabel: attr('x-label') ?? (scales.x?.title as { text?: string } | undefined)?.text ?? null,
      yLabel: attr('y-label') ?? (scales.y?.title as { text?: string } | undefined)?.text ?? null,
      doughnutRatio: o.cutout != null ? Number(o.cutout) / 100 : null,
    };
  }

  /** Colores por índice ORIGINAL de dataset, honrando overrides --border-color-N. */
  #resolveColors(count: number): { colors: string[]; fills: string[] } {
    const cs = getComputedStyle(this);
    const base = getCategoricalColors(this, count);
    const baseFills = getFillColors(this, count);
    const colors: string[] = [];
    const fills: string[] = [];
    for (let i = 0; i < count; i++) {
      const borderOverride = cs.getPropertyValue(`--border-color-${i + 1}`).trim();
      const fillOverride = cs.getPropertyValue(`--fill-color-${i + 1}`).trim();
      colors.push(borderOverride || base[i % base.length] || '');
      fills.push(fillOverride || (borderOverride ? borderOverride : baseFills[i % baseFills.length] || ''));
    }
    return { colors, fills };
  }

  #render(): void {
    if (!this.#mounted) return;

    const raw: ChartConfig = this.#config || {};
    const type = this.#fixedType || raw.type || this.type;
    const data = raw.data || { labels: [], datasets: [] };
    const allDatasets = Array.isArray(data.datasets) ? data.datasets : [];
    const labels = Array.isArray(data.labels) ? data.labels : [];
    const opts = this.#resolveOptions(raw.options, type);

    const isRadial = RADIAL_TYPES.has(type);
    const isSlice = SLICE_TYPES.has(type);

    // aria-label descriptivo del contenedor + aria-busy desactivado cuando
    // los datos están listos. El inicial "true" lo pone el constructor.
    this.#svg.setAttribute('aria-busy', allDatasets.length === 0 ? 'true' : 'false');
    if (allDatasets.length === 0) {
      this.#svg.setAttribute('aria-label', `Gráfico ${type} sin datos`);
    } else {
      const cats = labels.length;
      const series = allDatasets.length;
      const ariaLabel = `Gráfico ${type} con ${cats} ${cats === 1 ? 'categoría' : 'categorías'} y ${series} ${series === 1 ? 'serie' : 'series'}`;
      this.#svg.setAttribute('aria-label', ariaLabel);
      // sr-status: solo republicar cuando la firma cambia para evitar spam
      // durante resize. SR polite anuncia cambios reales de texto.
      const signature = `${type}|${series}|${cats}|${ariaLabel}`;
      if (signature !== this.#srSignature) {
        this.#srSignature = signature;
        this.#srStatusEl.textContent = ariaLabel;
      }
    }

    // Leyenda: en pie/doughnut/polarArea enumera las etiquetas; en el resto, los datasets.
    const legendEntries: LegendEntry[] = isSlice
      ? labels.map((lb: string, i: number) => ({ label: String(lb), index: i, hidden: this.#hiddenSlices.has(i) }))
      : allDatasets.map((ds: ChartDataset, i: number) => ({ label: ds.label || `Serie ${i + 1}`, index: i, hidden: this.#hiddenSeries.has(i) }));
    const autoLegend = legendEntries.length > 1;
    const showLegend = opts.legendDisplay === null ? autoLegend : opts.legendDisplay;

    this.#wrap.dataset['legend'] = showLegend ? opts.legendPosition : 'none';
    this.#wrap.dataset['theme'] = document.documentElement.classList.contains('theme-light') ? 'light' : 'dark';
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
      .map((ds: ChartDataset, i: number) => ({ ...ds, __i: i }))
      .filter((ds) => !this.#hiddenSeries.has(ds.__i));

    // Slices ocultos se filtran conservando el índice original para el color.
    const sliceMask: boolean[] | null = isSlice ? labels.map((_lb, i: number) => !this.#hiddenSlices.has(i)) : null;

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
    const margin: { top: number; right: number; bottom: number; left: number } = isRadial
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
      const longest = labels.reduce((max: number, lb: unknown) => Math.max(max, String(lb).length), 0);
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

    const ctx: ChartCtx = {
      svg: this.#svg, group, plot, width, height,
      data: { labels, datasets: visibleDatasets },
      sliceMask,
      colors, fills, text, grid, surface, style,
      opts,
      fmt: formatValue,
      addHit: (hit: HitRecord) => {
      // Marca navegable por teclado: tabindex=0 + aria-label derivado del
      // hit permiten Tab entre categorías y lectura por SR de cada mark.
      if (hit.el && hit.el instanceof Element) {
        const parts: string[] = [];
        if (hit.title) parts.push(String(hit.title));
        if (hit.label) parts.push(String(hit.label));
        if (hit.value != null) parts.push(`valor ${hit.display ?? String(hit.value)}`);
        const aria = parts.join(': ');
        if (aria) hit.el.setAttribute('aria-label', aria);
        hit.el.setAttribute('tabindex', '0');
      }
      this.#hits.push(hit);
    },
      scaleLinear, scaleBand, niceTicks,
    };

    // Se resuelve antes de los ejes: un tipo puede declarar su propio dominio
    // (la cascada, por ejemplo, se mide sobre el acumulado, no sobre los deltas).
    const ctor = this.constructor as typeof IsChart;
    const drawMarks: ((ctx: ChartCtx) => void) | null = ctor.drawMarks || MARK_REGISTRY[type] || null;
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
  #mountTurtle(group: SVGGElement, width: number, height: number, text: string): void {
    const lines = [...group.querySelectorAll<HTMLElement>('.mark-line, .mark-radar')]
      .map((el): { el: HTMLElement; d: string } | null => {
        const d = el.getAttribute('d');
        return d === null ? null : { el, d };
      })
      .filter((entry): entry is { el: HTMLElement; d: string } => entry !== null);
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
    if (!this.#turtleGroup) return;
    this.#turtle = new PathTurtle(this.#turtleGroup as unknown as HTMLElement);
    this.#turtle.setData({
      messages: lines.map(({ el, d }: { el: HTMLElement; d: string }, i: number) => ({
        path: d,
        step: i + 1,
        log: el.dataset['seriesLabel'] || '',
        color: el.getAttribute('stroke') ?? undefined,
      })),
      theme: { accent: text },
      viewW: width,
      viewH: height,
      autoLoop: this.isViewer,
      onState: (state: unknown) => emit(this, 'is-turtle-state', state),
    });
  }

  /** Clic en colore inline: abre el visor a pantalla completa. */
  #onHostClick = (): void => {
    if (this.isViewer || !this.hasAttribute('open-on-click')) return;
    const ev = new CustomEvent('is-open-viewer', {
      bubbles: true, composed: true, cancelable: true, detail: { payload: this.#config },
    });
    this.dispatchEvent(ev);
    if (!ev.defaultPrevented) void this.#openOwnViewer();
  };

  async #openOwnViewer(): Promise<void> {
    await import('../diagrams/diagram-lightbox.js');
    let lb = this.#ownLightbox;
    if (!lb || !lb.isConnected) {
      lb = document.createElement('is-diagram-lightbox');
      lb.setAttribute('kind', this.type);
      if (lb) {
        lb.addEventListener('is-after-hide', () => lb && lb.remove());
      }
      document.body.appendChild(lb);
      this.#ownLightbox = lb;
    }
    if (!lb) return;
    // El visor monta <is-chart> genérico: el tipo debe viajar en el payload.
    (lb as unknown as { payload: ChartConfig }).payload = { ...(this.#config || {}), type: this.type };
    (lb as unknown as { open: boolean }).open = true;
  }

  /** Prepara el trazo progresivo de las líneas (dasharray = longitud del path). */
  #primeLineAnimation(group: SVGGElement): void {
    for (const path of group.querySelectorAll<SVGGeometryElement>('.mark-line, .mark-radar')) {
      const len = typeof path.getTotalLength === 'function' ? path.getTotalLength() : 0;
      if (!len) continue;
      path.style.setProperty('--dash', String(len));
      path.style.strokeDasharray = String(len);
    }
  }

  #drawAxes(ctx: ChartCtx, axesGroup: SVGGElement, datasets: ChartDataset[]): void {
    const { plot, opts } = ctx;
    const horizontal = opts.horizontal;
    const numeric = isNumericXY(datasets);

    // --- Escala de valor -------------------------------------------------
    let values: number[];
    if (opts.stacked && !numeric) {
      const len = ctx.data.labels.length;
      const totalsUp = new Array<number>(len).fill(0);
      const totalsDown = new Array<number>(len).fill(0);
      datasets.forEach((d: ChartDataset) => d.data.forEach((raw: ChartDataPoint, i: number) => {
        const v = valueOf(raw) || 0;
        if (v >= 0) totalsUp[i] = (totalsUp[i] ?? 0) + v; else totalsDown[i] = (totalsDown[i] ?? 0) + v;
      }));
      values = [...totalsUp, ...totalsDown];
    } else if (typeof ctx.drawMarks?.domainValues === 'function') {
      // El tipo sabe mejor que nadie qué rango ocupa realmente en el eje.
      values = ctx.drawMarks.domainValues(datasets, ctx.data.labels, opts).filter(Number.isFinite);
    } else {
      values = datasets.flatMap((d: ChartDataset) => d.data.map(valueOf)).filter(Number.isFinite);
    }

    const dataMin = values.length ? Math.min(...values) : 0;
    const dataMax = values.length ? Math.max(...values) : 1;
    const vMin = opts.min ?? (opts.beginAtZero ? Math.min(0, dataMin) : dataMin);
    const vMax = opts.max ?? Math.max(dataMax, opts.beginAtZero ? 0 : dataMax);
    const vTicks = niceTicks(vMin, vMax, 5);
    const vDomain: [number, number] = [
      opts.min ?? vTicks[0] ?? 0,
      opts.max ?? vTicks[vTicks.length - 1] ?? 1,
    ];
    const vRange: [number, number] = horizontal
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
        if (tv === 0 && vDomain[0] < 0) (line as SVGLineElement).dataset['zero'] = 'true';
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
      const xs = datasets.flatMap((d: ChartDataset) => d.data.map((p: ChartDataPoint) => {
        if (p && typeof p === 'object') return Number(p.x);
        return Number.NaN;
      })).filter(Number.isFinite);
      const xTicks = niceTicks(Math.min(...xs), Math.max(...xs), 5);
      const xScale = scaleLinear([xTicks[0] ?? 0, xTicks[xTicks.length - 1] ?? 1], [plot.x, plot.x + plot.width]);
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
      const catRange: [number, number] = horizontal ? [plot.y, plot.y + plot.height] : [plot.x, plot.x + plot.width];
      const band = scaleBand(labels.length, catRange, 0.28);
      const maxLabelChars = Math.max(6, Math.floor(band.step / 7));
      labels.forEach((lb: string, i: number) => {
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
    ctx.pt = horizontal ? (c: number, v: number) => ({ x: v, y: c }) : (c: number, v: number) => ({ x: c, y: v });
  }

  #renderLegend(entries: LegendEntry[], colors: string[], isSlice: boolean): void {
    this.#legendEl.hidden = false;
    this.#legendEl.innerHTML = '';
    for (const entry of entries) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'legend-item dg-legend-item';
      item.dataset['index'] = String(entry.index);
      item.setAttribute('aria-pressed', String(!entry.hidden));

      const swatch = document.createElement('span');
      swatch.className = 'legend-swatch dg-swatch dg-swatch--square';
      swatch.style.background = colors[entry.index % colors.length] || '';
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

  #onPointerMove(e: PointerEvent): void {
    if (!this.#hits.length) return this.#clearHover();
    const svg = this.#svg as unknown as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
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
    let best: HitRecord | null = null;
    const markEl = e.target instanceof Element ? e.target.closest('.mark') : null;
    if (markEl) best = this.#hits.find((h: HitRecord) => h.el === markEl) || null;

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

  #applyHover(hit: HitRecord): void {
    this.#activeHit = hit;
    if (!this.#marksGroup) return;
    this.#marksGroup.dataset['hover'] = '';
    for (const el of this.#marksGroup.querySelectorAll<HTMLElement>('.mark[data-active]')) el.removeAttribute('data-active');
    if (hit.el) hit.el.setAttribute('data-active', '');
    this.#drawCrosshair(hit);
  }

  #drawCrosshair(hit: HitRecord): void {
    if (!this.#overlay) return;
    this.#overlay.innerHTML = '';
    if (!hit.crosshair) return;
    const { x1, y1, x2, y2 } = hit.crosshair;
    this.#overlay.appendChild(svgEl('line', { x1, y1, x2, y2, class: 'crosshair' }));
  }

  #clearHover(): void {
    this.#activeHit = null;
    if (this.#marksGroup) {
      delete this.#marksGroup.dataset['hover'];
      for (const el of this.#marksGroup.querySelectorAll<HTMLElement>('.mark[data-active]')) el.removeAttribute('data-active');
    }
    if (this.#overlay) this.#overlay.innerHTML = '';
    this.#tooltipEl.hidden = true;
  }

  #showTooltip(hit: HitRecord, x: number, y: number, wrapRect: DOMRect): void {
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
    swatch.style.background = hit.color || '';
    row.appendChild(swatch);
    const name = document.createElement('span');
    name.textContent = hit.label || '';
    row.appendChild(name);
    const value = document.createElement('span');
    value.className = 'dg-tooltip__value';
    value.textContent = hit.display ?? formatValue(Number(hit.value));
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
 * @param tag tag del custom element
 * @param fixedType tipo interno del chart
 * @param drawMarks función que dibuja las marks
 * @param styleModuleUrl URL opcional al CSS de la variante
 */
function defineTypedChart(
  tag: string,
  fixedType: string,
  drawMarks: (ctx: ChartCtx) => void,
  styleModuleUrl?: string,
): typeof IsChart {
  if (typeof drawMarks === 'function') MARK_REGISTRY[fixedType] = drawMarks;
  class Typed extends IsChart {
    static override fixedType: string = fixedType;
    static override drawMarks: (ctx: ChartCtx) => void = drawMarks;
    static override styleModuleUrl: string | null = styleModuleUrl || null;
  }
  return defineElement(tag, Typed, true) as unknown as typeof IsChart;
}

defineElement('is-chart', IsChart, 'IsChart');
for (const kind of ['chart', 'bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea', 'scatter', 'bubble']) {
  registerDiagramKind(kind, 'is-chart');
}

if (typeof window !== 'undefined') {
  window.__isDefineTypedChart = defineTypedChart;
}

export { IsChart, defineTypedChart, formatValue, type ChartCtx, type ChartConfig, type ChartDataset, type ChartDataPoint, type ResolvedOptions, type HitRecord };
