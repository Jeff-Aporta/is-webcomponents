/**
 * Etiquetas de arista = actores rectangulares.
 *
 * En PNG las chips se pintaban en el punto medio de la arista y acababan
 * encima de las cajas o unas sobre otras. Aquí cada rótulo es un rectángulo
 * que no puede solaparse con obstáculos (componentes, nodos, clases…) ni
 * con otras chips. Se busca sitio a lo largo del path, no solo en Y.
 */

import { spreadOrthogonalPaths } from './diagram-edge-spread.js';

export const EDGE_ACTOR_H = 16;

export function edgeActorWidth(text: number) {
  return Math.max(28, String(text ?? '').length * 5.6 + 10);
}

/** Vértices de un `d` ortogonal `M x,y L x,y …`. */
export function parsePathPoints(d: string) {
  if (!d) return [];
  const pts = [];
  const re = /[ML]\s*([\d.-]+)[,\s]+([\d.-]+)/gi;
  let m;
  while ((m = re.exec(String(d)))) {
    pts.push({ x: Number(m[1]), y: Number(m[2]) });
  }
  return pts;
}

/** Punto al `t` (0–1) de la longitud del polyline. */
export function pointAtFraction(pts, t: number = 0.5) {
  if (!pts?.length) return { x: 0, y: 0 };
  if (pts.length === 1) return { x: pts[0].x, y: pts[0].y };
  let total = 0;
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const len = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    segs.push({ a: pts[i], b: pts[i + 1], len });
    total += len;
  }
  if (total < 1) return { x: pts[0].x, y: pts[0].y };
  let walk = total * Math.min(1, Math.max(0, t));
  for (const s of segs) {
    if (walk <= s.len) {
      const k = s.len ? walk / s.len : 0;
      return { x: s.a.x + (s.b.x - s.a.x) * k, y: s.a.y + (s.b.y - s.a.y) * k };
    }
    walk -= s.len;
  }
  const last = pts[pts.length - 1];
  return { x: last.x, y: last.y };
}

function densify(pts: string, step: number = 14) {
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

function overlap(a, b, padX = 4, padY = 6) {
  return a.x - padX < b.x + b.w
    && a.x + a.w + padX > b.x
    && a.y - padY < b.y + b.h
    && a.y + a.h + padY > b.y;
}

/** Empuja en Y hasta que ningún par de actores se pise. */
function separateActors(placed, obstacles, canvas) {
  for (let n = 0; n < 80; n++) {
    let moved = false;
    for (let i = 0; i < placed.length; i++) {
      for (let j = 0; j < placed.length; j++) {
        if (i === j) continue;
        if (!overlap(placed[i], placed[j])) continue;
        placed[j].y += EDGE_ACTOR_H + 6;
        moved = true;
      }
      for (const o of obstacles) {
        if (!overlap(placed[i], o, 8, 8)) continue;
        placed[i].y += EDGE_ACTOR_H + 4;
        moved = true;
      }
      placed[i].x = Math.max(4, placed[i].x);
      placed[i].y = Math.max(4, placed[i].y);
    }
    if (!moved) break;
  }
  void canvas;
}

function spiral(maxR = 16) {
  const out = [{ dx: 0, dy: 0 }];
  for (let r = 1; r <= maxR; r++) {
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

const SPIRAL = spiral(16);
const SPIRAL_GLUE = spiral(2);

/**
 * Coloca chips de `edges[].label` como actores.
 * Mutates edges: labelX, labelY, labelW, labelH.
 * @returns {{ width: number, height: number, actors: Array<{x,y,w,h}> }}
 */
export function placeEdgeActors({
  edges = [],
  obstacles = [],
  canvas = { width: 800, height: 600 },
  glue = false,
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
    const mid = pointAtFraction(along.length >= 2 ? along : raw.length >= 2 ? raw : ends, 0.5);
    const ranked = along
      .map((p) => ({ p, d: Math.hypot(p.x - mid.x, p.y - mid.y) }))
      .sort((a, b) => a.d - b.d);
    const sample = ranked.length ? ranked.map((x) => x.p) : [mid];
    const offsets = glue ? SPIRAL_GLUE : SPIRAL;

    let best = null;
    search:
    for (const p of sample) {
      for (const s of offsets) {
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
    e._actor = best;
    e.labelW = w;
    e.labelH = h;
  }

  if (!glue) separateActors(placed, obstacles, canvas);
  for (const e of labeled) {
    const r = e._actor;
    delete e._actor;
    if (!r) continue;
    e.labelX = r.x + e.labelW / 2;
    e.labelY = r.y + e.labelH / 2;
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
export function applyEdgeActorLayout(layout, obstacles, opts = {}) {
  const edges = edgeListOf(layout);
  if (!edges) return layout;
  if (opts.spread !== false) spreadOrthogonalPaths(edges);
  const r = placeEdgeActors({
    edges,
    obstacles: obstacles ?? [],
    canvas: { width: layout.width, height: layout.height },
    glue: opts.glue !== false,
  });
  layout.width = r.width;
  layout.height = r.height;
  return layout;
}
