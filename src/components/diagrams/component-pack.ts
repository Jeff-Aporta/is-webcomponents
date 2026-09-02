/**
 * Empaque de componentes y ruteo que no atraviesa cajas.
 *
 * Las posiciones del payload son la semilla. Si hay paquetes, se reordenan
 * en columnas con corredor; el contorno del paquete es la unión ortogonal
 * (ángulos rectos) de sus hijos, no un rectángulo vacío.
 */

import type { Arista, Caja, Componente, Lado, OpcionesEmpaque, Paquete, Punto } from '../_shared/diagram-tipos.js';

export const COL_GUTTER = 52;
export const PKG_CORRIDOR = 72;
export const PKG_PAD = 16;
export const PKG_TAB = 22;
/** Hueco filas: C+O+stem + un carril de arista. */
export const ROW_GAP = 64;
/** Distancia mínima entre cajas si el consumidor no pone `min-gap`. */
export const DEFAULT_MIN_GAP = ROW_GAP;
/** Holgura arista vs perímetro. */
export const EDGE_CLEARANCE = 14;
/** Aire extra alrededor del título de paquete: 14 px no basta, se lee mal. */
export const TITLE_CLEARANCE = 22;

export function packDiagram(
  packages: Paquete[],
  components: Componente[],
  edges: readonly Arista[] = [],
  opts: OpcionesEmpaque = {},
): void {
  if (opts.mode === 'manual') return;
  const ungroup = new Set(opts.ungroup ?? []);
  if (ungroup.size) {
    for (const c of components) {
      if (ungroup.has(c.package)) c.package = undefined;
    }
    for (let i = packages.length - 1; i >= 0; i--) {
      if (ungroup.has(packages[i].id)) packages.splice(i, 1);
    }
  }
  const gaps = resolvePackingGaps(opts);
  const packed = { ...opts, ...gaps };
  if (opts.mode === 'triptych') {
    packTriptych(packages, components, edges, packed);
    return;
  }
  if (!packages?.length) return;
  packPackageColumns(packages, components, gaps.colGutter, gaps.pkgCorridor, gaps.rowGap);
}

/**
 * Distancia mínima entre cajas. `minGap` es el piso; row/col/corredor
 * concretos ganan si son más grandes.
 */
export function resolvePackingGaps(opts: OpcionesEmpaque = {}) {
  const raw = Number(opts.minGap);
  const floor = Number.isFinite(raw) && raw > 0 ? raw : 0;
  const pick = (v: unknown, fallback: number): number => {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) return Math.max(n, floor);
    return floor > 0 ? floor : fallback;
  };
  return {
    rowGap: pick(opts.rowGap, ROW_GAP),
    colGutter: pick(opts.colGutter, COL_GUTTER),
    sourceGap: pick(opts.sourceGap, DEFAULT_MIN_GAP),
    pkgCorridor: pick(opts.pkgCorridor, PKG_CORRIDOR),
  };
}

function packPackageColumns(
  packages: Paquete[],
  components: Componente[],
  gut: number = COL_GUTTER,
  corridor: number = PKG_CORRIDOR,
  rowGap: number = ROW_GAP,
): void {
  const kidsOf = (p: Paquete) => components.filter((c) => c.package === p.id);
  const sorted = packages.filter((p) => kidsOf(p).length).sort((a, b) => a.x - b.x || a.y - b.y);
  if (!sorted.length) return;
  const pkgCols = [];
  for (const p of sorted) {
    const last = pkgCols[pkgCols.length - 1];
    if (last && p.x < last.xMax - 20) last.items.push(p);
    else pkgCols.push({ items: [p], xMax: p.x + p.w });
  }
  let cursorX = Math.min(...sorted.map((p) => p.x));
  for (const pc of pkgCols) {
    pc.items.sort((a, b) => a.y - b.y);
    let y = pc.items[0].y;
    let colW = 0;
    for (const p of pc.items) {
      p.x = cursorX;
      p.y = y;
      packPackage(p, kidsOf(p), gut, rowGap);
      y = p.y + p.h + 20;
      colW = Math.max(colW, p.w);
    }
    cursorX += colW + corridor;
  }
}

function inferSources(components: readonly Componente[], edges: readonly Arista[]) {
  const out = new Map();
  const inn = new Map();
  for (const c of components) {
    out.set(c.id, 0);
    inn.set(c.id, 0);
  }
  for (const e of edges ?? []) {
    if (e.from && out.has(e.from)) out.set(e.from, out.get(e.from) + 1);
    if (e.to && inn.has(e.to)) inn.set(e.to, inn.get(e.to) + 1);
  }
  return components.filter((c) => out.get(c.id) > 0 && inn.get(c.id) === 0);
}

function boundsOf(items: readonly Caja[]) {
  const x = Math.min(...items.map((c) => c.x));
  const y = Math.min(...items.map((c) => c.y));
  return {
    x,
    y,
    w: Math.max(...items.map((c) => c.x + c.w)) - x,
    h: Math.max(...items.map((c) => c.y + c.h)) - y,
  };
}

/**
 * Cada origen (consumidor) en un lado distinto del clúster destino:
 * left / top / bottom / right. Evita un solo corredor saturado.
 */
