import { roundedBarRect, svgEl } from '../_shared/svg-chart-engine.js';
import { getStatusColor } from '../_shared/chart-palette.js';

/**
 * Marca de cascada (waterfall): cada punto es un delta sobre el acumulado,
 * salvo los índices en `totals`, que son barras absolutas medidas desde cero.
 */

/**
 * Calcula el rango de cada barra a partir de los valores brutos.
 * @param {(number|null|undefined)[]} values - deltas, salvo en los índices de `totals`.
 * @param {number[]} totals - índices que son barras absolutas (desde cero).
 * @returns {{index:number, start:number, end:number, kind:'up'|'down'|'total'}[]}
 */
export function waterfallBars(values, totals) {
  const totalSet = new Set(totals || []);
  let running = 0;
  return values.map((raw, index) => {
    if (totalSet.has(index)) {
      const val = Number.isFinite(raw) ? Number(raw) : running;
      running = val;
      return { index, start: 0, end: val, kind: 'total' };
    }
    const delta = Number(raw) || 0;
    const start = running;
    const end = start + delta;
    running = end;
    return { index, start, end, kind: delta >= 0 ? 'up' : 'down' };
  });
}

export function drawWaterfallMarks(ctx) {
  const { group, data, band, vScale, colors, style, addHit, horizontal, fmt, grid, pt } = ctx;
  if (!band) return;
  const ds = data.datasets[0];
  if (!ds) return;

  const host = ctx.svg.getRootNode().host || ctx.svg;
  const successColor = getStatusColor(host, 'success') || '#22c55e';
  const dangerColor = getStatusColor(host, 'danger') || '#ef4444';
  const totalColor = colors[0];

  const bars = waterfallBars(ds.data, ds.totals || []);
  const gap = style.barGap;
  const radius = style.barRadius;

  const rects = bars.map((bar, i) => {
    const slotStart = band.start(i);
    const slotSize = Math.max(band.bandwidth - gap, 1);
    const catStart = slotStart + (band.bandwidth - slotSize) / 2;
    const v0 = vScale(bar.start);
    const v1 = vScale(bar.end);
    const vLo = Math.min(v0, v1);
    const vSpan = Math.max(Math.abs(v1 - v0), 1);
    const color = bar.kind === 'total' ? totalColor : bar.kind === 'up' ? successColor : dangerColor;
    const edge = horizontal
      ? (bar.end >= bar.start ? 'right' : 'left')
      : (bar.end >= bar.start ? 'top' : 'bottom');
    const rect = horizontal
      ? { x: vLo, y: catStart, w: vSpan, h: slotSize }
      : { x: catStart, y: vLo, w: slotSize, h: vSpan };
    return { ...bar, rect, edge, color, catStart, slotSize, vLo, vSpan };
  });

  rects.forEach((r, i) => {
    const el = svgEl('path', {
      d: roundedBarRect(r.rect.x, r.rect.y, r.rect.w, r.rect.h, radius, r.edge),
      fill: r.color,
      class: 'mark mark-waterfall',
    });
    group.appendChild(el);

    const label = String(data.labels[i] ?? '');
    const value = r.kind === 'total' ? r.end : r.end - r.start;
    const catCenter = r.catStart + r.slotSize / 2;
    const valueCenter = r.vLo + r.vSpan / 2;
    const hitCenter = pt(catCenter, valueCenter);

    addHit({
      ...hitCenter,
      radius: Math.max(r.slotSize / 2, r.vSpan / 2, 12),
      title: label,
      label: ds.label || '',
      value,
      display: fmt(value),
      color: r.color,
      el,
    });
  });

  // Conectores angulares (snap a 8px) entre el final de una barra y el
  // arranque de la siguiente: un único tramo horizontal en el eje de valor.
  for (let i = 0; i < rects.length - 1; i++) {
    const a = rects[i];
    const b = rects[i + 1];
    const catEndA = a.catStart + a.slotSize;
    const catStartB = b.catStart;
    const yLevel = Math.round(vScale(a.end) / 8) * 8;
    const p1 = pt(catEndA, yLevel);
    const p2 = pt(catStartB, yLevel);
    group.appendChild(svgEl('line', {
      x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
      stroke: grid, 'stroke-width': 1, class: 'waterfall-connector',
    }));
  }
}

/**
 * Rango real que ocupa la cascada en el eje de valor: el recorrido acumulado,
 * no los deltas sueltos. Sin esto el eje se escala corto y las barras se salen.
 */
drawWaterfallMarks.domainValues = (datasets) => {
  const ds = datasets[0];
  if (!ds) return [0];
  const bars = waterfallBars(ds.data, ds.totals || []);
  const out = [0];
  for (const b of bars) out.push(b.start, b.end);
  return out;
};
