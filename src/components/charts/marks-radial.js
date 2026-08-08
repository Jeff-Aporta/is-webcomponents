import { pathArc, polarToCartesian, svgEl } from '../_shared/svg-chart-engine.js';

/**
 * Marks radiales (pie, doughnut, polarArea, radar).
 *
 * En pie/doughnut/polarArea la dimensión categórica son las etiquetas, así que
 * `ctx.sliceMask` indica qué rebanadas siguen visibles según la leyenda.
 */

const TAU = Math.PI * 2;

function sliceColor(ds, index, colors) {
  if (Array.isArray(ds.backgroundColor)) return ds.backgroundColor[index % ds.backgroundColor.length];
  if (typeof ds.backgroundColor === 'string') return ds.backgroundColor;
  return colors[index % colors.length];
}

/** Rebanadas visibles con su valor y su índice original (para el color). */
function visibleSlices(ctx) {
  const ds = ctx.data.datasets[0];
  if (!ds) return { ds: null, slices: [] };
  const mask = ctx.sliceMask;
  const slices = [];
  ds.data.forEach((raw, i) => {
    if (mask && !mask[i]) return;
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    slices.push({ value, index: i, label: String(ctx.data.labels[i] ?? '') });
  });
  return { ds, slices };
}

function drawSliceChart(ctx, innerRatio) {
  const { group, radial, colors, style, addHit, fmt } = ctx;
  const { ds, slices } = visibleSlices(ctx);
  if (!ds || !slices.length) return;

  const total = slices.reduce((sum, s) => sum + Math.abs(s.value), 0) || 1;
  const rOuter = radial.rMax;
  const rInner = rOuter * (innerRatio || 0);

  let angle = 0;
  for (const slice of slices) {
    const sweep = (Math.abs(slice.value) / total) * TAU;
    const start = angle;
    const end = angle + sweep;
    angle = end;

    const color = sliceColor(ds, slice.index, colors);
    const el = svgEl('path', {
      d: pathArc(radial.cx, radial.cy, rOuter, rInner, start, end),
      fill: color,
      class: 'mark mark-slice',
      'stroke-width': slices.length > 1 ? style.sliceGap : 0,
    });
    group.appendChild(el);

    const mid = (start + end) / 2 - Math.PI / 2;
    const rMid = rInner + (rOuter - rInner) / 2;
    const pct = (Math.abs(slice.value) / total) * 100;

    addHit({
      x: radial.cx + rMid * Math.cos(mid),
      y: radial.cy + rMid * Math.sin(mid),
      radius: Math.max((rOuter - rInner) / 2, 14),
      title: slice.label,
      label: ds.label || '',
      value: slice.value,
      display: `${fmt(slice.value)} · ${pct.toFixed(1)}%`,
      color,
      el,
    });

    // Etiqueta dentro de la rebanada sólo si hay espacio de sobra.
    if (pct >= 8 && rOuter - rInner > 26) {
      const t = svgEl('text', {
        x: radial.cx + rMid * Math.cos(mid),
        y: radial.cy + rMid * Math.sin(mid),
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        class: 'slice-value',
      });
      t.textContent = `${Math.round(pct)}%`;
      group.appendChild(t);
    }
  }

  // Total al centro del doughnut: aprovecha el hueco en vez de dejarlo vacío.
  if (rInner > 28) {
    const value = svgEl('text', {
      x: radial.cx, y: radial.cy - 2, 'text-anchor': 'middle', 'dominant-baseline': 'middle', class: 'center-value',
    });
    value.textContent = fmt(total);
    group.appendChild(value);
    const caption = svgEl('text', {
      x: radial.cx, y: radial.cy + 18, 'text-anchor': 'middle', 'dominant-baseline': 'middle', class: 'center-caption',
    });
    caption.textContent = ds.label || 'Total';
    group.appendChild(caption);
  }
}

export function drawPieMarks(ctx) {
  drawSliceChart(ctx, 0);
}

export function drawDoughnutMarks(ctx) {
  drawSliceChart(ctx, ctx.radial.innerRatio);
}