function packTriptych(
  packages: Paquete[],
  components: Componente[],
  edges: readonly Arista[],
  opts: OpcionesEmpaque,
): void {
  const listed = opts.sources?.length
    ? opts.sources.map((id) => components.find((c) => c.id === id)).filter(Boolean)
    : inferSources(components, edges);
  const sourceSet = new Set(listed.map((c) => c.id));
  const rest = components.filter((c) => !sourceSet.has(c.id));
  if (packages.length && rest.some((c) => c.package)) {
    packPackageColumns(packages, rest, opts.colGutter, opts.pkgCorridor, opts.rowGap);
  }
  if (!rest.length || !listed.length) return;
  const bbox = boundsOf(rest);
  const gap = opts.sourceGap ?? 32;
  const corridor = opts.pkgCorridor ?? PKG_CORRIDOR;
  const order = ['left', 'top', 'bottom', 'right'];
  const bySide = { left: [], top: [], bottom: [], right: [] };
  listed.forEach((s, i: number) => {
    // i % 4: con i % 3 la cuarta fuente volvía a 'left' y 'right' nunca se
    // usaba en automático (left se saturaba con ≥4 consumidores).
    const side = opts.sourceSides?.[s.id] || order[i % 4];
    bySide[side].push(s);
  });
  let y = bbox.y;
  for (const s of bySide.left) {
    s.x = bbox.x - corridor - s.w;
    s.y = y;
    y += s.h + gap;
  }
  let x = bbox.x;
  for (const s of bySide.top) {
    s.x = x;
    s.y = bbox.y - corridor - s.h;
    x += s.w + gap;
  }
  x = bbox.x;
  for (const s of bySide.bottom) {
    s.x = x;
    s.y = bbox.y + bbox.h + corridor;
    x += s.w + gap;
  }
  y = bbox.y;
  for (const s of bySide.right) {
    s.x = bbox.x + bbox.w + corridor;
    s.y = y;
    y += s.h + gap;
  }
}

function packPackage(
  pkg: Paquete,
  kids: Componente[],
  gut: number = COL_GUTTER,
  rowGap: number = ROW_GAP,
): void {
  if (!kids.length) return;
  const cols = clusterColumns(kids);
  let x = pkg.x + PKG_PAD;
  let maxBottom = pkg.y + PKG_TAB;
  let maxRight = x;
  for (const col of cols) {
    const w = Math.max(...col.items.map((k) => k.w));
    let y = pkg.y + PKG_TAB;
    col.items.sort((a, b) => a.y - b.y);
    for (const k of col.items) {
      k.x = x;
      k.y = y;
      y += k.h + rowGap;
    }
    maxBottom = Math.max(maxBottom, y - rowGap);
    maxRight = x + w;
    x += w + gut;
  }
  pkg.w = Math.max(80, maxRight + PKG_PAD - pkg.x);
  pkg.h = Math.max(48, maxBottom + PKG_PAD - pkg.y);
}

function clusterColumns(kids: readonly Componente[]) {
  const sorted = kids.slice().sort((a, b) => a.x - b.x);
  const cols = [];
  for (const k of sorted) {
    const hit = cols.find((col) => col.items.some((o) => xOverlap(o, k) > 24));
    if (hit) hit.items.push(k);
    else cols.push({ items: [k] });
  }
  return cols;
}

function xOverlap(a: Caja, b: Caja): boolean {
  return Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
}

/** Unión de rectángulos → polígono ortogonal (CCW). */
export function orthogonalUnion(rects: readonly Caja[]) {
  const g = occupyRects(rects, false);
  if (!g) return [];
  return occupyOutline(g.xs, g.ys, g.occ);
}

/** Cuadrícula orto-convexa: envuelve todos los rects (rellena huecos del grupo). */
export function orthogonalWrap(rects: readonly Caja[]) {
  const g = occupyRects(rects, true);
  if (!g) return [];
  return occupyOutline(g.xs, g.ys, g.occ);
}

export function pointInOrtho(pts: readonly Punto[], x: number, y: number): boolean {
  if (!pts || pts.length < 4) return false;
  let n = 0;
  const m = pts.length;
  for (let k = 0; k < m; k++) {
    const a = pts[k];
    const b = pts[(k + 1) % m];
    if (Math.abs(a.y - b.y) < 0.2) continue;
    const y0 = Math.min(a.y, b.y);
    const y1 = Math.max(a.y, b.y);
    if (y < y0 || y >= y1) continue;
    if (a.x > x) n += 1;
  }
  return n % 2 === 1;
}

export function orthoPolysOverlap(a: readonly Punto[], b: readonly Punto[]): boolean {
  if (!a?.length || !b?.length) return false;
  const xs = [...new Set([...a, ...b].map((p) => p.x))].sort((u, v) => u - v);
  const ys = [...new Set([...a, ...b].map((p) => p.y))].sort((u, v) => u - v);
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const cx = (xs[i] + xs[i + 1]) / 2;
      const cy = (ys[j] + ys[j + 1]) / 2;
      if (pointInOrtho(a, cx, cy) && pointInOrtho(b, cx, cy)) return true;
    }
  }
  return false;
}

function occupyRects(rects: readonly Caja[], convex: boolean) {
  if (!rects?.length) return null;
  const xs = [...new Set(rects.flatMap((r) => [r.x, r.x + r.w]))].sort((a, b) => a - b);
  const ys = [...new Set(rects.flatMap((r) => [r.y, r.y + r.h]))].sort((a, b) => a - b);
  if (xs.length < 2 || ys.length < 2) return null;
  const col = xs.length - 1;
  const row = ys.length - 1;
  const occ = Array.from({ length: col }, () => Array(row).fill(false));
  for (const r of rects) {
    for (let i = 0; i < col; i++) {
      for (let j = 0; j < row; j++) {
        const cx = (xs[i] + xs[i + 1]) / 2;
        const cy = (ys[j] + ys[j + 1]) / 2;
        if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) occ[i][j] = true;
      }
    }
  }
  if (convex) fillOrthoConvex(occ);
  return { xs, ys, occ };
}

function fillOrthoConvex(occ: boolean[][]): void {
  const col = occ.length;
  const row = occ[0]?.length ?? 0;
  for (let j = 0; j < row; j++) {
    let a = -1;
    let b = -1;
    for (let i = 0; i < col; i++) {
      if (!occ[i][j]) continue;
      if (a < 0) a = i;
      b = i;
    }
    if (a < 0) continue;
    for (let i = a; i <= b; i++) occ[i][j] = true;
  }
  for (let i = 0; i < col; i++) {
    let a = -1;
    let b = -1;
    for (let j = 0; j < row; j++) {
      if (!occ[i][j]) continue;
      if (a < 0) a = j;
      b = j;
    }
    if (a < 0) continue;
    for (let j = a; j <= b; j++) occ[i][j] = true;
  }
}

