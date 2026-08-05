import { roundedBarRect, pathLine, pathArea } from '../_shared/svg-chart-engine.js';

/**
 * Marks cartesianas (bar, line, scatter, bubble).
 *
 * El ctx viene de `chart.js`. En charts de categoría se trabaja en espacio
 * (categoría, valor) y `ctx.pt(c, v)` lo mapea a pantalla, de modo que
 * `index-axis="y"` (barras horizontales) sale gratis.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v != null) n.setAttribute(k, v);
  }
  return n;
}

/** Posición en píxeles del cero (o del borde del dominio si el cero queda fuera). */
function baselinePos(ctx) {
  const [lo, hi] = ctx.vDomain;
  return ctx.vScale(Math.max(lo, Math.min(0, hi)));
}

/** Línea guía que cruza el área de plot en la categoría apuntada. */
function crosshairFor(ctx, catCenter) {
  const { plot, horizontal } = ctx;
  return horizontal
    ? { x1: plot.x, x2: plot.x + plot.width, y1: catCenter, y2: catCenter }
    : { x1: catCenter, x2: catCenter, y1: plot.y, y2: plot.y + plot.height };
}

/** Curva a partir de las props de dataset de Chart.js (`tension`, `stepped`). */
function curveOf(ds) {
  if (ds.curve) return ds.curve;
  if (ds.stepped) return 'step';
  return Number(ds.tension) > 0 ? 'natural' : 'linear';
}

export function drawBarMarks(ctx) {
  const { group, data, band, vScale, colors, opts, style, addHit, horizontal, fmt } = ctx;
  if (!band) return; // datasets numéricos x/y no son de barras

  const datasets = data.datasets;
  const n = datasets.length || 1;
  const base = baselinePos(ctx);
  const gap = style.barGap;

  data.labels.forEach((label, i) => {
    const slotStart = band.start(i);
    const slotSize = band.bandwidth;
    const center = slotStart + slotSize / 2;
    let cumUp = 0;
    let cumDown = 0;

    datasets.forEach((ds, di) => {
      const value = Number(ds.data[i]);
      if (!Number.isFinite(value)) return;

      // Extensión en el eje de categoría
      const sub = opts.stacked ? slotSize : slotSize / n;
      const catStart = opts.stacked ? slotStart : slotStart + di * sub;
      const catSize = Math.max(opts.stacked ? sub : sub - gap, 1);

      // Extensión en el eje de valor
      let v0;
      let v1;
      if (opts.stacked) {
        const prev = value >= 0 ? cumUp : cumDown;
        v0 = vScale(prev);
        v1 = vScale(prev + value);
        if (value >= 0) cumUp += value; else cumDown += value;
      } else {
        v0 = base;
        v1 = vScale(value);
      }

      const vLo = Math.min(v0, v1);
      const vSpan = Math.abs(v1 - v0);
      const radius = Number.isFinite(Number(ds.borderRadius)) ? Number(ds.borderRadius) : style.barRadius;
      const positive = value >= 0;
      const edge = horizontal ? (positive ? 'right' : 'left') : (positive ? 'top' : 'bottom');

      const rect = horizontal
        ? { x: vLo, y: catStart, w: vSpan, h: catSize }
        : { x: catStart, y: vLo, w: catSize, h: vSpan };

      const color = ds.backgroundColor || colors[ds.__i % colors.length];
      const el = svgEl('path', {
        d: roundedBarRect(rect.x, rect.y, rect.w, rect.h, radius, edge),
        fill: color,
        class: 'mark mark-bar',
      });
      group.appendChild(el);

      const hitCenter = horizontal
        ? { x: vLo + vSpan / 2, y: catStart + catSize / 2 }
        : { x: catStart + catSize / 2, y: vLo + vSpan / 2 };

      addHit({
        ...hitCenter,
        radius: Math.max(catSize / 2, vSpan / 2, 12),
        title: String(label),
        label: ds.label || '',
        value,
        display: fmt(value),
        color,
        el,
        crosshair: crosshairFor(ctx, center),
      });
    });
  });
}

