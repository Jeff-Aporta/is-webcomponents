const SVG_NS = 'http://www.w3.org/2000/svg';

/** Crea un elemento SVG y le aplica atributos, saltando null/undefined.
 *  Reimplementada idéntica en 12 componentes (chart, marks-*, treemap,
 *  heatmap, maps, gantt, mindmap, sequence-diagram, org-chart) — usar esta
 *  en vez de copiarla de nuevo. */
export function svgEl(tag, attrs = {}) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v != null) n.setAttribute(k, v);
  }
  return n;
}

export function scaleLinear(domain, range) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = (d1 - d0) || 1;
  return (v) => r0 + ((v - d0) / span) * (r1 - r0);
}

export function scaleBand(count, range, gapRatio = 0.25) {
  const [r0, r1] = range;
  const n = Math.max(count, 1);
  const step = (r1 - r0) / n;
  const bandwidth = step * (1 - gapRatio);
  return {
    step,
    bandwidth,
    start: (i) => r0 + i * step + (step - bandwidth) / 2,
  };
}

export function niceTicks(min, max, count = 5) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const rawStep = span / count;
  const mag = 10 ** Math.floor(Math.log10(rawStep));
  const norm = rawStep / mag;
  const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

function stepPath(points) {
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    d += ` L${cur.x},${prev.y} L${cur.x},${cur.y}`;
  }
  return d;
}

function catmullRomPath(points, alpha = 0.5) {
  let d = `M${points[0].x},${points[0].y}`;
  const n = points.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + ((p2.x - p0.x) / 6) * alpha * 2;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * alpha * 2;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * alpha * 2;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * alpha * 2;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export function pathLine(points, { curve = 'linear' } = {}) {
  if (!points.length) return '';
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  if (curve === 'natural') return catmullRomPath(points);
  if (curve === 'step') return stepPath(points);
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
}

export function pathArea(points, baselineY, opts) {
  if (!points.length) return '';
  const line = pathLine(points, opts);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L${last.x},${baselineY} L${first.x},${baselineY} Z`;
}

export function polarToCartesian(cx, cy, r, angleRad) {
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

export function pathArc(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const a0 = startAngle - Math.PI / 2;
  const a1 = endAngle - Math.PI / 2;
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  const outerStart = polarToCartesian(cx, cy, rOuter, a0);
  const outerEnd = polarToCartesian(cx, cy, rOuter, a1);
  if (rInner <= 0) {
    return `M${cx},${cy} L${outerStart.x},${outerStart.y} A${rOuter},${rOuter} 0 ${large} 1 ${outerEnd.x},${outerEnd.y} Z`;
  }
  const innerStart = polarToCartesian(cx, cy, rInner, a1);
  const innerEnd = polarToCartesian(cx, cy, rInner, a0);
  return [
    `M${outerStart.x},${outerStart.y}`,
    `A${rOuter},${rOuter} 0 ${large} 1 ${outerEnd.x},${outerEnd.y}`,
    `L${innerStart.x},${innerStart.y}`,
    `A${rInner},${rInner} 0 ${large} 0 ${innerEnd.x},${innerEnd.y}`,
    'Z',
  ].join(' ');
}

export function roundedBarRect(x, y, w, h, radius, edge = 'top') {
  const isVertical = edge === 'top' || edge === 'bottom';
  const r = Math.max(0, Math.min(radius, isVertical ? w / 2 : h / 2, isVertical ? h : w));
  if (r <= 0 || !Number.isFinite(r)) return `M${x},${y} h${w} v${h} h${-w} Z`;
  if (edge === 'top') {
    return [
      `M${x},${y + h}`, `L${x},${y + r}`,
      `Q${x},${y} ${x + r},${y}`,
      `L${x + w - r},${y}`,
      `Q${x + w},${y} ${x + w},${y + r}`,
      `L${x + w},${y + h}`, 'Z',
    ].join(' ');
  }
  if (edge === 'bottom') {
    return [
      `M${x},${y}`, `L${x + w},${y}`,
      `L${x + w},${y + h - r}`,
      `Q${x + w},${y + h} ${x + w - r},${y + h}`,
      `L${x + r},${y + h}`,
      `Q${x},${y + h} ${x},${y + h - r}`,
      'Z',
    ].join(' ');
  }
  if (edge === 'right') {
    return [
      `M${x},${y}`, `L${x + w - r},${y}`,
      `Q${x + w},${y} ${x + w},${y + r}`,
      `L${x + w},${y + h - r}`,
      `Q${x + w},${y + h} ${x + w - r},${y + h}`,
      `L${x},${y + h}`, 'Z',
    ].join(' ');
  }
  return [
    `M${x + w},${y}`, `L${x + r},${y}`,
    `Q${x},${y} ${x},${y + r}`,
    `L${x},${y + h - r}`,
    `Q${x},${y + h} ${x + r},${y + h}`,
    `L${x + w},${y + h}`, 'Z',
  ].join(' ');
}

export function measureText(svgRoot, text, { fontSize = 12, fontFamily = 'sans-serif' } = {}) {
  const t = document.createElementNS(SVG_NS, 'text');
  t.setAttribute('x', '-9999');
  t.setAttribute('y', '-9999');
  t.style.font = `${fontSize}px ${fontFamily}`;
  t.textContent = text;
  svgRoot.appendChild(t);
  const box = t.getBBox();
  svgRoot.removeChild(t);
  return { width: box.width, height: box.height };
}