function occupyOutline(xs: readonly number[], ys: readonly number[], occ: readonly boolean[][]) {
  const col = occ.length;
  const row = occ[0]?.length ?? 0;
  const h = Array.from({ length: col }, () => Array(row + 1).fill(0));
  const v = Array.from({ length: col + 1 }, () => Array(row).fill(0));
  for (let i = 0; i < col; i++) {
    for (let j = 0; j < row; j++) {
      if (!occ[i][j]) continue;
      h[i][j] ^= 1;
      h[i][j + 1] ^= 1;
      v[i][j] ^= 1;
      v[i + 1][j] ^= 1;
    }
  }
  return walkOutline(xs, ys, h, v);
}

function distToRect(x: number, y: number, r: Caja): number {
  const dx = x < r.x ? r.x - x : x > r.x + r.w ? x - (r.x + r.w) : 0;
  const dy = y < r.y ? r.y - y : y > r.y + r.h ? y - (r.y + r.h) : 0;
  return Math.hypot(dx, dy);
}

function cellInConvex(
  xs: readonly number[],
  ys: readonly number[],
  occ: readonly boolean[][],
  x: number,
  y: number,
): boolean {
  for (let i = 0; i < occ.length; i++) {
    if (x < xs[i] || x >= xs[i + 1]) continue;
    for (let j = 0; j < occ[i].length; j++) {
      if (!occ[i][j]) continue;
      if (y >= ys[j] && y < ys[j + 1]) return true;
    }
  }
  return false;
}

function connectIslands(occ: boolean[][], blocked: readonly boolean[][]): void {
  const col = occ.length;
  const row = occ[0]?.length ?? 0;
  const key = (i: number, j: number) => `${i},${j}`;
  const seen = new Set();
  const islands = [];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let i = 0; i < col; i++) {
    for (let j = 0; j < row; j++) {
      if (!occ[i][j] || seen.has(key(i, j))) continue;
      const stack = [[i, j]];
      const cells = [];
      seen.add(key(i, j));
      while (stack.length) {
        const [ci, cj] = stack.pop();
        cells.push([ci, cj]);
        for (const [di, dj] of dirs) {
          const ni = ci + di;
          const nj = cj + dj;
          if (ni < 0 || nj < 0 || ni >= col || nj >= row) continue;
          if (!occ[ni][nj] || seen.has(key(ni, nj))) continue;
          seen.add(key(ni, nj));
          stack.push([ni, nj]);
        }
      }
      islands.push(cells);
    }
  }
  if (islands.length <= 1) return;
  islands.sort((a, b) => b.length - a.length);
  const main = new Set(islands[0].map(([i, j]) => key(i, j)));
  const passable = (i: number, j: number) => occ[i]![j] || !blocked[i]![j];
  for (let s = 1; s < islands.length; s++) {
    const start = islands[s][0];
    const q = [start];
    const prev = new Map([[key(start[0], start[1]), null]]);
    let hit = null;
    for (let qi = 0; qi < q.length && !hit; qi++) {
      const [ci, cj] = q[qi];
      for (const [di, dj] of dirs) {
        const ni = ci + di;
        const nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= col || nj >= row) continue;
        const k = key(ni, nj);
        if (prev.has(k) || !passable(ni, nj)) continue;
        prev.set(k, [ci, cj]);
        if (main.has(k)) { hit = [ni, nj]; break; }
        q.push([ni, nj]);
      }
    }
    if (!hit) continue;
    let cur = hit;
    while (cur) {
      occ[cur[0]][cur[1]] = true;
      main.add(key(cur[0], cur[1]));
      cur = prev.get(key(cur[0], cur[1]));
    }
    for (const c of islands[s]) main.add(key(c[0], c[1]));
  }
}

/**
 * Contornos de paquete: cuadrícula que envuelve a todos los hijos.
 * Celdas en conflicto van al paquete del hijo más cercano (tocan, no solapan).
 */
export function layoutPackageOutlines(
  packages: readonly Paquete[],
  components: readonly Componente[],
  opts: OpcionesEmpaque = {},
) {
  const pad = opts.pad ?? 12;
  const tabH = opts.tabH ?? 18;
  const groups = packages.map((p) => {
    const kids = components.filter((c) => c.package === p.id);
    const padded = kids.map((c) => ({ x: c.x - pad, y: c.y - pad, w: c.w + 2 * pad, h: c.h + 2 * pad }));
    if (padded.length) {
      const minX = Math.min(...padded.map((r) => r.x));
      const minY = Math.min(...padded.map((r) => r.y));
      const label = p.stereotype ? `«${p.stereotype}» ${p.name ?? ''}` : String(p.name ?? '');
      const tabW = Math.max(120, label.length * 7.4 + 24);
      padded.push({ x: minX, y: minY - tabH, w: tabW, h: tabH });
    }
    return { p, kids, padded, conv: occupyRects(padded, true) };
  }).filter((g) => g.padded.length && g.conv);

  if (!groups.length) return;

  const xs = [...new Set(groups.flatMap((g) => g.conv.xs))].sort((a, b) => a - b);
  const ys = [...new Set(groups.flatMap((g) => g.conv.ys))].sort((a, b) => a - b);
  const col = xs.length - 1;
  const row = ys.length - 1;
  if (col < 1 || row < 1) return;

  const owner = Array.from({ length: col }, () => Array(row).fill(null));
  for (let i = 0; i < col; i++) {
    for (let j = 0; j < row; j++) {
      const cx = (xs[i] + xs[i + 1]) / 2;
      const cy = (ys[j] + ys[j + 1]) / 2;
      const claim = groups.filter((g) => cellInConvex(g.conv.xs, g.conv.ys, g.conv.occ, cx, cy));
      if (!claim.length) continue;
      if (claim.length === 1) { owner[i][j] = claim[0].p.id; continue; }
      let best = claim[0];
      let bestD = Infinity;
      for (const g of claim) {
        const d = Math.min(...g.kids.map((k) => distToRect(cx, cy, k)));
        if (d < bestD) { bestD = d; best = g; }
      }
      owner[i][j] = best.p.id;
    }
  }

  for (const g of groups) {
    const occ = Array.from({ length: col }, () => Array(row).fill(false));
    const blocked = Array.from({ length: col }, () => Array(row).fill(false));
    for (let i = 0; i < col; i++) {
      for (let j = 0; j < row; j++) {
        if (owner[i][j] === g.p.id) occ[i][j] = true;
        else if (owner[i][j]) blocked[i][j] = true;
      }
    }
    connectIslands(occ, blocked);
    const outline = occupyOutline(xs, ys, occ);
    g.p.outline = outline;
    if (outline.length) {
      g.p.x = Math.min(...outline.map((q) => q.x));
      g.p.y = Math.min(...outline.map((q) => q.y));
      g.p.w = Math.max(...outline.map((q) => q.x)) - g.p.x;
      g.p.h = Math.max(...outline.map((q) => q.y)) - g.p.y;
    }
  }
}