export function drawPolarAreaMarks(ctx) {
  const { group, radial, colors, style, addHit, fmt, grid } = ctx;
  const { ds, slices } = visibleSlices(ctx);
  if (!ds || !slices.length) return;

  const max = Math.max(...slices.map((s) => Math.abs(s.value)), 1);
  const sweep = TAU / slices.length;

  // Anillos de referencia: sin ellos no se puede leer la magnitud del radio.
  for (const f of [0.25, 0.5, 0.75, 1]) {
    group.appendChild(svgEl('circle', {
      cx: radial.cx, cy: radial.cy, r: radial.rMax * f, fill: 'none', stroke: grid, class: 'grid-line',
    }));
  }

  slices.forEach((slice, i) => {
    const r = (Math.abs(slice.value) / max) * radial.rMax;
    const start = i * sweep;
    const end = start + sweep;
    const color = sliceColor(ds, slice.index, colors);

    const el = svgEl('path', {
      d: pathArc(radial.cx, radial.cy, r, 0, start, end),
      fill: color,
      class: 'mark mark-slice',
      'stroke-width': style.sliceGap,
    });
    group.appendChild(el);

    const mid = (start + end) / 2 - Math.PI / 2;
    addHit({
      x: radial.cx + (r / 2) * Math.cos(mid),
      y: radial.cy + (r / 2) * Math.sin(mid),
      radius: Math.max(r / 2, 14),
      title: slice.label,
      label: ds.label || '',
      value: slice.value,
      display: fmt(slice.value),
      color,
      el,
    });
  });
}

export function drawRadarMarks(ctx) {
  const { group, data, radial, colors, fills, style, grid, addHit, fmt } = ctx;
  const labels = data.labels;
  const axes = labels.length;
  if (!axes) return;

  const values = data.datasets.flatMap((d) => d.data.map((v) => Math.abs(Number(v)))).filter(Number.isFinite);
  const max = Math.max(...values, 1);
  const angleAt = (i) => (i / axes) * TAU - Math.PI / 2;

  // Rejilla poligonal + radios
  for (const f of [0.25, 0.5, 0.75, 1]) {
    const pts = labels.map((_, i) => polarToCartesian(radial.cx, radial.cy, radial.rMax * f, angleAt(i)));
    group.appendChild(svgEl('path', {
      d: `${pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')} Z`,
      fill: 'none',
      stroke: grid,
      class: 'grid-line',
    }));
  }

  labels.forEach((label, i) => {
    const angle = angleAt(i);
    const end = polarToCartesian(radial.cx, radial.cy, radial.rMax, angle);
    group.appendChild(svgEl('line', {
      x1: radial.cx, y1: radial.cy, x2: end.x, y2: end.y, stroke: grid, class: 'grid-line',
    }));

    const at = polarToCartesian(radial.cx, radial.cy, radial.rMax + 16, angle);
    const cos = Math.cos(angle);
    const anchor = Math.abs(cos) < 0.3 ? 'middle' : cos > 0 ? 'start' : 'end';
    const t = svgEl('text', {
      x: at.x, y: at.y, 'text-anchor': anchor, 'dominant-baseline': 'middle', class: 'tick-label',
    });
    t.textContent = String(label);
    group.appendChild(t);
  });

  data.datasets.forEach((ds) => {
    const color = ds.borderColor || colors[ds.__i % colors.length];
    const fill = ds.backgroundColor || fills[ds.__i % fills.length];
    const pts = ds.data.map((v, i) => {
      const value = Number(v) || 0;
      return {
        ...polarToCartesian(radial.cx, radial.cy, (Math.abs(value) / max) * radial.rMax, angleAt(i)),
        value,
        index: i,
      };
    });
    if (!pts.length) return;

    const d = `${pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')} Z`;
    // Sin la clase mark-line: esa regla fuerza fill:none y borraría el área rellena.
    const poly = svgEl('path', {
      d, fill, stroke: color, 'stroke-width': style.lineWidth, class: 'mark mark-radar',
    });
    if (ds.label) poly.dataset.seriesLabel = ds.label;
    group.appendChild(poly);

    pts.forEach((p) => {
      const dot = svgEl('circle', { cx: p.x, cy: p.y, r: style.pointRadius, fill: color, class: 'mark mark-point' });
      group.appendChild(dot);
      addHit({
        x: p.x, y: p.y, radius: 14,
        title: String(labels[p.index] ?? ''),
        label: ds.label || '',
        value: p.value,
        display: fmt(p.value),
        color,
        el: dot,
      });
    });
  });
}