export function drawLineMarks(ctx) {
  const { group, data, band, xScale, vScale, yScale, plot, colors, fills, style, addHit, numeric, fmt } = ctx;
  const valueScale = numeric ? yScale : vScale;

  data.datasets.forEach((ds) => {
    const color = ds.borderColor || colors[ds.__i % colors.length];
    const fill = ds.backgroundColor || fills[ds.__i % fills.length];
    const curve = curveOf(ds);
    const lineWidth = Number.isFinite(Number(ds.borderWidth)) ? Number(ds.borderWidth) : style.lineWidth;
    const pointRadius = Number.isFinite(Number(ds.pointRadius)) ? Number(ds.pointRadius) : style.pointRadius;

    const points = [];
    ds.data.forEach((raw, i) => {
      const value = numeric ? Number(raw.y) : Number(raw);
      if (!Number.isFinite(value)) return;
      const cat = numeric ? xScale(Number(raw.x)) : band.start(i) + band.bandwidth / 2;
      // Los datasets numéricos ya vienen en coordenadas x/y; sólo los de
      // categoría se remapean según index-axis.
      const pos = numeric || !ctx.pt
        ? { x: cat, y: valueScale(value) }
        : ctx.pt(cat, valueScale(value));
      points.push({ ...pos, value, index: i });
    });
    if (!points.length) return;

    // Chart.js no rellena por defecto: sólo si el dataset lo pide.
    if (ds.fill) {
      group.appendChild(svgEl('path', {
        d: pathArea(points, plot.y + plot.height, { curve }),
        fill,
        stroke: 'none',
        class: 'mark mark-area',
      }));
    }

    const line = svgEl('path', {
      d: pathLine(points, { curve }),
      stroke: color,
      'stroke-width': lineWidth,
      class: 'mark mark-line',
    });
    if (ds.label) line.dataset.seriesLabel = ds.label;
    group.appendChild(line);

    if (pointRadius > 0) {
      points.forEach((p) => {
        const dot = svgEl('circle', { cx: p.x, cy: p.y, r: pointRadius, fill: color, class: 'mark mark-point' });
        group.appendChild(dot);
        addHit({
          x: p.x, y: p.y, radius: Math.max(pointRadius * 3, 14),
          title: numeric ? undefined : String(data.labels[p.index] ?? ''),
          label: ds.label || '',
          value: p.value,
          display: fmt(p.value),
          color,
          el: dot,
          crosshair: crosshairFor(ctx, ctx.horizontal ? p.y : p.x),
        });
      });
    }
  });
}

export function drawScatterMarks(ctx) {
  const { group, data, xScale, yScale, colors, style, addHit, fmt } = ctx;
  if (!xScale || !yScale) return;

  data.datasets.forEach((ds) => {
    const color = ds.borderColor || colors[ds.__i % colors.length];
    const r = Number.isFinite(Number(ds.pointRadius)) ? Number(ds.pointRadius) : Math.max(style.pointRadius + 1, 4);
    ds.data.forEach((pt) => {
      const x = xScale(Number(pt.x));
      const y = yScale(Number(pt.y));
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const el = svgEl('circle', { cx: x, cy: y, r, fill: color, class: 'mark mark-point' });
      group.appendChild(el);
      addHit({
        x, y, radius: Math.max(r * 3, 14),
        label: ds.label || '',
        value: pt.y,
        display: `${fmt(Number(pt.x))} · ${fmt(Number(pt.y))}`,
        color,
        el,
      });
    });
  });
}

export function drawBubbleMarks(ctx) {
  const { group, data, xScale, yScale, colors, fills, addHit, fmt } = ctx;
  if (!xScale || !yScale) return;

  data.datasets.forEach((ds) => {
    const border = ds.borderColor || colors[ds.__i % colors.length];
    const fill = ds.backgroundColor || fills[ds.__i % fills.length];
    ds.data.forEach((pt) => {
      const x = xScale(Number(pt.x));
      const y = yScale(Number(pt.y));
      // Chart.js interpreta `r` en píxeles.
      const r = Math.max(Number(pt.r) || 5, 2);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const el = svgEl('circle', {
        cx: x, cy: y, r,
        fill,
        stroke: border,
        'stroke-width': 1.5,
        class: 'mark mark-bubble',
      });
      group.appendChild(el);
      addHit({
        x, y, radius: r + 8,
        label: ds.label || '',
        value: pt.y,
        display: `${fmt(Number(pt.x))} · ${fmt(Number(pt.y))} · r ${fmt(r)}`,
        color: border,
        el,
      });
    });
  });
}