function walkOutline(
  xs: readonly number[],
  ys: readonly number[],
  h: readonly boolean[][],
  v: readonly boolean[][],
): Punto[] {
  let i0 = -1;
  let j0 = -1;
  for (let j = 0; j < h[0].length; j++) {
    for (let i = 0; i < h.length; i++) {
      if (h[i][j]) { i0 = i; j0 = j; break; }
    }
    if (i0 >= 0) break;
  }
  if (i0 < 0) return [];
  const pts = [];
  let i = i0;
  let j = j0;
  let dir = 'E';
  for (let n = 0; n < 800; n++) {
    pts.push({ x: xs[i], y: ys[j] });
    if (dir === 'E') {
      if (!h[i]?.[j]) break;
      h[i][j] = 0;
      i += 1;
      if (j > 0 && v[i][j - 1]) dir = 'N';
      else if (h[i]?.[j]) dir = 'E';
      else if (v[i]?.[j]) dir = 'S';
      else break;
    } else if (dir === 'S') {
      if (!v[i]?.[j]) break;
      v[i][j] = 0;
      j += 1;
      if (h[i]?.[j]) dir = 'E';
      else if (v[i]?.[j]) dir = 'S';
      else if (i > 0 && h[i - 1]?.[j]) dir = 'W';
      else break;
    } else if (dir === 'W') {
      if (!h[i - 1]?.[j]) break;
      h[i - 1][j] = 0;
      i -= 1;
      if (v[i]?.[j]) dir = 'S';
      else if (i > 0 && h[i - 1]?.[j]) dir = 'W';
      else if (j > 0 && v[i]?.[j - 1]) dir = 'N';
      else break;
    } else {
      if (!v[i]?.[j - 1]) break;
      v[i][j - 1] = 0;
      j -= 1;
      if (i > 0 && h[i - 1]?.[j]) dir = 'W';
      else if (j > 0 && v[i]?.[j - 1]) dir = 'N';
      else if (h[i]?.[j]) dir = 'E';
      else break;
    }
    if (dir === 'E' && i === i0 && j === j0 && n > 0) {
      pts.push({ x: xs[i], y: ys[j] });
      break;
    }
  }
  return simplifyOrtho(pts);
}

function simplifyOrtho(pts: readonly Punto[]): Punto[] {
  if (pts.length < 2) return pts;
  const out = [pts[0]];
  for (let k = 1; k < pts.length; k++) {
    const a = out[out.length - 1];
    const b = pts[k];
    if (Math.abs(a.x - b.x) < 0.2 && Math.abs(a.y - b.y) < 0.2) continue;
    if (out.length >= 2) {
      const p = out[out.length - 2];
      const sameH = Math.abs(p.y - a.y) < 0.2 && Math.abs(a.y - b.y) < 0.2;
      const sameV = Math.abs(p.x - a.x) < 0.2 && Math.abs(a.x - b.x) < 0.2;
      if (sameH || sameV) out.pop();
    }
    out.push(b);
  }
  return out;
}

export function outlineToPath(pts: readonly Punto[]): string {
  if (!pts?.length) return '';
  return `M${pts[0].x},${pts[0].y} ` + pts.slice(1).map((p) => `L${p.x},${p.y}`).join(' ') + ' Z';
}

export function inflateBox(c: Caja, pad: number): Caja {
  return { ...c, x: c.x - pad, y: c.y - pad, w: c.w + 2 * pad, h: c.h + 2 * pad };
}

/** Título: aire a los lados y arriba. Abajo no, se come la primera fila. */
export function inflateTitleObstacle(tb: Caja, pad: number, yClip: number): Caja {
  const x = tb.x - pad;
  const y = tb.y - pad;
  const w = tb.w + 2 * pad;
  let h = tb.h + pad;
  if (Number.isFinite(yClip) && y + h > yClip) h = Math.max(8, yClip - y);
  return { ...tb, x, y, w, h };
}

export function segmentoEsDiagonal(x1: number, y1: number, x2: number, y2: number) {
  return Math.abs(x1 - x2) >= 0.6 && Math.abs(y1 - y2) >= 0.6;
}

export function pathHasDiagonal(pts: readonly Punto[]): boolean {
  for (let i = 0; i < pts.length - 1; i++) {
    if (segmentoEsDiagonal(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y)) return true;
  }
  return false;
}

