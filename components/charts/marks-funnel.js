/**
 * Marca de embudo (funnel): bandas horizontales apiladas, cada una centrada
 * y con ancho proporcional a su valor respecto al primer paso.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v != null) n.setAttribute(k, v);
  }
  return n;
}

/**
 * Calcula la proporción y la caída de cada paso del embudo.
 * @param {number[]} values
 * @returns {{index:number, ratio:number, dropPct:number}[]}
 */
export function funnelBands(values) {
  const first = Number(values[0]) || 1;
  return values.map((raw, index) => {
    const v = Number(raw) || 0;
    const ratio = first ? v / first : 0;
    const prev = index === 0 ? v : Number(values[index - 1]) || 0;
    const dropPct = prev ? (v / prev) * 100 : 100;
    return { index, ratio, dropPct };
  });
}

export function drawFunnelMarks(ctx) {
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
  const baseColor = colors[0];
  const halfWidths = bands.map((b) => Math.max(b.ratio, 0.06) * maxHalfWidth);

  bands.forEach((b, i) => {
    const y0 = plot.y + i * rowH;
    const y1 = y0 + rowH;
    const wTop = halfWidths[i];
    const wBottom = i < n - 1 ? halfWidths[i + 1] : halfWidths[i] * 0.94;
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
    valueEl.textContent = `${fmt(values[i])}${pctText}`;
    group.appendChild(valueEl);

    addHit({
      x: cx, y: midY,
      radius: Math.max(wTop, rowH / 2, 12),
      title: label,
      label: ds.label || '',
      value: values[i],
      display: `${fmt(values[i])} · ${b.dropPct.toFixed(1)}%`,
      color: baseColor,
      el,
    });
  });
}
