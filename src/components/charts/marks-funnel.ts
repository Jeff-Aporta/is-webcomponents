import { svgEl } from '../_shared/svg-chart-engine.js';
import type { ChartCtx } from './chart.js';

/**
 * Marca de embudo (funnel): bandas horizontales apiladas, cada una centrada
 * y con ancho proporcional a su valor respecto al primer paso.
 */

/** Paso del embudo: ratio respecto al primero y caída porcentual respecto al anterior. */
export type FunnelBand = { index: number; ratio: number; dropPct: number };

/**
 * Calcula la proporción y la caída de cada paso del embudo.
 */
export function funnelBands(values: readonly number[]): FunnelBand[] {
  const first = Number(values[0]) || 1;
  return values.map((raw, index: number) => {
    const v = Number(raw) || 0;
    const ratio = first ? v / first : 0;
    const prev = index === 0 ? v : Number(values[index - 1]) || 0;
    const dropPct = prev ? (v / prev) * 100 : 100;
    return { index, ratio, dropPct };
  });
}

export function drawFunnelMarks(ctx: ChartCtx): void {
  const { group, data, plot, colors, addHit, fmt, text } = ctx;
  const ds = data.datasets[0];
  if (!ds) return;
  const values = ds.data.map(Number);
  const bands = funnelBands(values);
  const n = bands.length;
  if (!n) return;

  const rowH = plot.height / n;
  const maxHalfWidth = Math.min(plot.width * 0.22, plot.height * 1.2);
  const cx = plot.x + plot.width / 2;
  const baseColor = colors[0] ?? '';
  const halfWidths = bands.map((b) => Math.max(b.ratio, 0.06) * maxHalfWidth);

  bands.forEach((b: FunnelBand, i: number) => {
    const y0 = plot.y + i * rowH;
    const y1 = y0 + rowH;
    const wTop = halfWidths[i] ?? 0;
    const wBottom = i < n - 1 ? (halfWidths[i + 1] ?? wTop) : wTop * 0.94;
    const opacity = 1 - i * (0.55 / Math.max(n - 1, 1));

    const d = [
      `M${cx - wTop},${y0}`,
      `L${cx + wTop},${y0}`,
      `L${cx + wBottom},${y1}`,
      `L${cx - wBottom},${y1}`,
      'Z',
    ].join(' ');
    const el = svgEl('path', {
      d, fill: baseColor, opacity: opacity.toFixed(2), class: 'mark mark-funnel',
    });
    group.appendChild(el);

    const label = String(data.labels[i] ?? '');
    const pctText = i === 0 ? '' : ` · ${b.dropPct.toFixed(1)}%`;
    const midY = (y0 + y1) / 2;
    const value = values[i] ?? 0;

    const labelEl = svgEl('text', {
      x: cx - wTop - 10, y: midY, 'text-anchor': 'end', 'dominant-baseline': 'middle', fill: text,
      class: 'funnel-label',
    });
    labelEl.textContent = label;
    group.appendChild(labelEl);

    const valueEl = svgEl('text', {
      x: cx + wTop + 10, y: midY, 'text-anchor': 'start', 'dominant-baseline': 'middle', fill: text,
      class: 'funnel-value',
    });
    valueEl.textContent = `${fmt(value)}${pctText}`;
    group.appendChild(valueEl);

    addHit({
      x: cx, y: midY,
      radius: Math.max(wTop, rowH / 2, 12),
      title: label,
      label: ds.label || '',
      value,
      display: `${fmt(value)} · ${b.dropPct.toFixed(1)}%`,
      color: baseColor,
      el,
    });
  });
}