export function segmentoCortaCaja(x1: number, y1: number, x2: number, y2: number, c: Caja): boolean {
  if (segmentoEsDiagonal(x1, y1, x2, y2)) return true;
  const left = c.x;
  const right = c.x + c.w;
  const top = c.y;
  const bottom = c.y + c.h;
  if (right <= left || bottom <= top) return false;
  const horizontal = Math.abs(y1 - y2) < 0.6;
  const vertical = Math.abs(x1 - x2) < 0.6;
  if (horizontal) {
    const y = (y1 + y2) / 2;
    if (y <= top || y >= bottom) return false;
    const a = Math.min(x1, x2);
    const b = Math.max(x1, x2);
    return a < right && b > left;
  }
  if (vertical) {
    const x = (x1 + x2) / 2;
    if (x <= left || x >= right) return false;
    const a = Math.min(y1, y2);
    const b = Math.max(y1, y2);
    return a < bottom && b > top;
  }
  return false;
}

export function rutaChoca(puntos: readonly Punto[], obstaculos: readonly Caja[]): boolean {
  for (let i = 0; i < puntos.length - 1; i++) {
    const a = puntos[i];
    const b = puntos[i + 1];
    for (const c of obstaculos) {
      if (segmentoCortaCaja(a.x, a.y, b.x, b.y, c)) return true;
    }
  }
  return false;
}

function verticalGaps(obstaculos: readonly Caja[], xMin: number, xMax: number) {
  const spans = obstaculos
    .map((c) => ({ a: c.x, b: c.x + c.w }))
    .filter((s) => s.b > xMin && s.a < xMax)
    .sort((a, b) => a.a - b.a);
  const merged = [];
  for (const s of spans) {
    if (!merged.length || s.a > merged[merged.length - 1].b + 4) merged.push({ ...s });
    else merged[merged.length - 1].b = Math.max(merged[merged.length - 1].b, s.b);
  }
  const gaps = [];
  let cursor = xMin;
  for (const m of merged) {
    if (m.a - cursor >= 20) gaps.push({ a: cursor, b: m.a });
    cursor = Math.max(cursor, m.b);
  }
  if (xMax - cursor >= 20) gaps.push({ a: cursor, b: xMax });
  return gaps;
}

function nearestGap(gaps: readonly { x: number }[], x: number) {
  let best = gaps[0];
  let bestD = Infinity;
  for (const g of gaps) {
    const d = x < g.a ? g.a - x : x > g.b ? x - g.b : 0;
    if (d < bestD) { bestD = d; best = g; }
  }
  return best;
}

function laneInGap(gap, rank: number, total: number) {
  const t = (rank + 1) / (total + 1);
  return gap.a + (gap.b - gap.a) * t;
}

const comoPath = (pts) => `M${pts[0].x},${pts[0].y} ` + pts.slice(1).map((p) => `L${p.x},${p.y}`).join(' ');

/** Cuánto se sale el path del marco (margen). */
export function boundsOverflow(pts: readonly Punto[], frame: Caja, margin = 36): boolean {
  if (!frame || !pts?.length) return 0;
  const x0 = frame.x - margin;
  const y0 = frame.y - margin;
  const x1 = frame.x + frame.w + margin;
  const y1 = frame.y + frame.h + margin;
  let n = 0;
  for (const p of pts) {
    if (p.x < x0) n += x0 - p.x;
    if (p.y < y0) n += y0 - p.y;
    if (p.x > x1) n += p.x - x1;
    if (p.y > y1) n += p.y - y1;
  }
  return n;
}

function outward(p: Punto, side: Lado, d: number): Punto {
  if (!side) return { x: p.x, y: p.y };
  if (side === 'left') return { x: p.x - d, y: p.y };
  if (side === 'right') return { x: p.x + d, y: p.y };
  if (side === 'top') return { x: p.x, y: p.y - d };
  return { x: p.x, y: p.y + d };
}

function alongSide(p: Punto, side: Lado, d: number): Punto {
  if (!side || !d) return { x: p.x, y: p.y };
  if (side === 'left' || side === 'right') return { x: p.x, y: p.y + d };
  return { x: p.x + d, y: p.y };
}

function dedupePts(pts) {
  const out = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.5 && Math.abs(last.y - p.y) < 0.5) continue;
    out.push(p);
  }
  return out;
}

function manhattan(pts) {
  let n = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    n += Math.abs(pts[i + 1].x - pts[i].x) + Math.abs(pts[i + 1].y - pts[i].y);
  }
  return n;
}

function collinearOverlap(a1, a2, b1, b2, tol = 6) {
  const hA = Math.abs(a1.y - a2.y) < 0.6;
  const hB = Math.abs(b1.y - b2.y) < 0.6;
  if (hA && hB && Math.abs(a1.y - b1.y) < tol) {
    const a0 = Math.min(a1.x, a2.x);
    const a1x = Math.max(a1.x, a2.x);
    const b0 = Math.min(b1.x, b2.x);
    const b1x = Math.max(b1.x, b2.x);
    return Math.max(0, Math.min(a1x, b1x) - Math.max(a0, b0));
  }
  const vA = Math.abs(a1.x - a2.x) < 0.6;
  const vB = Math.abs(b1.x - b2.x) < 0.6;
  if (vA && vB && Math.abs(a1.x - b1.x) < tol) {
    const a0 = Math.min(a1.y, a2.y);
    const a1y = Math.max(a1.y, a2.y);
    const b0 = Math.min(b1.y, b2.y);
    const b1y = Math.max(b1.y, b2.y);
    return Math.max(0, Math.min(a1y, b1y) - Math.max(a0, b0));
  }
  return 0;
}

export function pathShareLen(pts, usedSegs, tol = 4) {
  if (!usedSegs?.length || pts.length < 2) return 0;
  let n = 0;
  for (let i = 1; i < pts.length - 2; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    for (const u of usedSegs) {
      n += collinearOverlap(a, b, u.a, u.b, tol);
    }
  }
  return n;
}

