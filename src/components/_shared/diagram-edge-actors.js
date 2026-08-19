/**
 * Etiquetas de arista = actores rectangulares.
 *
 * En PNG las chips se pintaban en el punto medio de la arista y acababan
 * encima de las cajas o unas sobre otras. Aquí cada rótulo es un rectángulo
 * que no puede solaparse con obstáculos (componentes, nodos, clases…) ni
 * con otras chips. Se busca sitio a lo largo del path, no solo en Y.
 */

export const EDGE_ACTOR_H = 16;

export function edgeActorWidth(text) {
  return Math.max(28, String(text ?? '').length * 5.6 + 10);
}

/** Vértices de un `d` ortogonal `M x,y L x,y …`. */
export function parsePathPoints(d) {
  if (!d) return [];
  const pts = [];
  const re = /[ML]\s*([\d.-]+)[,\s]+([\d.-]+)/gi;
  let m;
  while ((m = re.exec(String(d)))) {
    pts.push({ x: Number(m[1]), y: Number(m[2]) });
  }
  return pts;
}

function densify(pts, step = 14) {
  if (pts.length < 2) return pts.slice();
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const n = Math.max(1, Math.ceil(len / step));
    for (let k = 0; k < n; k++) {
      out.push({ x: a.x + (dx * k) / n, y: a.y + (dy * k) / n });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function overlap(a, b, pad = 5) {
  return a.x - pad < b.x + b.w
    && a.x + a.w + pad > b.x
    && a.y - pad < b.y + b.h
    && a.y + a.h + pad > b.y;
}

function spiral() {
  const out = [{ dx: 0, dy: 0 }];
  for (let r = 1; r <= 16; r++) {
    for (let dx = -r; dx <= r; dx++) {
      out.push({ dx: dx * 12, dy: -r * 12 });
      out.push({ dx: dx * 12, dy: r * 12 });
    }
    for (let dy = -r + 1; dy <= r - 1; dy++) {
      out.push({ dx: -r * 12, dy: dy * 12 });
      out.push({ dx: r * 12, dy: dy * 12 });
    }
  }
  return out;
}

const SPIRAL = spiral();

/**
 * Coloca chips de `edges[].label` como actores.
 * Mutates edges: labelX, labelY, labelW, labelH.
 * @returns {{ width: number, height: number, actors: Array<{x,y,w,h}> }}
 */
export function placeEdgeActors({
  edges = [],
  obstacles = [],
  canvas = { width: 800, height: 600 },
} = {}) {
  const placed = [];
  const labeled = edges
    .filter((e) => e && e.label)
    .sort((a, b) => String(b.label).length - String(a.label).length);

  for (const e of labeled) {
    const w = edgeActorWidth(e.label);
    const h = EDGE_ACTOR_H;
    const raw = parsePathPoints(e.path);
    const ends = [
      { x: Number(e.fromX) || 0, y: Number(e.fromY) || 0 },
      { x: Number(e.toX) || 0, y: Number(e.toY) || 0 },
    ];
    const along = densify(raw.length >= 2 ? raw : ends);
    const lo = Math.floor(along.length * 0.22);
    const hi = Math.max(lo + 1, Math.ceil(along.length * 0.78));
    const seeds = along.slice(lo, hi);
    const sample = seeds.length ? seeds.filter((_, i) => i % 2 === 0) : along;

    let best = null;
    search:
    for (const p of sample) {
      for (const s of SPIRAL) {
        const rect = {
          x: p.x + s.dx - w / 2,
          y: p.y + s.dy - h / 2,
          w,
          h,
        };
        if (rect.x < 4 || rect.y < 4) continue;
        if (obstacles.some((o) => overlap(rect, o))) continue;
        if (placed.some((o) => overlap(rect, o))) continue;
        best = rect;
        break search;
      }
    }
    if (!best) {
      best = {
        x: Math.max(4, (Number(e.fromX) + Number(e.toX)) / 2 - w / 2),
        y: canvas.height + 8 + placed.length * (h + 6),
        w,
        h,
      };
      while (placed.some((o) => overlap(best, o)) || obstacles.some((o) => overlap(best, o))) {
        best.y += h + 6;
      }
    }
    placed.push(best);
    e.labelX = best.x + w / 2;
    e.labelY = best.y + h / 2;
    e.labelW = w;
    e.labelH = h;
  }

  let width = canvas.width;
  let height = canvas.height;
  for (const r of placed) {
    width = Math.max(width, r.x + r.w + 16);
    height = Math.max(height, r.y + r.h + 16);
  }
  return { width, height, actors: placed };
}

function edgeListOf(layout) {
  if (layout?.edges?.length) return layout.edges;
  if (layout?.relations?.length) return layout.relations;
  if (layout?.links?.length) return layout.links;
  return null;
}

/** Aplica actores al layout y agranda el lienzo si hace falta. */
export function applyEdgeActorLayout(layout, obstacles) {
  const edges = edgeListOf(layout);
  if (!edges) return layout;
  const r = placeEdgeActors({
    edges,
    obstacles: obstacles ?? [],
    canvas: { width: layout.width, height: layout.height },
  });
  layout.width = r.width;
  layout.height = r.height;
  return layout;
}
