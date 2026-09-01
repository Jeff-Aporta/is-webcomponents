/**
 * Separa polilíneas ortogonales que corren pegadas.
 *
 * El A* reutiliza el mismo corredor: varias aristas salen como una sola raya.
 * Aquí se desplazan los vértices interiores de tramos paralelos que se solapan,
 * un poco a cada lado, para poder seguir cada línea.
 */

function parsePathPoints(d: string) {
  if (!d) return [];
  const pts = [];
  const re = /[ML]\s*([\d.-]+)[,\s]+([\d.-]+)/gi;
  let m;
  while ((m = re.exec(String(d)))) {
    pts.push({ x: Number(m[1]), y: Number(m[2]) });
  }
  return pts;
}

function rangesOverlap(a0: number, a1: number, b0: number, b1: number, min = 12) {
  return Math.min(a1, b1) - Math.max(a0, b0) > min;
}

function toPath(pts) {
  if (!pts.length) return '';
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
}

function collectRuns(items, vertical) {
  const runs = [];
  for (let ii = 0; ii < items.length; ii++) {
    const pts = items[ii].pts;
    let i = 0;
    while (i < pts.length - 1) {
      const aligned = vertical
        ? Math.abs(pts[i].x - pts[i + 1].x) < 0.6
        : Math.abs(pts[i].y - pts[i + 1].y) < 0.6;
      if (!aligned) { i += 1; continue; }
      let j = i + 1;
      while (j < pts.length - 1) {
        const next = vertical
          ? Math.abs(pts[j].x - pts[j + 1].x) < 0.6
          : Math.abs(pts[j].y - pts[j + 1].y) < 0.6;
        if (!next) break;
        j += 1;
      }
      const pos = vertical ? pts[i].x : pts[i].y;
      const a = vertical
        ? Math.min(pts[i].y, pts[j].y)
        : Math.min(pts[i].x, pts[j].x);
      const b = vertical
        ? Math.max(pts[i].y, pts[j].y)
        : Math.max(pts[i].x, pts[j].x);
      if (b - a >= 24 && j - i >= 1) {
        runs.push({ ii, i, j, pos, a, b });
      }
      i = j;
    }
  }
  return runs;
}

function spreadAxis(items, vertical, gap) {
  const runs = collectRuns(items, vertical);
  const buckets = new Map();
  for (const r of runs) {
    const k = Math.round(r.pos / 5) * 5;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(r);
  }
  for (const group of buckets.values()) {
    const sorted = group.slice().sort((a, b) => a.a - b.a);
    const clusters = [];
    for (const r of sorted) {
      const hit = clusters.find((c) => c.some((o) => rangesOverlap(o.a, o.b, r.a, r.b)));
      if (hit) hit.push(r);
      else clusters.push([r]);
    }
    for (const cluster of clusters) {
      const byEdge = new Map();
      for (const r of cluster) {
        const prev = byEdge.get(r.ii);
        if (!prev || (r.b - r.a) > (prev.b - prev.a)) byEdge.set(r.ii, r);
      }
      const uniq = [...byEdge.values()].sort((a, b) => a.ii - b.ii);
      if (uniq.length < 2) continue;
      uniq.forEach((r, idx) => {
        const delta = (idx - (uniq.length - 1) / 2) * gap;
        const pts = items[r.ii].pts;
        for (let k = r.i; k <= r.j; k++) {
          if (k === 0 || k === pts.length - 1) continue;
          if (vertical) pts[k].x += delta;
          else pts[k].y += delta;
        }
      });
    }
  }
}

/** Mutates `edges[].path`. */
export function spreadOrthogonalPaths(edges, gap = 7) {
  const items = (edges ?? [])
    .filter((e) => e && e.path)
    .map((e) => ({ e, pts: parsePathPoints(e.path).map((p) => ({ x: p.x, y: p.y })) }));
  if (items.length < 2) return edges;
  spreadAxis(items, true, gap);
  spreadAxis(items, false, gap);
  for (const it of items) it.e.path = toPath(it.pts);
  return edges;
}