export function segsFromPath(pts) {
  const out = [];
  for (let i = 1; i < pts.length - 2; i++) out.push({ a: pts[i], b: pts[i + 1] });
  return out;
}

function hullOf(boxes, pad) {
  return {
    x0: Math.min(...boxes.map((c) => c.x)) - pad,
    y0: Math.min(...boxes.map((c) => c.y)) - pad,
    x1: Math.max(...boxes.map((c) => c.x + c.w)) + pad,
    y1: Math.max(...boxes.map((c) => c.y + c.h)) + pad,
  };
}

function gridRoute(from, to, boxes, clearance) {
  const step = 8;
  const blocked = boxes.map((c) => inflateBox(c, clearance));
  const pad = 80;
  let minX = Math.min(from.x, to.x) - pad;
  let minY = Math.min(from.y, to.y) - pad;
  let maxX = Math.max(from.x, to.x) + pad;
  let maxY = Math.max(from.y, to.y) + pad;
  for (const c of blocked) {
    minX = Math.min(minX, c.x - pad);
    minY = Math.min(minY, c.y - pad);
    maxX = Math.max(maxX, c.x + c.w + pad);
    maxY = Math.max(maxY, c.y + c.h + pad);
  }
  const snap = (v: number) => Math.round(v / step) * step;
  const hit = (x, y) => blocked.some((c) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h);
  const sx = snap(from.x);
  const sy = snap(from.y);
  const gx = snap(to.x);
  const gy = snap(to.y);
  const startK = `${sx},${sy}`;
  const goalK = `${gx},${gy}`;
  const q = [[sx, sy]];
  const prev = new Map([[startK, null]]);
  const dirs = [[step, 0], [-step, 0], [0, step], [0, -step]];
  const near = (x: number, y: number, tx: number, ty: number) => Math.abs(x - tx) + Math.abs(y - ty) <= step * 2;
  for (let i = 0; i < q.length && i < 40000; i++) {
    const [x, y] = q[i];
    if (`${x},${y}` === goalK) break;
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < minX || ny < minY || nx > maxX || ny > maxY) continue;
      const k = `${nx},${ny}`;
      if (prev.has(k)) continue;
      if (hit(nx, ny) && k !== goalK && k !== startK && !near(nx, ny, gx, gy) && !near(nx, ny, sx, sy)) continue;
      prev.set(k, [x, y]);
      q.push([nx, ny]);
    }
  }
  if (!prev.has(goalK)) return null;
  const rev = [];
  let cur = [gx, gy];
  while (cur) {
    rev.push({ x: cur[0], y: cur[1] });
    cur = prev.get(`${cur[0]},${cur[1]}`);
  }
  rev.reverse();
  const join = (a, b) => {
    if (Math.abs(a.x - b.x) < 0.5 || Math.abs(a.y - b.y) < 0.5) return [a, b];
    return [a, { x: a.x, y: b.y }, b];
  };
  const first = rev[0];
  const last = rev[rev.length - 1];
  return collapseOrtho(dedupePts([...join(from, first), ...rev.slice(1, -1), ...join(last, to).slice(1)]));
}

function overshootsTip(pts) {
  if (pts.length < 3) return false;
  const a = pts[pts.length - 3];
  const b = pts[pts.length - 2];
  const t = pts[pts.length - 1];
  const between = (u: number, v: number, m) => m > Math.min(u, v) + 0.5 && m < Math.max(u, v) - 0.5;
  if (Math.abs(a.y - b.y) < 0.5 && Math.abs(b.y - t.y) < 0.5 && between(a.x, b.x, t.x)) return true;
  if (Math.abs(a.x - b.x) < 0.5 && Math.abs(b.x - t.x) < 0.5 && between(a.y, b.y, t.y)) return true;
  return false;
}

function overshootsStart(pts) {
  if (pts.length < 3) return false;
  const t = pts[0];
  const a = pts[1];
  const b = pts[2];
  const between = (u: number, v: number, m) => m > Math.min(u, v) + 0.5 && m < Math.max(u, v) - 0.5;
  if (Math.abs(t.y - a.y) < 0.5 && Math.abs(a.y - b.y) < 0.5 && between(a.x, b.x, t.x)) return true;
  if (Math.abs(t.x - a.x) < 0.5 && Math.abs(a.x - b.x) < 0.5 && between(a.y, b.y, t.y)) return true;
  return false;
}

function lastMissesApproach(pts, toSide) {
  if (!toSide || pts.length < 2) return false;
  const a = pts[pts.length - 2];
  const b = pts[pts.length - 1];
  if (toSide === 'right') return a.x < b.x - 0.5;
  if (toSide === 'left') return a.x > b.x + 0.5;
  if (toSide === 'bottom') return a.y < b.y - 0.5;
  if (toSide === 'top') return a.y > b.y + 0.5;
  return false;
}

function collapseOrtho(pts) {
  if (!pts?.length) return [];
  if (pts.length < 3) return pts.slice();
  const eq = (a: number, b: number) => Math.abs(a - b) < 0.51;
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = out[out.length - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const col = (eq(a.x, b.x) && eq(b.x, c.x)) || (eq(a.y, b.y) && eq(b.y, c.y));
    if (!col) out.push(b);
  }
  out.push(pts[pts.length - 1]);
  return dedupePts(out);
}

function inCorridor(from, to, c, inflate = 12) {
  const x0 = Math.min(from.x, to.x) - inflate;
  const x1 = Math.max(from.x, to.x) + inflate;
  const y0 = Math.min(from.y, to.y) - inflate;
  const y1 = Math.max(from.y, to.y) + inflate;
  return c.x < x1 && c.x + c.w > x0 && c.y < y1 && c.y + c.h > y0;
}

