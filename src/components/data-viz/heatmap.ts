import { adoptCss, defineElement, emit } from '../../core/element.js';
import { withStyleAttrs } from '../../core/attrs.js';

import { niceTicks, scaleLinear, svgEl } from '../_shared/svg-chart-engine.js';

/** Config leída del slot JSON. */
type HeatmapCfg = {
  xLabels?: unknown[];
  yLabels?: unknown[];
  data?: unknown[];
  points?: Array<{ x: unknown; y: unknown; v: number }>;
};

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

  const COLORS: Record<string, string[]> = {
    brand:    ['#0f172a', ...intensitySteps('#5b9bff')],
    neutral:  ['#0f172a', ...intensitySteps('#94a3b8')],
    success:  ['#0f172a', ...intensitySteps('#22c55e')],
    warning:  ['#0f172a', ...intensitySteps('#eab308')],
    danger:   ['#0f172a', ...intensitySteps('#ef4444')],
    'red-blue': [...intensitySteps('#3b82f6').reverse(), ...intensitySteps('#ef4444')],
  };

  function intensitySteps(hex: string): string[] {
    // 5 pasos de opacidad (0.15, 0.3, 0.5, 0.7, 0.9)
    return [0.18, 0.36, 0.55, 0.75, 0.95].map((a: number) => `color-mix(in srgb, ${hex} ${Math.round(a * 100)}%, var(--is-bg-elev))`);
  }

  class IsHeatmap extends withStyleAttrs(HTMLElement) {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    'text-color': { prop: '--is-heatmap-text', onlyColorValues: true },
    'grid-color': { prop: '--is-heatmap-grid-color', onlyColorValues: true },
    };

    static get observedAttributes(): string[] { return [...OBSERVED, 'text-color', 'grid-color']; }

    #ro: ResizeObserver | null = null;
    #mo: MutationObserver | null = null;
    #svg!: HTMLElement;
    #legendEl!: HTMLElement;
    #srStatusEl!: HTMLElement;
    #mounted = false;
    #config: HeatmapCfg | null = null;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot!.innerHTML = /* html */ `
        <div part="root" class="root" data-legend="end">
          <svg part="canvas" class="chart-svg" role="img" aria-busy="true"></svg>
          <div part="legend" class="legend" hidden></div>
          <div part="sr-status" class="sr-status" aria-live="polite" aria-atomic="true"></div>
        </div>
      `;
      adoptCss(this.shadowRoot!, import.meta.url);
      this.#svg = this.shadowRoot!.querySelector<HTMLElement>('.chart-svg')!;
      this.#legendEl = this.shadowRoot!.querySelector<HTMLElement>('.legend')!;
      this.#srStatusEl = this.shadowRoot!.querySelector<HTMLElement>('.sr-status')!;
      this.#svg.addEventListener('pointermove', (e: Event) => this.#onHover(e));
      this.#svg.addEventListener('pointerleave', () => this.#clearHover());
    }

    connectedCallback(): void {
      super.connectedCallback();
      this.#mounted = true;
      this.#readJsonSlot();
      const mo = new MutationObserver(() => this.#readJsonSlot());
      this.#mo = mo;
      mo.observe(this, { childList: true, characterData: true, subtree: true });
      const ro = new ResizeObserver(() => this.#render());
      this.#ro = ro;
      ro.observe(this);
      this.#render();
    }

    disconnectedCallback(): void {
      this.#mounted = false;
      this.#mo?.disconnect();
      this.#ro?.disconnect();
    }

    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
      super.attributeChangedCallback(name, oldVal, newVal);
      if (!this.#mounted || oldVal === newVal) return;
      this.#render();
    }

    get config(): HeatmapCfg | null { return this.#config; }
    set config(v: HeatmapCfg | null) { this.#config = v || null; this.#render(); }

    #readJsonSlot(): void {
      const script = [...this.children].find((c: Element) => c.tagName === 'SCRIPT' && /json/i.test((c as HTMLScriptElement).type || ''));
      if (!script) return;
      try {
        this.#config = JSON.parse(script.textContent || '');
        this.#render();
      } catch { /* noop */ }
    }

    #render(): void {
      if (!this.#mounted) return;
      const cfg: HeatmapCfg = this.#config || {};
      const xLabels: string[] = Array.isArray(cfg.xLabels) ? cfg.xLabels.map((x: unknown) => String(x)) : [];
      const yLabels: string[] = Array.isArray(cfg.yLabels) ? cfg.yLabels.map((y: unknown) => String(y)) : [];
      // aceptar {xLabels, yLabels, points: [{x, y, v}]} o matrix
      let matrix: (number | null)[][] | null = null;
      if (Array.isArray(cfg.data)) {
        matrix = cfg.data as (number | null)[][];
      } else if (Array.isArray(cfg.points)) {
        const points = cfg.points;
        matrix = yLabels.map((_, y) => xLabels.map((_, x) => {
          const p = points.find((pt) => String(pt.x) === xLabels[x] && String(pt.y) === yLabels[y]);
          return p ? p.v : null;
        }));
      }
      matrix = matrix || [];
      const showLegend = !['none'].includes(this.getAttribute('legend-position') || 'end');
      this.shadowRoot!.querySelector<HTMLElement>('.root')!.dataset['legend'] = this.getAttribute('legend-position') || 'end';

      const W = Math.max(this.#svg.getBoundingClientRect().width, 1);
      const H = Math.max(this.#svg.getBoundingClientRect().height, 1);
      this.#svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      while (this.#svg.firstChild) this.#svg.firstChild.remove();

      const cs = getComputedStyle(this);
      const text = cs.getPropertyValue('--chart-text').trim() || cs.color;
      const grid = cs.getPropertyValue('--grid-color').trim() || 'rgba(128,128,128,.18)';

      // calcular dominio
      const flat = matrix.flat().filter((v): v is number => v != null && Number.isFinite(v));
      if (!flat.length) {
        // Sin datos: mantenemos aria-busy y dejamos un aria-label neutro.
        this.#svg.setAttribute('aria-busy', 'true');
        this.#svg.setAttribute('aria-label', 'Mapa de calor sin datos');
        return;
      }
      const min = Math.min(...flat);
      const max = Math.max(...flat);
      const ticks = niceTicks(min, max, 5);
      const domain: [number, number] = [ticks[0] ?? min, ticks[ticks.length - 1] ?? max];

      // aria-label dinámico con resumen del dataset (filas, columnas, min, max).
      const rows = yLabels.length || matrix.length;
      const cols = xLabels.length || (matrix[0]?.length ?? 0);
      this.#svg.setAttribute('aria-busy', 'false');
      this.#svg.setAttribute(
        'aria-label',
        `Mapa de calor de ${rows} filas y ${cols} columnas, rango de ${formatVal(min)} a ${formatVal(max)}`,
      );

      const legendW = showLegend ? 70 : 0;
      const labelPadX = (xLabels[0]?.length || 4) * 6 + 12;
      const labelPadY = 18;
      const titleH = 22;
      const xTitleH = this.hasAttribute('x-label') ? 18 : 0;
      // 18px de ancho reservado para el título Y rotado. Antes era 14, que
      // era muy poco y provocaba que el texto rotado se solapara con los
      // labels de fila. Ahora damos 4px mas para separar visualmente.
      const yTitleW = this.hasAttribute('y-label') ? 18 : 0;

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
        // El título Y rotado se coloca en x=4 (borde izquierdo del SVG) y
        // centrado vertical en el plot. Antes x=10 quedaba muy pegado a los
        // row labels (en plot.x - 4) y como ambos se centraban en el mismo
        // vertical (plot.y + plot.height/2), el texto rotado cruzaba la
        // etiqueta de la fila central (e.g. "Día" sobre "Jue" con 7 filas).
        const yCx = 6;
        const yCy = plot.y + plot.height / 2;
        const t = svgEl('text', {
          x: yCx, y: yCy, 'text-anchor': 'middle', class: 'axis-title',
          transform: `rotate(-90 ${yCx} ${yCy})`,
        });
        t.textContent = this.getAttribute('y-label');
        t.style.fill = text;
        this.#svg.appendChild(t);
      }
      // labels X (rotadas)
      xLabels.forEach((lb: string, i: number) => {
        const t = svgEl('text', { x: plot.x + cellW * i + cellW / 2, y: plot.y - 6, 'text-anchor': 'middle', class: 'tick-label' });
        t.textContent = String(lb);
        t.style.fill = text;
        this.#svg.appendChild(t);
      });
      // labels Y
      yLabels.forEach((lb: string, i: number) => {
        const t = svgEl('text', { x: plot.x - 4, y: plot.y + cellH * i + cellH / 2 + 4, 'text-anchor': 'end', class: 'tick-label' });
        t.textContent = String(lb);
        t.style.fill = text;
        this.#svg.appendChild(t);
      });

      // cells
      const paletteName = this.getAttribute('color') || 'brand';
      const palette = COLORS[paletteName] || COLORS['brand']!;

      matrix.forEach((row, y) => {
        row.forEach((v, x) => {
          if (v == null || !Number.isFinite(v)) return;
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

    #renderLegend(domain: [number, number], palette: string[], x: number, y: number, w: number, h: number): void {
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
      void x; void y; void h;
    }

    #onHover(e: Event): void {
      const target = e.target as Element | null;
      const cell = target?.closest('.cell') as HTMLElement | null;
      if (!cell) return this.#clearHover();
      cell.classList.add('is-hover');
      const detail = { x: cell.dataset['x'], y: cell.dataset['y'], value: Number(cell.dataset['v']) };
      // Anuncio polite al sr-status: replica el detail del evento is-cell-hover.
      this.#srStatusEl.textContent = `${detail.y} · ${detail.x} = ${formatVal(Number(detail.value))}`;
      emit(this, 'is-cell-hover', detail);
    }

    #clearHover(): void {
      this.#svg.querySelectorAll<HTMLElement>('.cell.is-hover').forEach((c) => c.classList.remove('is-hover'));
      // No limpiamos srStatusEl.textContent: los lectores de pantalla polite
      // necesitan mantener el último mensaje hasta que llegue uno nuevo.
    }
  }

  function colorFor(v: number, [lo, hi]: [number, number], palette: string[]): string {
    if (hi === lo) return palette[Math.floor(palette.length / 2)] ?? '#000';
    const t = (v - lo) / (hi - lo);
    const idx = Math.min(palette.length - 1, Math.floor(t * palette.length));
    return palette[idx] ?? '#000';
  }

  function formatVal(v: number): string {
    if (Math.abs(v) >= 10000) return new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
    if (Number.isInteger(v)) return String(v);
    return Number(v.toFixed(2)).toString();
  }

  defineElement('is-heatmap', IsHeatmap);
})();