function endpointClamp(from, to, fromBox, toBox) {
  const xs = [from.x, to.x];
  const ys = [from.y, to.y];
  if (fromBox) {
    xs.push(fromBox.x, fromBox.x + fromBox.w);
    ys.push(fromBox.y, fromBox.y + fromBox.h);
  }
  if (toBox) {
    xs.push(toBox.x, toBox.x + toBox.w);
    ys.push(toBox.y, toBox.y + toBox.h);
  }
  return {
    xMin: Math.min(...xs) - 36,
    xMax: Math.max(...xs) + 36,
    yMin: Math.min(...ys) - 36,
    yMax: Math.max(...ys) + 36,
  };
}

function wrapCandidates(from, to, a0, b0, aJog, bJog, boxes, pad, lane: number = 0, clamp) {
  const o = 8 + Math.min(lane, 6) * 8;
  const ax = aJog.x;
  const ay = aJog.y;
  const bx = bJog.x;
  const by = bJog.y;
  const paths = [
    [from, a0, aJog, { x: bx, y: ay }, bJog, b0, to],
    [from, a0, aJog, { x: ax, y: by }, bJog, b0, to],
  ];
  if (!boxes.length) return paths;
  const h = hullOf(boxes, pad);
  let x0 = h.x0 - o;
  let x1 = h.x1 + o;
  let y0 = h.y0 - o;
  let y1 = h.y1 + o;
  if (clamp) {
    if (clamp.xMin != null) x0 = Math.max(x0, clamp.xMin);
    if (clamp.xMax != null) x1 = Math.min(x1, clamp.xMax);
    if (clamp.yMin != null) y0 = Math.max(y0, clamp.yMin);
    if (clamp.yMax != null) y1 = Math.min(y1, clamp.yMax);
  }
  paths.push(
    [from, a0, aJog, { x: ax, y: y0 }, { x: bx, y: y0 }, bJog, b0, to],
    [from, a0, aJog, { x: ax, y: y1 }, { x: bx, y: y1 }, bJog, b0, to],
    [from, a0, aJog, { x: x0, y: ay }, { x: x0, y: by }, bJog, b0, to],
    [from, a0, aJog, { x: x1, y: ay }, { x: x1, y: by }, bJog, b0, to],
    [from, a0, aJog, { x: x0, y: ay }, { x: x0, y: y0 }, { x: bx, y: y0 }, bJog, b0, to],
    [from, a0, aJog, { x: x1, y: ay }, { x: x1, y: y0 }, { x: bx, y: y0 }, bJog, b0, to],
    [from, a0, aJog, { x: x0, y: ay }, { x: x0, y: y1 }, { x: bx, y: y1 }, bJog, b0, to],
    [from, a0, aJog, { x: x1, y: ay }, { x: x1, y: y1 }, { x: bx, y: y1 }, bJog, b0, to],
    [from, a0, aJog, { x: ax, y: y0 }, { x: x0, y: y0 }, { x: x0, y: by }, bJog, b0, to],
    [from, a0, aJog, { x: ax, y: y0 }, { x: x1, y: y0 }, { x: x1, y: by }, bJog, b0, to],
    [from, a0, aJog, { x: ax, y: y1 }, { x: x0, y: y1 }, { x: x0, y: by }, bJog, b0, to],
    [from, a0, aJog, { x: ax, y: y1 }, { x: x1, y: y1 }, { x: x1, y: by }, bJog, b0, to],
  );
  return paths;
}

/**
 * Polilínea ortogonal: sale perpendicular, camina fuera de cajas infladas,
 * llega alineada al centro del O. Origen/destino solo tocan en el extremo.
 */
export function routeAvoidingBoxes(from, to, obstaculos, rank: number = 0, total: number = 1, opts = {}) {
  const clearance = opts.clearance ?? EDGE_CLEARANCE;
  const a0 = outward(from, opts.fromSide, clearance);
  const b0 = outward(to, opts.toSide, clearance);
  const spread = Math.max(-24, Math.min(24, (rank - (total - 1) / 2) * 8));
  const aJog = alongSide(a0, opts.fromSide, spread);
  const bJog = alongSide(b0, opts.toSide, -spread);
  const others = obstaculos.map((c) => inflateBox(c, clearance));
  const midObst = others.slice();
  const farFrom = (box, pt) => {
    if (!box || !pt) return false;
    const inf = inflateBox(box, 10);
    return pt.x < inf.x || pt.x > inf.x + inf.w || pt.y < inf.y || pt.y > inf.y + inf.h;
  };
  if (opts.fromBox && farFrom(opts.fromBox, to)) midObst.push(inflateBox(opts.fromBox, 4));
  if (opts.toBox && farFrom(opts.toBox, from)) midObst.push(inflateBox(opts.toBox, 4));
  const blocking = obstaculos.filter((c) => inCorridor(from, to, c, clearance + 8));
  const wrapBoxes = opts.wrapBoxes ?? obstaculos;
  const inner = endpointClamp(from, to, opts.fromBox, opts.toBox);
  const clamp = undefined;

  const legal = (pts) => {
    if (pts.length < 2 || pathHasDiagonal(pts)) return false;
    const comps = obstaculos.slice();
    if (opts.fromBox) comps.push(opts.fromBox);
    if (opts.toBox) comps.push(opts.toBox);
    if (pathIllegal(pts, comps, opts.fromBox?.id, opts.toBox?.id, clearance)) return false;
    if (overshootsTip(pts) || overshootsStart(pts)) return false;
    if (lastMissesApproach(pts, opts.toSide)) return false;
    const stem1 = [pts[0], pts[1]];
    const stem2 = [pts[pts.length - 2], pts[pts.length - 1]];
    const mid = pts.slice(1, -1);
    if (mid.length >= 2 && rutaChoca(mid, midObst)) return false;
    if (rutaChoca(stem1, others)) return false;
    if (rutaChoca(stem2, others)) return false;
    return true;
  };

  let best = null;
  let bestScore = Infinity;
  const used = opts.usedSegs ?? [];
  const frame = opts.frame;
  const consider = (pts) => {
    const clean = collapseOrtho(dedupePts(pts));
    if (!legal(clean)) return;
    const share = pathShareLen(clean, used);
    const outside = frame ? boundsOverflow(clean, frame, 24) : 0;
    const hook = boundsOverflow(clean, {
      x: inner.xMin, y: inner.yMin,
      w: inner.xMax - inner.xMin, h: inner.yMax - inner.yMin,
    }, 0);
    const score = manhattan(clean) + share * 200 + outside * 24 + hook * 16;
    if (score < bestScore || (score === bestScore && share < (best?._share ?? Infinity))) {
      bestScore = score;
      best = clean;
      best._share = share;
    }
  };

  consider([from, a0, aJog, { x: aJog.x, y: bJog.y }, bJog, b0, to]);
  consider([from, a0, aJog, { x: bJog.x, y: aJog.y }, bJog, b0, to]);
  if (rank === 0) {
    consider([from, a0, { x: a0.x, y: b0.y }, b0, to]);
    consider([from, a0, { x: b0.x, y: a0.y }, b0, to]);
  }

  for (const extra of [0, 12, 24, 40]) {
    const pad = clearance + Math.min(rank, 4) * 4 + extra;
    const groups = [blocking, wrapBoxes].filter((g) => g.length);
    if (!groups.length) groups.push([]);
    for (const boxes of groups) {
      for (const raw of wrapCandidates(from, to, a0, b0, aJog, bJog, boxes, pad, rank, clamp)) consider(raw);
    }
    if (obstaculos.length) {
      const xMin = clamp
        ? Math.max(clamp.xMin, Math.min(from.x, to.x, ...obstaculos.map((c) => c.x)) - 24 - extra)
        : Math.min(from.x, to.x, ...obstaculos.map((c) => c.x)) - 24 - extra;
      const xMax = clamp
        ? Math.min(clamp.xMax, Math.max(from.x, to.x, ...obstaculos.map((c) => c.x + c.w)) + 24 + extra)
        : Math.max(from.x, to.x, ...obstaculos.map((c) => c.x + c.w)) + 24 + extra;
      if (xMax - xMin < 20) continue;
      const gaps = verticalGaps(obstaculos.map((c) => inflateBox(c, clearance)), xMin, xMax);
      if (gaps.length) {
        for (const g of gaps) {
          const span = g.b - g.a;
          if (span < 16) continue;
          const nLanes = Math.max(1, Math.floor((span - 8) / 12));
          for (let k = 0; k < nLanes; k++) {
            const x = g.a + 6 + (k + 0.5) * ((span - 12) / nLanes);
            consider([from, a0, aJog, { x, y: aJog.y }, { x, y: bJog.y }, bJog, b0, to]);
          }
        }
        const gFrom = nearestGap(gaps, from.x);
        const gTo = nearestGap(gaps, to.x);
        const lane1 = laneInGap(gFrom, rank, total);
        const lane2 = laneInGap(gTo, rank, total);
        consider([from, a0, aJog, { x: lane1, y: aJog.y }, { x: lane1, y: bJog.y }, bJog, b0, to]);
        const ys = obstaculos.flatMap((c) => [c.y, c.y + c.h]);
        const top = clamp ? Math.max(clamp.yMin, Math.min(...ys) - pad) : Math.min(...ys) - pad;
        const bot = clamp ? Math.min(clamp.yMax, Math.max(...ys) + pad) : Math.max(...ys) + pad;
        for (const wrapY of [top, bot]) {
          consider([
            from, a0, aJog,
            { x: lane1, y: aJog.y }, { x: lane1, y: wrapY },
            { x: lane2, y: wrapY }, { x: lane2, y: bJog.y },
            bJog, b0, to,
          ]);
        }
      }
    }
  }

  const all = obstaculos.slice();
  if (opts.fromBox) all.push(opts.fromBox);
  if (opts.toBox) all.push(opts.toBox);
  if (all.length) {
    for (const extra of [24, 48, 80]) {
      for (const raw of wrapCandidates(from, to, a0, b0, aJog, bJog, all, clearance + extra + Math.min(rank, 4) * 4, rank, clamp)) consider(raw);
    }
  }

  if (!best && !opts._loose) {
    return routeAvoidingBoxes(from, to, obstaculos, rank, total, { ...opts, _loose: true });
  }
  if (!best) {
    for (const cl of [clearance, Math.max(6, clearance - 4)]) {
      const g = gridRoute(from, to, obstaculos, cl);
      if (g) consider(collapseOrtho(g));
    }
  }
  if (!best) return null;
  delete best._share;
  return comoPath(collapseOrtho(best));
}

/** True si camino pisa caja ajena, diagonal, o origen/destino más de 1 toque. */
export function pathIllegal(pts, comps, fromId, toId, clearance = EDGE_CLEARANCE) {
  if (!pts?.length || pathHasDiagonal(pts)) return true;
  const fromBox = comps.find((c) => c.id === fromId);
  const toBox = comps.find((c) => c.id === toId);
  for (const c of comps) {
    const padded = inflateBox(c, c.id === fromId || c.id === toId ? 1 : clearance);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      if (!segmentoCortaCaja(a.x, a.y, b.x, b.y, padded)) continue;
      const extremoOrigen = c.id === fromId && i === 0;
      const extremoDestino = c.id === toId && i === pts.length - 2;
      if (extremoOrigen || extremoDestino) continue;
      return true;
    }
  }
  if (fromBox && rutaChoca(pts.slice(1), [fromBox])) return true;
  if (toBox && rutaChoca(pts.slice(0, -1), [toBox])) return true;
  return false;
}
