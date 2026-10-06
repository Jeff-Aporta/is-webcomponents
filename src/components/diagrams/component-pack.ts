/**
 * Empaque de componentes y ruteo que no atraviesa cajas.
 *
 * Las posiciones del payload son la semilla. Si hay paquetes, se reordenan
 * en columnas con corredor; el contorno del paquete es la unión ortogonal
 * (ángulos rectos) de sus hijos, no un rectángulo vacío.
 */

import type { Arista, Caja, Componente, Lado, OpcionesEmpaque, Paquete, Punto } from '../_shared/diagram-tipos.js';
import type { ClusterColumn, GroupConv, RouteAvoidOpts } from "./component-pack.schemas.js";

export const COL_GUTTER = 52;
export const PKG_CORRIDOR = 72;
export const PKG_PAD = 16;
export const PKG_TAB = 22;
/** Hueco filas: C+O+stem + un carril de arista (≈ assemblyEntityMargin). */
export const ROW_GAP = 72;
/** Hueco entre paquetes raíz apilados en la misma columna. */
export const PKG_ROW_GAP = 28;
/** Distancia mínima entre cajas si el consumidor no pone `min-gap`. */
export const DEFAULT_MIN_GAP = ROW_GAP;
/** Holgura arista vs perímetro de componentes. */
export const EDGE_CLEARANCE = 22;
/** Margen arista ↔ borde de agrupador (paquete). */
export const PKG_BORDER_CLEARANCE = 40;
/**
 * Distancia mínima entre rieles de aristas (carriles H/V).
 * Más cerca → más costo. Override: `layout.lanePitch`.
 */
export const LANE_PITCH = 20;
/** Factor de costo si el tramo está a < lanePitch de otro riel. */
export const LANE_NEAR_FACTOR = 6;
/** Factor de costo cerca del perímetro (bordes) de un agrupador. */
export const PKG_BORDER_NEAR_FACTOR = 5;
/** Factor de costo al caminar por el interior de un agrupador (vs exterior). */
export const PKG_CROSS_FACTOR = 3;
/** Hueco entre componentes dentro de paquetes anidados (p.ej. PatyIA API). */
export const NESTED_ROW_GAP = 36;
/** Aire extra alrededor del título de paquete. */
export const TITLE_CLEARANCE = 22;
/**
 * W54: penalización por cada giro de 90° dentro de la A*. Un camino recto
 * (manhattan puro) sigue siendo el más barato; un zigzag lo paga en cada
 * cambio de dirección. La unidad es la misma que `step` (px), así que un
 * giro equivale a desviarse 200px de la línea recta — un L doble "barato"
 * ya no compensa: el router prefiere rodear antes que zigzaguear.
 */
export const TURN_PENALTY = 200;
/**
 * W54: nº máximo de giros que puede tener una arista. 4 = "recta + esquina
 * + recta + esquina + recta" (la forma canónica de un L doble). El router
 * descarta paths con más de este nº de giros (escalada a 12 si es
 * necesario) para evitar zigzags ilegibles tipo Visio.
 */
export const MAX_TURNS_PER_EDGE = 4;
/**
 * W54: penalización por cada giro por encima de `MAX_TURNS_PER_EDGE`. El
 * router descarta paths con >4 giros en estricto, pero en _loose los
 * permite hasta 12; el multiplicador por exceso se aplica igual para que
 * el A* siga prefiriendo rodear a zigzag.
 */
export const ZIGZAG_PENALTY = 100;
/**
 * W54 (tuning agresivo): penalización multiplicativa por aristas que
 * comparten corredor. Cada celda (x, y) del grid recuerda cuántas aristas
 * ya la cruzan; las nuevas se pagan `1 + count * CORRIDOR_PENALTY`. Esto
 * empuja a las aristas a buscar carriles sin ocupar, en vez de apiñarse
 * sobre el mismo eje.
 *
 * W55 (Phase 4): elevado de 8 a 14 — combinado con la optimización
 * iterativa (re-route con `usedSegs` globales en lugar de acumulado
 * secuencial), esto fuerza la separación temprana de carriles que
 * vienen del mismo origen (p.ej. 5 aristas desde ISW-TestPatyIA → 5
 * grupos en `pkg-api`).
 */
export const CORRIDOR_PENALTY = 14;
/**
 * W55: penalización ADITIVA por cada paso pegado al borde del PADRE del
 * origen (no a cualquier paquete). Suma — no multiplica — para que el
 * A* prefiera rodear el perímetro del padre antes que pegarse a él.
 * 15000 ≈ 150 pasos de coste (10 px/step) → el rodeo siempre gana sobre
 * el atajo que pasa rozando el borde interior. Subido agresivamente
 * desde 5000 para forzar la separación temprana de carriles en
 * geometrías con muchos orígenes hijos del mismo paquete (lab
 * ISS·AyudasCPIA: 5 aristas desde ISW-TestPatyIA → pkg-api).
 */
export const PARENT_BORDER_PENALTY = 15000;

export function packDiagram(packages: Paquete[], components: Componente[], edges: readonly Arista[] = [], opts: OpcionesEmpaque = {}): void {
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
  packPackageColumns(
    packages, components,
    gaps.colGutter, gaps.pkgCorridor, gaps.rowGap, gaps.pkgRowGap, gaps.nestedRowGap,
  );
  // Grid equidistante: márgenes laterales simétricos (Azure queda más al centro).
  centerPackedGrid(packages, components, 56);
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
  // lanePitch / pkgBorderClearance: props de ruteo, no de empaque — sin piso minGap.
  const pickExact = (v: unknown, fallback: number): number => {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) return n;
    return fallback;
  };
  return {
    rowGap: pick(opts.rowGap, ROW_GAP),
    nestedRowGap: pick(opts.nestedRowGap, NESTED_ROW_GAP),
    pkgRowGap: pick(opts.pkgRowGap, PKG_ROW_GAP),
    colGutter: pick(opts.colGutter, COL_GUTTER),
    sourceGap: pick(opts.sourceGap, DEFAULT_MIN_GAP),
    pkgCorridor: pick(opts.pkgCorridor, PKG_CORRIDOR),
    lanePitch: pickExact(opts.lanePitch, LANE_PITCH),
    laneNearFactor: pickExact(opts.laneNearFactor, LANE_NEAR_FACTOR),
    pkgBorderClearance: pickExact(opts.pkgBorderClearance, PKG_BORDER_CLEARANCE),
    pkgBorderNearFactor: pickExact(opts.pkgBorderNearFactor, PKG_BORDER_NEAR_FACTOR),
    pkgCrossFactor: pickExact(opts.pkgCrossFactor, PKG_CROSS_FACTOR),
  };
}

function packPackageColumns(
  packages: Paquete[],
  components: Componente[],
  gut: number = COL_GUTTER,
  corridor: number = PKG_CORRIDOR,
  rowGap: number = ROW_GAP,
  pkgRowGap: number = PKG_ROW_GAP,
  nestedRowGap: number = NESTED_ROW_GAP,
): void {
  const kidsOf = (p: Paquete) => components.filter((c) => c.package === p.id);
  const childPkgsOf = (p: Paquete) => packages.filter((c) => c.parent === p.id);
  // Solo raíces (sin parent) en columnas; anidados se empaquetan dentro del padre.
  const roots = packages.filter((p) => !p.parent || !packages.some((q) => q.id === p.parent));
  const leaves = roots.filter((p) => kidsOf(p).length || childPkgsOf(p).length);
  const sorted = leaves.sort((a, b) => a.x - b.x || a.y - b.y);
  if (!sorted.length) return;

  const packNested = (p: Paquete): void => {
    for (const child of childPkgsOf(p)) packNested(child);
    const comps = kidsOf(p);
    if (comps.length) {
      // Solo «ISW» Apps usa rowGap amplio; OpenAI / API / etc. → nestedRowGap.
      const wide = !p.parent && (p.id === 'pkg-apps' || p.stereotype === 'ISW');
      packPackage(p, comps, gut, wide ? rowGap : nestedRowGap);
    }
    const nested = childPkgsOf(p);
    if (!nested.length) return;
    // Envuelve hijos-paquete + componentes propios.
    const boxes: Caja[] = [
      ...comps,
      ...nested,
    ];
    if (!boxes.length) return;
    const pad = PKG_PAD;
    const titleH = PKG_TAB;
    const x = Math.min(...boxes.map((b) => b.x)) - pad;
    const y = Math.min(...boxes.map((b) => b.y)) - titleH;
    const r = Math.max(...boxes.map((b) => b.x + b.w)) + pad;
    const btm = Math.max(...boxes.map((b) => b.y + b.h)) + pad;
    p.x = x;
    p.y = y;
    p.w = Math.max(80, r - x);
    p.h = Math.max(48, btm - y);
  };

  const pkgCols: Array<{ items: Paquete[]; xMax: number }> = [];
  for (const p of sorted) {
    const last = pkgCols[pkgCols.length - 1];
    if (last && p.x < last.xMax - 20) last.items.push(p);
    else pkgCols.push({ items: [p], xMax: p.x + p.w });
  }
  let cursorX = Math.min(...sorted.map((p) => p.x));
  for (const pc of pkgCols) {
    pc.items.sort((a, b) => a.y - b.y);
    let y = pc.items[0]!.y;
    let colW = 0;
    for (const p of pc.items) {
      // Mover árbol entero (anidados + comps) al slot de columna; si no,
      // packNested reenvuelve hijos en coords semilla y come el pkgCorridor.
      const dx = cursorX - p.x;
      const dy = y - p.y;
      if (dx || dy) shiftPackageTree(p, packages, components, dx, dy);
      packNested(p);
      y = p.y + p.h + pkgRowGap;
      colW = Math.max(colW, p.w);
    }
    cursorX += colW + corridor;
  }
  // Centrar columnas verticalmente respecto a la más alta (grid, no radial).
  centerColumnsVertically(pkgCols, packages, components);
  // Hijos laterales (p.ej. PostgreSQL clientesis en Azure): centro vertical.
  for (const parent of packages) {
    for (const child of packages.filter((c) => c.parent === parent.id)) {
      if (child.x > parent.x + parent.w * 0.4) {
        centerChildPkgInParent(parent, child, packages, components);
      }
    }
  }
}

/** Alinea el centro Y de cada columna al de la columna más alta. */
function centerColumnsVertically(
  pkgCols: Array<{ items: Paquete[] }>,
  packages: Paquete[],
  components: Componente[],
): void {
  if (pkgCols.length < 2) return;
  const bounds = pkgCols.map((pc) => boundsOf(pc.items));
  const tall = bounds.reduce((a, b, i) => (b.h > bounds[a]!.h ? i : a), 0);
  const refCy = bounds[tall]!.y + bounds[tall]!.h / 2;
  for (let i = 0; i < pkgCols.length; i++) {
    if (i === tall) continue;
    const b = bounds[i]!;
    const dy = refCy - (b.y + b.h / 2);
    if (Math.abs(dy) < 2) continue;
    for (const p of pkgCols[i]!.items) shiftPackageTree(p, packages, components, 0, dy);
  }
}

/** Centra un hijo-paquete en el eje Y del padre (con pad). */
function centerChildPkgInParent(
  parent: Paquete,
  child: Paquete,
  packages: Paquete[],
  components: Componente[],
): void {
  const innerTop = parent.y + PKG_TAB + 8;
  const innerBot = parent.y + parent.h - PKG_PAD;
  if (innerBot - innerTop < child.h + 8) return;
  const mid = (innerTop + innerBot) / 2;
  const dy = mid - (child.y + child.h / 2);
  const minDy = innerTop - child.y;
  const maxDy = innerBot - (child.y + child.h);
  const use = Math.max(minDy, Math.min(maxDy, dy));
  if (Math.abs(use) > 1) shiftPackageTree(child, packages, components, 0, use);
}

/** Traslada un paquete raíz y todo su subárbol (pkgs hijos + comps). */
function shiftPackageTree(
  root: Paquete,
  packages: Paquete[],
  components: Componente[],
  dx: number,
  dy: number,
): void {
  if (!dx && !dy) return;
  const ids = new Set<string>([root.id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const p of packages) {
      if (p.parent && ids.has(p.parent) && !ids.has(p.id)) {
        ids.add(p.id);
        grew = true;
      }
    }
  }
  for (const p of packages) {
    if (!ids.has(p.id)) continue;
    p.x += dx;
    p.y += dy;
  }
  for (const c of components) {
    if (c.package && ids.has(c.package)) {
      c.x += dx;
      c.y += dy;
    }
  }
}

/** Desplaza el bloque empacado: margen izq. y el paquete más pesado hacia el centro. */
function centerPackedGrid(packages: Paquete[], components: Componente[], sidePad = 48): void {
  if (!packages.length) return;
  const roots = packages.filter((p) => !p.parent);
  const box = boundsOf(roots.length ? roots : packages);
  if (!(box.w > 0)) return;
  // El más grande (Azure) tira el margen: si queda a la derecha del mid, sobra pad izq.
  const heavy = (roots.length ? roots : packages)
    .slice()
    .sort((a, b) => b.w * b.h - a.w * a.h)[0]!;
  const heavyCx = heavy.x - box.x + heavy.w / 2;
  // Margen izq. asimétrico: el paquete pesado (Azure) queda al centro del viewBox.
  const leftPad = Math.max(sidePad, Math.round(box.w + sidePad - 2 * heavyCx));
  const dx = leftPad - box.x;
  if (Math.abs(dx) < 1) return;
  for (const p of packages) p.x += dx;
  for (const c of components) c.x += dx;
}

function inferSources(components: readonly Componente[], edges: readonly Arista[]): Componente[] {
  const out = new Map<string, number>();
  const inn = new Map<string, number>();
  for (const c of components) {
    out.set(c.id, 0);
    inn.set(c.id, 0);
  }
  for (const e of edges ?? []) {
    if (e.from && out.has(e.from)) out.set(e.from, (out.get(e.from) ?? 0) + 1);
    if (e.to && inn.has(e.to)) inn.set(e.to, (inn.get(e.to) ?? 0) + 1);
  }
  return components.filter((c) => (out.get(c.id) ?? 0) > 0 && (inn.get(c.id) ?? 0) === 0);
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
function packTriptych(packages: Paquete[], components: Componente[], edges: readonly Arista[], opts: OpcionesEmpaque): void {
  const listed: Componente[] = (opts.sources?.length
    ? opts.sources.map((id) => components.find((c) => c.id === String(id))).filter((c): c is Componente => Boolean(c))
    : inferSources(components, edges));
  const sourceSet = new Set(listed.map((c) => c.id));
  const rest = components.filter((c) => !sourceSet.has(c.id));
  if (packages.length && rest.some((c) => c.package)) {
    packPackageColumns(
      packages, rest,
      opts.colGutter, opts.pkgCorridor, opts.rowGap, opts.pkgRowGap, opts.nestedRowGap,
    );
  }
  if (!rest.length || !listed.length) return;
  const bbox = boundsOf(rest);
  const gap = opts.sourceGap ?? 32;
  const corridor = opts.pkgCorridor ?? PKG_CORRIDOR;
  const order: Lado[] = ['left', 'top', 'bottom', 'right'];
  const bySide: Record<Lado, Componente[]> = { left: [], top: [], bottom: [], right: [] };
  listed.forEach((s, i: number) => {
    // i % 4: con i % 3 la cuarta fuente volvía a 'left' y 'right' nunca se
    // usaba en automático (left se saturaba con ≥4 consumidores).
    const rawSide = (opts.sourceSides as Record<string, Lado> | undefined)?.[s.id] || order[i % 4]!;
    const side: Lado = bySide[rawSide] !== undefined ? rawSide : order[i % 4]!;
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

function packPackage(pkg: Paquete, kids: Componente[], gut: number = COL_GUTTER, rowGap: number = ROW_GAP): void {
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

function clusterColumns(kids: readonly Componente[]): ClusterColumn[] {
  const sorted = kids.slice().sort((a, b) => a.x - b.x);
  const cols: ClusterColumn[] = [];
  for (const k of sorted) {
    const hit = cols.find((col) => xOverlap(col.items[0]!, k) > 24);
    if (hit) hit.items.push(k);
    else cols.push({ items: [k] });
  }
  return cols;
}

function xOverlap(a: Caja, b: Caja): number {
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

function occupyOutline(xs: readonly number[], ys: readonly number[], occ: readonly boolean[][]): Punto[] {
  const col = occ.length;
  const row = occ[0]?.length ?? 0;
  const h: number[][] = Array.from({ length: col }, () => Array(row + 1).fill(0));
  const v: number[][] = Array.from({ length: col + 1 }, () => Array(row).fill(0));
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

function cellInConvex(xs: readonly number[], ys: readonly number[], occ: readonly boolean[][], x: number, y: number): boolean {
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
  const key = (i: number, j: number): string => `${i},${j}`;
  const seen = new Set<string>();
  const islands: Array<Array<[number, number]>> = [];
  const dirs: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let i = 0; i < col; i++) {
    for (let j = 0; j < row; j++) {
      if (!occ[i][j] || seen.has(key(i, j))) continue;
      const stack: Array<[number, number]> = [[i, j]];
      const cells: Array<[number, number]> = [];
      seen.add(key(i, j));
      while (stack.length) {
        const popped = stack.pop();
        if (!popped) break;
        const [ci, cj] = popped;
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
  const main = new Set(islands[0]!.map(([i, j]) => key(i, j)));
  const passable = (i: number, j: number) => occ[i]![j] || !blocked[i]![j];
  for (let s = 1; s < islands.length; s++) {
    const start: [number, number] = islands[s]![0]!;
    const q: Array<[number, number]> = [start];
    const prev = new Map<string, [number, number] | null>([[key(start[0], start[1]), null]]);
    let hit: [number, number] | null = null;
    for (let qi = 0; qi < q.length && !hit; qi++) {
      const head = q[qi]!;
      const [ci, cj] = head;
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
    let cur: [number, number] | null | undefined = hit;
    while (cur) {
      occ[cur[0]][cur[1]] = true;
      main.add(key(cur[0], cur[1]));
      cur = prev.get(key(cur[0], cur[1]));
    }
    for (const c of islands[s]!) main.add(key(c[0], c[1]));
  }
}

/**
 * Contornos de paquete: cuadrícula que envuelve a todos los hijos.
 * Celdas en conflicto van al paquete del hijo más cercano (tocan, no solapan).
 */
export function layoutPackageOutlines(packages: readonly Paquete[], components: readonly Componente[], opts: OpcionesEmpaque = {}) {
  const pad = opts.pad ?? 12;
  const tabH = opts.tabH ?? 18;
  const groups = packages.map((p) => {
    const kids = components.filter((c) => c.package === p.id);
    // Agrupadores anidados: el padre también abraza a sus paquetes hijos.
    const nested = packages.filter((c) => c.parent === p.id);
    const padded: Caja[] = [
      ...kids.map((c) => ({ x: c.x - pad, y: c.y - pad, w: c.w + 2 * pad, h: c.h + 2 * pad })),
      ...nested.map((c) => ({ x: c.x - pad, y: c.y - pad, w: c.w + 2 * pad, h: c.h + 2 * pad })),
    ];
    if (padded.length) {
      const minX = Math.min(...padded.map((r) => r.x));
      const minY = Math.min(...padded.map((r) => r.y));
      const label = p.stereotype ? `«${p.stereotype}» ${p.name ?? ''}` : String(p.name ?? '');
      const tabW = Math.max(120, label.length * 7.4 + 24);
      padded.push({ x: minX, y: minY - tabH, w: tabW, h: tabH });
    }
    return { p, kids, padded, conv: occupyRects(padded, true) };
  }).filter((g): g is { p: Paquete; kids: Componente[]; padded: Caja[]; conv: GroupConv } => g.padded.length > 0 && g.conv !== null);

  if (!groups.length) return;

  const xs = [...new Set(groups.flatMap((g) => g.conv.xs))].sort((a, b) => a - b);
  const ys = [...new Set(groups.flatMap((g) => g.conv.ys))].sort((a, b) => a - b);
  const col = xs.length - 1;
  const row = ys.length - 1;
  if (col < 1 || row < 1) return;

  const owner: Array<Array<string | null>> = Array.from({ length: col }, () => Array(row).fill(null));
  for (let i = 0; i < col; i++) {
    for (let j = 0; j < row; j++) {
      const cx = (xs[i] + xs[i + 1]) / 2;
      const cy = (ys[j] + ys[j + 1]) / 2;
      const claim = groups.filter((g) => cellInConvex(g.conv.xs, g.conv.ys, g.conv.occ, cx, cy));
      if (!claim.length) continue;
      if (claim.length === 1) { owner[i]![j] = claim[0]!.p.id; continue; }
      let best = claim[0]!;
      let bestD = Infinity;
      for (const g of claim) {
        const anchors = g.kids.length
          ? g.kids
          : g.padded;
        const d = anchors.length
          ? Math.min(...anchors.map((k) => distToRect(cx, cy, k)))
          : Infinity;
        if (d < bestD) { bestD = d; best = g; }
      }
      owner[i]![j] = best.p.id;
    }
  }

  for (const g of groups) {
    const isNested = Boolean(g.p.parent);
    const hasChildPkgs = packages.some((c) => c.parent === g.p.id);
    // Anidados / padres con hijos-paquete: AABB del packer; el outline
    // robaba celdas al padre y dejaba al hijo en un rectángulo de pestaña.
    if (isNested || hasChildPkgs) {
      (g.p as Paquete & { outline?: Punto[] }).outline = undefined;
      continue;
    }
    const occ: boolean[][] = Array.from({ length: col }, () => Array(row).fill(false));
    const blocked: boolean[][] = Array.from({ length: col }, () => Array(row).fill(false));
    for (let i = 0; i < col; i++) {
      for (let j = 0; j < row; j++) {
        if (owner[i]![j] === g.p.id) occ[i]![j] = true;
        else if (owner[i]![j]) blocked[i]![j] = true;
      }
    }
    connectIslands(occ, blocked);
    const outline = occupyOutline(xs, ys, occ);
    (g.p as Paquete & { outline?: Punto[] }).outline = outline;
    if (outline.length) {
      g.p.x = Math.min(...outline.map((q) => q.x));
      g.p.y = Math.min(...outline.map((q) => q.y));
      g.p.w = Math.max(...outline.map((q) => q.x)) - g.p.x;
      g.p.h = Math.max(...outline.map((q) => q.y)) - g.p.y;
    }
  }
}

function walkOutline(xs: readonly number[], ys: readonly number[], h: readonly number[][], v: readonly number[][]): Punto[] {
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
  if (pts.length < 2) return pts.slice();
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

function verticalGaps(obstaculos: readonly Caja[], xMin: number, xMax: number): Array<{ a: number; b: number }> {
  const spans = obstaculos
    .map((c) => ({ a: c.x, b: c.x + c.w }))
    .filter((s) => s.b > xMin && s.a < xMax)
    .sort((a, b) => a.a - b.a);
  const merged: Array<{ a: number; b: number }> = [];
  for (const s of spans) {
    if (!merged.length || s.a > merged[merged.length - 1]!.b + 4) merged.push({ ...s });
    else merged[merged.length - 1]!.b = Math.max(merged[merged.length - 1]!.b, s.b);
  }
  const gaps: Array<{ a: number; b: number }> = [];
  let cursor = xMin;
  for (const m of merged) {
    if (m.a - cursor >= 20) gaps.push({ a: cursor, b: m.a });
    cursor = Math.max(cursor, m.b);
  }
  if (xMax - cursor >= 20) gaps.push({ a: cursor, b: xMax });
  return gaps;
}

function nearestGap(gaps: readonly { a: number; b: number }[], x: number): { a: number; b: number } {
  let best = gaps[0]!;
  let bestD = Infinity;
  for (const g of gaps) {
    const d = x < g.a ? g.a - x : x > g.b ? x - g.b : 0;
    if (d < bestD) { bestD = d; best = g; }
  }
  return best;
}

function laneInGap(gap: { a: number; b: number }, rank: number, total: number): number {
  const t = (rank + 1) / (total + 1);
  return gap.a + (gap.b - gap.a) * t;
}

const comoPath = (pts: readonly Punto[]): string => `M${pts[0]!.x},${pts[0]!.y} ` + pts.slice(1).map((p) => `L${p.x},${p.y}`).join(' ');

/** Cuánto se sale el path del marco (margen). */
export function boundsOverflow(pts: readonly Punto[], frame: Caja, margin = 36): number {
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

function outward(p: Punto, side: Lado | undefined, d: number): Punto {
  if (!side) return { x: p.x, y: p.y };
  if (side === 'left') return { x: p.x - d, y: p.y };
  if (side === 'right') return { x: p.x + d, y: p.y };
  if (side === 'top') return { x: p.x, y: p.y - d };
  return { x: p.x, y: p.y + d };
}

function alongSide(p: Punto, side: Lado | undefined, d: number): Punto {
  if (!side || !d) return { x: p.x, y: p.y };
  if (side === 'left' || side === 'right') return { x: p.x, y: p.y + d };
  return { x: p.x + d, y: p.y };
}

function dedupePts(pts: readonly Punto[]): Punto[] {
  const out: Punto[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.5 && Math.abs(last.y - p.y) < 0.5) continue;
    out.push(p);
  }
  return out;
}

function manhattan(pts: readonly Punto[]): number {
  let n = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    n += Math.abs(pts[i + 1]!.x - pts[i]!.x) + Math.abs(pts[i + 1]!.y - pts[i]!.y);
  }
  return n;
}

function collinearOverlap(a1: Punto, a2: Punto, b1: Punto, b2: Punto, tol = 6): number {
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

export function pathShareLen(pts: readonly Punto[], usedSegs: ReadonlyArray<{ a: Punto; b: Punto }>, tol = 4): number {
  if (!usedSegs?.length || pts.length < 2) return 0;
  let n = 0;
  // Incluye tramos de corredor (antes cortaba en length-2 y perdía el vertical largo).
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    for (const u of usedSegs) {
      n += collinearOverlap(a, b, u.a, u.b, tol);
    }
  }
  return n;
}

/** Carriles verticales (X) y horizontales (Y) ya ocupados por aristas. */
export function usedLaneAxes(
  usedSegs: ReadonlyArray<{ a: Punto; b: Punto }>,
  snap = 4,
): { xs: number[]; ys: number[] } {
  const xs = new Set<number>();
  const ys = new Set<number>();
  for (const u of usedSegs) {
    if (Math.abs(u.a.x - u.b.x) < 0.6) {
      const len = Math.abs(u.a.y - u.b.y);
      if (len >= 12) xs.add(Math.round(u.a.x / snap) * snap);
    }
    if (Math.abs(u.a.y - u.b.y) < 0.6) {
      const len = Math.abs(u.a.x - u.b.x);
      if (len >= 12) ys.add(Math.round(u.a.y / snap) * snap);
    }
  }
  return { xs: [...xs], ys: [...ys] };
}

/** Ejes de borde de paquetes (agrupadores): X izq/der, Y top/bot. */
export function packageBorderAxes(
  pkgs: readonly Caja[],
  snap = 4,
): { xs: number[]; ys: number[] } {
  const xs = new Set<number>();
  const ys = new Set<number>();
  for (const p of pkgs) {
    if (!(p.w > 0 && p.h > 0)) continue;
    xs.add(Math.round(p.x / snap) * snap);
    xs.add(Math.round((p.x + p.w) / snap) * snap);
    ys.add(Math.round(p.y / snap) * snap);
    ys.add(Math.round((p.y + p.h) / snap) * snap);
  }
  return { xs: [...xs], ys: [...ys] };
}

/** Penalización ×borderNearFactor si el tramo pasa cerca del perímetro de un agrupador. */
function borderProximityCost(
  pts: readonly Punto[],
  borderXs: readonly number[],
  borderYs: readonly number[],
  minDist = PKG_BORDER_CLEARANCE,
  nearFactor = PKG_BORDER_NEAR_FACTOR,
): number {
  if ((!borderXs.length && !borderYs.length) || pts.length < 2) return 0;
  const factor = Math.max(1, nearFactor);
  let cost = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const len = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    if (len < 12) continue;
    // Regla 6/9: cada borde a < minDist suma factor al multiplicador (aditivo,
    // no multiplicativo). El tramo no se "atasca" en 1×; cuantos más bordes
    // pise, más paga.
    const taxAxis = (n: number, d: number): number => {
      if (n === 0) {
        // Zona de transición (entre minDist y minDist+16): rampa lineal.
        if (d < minDist + 16) return (minDist + 16 - d) * len * 1.5;
        return 0;
      }
      const near = len * n * factor;
      if (d < 4) return near + len * factor * 40;
      return near + (minDist - d) * len * factor * 2;
    };
    if (Math.abs(a.x - b.x) < 0.6) {
      const d = nearestAxisDist(a.x, borderXs);
      cost += taxAxis(countNearAxes(a.x, borderXs, minDist), d);
    }
    if (Math.abs(a.y - b.y) < 0.6) {
      const d = nearestAxisDist(a.y, borderYs);
      cost += taxAxis(countNearAxes(a.y, borderYs, minDist), d);
    }
  }
  return cost;
}

/** Distancia mínima a un eje ocupado (∞ si vacío). */
function nearestAxisDist(v: number, axes: readonly number[]): number {
  if (!axes.length) return Infinity;
  let best = Infinity;
  for (const a of axes) best = Math.min(best, Math.abs(v - a));
  return best;
}

/**
 * Nº de ejes a menos de `pitch` del valor `v` (regla 5: cada arista/borde
 * cercana es un factor ADITIVO al multiplicador, no multiplicativo). Si
 * están 3 aristas a < 20px de un tramo, el coste es 1+3·factor — no se queda
 * en 1·factor (que era el bug previo: tope de 3× sin importar N).
 */
function countNearAxes(v: number, axes: readonly number[], pitch: number = LANE_PITCH): number {
  if (!axes.length || !(pitch > 0)) return 0;
  let n = 0;
  for (const a of axes) if (Math.abs(v - a) < pitch) n++;
  return n;
}

/** Penalización por acercarse a carriles ya usados (×laneNearFactor si d < pitch). */
function laneProximityCost(
  pts: readonly Punto[],
  used: ReadonlyArray<{ a: Punto; b: Punto }>,
  pitch = LANE_PITCH,
  nearFactor = LANE_NEAR_FACTOR,
): number {
  if (!used.length || pts.length < 2) return 0;
  const { xs, ys } = usedLaneAxes(used, 4);
  const factor = Math.max(1, nearFactor);
  let cost = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const len = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    if (len < 10) continue;
    // Regla 5: aditivo — cada arista a < pitch añade factor al multiplicador
    // (1 + n·factor, no cap multiplicativo).
    const taxAxis = (n: number, d: number): number => {
      if (n === 0) {
        if (d < pitch + 12) return (pitch + 12 - d) * len * 1.5;
        return 0;
      }
      const near = len * n * factor;
      if (d < 2) return near + len * factor * 50;
      return near + (pitch - d) * len * factor * 2;
    };
    if (Math.abs(a.x - b.x) < 0.6) {
      const d = nearestAxisDist(a.x, xs);
      cost += taxAxis(countNearAxes(a.x, xs, pitch), d);
    }
    if (Math.abs(a.y - b.y) < 0.6) {
      const d = nearestAxisDist(a.y, ys);
      cost += taxAxis(countNearAxes(a.y, ys, pitch), d);
    }
  }
  return cost;
}

/** Separación de carril por rango (abanico fuera del stem). */
function corridorFan(rank: number, total: number, pitch = 14): number {
  return (rank - (total - 1) / 2) * pitch;
}

/** Cruce propio (⊥ o X), no solape colineal. Evita intersecciones tipo Visio. */
export function segmentsCross(
  a1: Punto, a2: Punto, b1: Punto, b2: Punto, tipTol = 2,
): boolean {
  const ax = a2.x - a1.x;
  const ay = a2.y - a1.y;
  const bx = b2.x - b1.x;
  const by = b2.y - b1.y;
  const den = ax * by - ay * bx;
  if (Math.abs(den) < 1e-9) return false; // paralelo / colineal → lo mira pathShareLen
  const t = ((b1.x - a1.x) * by - (b1.y - a1.y) * bx) / den;
  const u = ((b1.x - a1.x) * ay - (b1.y - a1.y) * ax) / den;
  if (t <= 0 || t >= 1 || u <= 0 || u >= 1) return false;
  // Ignora toques en extremos (empalme de tramos).
  const tip = tipTol / Math.max(1, Math.hypot(ax, ay), Math.hypot(bx, by));
  return t > tip && t < 1 - tip && u > tip && u < 1 - tip;
}

/** Nº de cruces con aristas ya ruteadas (tramos medios). */
export function pathCrossingCount(
  pts: readonly Punto[],
  usedSegs: ReadonlyArray<{ a: Punto; b: Punto }>,
): number {
  if (!usedSegs?.length || pts.length < 2) return 0;
  let n = 0;
  for (let i = 1; i < pts.length - 2; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    for (const u of usedSegs) {
      if (segmentsCross(a, b, u.a, u.b)) n += 1;
    }
  }
  return n;
}

/**
 * W54: nº de giros de 90° en una polilínea ortogonal. Cada cambio de
 * dirección cuenta como un giro — usado para penalizar zigzags en la
 * `consider()` y como filtro en `legal()` (descarta paths con más de
 * MAX_TURNS_PER_EDGE giros). Variante específica para `Punto`
 * (el `countTurns` exportado en diagram-astar.ts trabaja sobre
 * `GridPoint` con campos `col,row`).
 */
export function countPuntoTurns(pts: readonly Punto[] | null | undefined): number {
  if (!pts || pts.length < 3) return 0;
  let turns = 0;
  let prevDx = 0, prevDy = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i]!.x - pts[i - 1]!.x;
    const dy = pts[i]!.y - pts[i - 1]!.y;
    if (i > 1 && (dx !== prevDx || dy !== prevDy)) turns++;
    prevDx = dx;
    prevDy = dy;
  }
  return turns;
}

/**
 * Min-heap binario para la open-list del A* (W54: la búsqueda ahora
 * trabaja sobre estados (x, y, dir), 4× más que sin dirección — un
 * find-best O(n) sobre un array es prohibitivo. La heap es O(log n)).
 */
class AStarHeap {
  private a: { k: string; f: number }[] = [];
  get size(): number { return this.a.length; }
  push(k: string, f: number): void {
    const a = this.a;
    a.push({ k, f });
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p]!.f <= a[i]!.f) break;
      [a[p], a[i]] = [a[i]!, a[p]!];
      i = p;
    }
  }
  pop(): string | undefined {
    const a = this.a;
    const top = a[0];
    if (!top) return undefined;
    const last = a.pop();
    if (a.length && last) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let s = i;
        if (l < a.length && a[l]!.f < a[s]!.f) s = l;
        if (r < a.length && a[r]!.f < a[s]!.f) s = r;
        if (s === i) break;
        [a[s], a[i]] = [a[i]!, a[s]!];
        i = s;
      }
    }
    return top.k;
  }
}

/** ¿La polilínea (también diagonal) corta alguna caja? */
export function pathHitsBoxes(pts: readonly Punto[], boxes: readonly Caja[]): boolean {
  if (pts.length < 2 || !boxes.length) return false;
  return rutaChoca(pts, boxes);
}

export function segsFromPath(pts: readonly Punto[]): Array<{ a: Punto; b: Punto }> {
  const out: Array<{ a: Punto; b: Punto }> = [];
  // Incluye tramos tras el stem inicial (antes se cortaba en length-2 y
  // los verticales del corredor no se registraban → cruces posteriores).
  for (let i = 1; i < pts.length - 1; i++) out.push({ a: pts[i]!, b: pts[i + 1]! });
  return out;
}

function hullOf(boxes: readonly Caja[], pad: number): { x0: number; y0: number; x1: number; y1: number } {
  return {
    x0: Math.min(...boxes.map((c) => c.x)) - pad,
    y0: Math.min(...boxes.map((c) => c.y)) - pad,
    x1: Math.max(...boxes.map((c) => c.x + c.w)) + pad,
    y1: Math.max(...boxes.map((c) => c.y + c.h)) + pad,
  };
}

function gridRoute(
  from: Punto,
  to: Punto,
  boxes: readonly Caja[],
  clearance: number,
  usedSegs: ReadonlyArray<{ a: Punto; b: Punto }> = [],
  soft: {
    softPkgs?: readonly Caja[];
    textBoxes?: readonly Caja[];
    pkgCrossFactor?: number;
    lanePitch?: number;
    laneNearFactor?: number;
    /** Ejes X de bordes de agrupadores (regla 6: cuentan como aristas). */
    borderXs?: readonly number[];
    /** Ejes Y de bordes de agrupadores. */
    borderYs?: readonly number[];
    /** W54: agrupadores marcados `prohibido: true` → muro duro (Infinity). */
    prohibitedPkgs?: readonly Caja[];
    /**
     * W55: bordes del agrupador PADRE del origen (no todos los bordes).
     * Dentro del padre, acercarse a SU perímetro cuesta muchísimo —
     * evita que la arista arranque corriendo por el borde interior del
     * paquete antes de salir.
     */
    parentBorderXs?: readonly number[];
    /** W55: id. para Y. */
    parentBorderYs?: readonly number[];
    /** W55: penalización ADITIVA por paso pegado al borde del padre. */
    parentBorderPenalty?: number;
    /** W55: radio de influencia del borde del padre (px). */
    parentBorderClearance?: number;
  } = {},
): Punto[] | null {
  const step = 10;
  // Regla 1/2/3/4 + W54: muros duros.
  //   - Componentes (boxes, inflated por clearance)
  //   - Textos / títulos (textBoxes, inflated por 4)
  //   - Agrupadores prohibidos (prohibitedPkgs, inflated por clearance) ← W54
  const hardBoxes: Caja[] = [
    ...boxes.map((c) => inflateBox(c, clearance)),
    ...(soft.textBoxes ?? []).map((c) => inflateBox(c, 4)),
    ...(soft.prohibitedPkgs ?? []).map((c) => inflateBox(c, clearance)),
  ];
  const parentBorderXs = soft.parentBorderXs ?? [];
  const parentBorderYs = soft.parentBorderYs ?? [];
  const parentBorderPenalty = Math.max(0, Number(soft.parentBorderPenalty) || 0);
  /**
   * W55+: clearance por defecto subido de 40 → 60 para que la
   * penalización del padre cubra el rango típico de conectores hijos
   * (un componente hijo de 60-100px de alto, cuyos conectores pueden
   * estar a 30-50px del borde top/bot del padre). Con 40, la W55 no
   * se disparaba en geometrías como ISW-TestPatyIA dentro de pkg-apps
   * (5 aristas paralelas al borde del padre).
   */
  const parentBorderClearance = Math.max(8, Number(soft.parentBorderClearance) || Math.max(60, PKG_BORDER_CLEARANCE + 20));
  const softPkgs = soft.softPkgs ?? [];
  const crossFactor = Math.max(1, Number(soft.pkgCrossFactor) || PKG_CROSS_FACTOR);
  const lanePitch = Math.max(8, Number(soft.lanePitch) || LANE_PITCH);
  const nearFactor = Math.max(1, Number(soft.laneNearFactor) || LANE_NEAR_FACTOR);
  const borderXs = soft.borderXs ?? [];
  const borderYs = soft.borderYs ?? [];
  const pad = 96;
  let minX = Math.min(from.x, to.x) - pad;
  let minY = Math.min(from.y, to.y) - pad;
  let maxX = Math.max(from.x, to.x) + pad;
  let maxY = Math.max(from.y, to.y) + pad;
  for (const c of [...hardBoxes, ...softPkgs]) {
    minX = Math.min(minX, c.x - pad);
    minY = Math.min(minY, c.y - pad);
    maxX = Math.max(maxX, c.x + c.w + pad);
    maxY = Math.max(maxY, c.y + c.h + pad);
  }
  const snap = (v: number): number => Math.round(v / step) * step;
  const hit = (x: number, y: number, c: Caja): boolean =>
    x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h;
  const inSoftPkg = (x: number, y: number): boolean => softPkgs.some((c) => hit(x, y, c));
  const sx = snap(from.x);
  const sy = snap(from.y);
  const gx = snap(to.x);
  const gy = snap(to.y);
  const startK = `${sx},${sy}`;
  const goalK = `${gx},${gy}`;
  const { xs: usedXs, ys: usedYs } = usedLaneAxes(usedSegs, step);
  /**
   * W54 (tuning agresivo): mapa de uso por celda. Cada celda (x, y) del
   * grid (snapped a `step`) recuerda cuántas aristas previas la cruzan. El
   * A* paga un multiplicador `1 + count * CORRIDOR_PENALTY` por pisar
   * celdas ya usadas — empuja a las nuevas aristas a buscar carriles
   * libres en vez de apiñarse sobre el mismo eje.
   */
  const cellUsage: Map<string, number> = (() => {
    const m = new Map<string, number>();
    if (!CORRIDOR_PENALTY) return m;
    for (const u of usedSegs) {
      const ax = snap(u.a.x), ay = snap(u.a.y);
      const bx = snap(u.b.x), by = snap(u.b.y);
      if (Math.abs(ax - bx) < 0.5) {
        const x = ax;
        const stepY = ay < by ? step : -step;
        for (let y = ay; Math.abs(y - by) >= step * 0.5; y += stepY) {
          const k = `${x},${y}`;
          m.set(k, (m.get(k) ?? 0) + 1);
        }
      } else if (Math.abs(ay - by) < 0.5) {
        const y = ay;
        const stepX = ax < bx ? step : -step;
        for (let x = ax; Math.abs(x - bx) >= step * 0.5; x += stepX) {
          const k = `${x},${y}`;
          m.set(k, (m.get(k) ?? 0) + 1);
        }
      }
    }
    return m;
  })();
  /**
   * Regla 5/6: coste de paso ADITIVO. Cada arista (usedXs/usedYs) y cada
   * borde de agrupador (borderXs/borderYs) a < lanePitch del paso añade
   * `nearFactor` al multiplicador — NO se multiplican entre sí, se SUMAN.
   *   - 0 cerca  → ×1
   *   - 1 cerca  → ×(1 + 1·factor)
   *   - 3 cerca  → ×(1 + 3·factor)  ← más castigo cuanto más apiñado
   * Si el eje de movimiento no toca el eje evaluado, ese eje no se cuenta.
   */
  const stepPenaltyMul = (x: number, y: number, dx: number, dy: number): number => {
    let n = 0;
    if (dx !== 0) n += countNearAxes(y, usedYs, lanePitch);
    if (dy !== 0) n += countNearAxes(x, usedXs, lanePitch);
    n += countNearAxes(x, borderXs, lanePitch);
    n += countNearAxes(y, borderYs, lanePitch);
    return 1 + n * nearFactor;
  };
  /**
   * W55: penalización por paso pegado al borde del PADRE del origen.
   * Si el segmento evaluado pasa a < parentBorderClearance del borde del
   * paquete que contiene al origen, sumamos `parentBorderPenalty` al coste
   * del paso (no multiplicativo, ADITIVO) — así el A* prefiere rodear el
   * perímetro del padre antes que pegarse a él. Solo aplica a los ejes
   * del padre (no a todos los paquetes).
   *
   * W55+ (parentBorderProximity): cuando el primer segmento de la arista
   * corre PARALELO al borde del padre (e.g. aristas desde ISW-TestPatyIA
   * que hacen 44-200px horizontales pegadas al top/bot del pkg-apps),
   * añadimos una penalización ADITIVA proporcional a la longitud del
   * tramo paralelo. Esto fuerza a la arista a separarse del borde
   * perpendicularmente en lugar de pegarse a él.
   */
  const parentBorderStepCost = (x: number, y: number, dx: number, dy: number): number => {
    if (!parentBorderPenalty) return 0;
    if (!parentBorderXs.length && !parentBorderYs.length) return 0;
    let extra = 0;
    if (dx !== 0) {
      // Movimiento horizontal: el borde del padre vertical (axis Y) cuenta si y
      // está cerca de un eje Y del padre. Y también si el propio eje x está
      // cerca de un eje X del padre (la arista va paralela al borde).
      for (const by of parentBorderYs) {
        if (Math.abs(y - by) < parentBorderClearance) {
          extra += parentBorderPenalty * (parentBorderClearance - Math.abs(y - by)) / parentBorderClearance;
        }
      }
      for (const bx of parentBorderXs) {
        if (Math.abs(x - bx) < 4) {
          extra += parentBorderPenalty * 2;
        }
      }
    } else if (dy !== 0) {
      for (const bx of parentBorderXs) {
        if (Math.abs(x - bx) < parentBorderClearance) {
          extra += parentBorderPenalty * (parentBorderClearance - Math.abs(x - bx)) / parentBorderClearance;
        }
      }
      for (const by of parentBorderYs) {
        if (Math.abs(y - by) < 4) {
          extra += parentBorderPenalty * 2;
        }
      }
    }
    return extra;
  };
  /**
   * W54: A* consciente de dirección. Estado = (x, y, dir) donde dir ∈
   * {0,1,2,3} codifica la última dirección de movimiento
   * (R/D/L/U); -1 = sin dirección (inicio). Cada cambio de dirección
   * entre paso y paso suma TURN_PENALTY al coste — un zigzag se paga
   * proporcional a su nº de giros. Sin esta penalización el A* solo
   * miraba `cellCost` y los corredores zigzagueantes (L+L+L+...)
   * salían igual de baratos que un camino recto con un único L.
   */
  const encodeState = (x: number, y: number, dir: number): string => `${x},${y},${dir}`;
  const decodeState = (k: string): { x: number; y: number; dir: number } => {
    const parts = k.split(',');
    return { x: Number(parts[0]), y: Number(parts[1]), dir: Number(parts[2]) };
  };
  // dirs[i] = [dx, dy, dirIndex] — dirIndex usado para comparar con prev.
  const dirs: Array<[number, number, number]> = [
    [step, 0, 0],     // right
    [0, step, 1],     // down
    [-step, 0, 2],    // left
    [0, -step, 3],    // up
  ];
  // A*: f = g + h; h = manhattan. Interior de agrupador = ×pkgCrossFactor.
  const dist = new Map<string, number>([[encodeState(sx, sy, -1), 0]]);
  const prev = new Map<string, { x: number; y: number; dir: number } | null>([[encodeState(sx, sy, -1), null]]);
  const open = new AStarHeap();
  const startStateK = encodeState(sx, sy, -1);
  open.push(startStateK, Math.abs(gx - sx) + Math.abs(gy - sy));
  const near = (x: number, y: number, tx: number, ty: number): boolean =>
    Math.abs(x - tx) + Math.abs(y - ty) <= step * 2;
  let guard = 0;
  while (open.size && guard++ < 80000) {
    const sk = open.pop()!;
    const { x: cx, y: cy, dir: cdir } = decodeState(sk);
    if (cx === gx && cy === gy) break;
    const curG = dist.get(sk) ?? Infinity;
    if (curG === Infinity) continue;
    for (const [dx, dy, ndir] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < minX || ny < minY || nx > maxX || ny > maxY) continue;
      const nk = encodeState(nx, ny, ndir);
      // Regla 1/2/3/4 + W54: muros duros. Sin esto el A* atraviesa un
      // título o un paquete prohibido para "ahorrar" un giro.
      const blockedHit = hardBoxes.some((c) => hit(nx, ny, c));
      if (blockedHit && !(nx === gx && ny === gy) && !(nx === sx && ny === sy) && !near(nx, ny, gx, gy) && !near(nx, ny, sx, sy)) {
        continue;
      }
      const base = step;
      const mul = stepPenaltyMul(nx, ny, dx, dy);
      // W54 (tuning agresivo): pisar una celda ya usada por N aristas
      // previas cuesta `1 + N * CORRIDOR_PENALTY`. Se aplica DESPUÉS del
      // mul de carril/borde para que el apiñamiento entre aristas tenga
      // coste propio (no se diluye con la penalización por cercanía).
      const usedCount = cellUsage.get(`${nx},${ny}`) ?? 0;
      const corridorMul = CORRIDOR_PENALTY ? 1 + usedCount * CORRIDOR_PENALTY : 1;
      // Regla 7: cada paso dentro de un agrupador = ×pkgCrossFactor.
      const distCost = (inSoftPkg(nx, ny) ? base * crossFactor : base) * mul * corridorMul;
      // W55: penalización ADITIVA por paso pegado al borde del padre.
      const parentBorderExtra = parentBorderStepCost(nx, ny, dx, dy);
      // W54: TURN_PENALTY por cada cambio de dirección (excepto el primer
      // paso, donde dir = -1).
      const turnCost = (cdir !== -1 && cdir !== ndir) ? TURN_PENALTY : 0;
      const stepCost = distCost + turnCost + parentBorderExtra;
      const ng = curG + stepCost;
      if (ng >= (dist.get(nk) ?? Infinity)) continue;
      dist.set(nk, ng);
      prev.set(nk, { x: cx, y: cy, dir: cdir });
      const h = Math.abs(gx - nx) + Math.abs(gy - ny);
      open.push(nk, ng + h);
    }
  }
  // Reconstruir el camino: empezamos en goal con cualquier dir.
  let endKey: string | null = null;
  for (const k of prev.keys()) {
    const d = decodeState(k);
    if (d.x === gx && d.y === gy) { endKey = k; break; }
  }
  if (!endKey) return null;
  const rev: Punto[] = [];
  let cur: { x: number; y: number; dir: number } | null | undefined = prev.get(endKey)!;
  rev.push({ x: gx, y: gy });
  while (cur) {
    rev.push({ x: cur.x, y: cur.y });
    const pk = encodeState(cur.x, cur.y, cur.dir);
    cur = prev.get(pk) ?? null;
  }
  rev.reverse();
  const join = (a: Punto, b: Punto): Punto[] => {
    if (Math.abs(a.x - b.x) < 0.5 || Math.abs(a.y - b.y) < 0.5) return [a, b];
    return [a, { x: a.x, y: b.y }, b];
  };
  const first = rev[0]!;
  const last = rev[rev.length - 1]!;
  return collapseOrtho(dedupePts([...join(from, first), ...rev.slice(1, -1), ...join(last, to).slice(1)]));
}

/** Longitud de path que cae dentro de agrupadores (para score). */
function pathInsidePkgsLen(pts: readonly Punto[], pkgs: readonly Caja[]): number {
  if (!pkgs.length || pts.length < 2) return 0;
  let len = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const seg = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    if (seg < 1) continue;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    if (pkgs.some((p) => mx >= p.x && mx <= p.x + p.w && my >= p.y && my <= p.y + p.h)) {
      len += seg;
    }
  }
  return len;
}

function overshootsTip(pts: readonly Punto[]): boolean {
  if (pts.length < 3) return false;
  const a = pts[pts.length - 3]!;
  const b = pts[pts.length - 2]!;
  const t = pts[pts.length - 1]!;
  const between = (u: number, v: number, m: number): boolean => m > Math.min(u, v) + 0.5 && m < Math.max(u, v) - 0.5;
  if (Math.abs(a.y - b.y) < 0.5 && Math.abs(b.y - t.y) < 0.5 && between(a.x, b.x, t.x)) return true;
  if (Math.abs(a.x - b.x) < 0.5 && Math.abs(b.x - t.x) < 0.5 && between(a.y, b.y, t.y)) return true;
  return false;
}

function overshootsStart(pts: readonly Punto[]): boolean {
  if (pts.length < 3) return false;
  const t = pts[0]!;
  const a = pts[1]!;
  const b = pts[2]!;
  const between = (u: number, v: number, m: number): boolean => m > Math.min(u, v) + 0.5 && m < Math.max(u, v) - 0.5;
  if (Math.abs(t.y - a.y) < 0.5 && Math.abs(a.y - b.y) < 0.5 && between(a.x, b.x, t.x)) return true;
  if (Math.abs(t.x - a.x) < 0.5 && Math.abs(a.x - b.x) < 0.5 && between(a.y, b.y, t.y)) return true;
  return false;
}

function lastMissesApproach(pts: readonly Punto[], toSide: Lado | undefined): boolean {
  if (!toSide || pts.length < 2) return false;
  const a = pts[pts.length - 2]!;
  const b = pts[pts.length - 1]!;
  if (toSide === 'right') return a.x < b.x - 0.5;
  if (toSide === 'left') return a.x > b.x + 0.5;
  if (toSide === 'bottom') return a.y < b.y - 0.5;
  if (toSide === 'top') return a.y > b.y + 0.5;
  return false;
}

function collapseOrtho(pts: readonly Punto[]): Punto[] {
  if (!pts?.length) return [];
  if (pts.length < 3) return pts.slice();
  const eq = (a: number, b: number): boolean => Math.abs(a - b) < 0.51;
  const out: Punto[] = [pts[0]!];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = out[out.length - 1]!;
    const b = pts[i]!;
    const c = pts[i + 1]!;
    const col = (eq(a.x, b.x) && eq(b.x, c.x)) || (eq(a.y, b.y) && eq(b.y, c.y));
    if (!col) out.push(b);
  }
  out.push(pts[pts.length - 1]!);
  return dedupePts(out);
}

function inCorridor(from: Punto, to: Punto, c: Caja, inflate = 12): boolean {
  const x0 = Math.min(from.x, to.x) - inflate;
  const x1 = Math.max(from.x, to.x) + inflate;
  const y0 = Math.min(from.y, to.y) - inflate;
  const y1 = Math.max(from.y, to.y) + inflate;
  return c.x < x1 && c.x + c.w > x0 && c.y < y1 && c.y + c.h > y0;
}

function endpointClamp(from: Punto, to: Punto, fromBox: Caja | undefined, toBox: Caja | undefined): { xMin: number; xMax: number; yMin: number; yMax: number } {
  const xs: number[] = [from.x, to.x];
  const ys: number[] = [from.y, to.y];
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

function wrapCandidates(
  from: Punto,
  to: Punto,
  a0: Punto,
  b0: Punto,
  aJog: Punto,
  bJog: Punto,
  boxes: readonly Caja[],
  pad: number,
  lane: number = 0,
  clamp?: { xMin: number; xMax: number; yMin: number; yMax: number },
): Punto[][] {
  const o = 8 + Math.min(lane, 6) * 8;
  const ax = aJog.x;
  const ay = aJog.y;
  const bx = bJog.x;
  const by = bJog.y;
  const paths: Punto[][] = [
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

export function routeAvoidingBoxes(
  from: Punto,
  to: Punto,
  obstaculos: readonly Caja[],
  rank: number = 0,
  total: number = 1,
  opts: RouteAvoidOpts = {},
): string | null {
  const clearance = opts.clearance ?? EDGE_CLEARANCE;
  const a0 = outward(from, opts.fromSide, clearance);
  const b0 = outward(to, opts.toSide, clearance);
  const lanePitch = Math.max(8, Number(opts.lanePitch) || LANE_PITCH);
  const laneNearFactor = Math.max(1, Number(opts.laneNearFactor) || LANE_NEAR_FACTOR);
  const pkgBorderKeep = Math.max(12, Number(opts.pkgBorderClearance) || PKG_BORDER_CLEARANCE);
  const sideSpread = Math.max(-80, Math.min(80, corridorFan(rank, total, lanePitch)));
  const aJog = alongSide(a0, opts.fromSide, sideSpread);
  const bJog = alongSide(b0, opts.toSide, -sideSpread);
  // Carril ortogonal al puerto: offset lineal por rank × lanePitch.
  const pitch = lanePitch;
  const corridorPad = Math.max(36, pkgBorderKeep);
  const corridorFrom = (() => {
    if (opts.fromSide === 'right') return { x: aJog.x + corridorPad + rank * pitch, y: aJog.y };
    if (opts.fromSide === 'left') return { x: aJog.x - corridorPad - rank * pitch, y: aJog.y };
    if (opts.fromSide === 'bottom') return { x: aJog.x, y: aJog.y + corridorPad + rank * pitch };
    if (opts.fromSide === 'top') return { x: aJog.x, y: aJog.y - corridorPad - rank * pitch };
    return { ...aJog };
  })();
  const corridorTo = (() => {
    if (opts.toSide === 'right') return { x: bJog.x + corridorPad + (total - 1 - rank) * pitch, y: bJog.y };
    if (opts.toSide === 'left') return { x: bJog.x - corridorPad - (total - 1 - rank) * pitch, y: bJog.y };
    if (opts.toSide === 'bottom') return { x: bJog.x, y: bJog.y + corridorPad + (total - 1 - rank) * pitch };
    if (opts.toSide === 'top') return { x: bJog.x, y: bJog.y - corridorPad - (total - 1 - rank) * pitch };
    return { ...bJog };
  })();
  const others: Caja[] = obstaculos.map((c) => inflateBox(c, clearance));
  const midObst: Caja[] = others.slice();
  const farFrom = (box: Caja, pt: Punto): boolean => {
    if (!box || !pt) return false;
    const inf = inflateBox(box, 10);
    return pt.x < inf.x || pt.x > inf.x + inf.w || pt.y < inf.y || pt.y > inf.y + inf.h;
  };
  if (opts.fromBox && farFrom(opts.fromBox, to)) midObst.push(inflateBox(opts.fromBox, 4));
  if (opts.toBox && farFrom(opts.toBox, from)) midObst.push(inflateBox(opts.toBox, 4));
  const blocking: Caja[] = obstaculos.filter((c: Caja) => inCorridor(from, to, c, clearance + 8));
  const wrapBoxes: readonly Caja[] = opts.wrapBoxes ?? obstaculos;
  const inner = endpointClamp(from, to, opts.fromBox, opts.toBox);
  const clamp: { xMin: number; xMax: number; yMin: number; yMax: number } | undefined = undefined as { xMin: number; xMax: number; yMin: number; yMax: number } | undefined;
  const used = opts.usedSegs ?? [];
  const { xs: busyXs, ys: busyYs } = usedLaneAxes(used, 4);
  const pkgList: Caja[] = [];
  if (opts.fromPkg) pkgList.push(opts.fromPkg as Caja);
  if (opts.toPkg) pkgList.push(opts.toPkg as Caja);
  for (const p of opts.pkgBoxes ?? []) pkgList.push(p as Caja);
  for (const w of opts.wrapBoxes ?? []) {
    const id = (w as Caja & { id?: string }).id ?? '';
    if (id.startsWith('wrap-') || id.startsWith('pkg-')) pkgList.push(w as Caja);
  }
  const { xs: borderXs, ys: borderYs } = packageBorderAxes(pkgList, 4);
  const softPkgs: Caja[] = (opts.softPkgs ?? opts.pkgBoxes ?? pkgList).slice() as Caja[];
  const textBoxes: Caja[] = (opts.textBoxes ?? []).slice() as Caja[];
  const pkgCrossFactor = Math.max(1, Number(opts.pkgCrossFactor) || PKG_CROSS_FACTOR);
  /**
   * W54: agrupadores prohibidos. Cada uno se trata como muro duro en
   * `gridRoute` (Infinity) y aquí se valida también en `legal()` para
   * los candidatos heurísticos (codos, wrapCandidates, etc.).
   */
  const prohibitedPkgs: Caja[] = ((opts as { prohibitedPkgs?: readonly Caja[] }).prohibitedPkgs ?? []).slice() as Caja[];
  /**
   * W55: bordes del paquete PADRE del source (no de cualquier paquete).
   * Cuando el origen vive dentro de un paquete, sus bordes cuentan como
   * "pared caliente" — el A* paga parentBorderPenalty por cada paso a
   * < parentBorderClearance del perímetro del padre. Esto evita que la
   * arista arranque corriendo por el borde interior del paquete antes
   * de salir al corredor.
   */
  const fromPkgBox = opts.fromPkg as Caja | undefined;
  const parentBorderPkg: Caja[] = fromPkgBox ? [fromPkgBox] : [];
  const { xs: parentBorderXs, ys: parentBorderYs } = packageBorderAxes(parentBorderPkg, 4);
  const parentBorderPenalty = Number(opts.parentBorderPenalty) || PARENT_BORDER_PENALTY;
  const parentBorderClearance = Math.max(24, Number(opts.parentBorderClearance) || Math.max(60, PKG_BORDER_CLEARANCE + 20));

  const legal = (pts: Punto[]): boolean => {
    if (pts.length < 2 || pathHasDiagonal(pts)) return false;
    const comps: Caja[] = obstaculos.slice();
    if (opts.fromBox) comps.push(opts.fromBox);
    if (opts.toBox) comps.push(opts.toBox);
    const fromId = (opts.fromBox as (Caja & { id?: string }) | undefined)?.id;
    const toId = (opts.toBox as (Caja & { id?: string }) | undefined)?.id;
    if (pathIllegal(pts, comps, fromId, toId, clearance)) return false;
    // Prohibido absoluto: arista sobre textos / títulos.
    if (textBoxes.length && pathHitsBoxes(pts, textBoxes.map((t) => inflateBox(t, 2)))) return false;
    // W54: prohibidos absolutos para aristas. Igual que los textos, las
    // aristas NO pueden atravesar un agrupador marcado como prohibido.
    // W55: la inflación aquí debe ser ≥ gridRoute para que el check
    // post-A* no sea más permisivo que el muro duro del A*. Antes era
    // 2 (≈ stroke width) → paths que rozan el borde pasaban el check.
    // Subimos a EDGE_CLEARANCE para alinear con el muro del A*.
    if (prohibitedPkgs.length && pathHitsBoxes(pts, prohibitedPkgs.map((p) => inflateBox(p, EDGE_CLEARANCE)))) return false;
    if (overshootsTip(pts) || overshootsStart(pts)) return false;
    if (lastMissesApproach(pts, opts.toSide)) return false;
    const stem1 = [pts[0]!, pts[1]!];
    const stem2 = [pts[pts.length - 2]!, pts[pts.length - 1]!];
    const mid = pts.slice(1, -1);
    // Con softPkgs el interior de agrupador es costo (×N), no muro duro.
    // Sin soft: muro propio origen/destino en el tramo medio (legado).
    if (!softPkgs.length) {
      const pkgWalls: Caja[] = [];
      if (opts.fromPkg) pkgWalls.push(inflateBox(opts.fromPkg as Caja, 2));
      if (opts.toPkg) pkgWalls.push(inflateBox(opts.toPkg as Caja, 2));
      if (mid.length >= 2 && rutaChoca(mid, [...midObst, ...pkgWalls])) return false;
    } else if (mid.length >= 2 && rutaChoca(mid, midObst)) {
      return false;
    }
    if (rutaChoca(stem1, others)) return false;
    if (rutaChoca(stem2, others)) return false;
    if (!opts._loose && opts.fromPkg && opts.fromSide) {
      const fp = opts.fromPkg as Caja;
      if (opts.fromSide === 'right' && pts.some((p, i) => i > 0 && p.x < fp.x - 2)) return false;
      if (opts.fromSide === 'left' && pts.some((p, i) => i > 0 && p.x > fp.x + fp.w + 2)) return false;
      if (opts.fromSide === 'bottom' && pts.some((p, i) => i > 0 && p.y < fp.y - 2)) return false;
      if (opts.fromSide === 'top' && pts.some((p, i) => i > 0 && p.y > fp.y + fp.h + 2)) return false;
    }
    if (!opts._loose && pathCrossingCount(pts, used) > 0) return false;
    // W54 (tuning agresivo): máx. Nº de giros. Un camino con >
    // MAX_TURNS_PER_EDGE es zigzag ilegible; descartado en estricto. En
    // _loose permitimos +1 (5) para fallback en geometrías apretadas
    // (p.ej. cuando la unión desde/hasta lollipop no se alinea al grid
    // del A* y aparece un segmento extra de 2px). Mantener el fallback
    // en 5 es preferible a la línea recta diagonal del último recurso.
    const maxTurns = opts._loose ? MAX_TURNS_PER_EDGE + 1 : MAX_TURNS_PER_EDGE;
    if (countPuntoTurns(pts) > maxTurns) return false;
    return true;
  };

  interface ScoredPath extends Array<Punto> {
    _share?: number;
  }

  let best: ScoredPath | null = null;
  let bestScore = Infinity;
  const frame = opts.frame;
  const laneFree = (x: number, y: number, vertical: boolean): boolean => {
    // Rechazo duro ~0.75×pitch; el costo ×laneNearFactor castiga hasta pitch.
    const busyMin = opts._loose
      ? Math.max(6, lanePitch * 0.45)
      : Math.max(12, lanePitch * 0.75);
    const keep = opts._loose
      ? Math.max(10, Math.round(pkgBorderKeep * 0.4))
      : Math.max(24, Math.round(pkgBorderKeep * 0.6));
    if (vertical) {
      if (nearestAxisDist(x, busyXs) < busyMin) return false;
      if (borderXs.length && nearestAxisDist(x, borderXs) < keep) return false;
      return true;
    }
    if (nearestAxisDist(y, busyYs) < busyMin) return false;
    if (borderYs.length && nearestAxisDist(y, borderYs) < keep) return false;
    return true;
  };
  const consider = (pts: Punto[]): void => {
    const clean = collapseOrtho(dedupePts(pts));
    if (!legal(clean)) return;
    // wrapCandidates / codos pueden rozar el borde del agrupador: rechazar
    // en estricto (laneFree solo filtra el abanico explícito).
    if (!opts._loose && (borderXs.length || borderYs.length)) {
      const keep = Math.max(24, Math.round(pkgBorderKeep * 0.6));
      for (let i = 1; i < clean.length - 2; i++) {
        const a = clean[i]!;
        const b = clean[i + 1]!;
        const len = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        if (len < 48) continue;
        if (Math.abs(a.x - b.x) < 0.6 && nearestAxisDist(a.x, borderXs) < keep) return;
        if (Math.abs(a.y - b.y) < 0.6 && nearestAxisDist(a.y, borderYs) < keep) return;
      }
    }
    const share = pathShareLen(clean, used, 6);
    const crosses = pathCrossingCount(clean, used);
    const laneTax = laneProximityCost(clean, used, lanePitch, laneNearFactor);
    const borderTax = borderProximityCost(clean, borderXs, borderYs, pkgBorderKeep);
    // Interior de agrupador: ×pkgCrossFactor sobre la longitud interior.
    const insideLen = pathInsidePkgsLen(clean, softPkgs);
    const pkgTax = insideLen * (pkgCrossFactor - 1);
    /**
     * W55: penalización post-A* por tramo pegado al borde del PADRE del
     * origen. Complementa al coste del A* (este cubre candidatos
     * heurísticos como codos y wrapCandidates). Mide la longitud del
     * tramo que está a < parentBorderClearance de cualquier borde del
     * padre y lo multiplica por parentBorderPenalty.
     *
     * W55+ (Phase 5): extra de "primer tramo paralelo al borde" — cuando
     * los primeros 3 puntos del path forman un segmento pegado al borde
     * top/bot del padre y la arista está justo dentro del ancho del
     * padre, suma un extra proporcional a la longitud. Esto penaliza
     * los "renglones" de aristas que corren paralelas al borde en lugar
     * de separarse perpendicularmente.
     */
    let parentBorderTax = 0;
    if (parentBorderPenalty && (parentBorderXs.length || parentBorderYs.length)) {
      for (let i = 1; i < clean.length - 1; i++) {
        const a = clean[i]!;
        const b = clean[i + 1]!;
        const len = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        if (len < 1) continue;
        let near = 0;
        if (Math.abs(a.x - b.x) < 0.6) {
          // Segmento vertical: paga si x está pegado a un eje X del padre.
          for (const bx of parentBorderXs) {
            if (Math.abs(a.x - bx) < parentBorderClearance) near += (parentBorderClearance - Math.abs(a.x - bx)) / parentBorderClearance;
          }
        } else if (Math.abs(a.y - b.y) < 0.6) {
          // Segmento horizontal: paga si y está pegado a un eje Y del padre.
          for (const by of parentBorderYs) {
            if (Math.abs(a.y - by) < parentBorderClearance) near += (parentBorderClearance - Math.abs(a.y - by)) / parentBorderClearance;
          }
        }
        parentBorderTax += len * near * parentBorderPenalty;
      }
    }
    const outside = frame ? boundsOverflow(clean, frame, 24) : 0;
    const hook = boundsOverflow(clean, {
      x: inner.xMin, y: inner.yMin,
      w: inner.xMax - inner.xMin, h: inner.yMax - inner.yMin,
    }, 0);
    // W54: cada giro suma TURN_PENALTY (legibilidad > distancia). Zigzags
    // largos se penalizan también con ZIGZAG_PENALTY.
    const turns = countPuntoTurns(clean);
    const turnTax = turns * TURN_PENALTY + (turns > MAX_TURNS_PER_EDGE ? (turns - MAX_TURNS_PER_EDGE) * ZIGZAG_PENALTY * TURN_PENALTY : 0);
    // Rieles pegados / interior agrupador / zigzags cuestan más que un rodeo.
    const score = manhattan(clean) + share * 1800 + laneTax + borderTax + pkgTax
      + crosses * 1200 + outside * 24 + hook * 16 + turnTax + parentBorderTax;
    if (score < bestScore || (score === bestScore && share < (best?._share ?? Infinity))) {
      bestScore = score;
      best = clean as ScoredPath;
      best._share = share;
    }
  };

  // Primario: A* sobre grid (costo mínimo + ×N dentro de agrupadores / rieles).
  {
    const hardOnly = obstaculos.filter((c) => {
      const id = (c as Caja & { id?: string }).id ?? '';
      return !id.startsWith('pkg-') && !id.startsWith('wrap-');
    });
    for (const cl of [clearance, Math.max(8, clearance - 6)]) {
      const g = gridRoute(from, to, hardOnly, cl, used, {
        softPkgs,
        textBoxes,
        pkgCrossFactor,
        lanePitch,
        laneNearFactor,
        // Regla 6: bordes de agrupador cuentan como aristas en el A* (no
        // solo en el scoring post-evaluación).
        borderXs,
        borderYs,
        // W54: agrupadores prohibidos = muro duro. Sin este pase, el A*
        // atravesaba el paquete "«PG» clientesis" para "ahorrar" un giro.
        prohibitedPkgs,
        // W55: penalización ADITIVA por estar cerca del borde del PADRE
        // del origen — evita que la arista recorra pegada al perímetro
        // interior del paquete antes de salir al corredor.
        parentBorderXs,
        parentBorderYs,
        parentBorderPenalty,
        parentBorderClearance,
      });
      if (g) consider(collapseOrtho(g));
    }
  }

  // Codos: solo si el eje del corredor está libre de aristas Y de bordes de paquete.
  const corridorAxisFree = (opts.fromSide === 'top' || opts.fromSide === 'bottom')
    ? laneFree(0, corridorFrom.y, false)
    : laneFree(corridorFrom.x, 0, true);
  if (corridorAxisFree || opts._loose) {
    consider([from, a0, aJog, corridorFrom, { x: corridorFrom.x, y: corridorTo.y }, corridorTo, bJog, b0, to]);
    consider([from, a0, aJog, corridorFrom, { x: corridorTo.x, y: corridorFrom.y }, corridorTo, bJog, b0, to]);
    consider([from, a0, aJog, { x: corridorFrom.x, y: aJog.y }, { x: corridorFrom.x, y: bJog.y }, bJog, b0, to]);
    consider([from, a0, aJog, { x: aJog.x, y: corridorFrom.y }, { x: bJog.x, y: corridorFrom.y }, bJog, b0, to]);
  }
  // Oferta de carriles 0..N globales: elige el libre más cercano (ignora rank local).
  const laneN = Math.max(total * 3, 24);
  const laneBase = Math.max(40, PKG_BORDER_CLEARANCE);
  for (let k = 0; k < laneN; k++) {
    let vx = aJog.x;
    let hy = aJog.y;
    if (opts.fromSide === 'right') vx = aJog.x + laneBase + k * pitch;
    else if (opts.fromSide === 'left') vx = aJog.x - laneBase - k * pitch;
    else if (opts.fromSide === 'bottom') hy = aJog.y + laneBase + k * pitch;
    else if (opts.fromSide === 'top') hy = aJog.y - laneBase - k * pitch;
    else vx = aJog.x + laneBase + k * pitch;
    if (opts.fromSide === 'top' || opts.fromSide === 'bottom') {
      if (!laneFree(0, hy, false) && !opts._loose) continue;
      consider([from, a0, aJog, { x: aJog.x, y: hy }, { x: bJog.x, y: hy }, bJog, b0, to]);
    } else {
      if (!laneFree(vx, 0, true) && !opts._loose) continue;
      consider([from, a0, aJog, { x: vx, y: aJog.y }, { x: vx, y: bJog.y }, bJog, b0, to]);
      consider([from, a0, aJog, { x: vx, y: aJog.y }, { x: vx, y: corridorTo.y }, corridorTo, bJog, b0, to]);
    }
  }
  if (rank === 0 && !used.length) {
    consider([from, a0, { x: a0.x, y: b0.y }, b0, to]);
    consider([from, a0, { x: b0.x, y: a0.y }, b0, to]);
  }

  for (const extra of [0, 12, 24, 40, 56]) {
    const pad = clearance + Math.min(rank, 4) * 4 + extra;
    const groups = [blocking, wrapBoxes].filter((g) => g.length);
    if (!groups.length) groups.push([]);
    for (const boxes of groups) {
      for (const raw of wrapCandidates(from, to, a0, b0, corridorFrom, corridorTo, boxes, pad, rank, clamp)) {
        consider(raw);
      }
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
            if (!laneFree(x, 0, true) && !opts._loose) continue;
            consider([from, a0, aJog, corridorFrom, { x, y: corridorFrom.y }, { x, y: corridorTo.y }, corridorTo, bJog, b0, to]);
          }
        }
        const gFrom = nearestGap(gaps, corridorFrom.x);
        const gTo = nearestGap(gaps, corridorTo.x);
        // Preferir sub-carril libre dentro del gap.
        const pickLane = (g: { a: number; b: number }, prefer: number): number => {
          const span = g.b - g.a;
          const nLanes = Math.max(1, Math.floor((span - 8) / 12));
          let bestX = laneInGap(g, rank, total);
          let bestD = Infinity;
          for (let k = 0; k < nLanes; k++) {
            const x = g.a + 6 + (k + 0.5) * ((span - 12) / nLanes);
            if (!laneFree(x, 0, true) && !opts._loose) continue;
            const d = Math.abs(x - prefer);
            if (d < bestD) { bestD = d; bestX = x; }
          }
          return bestX;
        };
        const lane1 = pickLane(gFrom, corridorFrom.x);
        const lane2 = pickLane(gTo, corridorTo.x);
        consider([from, a0, aJog, corridorFrom, { x: lane1, y: corridorFrom.y }, { x: lane1, y: corridorTo.y }, corridorTo, bJog, b0, to]);
        const ys = obstaculos.flatMap((c) => [c.y, c.y + c.h]);
        const top = clamp ? Math.max(clamp.yMin, Math.min(...ys) - pad) : Math.min(...ys) - pad;
        const bot = clamp ? Math.min(clamp.yMax, Math.max(...ys) + pad) : Math.max(...ys) + pad;
        for (const wrapY of [top, bot]) {
          if (!laneFree(0, wrapY, false) && !opts._loose) continue;
          consider([
            from, a0, aJog, corridorFrom,
            { x: lane1, y: corridorFrom.y }, { x: lane1, y: wrapY },
            { x: lane2, y: wrapY }, { x: lane2, y: corridorTo.y },
            corridorTo, bJog, b0, to,
          ]);
        }
      }
    }
  }

  const all: Caja[] = obstaculos.slice();
  if (opts.fromBox) all.push(opts.fromBox);
  if (opts.toBox) all.push(opts.toBox);
  if (all.length) {
    for (const extra of [24, 48, 80]) {
      for (const raw of wrapCandidates(from, to, a0, b0, corridorFrom, corridorTo, all, clearance + extra + Math.min(rank, 4) * 4, rank, clamp)) {
        consider(raw);
      }
    }
  }

  if (!best && !opts._loose) {
    return routeAvoidingBoxes(from, to, obstaculos, rank, total, { ...opts, _loose: true });
  }
  if (!best) {
    for (const cl of [clearance, Math.max(6, clearance - 4)]) {
      const g = gridRoute(from, to, obstaculos, cl, used, {
        softPkgs,
        textBoxes,
        pkgCrossFactor,
        lanePitch,
        laneNearFactor,
        borderXs,
        borderYs,
        prohibitedPkgs,
        // W55: id. pase primario.
        parentBorderXs,
        parentBorderYs,
        parentBorderPenalty,
        parentBorderClearance,
      });
      if (g) consider(collapseOrtho(g));
    }
  }
  if (!best) return null;
  const chosen: ScoredPath = best;
  delete chosen._share;
  return comoPath(collapseOrtho(chosen));
}

/** Hit-test módulo-level: ¿(x, y) cae dentro de la caja? (W54 — usado en
 * `pathIllegal` que no tiene acceso al `hit` local de `gridRoute`). */
function puntoEnCaja(x: number, y: number, c: Caja): boolean {
  return x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h;
}

/** True si camino pisa caja ajena, diagonal, o origen/destino más de 1 toque. */
export function pathIllegal(pts: Punto[], comps: Caja[], fromId?: string, toId?: string, clearance = EDGE_CLEARANCE): boolean {
  if (!pts?.length || pathHasDiagonal(pts)) return true;
  const fromBox = comps.find((c) => (c as Caja & { id?: string }).id === fromId);
  const toBox = comps.find((c) => (c as Caja & { id?: string }).id === toId);
  for (const c of comps) {
    const cid = (c as Caja & { id?: string }).id;
    const padded = inflateBox(c, cid === fromId || cid === toId ? 1 : clearance);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      if (!segmentoCortaCaja(a.x, a.y, b.x, b.y, padded)) continue;
      const extremoOrigen = cid === fromId && i === 0;
      const extremoDestino = cid === toId && i === pts.length - 2;
      if (extremoOrigen || extremoDestino) continue;
      return true;
    }
  }
  if (fromBox && rutaChoca(pts.slice(1), [fromBox])) return true;
  if (toBox && rutaChoca(pts.slice(0, -1), [toBox])) return true;
  return false;
}

/**
 * Empuja corredores largos lejos de bordes de agrupador.
 * Pase final: el router a veces cae en _loose y se pega al perímetro.
 */
export function nudgePathsFromPackageBorders(
  paths: Array<{ path: string }>,
  packages: readonly Caja[],
  keep = Math.max(28, Math.round(PKG_BORDER_CLEARANCE * 0.7)),
): void {
  if (!packages.length || !paths.length) return;
  const { xs, ys } = packageBorderAxes(packages, 2);
  const nearest = (v: number, axes: readonly number[]): number => {
    let best = axes[0] ?? v;
    for (const a of axes) if (Math.abs(v - a) < Math.abs(v - best)) best = a;
    return best;
  };
  const rebuild = (pts: Punto[]): string => {
    if (!pts.length) return '';
    let d = `M${pts[0]!.x},${pts[0]!.y}`;
    for (let i = 1; i < pts.length; i++) d += ` L${pts[i]!.x},${pts[i]!.y}`;
    return d;
  };
  for (const e of paths) {
    if (!e.path) continue;
    const pts: Punto[] = [];
    const re = /[ML]\s*([\d.-]+)\s*,\s*([\d.-]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(e.path))) pts.push({ x: +m[1]!, y: +m[2]! });
    if (pts.length < 4) continue;
    let changed = false;
    for (let i = 1; i < pts.length - 2; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      const len = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      if (len < 48) continue;
      if (Math.abs(a.x - b.x) < 0.6 && xs.length) {
        const d = nearestAxisDist(a.x, xs);
        if (d < keep) {
          const left = [...xs].filter((x) => x <= a.x + 0.5).sort((p, q) => q - p)[0];
          const right = [...xs].filter((x) => x >= a.x - 0.5).sort((p, q) => p - q)[0];
          let nx: number;
          if (left != null && right != null && left !== right && right - left < keep * 2 + 4) {
            // Hueco estrecho entre agrupadores anidados: centrar.
            nx = (left + right) / 2;
          } else {
            const wall = nearest(a.x, xs);
            nx = wall + (a.x >= wall ? 1 : -1) * keep;
          }
          const old = a.x;
          for (const p of pts) {
            if (p === pts[0] || p === pts[pts.length - 1]) continue;
            if (Math.abs(p.x - old) < 0.6) p.x = nx;
          }
          changed = true;
        }
      }
      if (Math.abs(a.y - b.y) < 0.6 && ys.length) {
        const d = nearestAxisDist(a.y, ys);
        if (d < keep) {
          const top = [...ys].filter((y) => y <= a.y + 0.5).sort((p, q) => q - p)[0];
          const bot = [...ys].filter((y) => y >= a.y - 0.5).sort((p, q) => p - q)[0];
          let ny: number;
          if (top != null && bot != null && top !== bot && bot - top < keep * 2 + 4) {
            ny = (top + bot) / 2;
          } else {
            const wall = nearest(a.y, ys);
            ny = wall + (a.y >= wall ? 1 : -1) * keep;
          }
          const old = a.y;
          for (const p of pts) {
            if (p === pts[0] || p === pts[pts.length - 1]) continue;
            if (Math.abs(p.y - old) < 0.6) p.y = ny;
          }
          changed = true;
        }
      }
    }
    if (changed) e.path = rebuild(pts);
  }
}

/**
 * Parsea un atributo `d` SVG a una lista de puntos.
 */
export function pathPoints(d: string): Punto[] {
  const pts: Punto[] = [];
  const re = /[ML]\s*([\d.-]+)\s*,\s*([\d.-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) pts.push({ x: +m[1]!, y: +m[2]! });
  return pts;
}

/**
 * W55: post-procesado de corredor-splitter.
 *
 * Tras el A* + nudges, agrupamos las aristas por las celdas (x, y)
 * snapeadas a `lanePitch` que comparten. Si en alguna celda pasan 2+
 * aristas, desplazamos la mitad por +lanePitch y la otra mitad por
 * -lanePitch en su eje dominante. El objetivo es romper los corredores
 * apiñados que aparecen cuando múltiples orígenes comparten destino
 * (p.ej. 5 aristas desde App-testpatyia → 5 grupos en `pkg-api`).
 *
 * W55+ (Phase 5): `minOvercrowd` baja de 2 a 1 (≥2 aristas en una
 * celda ya se considera apiñamiento) y el offset sube de 1×step a
 * 1.5×step para que la separación sea más visible.
 *
 * Restricciones:
 *   - No tocamos los extremos (origen/destino) de la arista.
 *   - Solo desplazamos tramos INTERMEDIOS (entre pts[1] y pts[-2]).
 *   - Si el desplazamiento cruza una caja de `boxes`, lo descartamos.
 *
 * @returns número de aristas que se pudieron re-colocar.
 */
export function spreadEdges(
  paths: Array<{ path: string }>,
  boxes: readonly Caja[],
  lanePitch: number = LANE_PITCH,
  minOvercrowd: number = 2,
): number {
  if (!paths.length || lanePitch <= 0) return 0;
  const step = Math.max(4, lanePitch);
  /**
   * Mapa (axis, value) -> { axis: 'x' | 'y', v: number, paths: indices[] }
   * donde `axis`/`v` son el eje y posición snapeada de la celda, e
   * `indices` son los índices en `paths` que cruzan ese eje.
   */
  type Cell = { axis: 'x' | 'y'; v: number; pathIdx: Set<number> };
  const cells = new Map<string, Cell>();
  const snap = (v: number): number => Math.round(v / step) * step;
  for (let i = 0; i < paths.length; i++) {
    const p = paths[i];
    if (!p?.path) continue;
    const pts = pathPoints(p.path);
    for (let j = 1; j < pts.length - 1; j++) {
      const a = pts[j]!;
      const b = pts[j + 1]!;
      if (Math.abs(a.x - b.x) < 0.6) {
        const v = snap(a.x);
        const k = `x:${v}`;
        let c = cells.get(k);
        if (!c) { c = { axis: 'x', v, pathIdx: new Set() }; cells.set(k, c); }
        c.pathIdx.add(i);
      } else if (Math.abs(a.y - b.y) < 0.6) {
        const v = snap(a.y);
        const k = `y:${v}`;
        let c = cells.get(k);
        if (!c) { c = { axis: 'y', v, pathIdx: new Set() }; cells.set(k, c); }
        c.pathIdx.add(i);
      }
    }
  }
  const crowded = [...cells.values()].filter((c) => c.pathIdx.size > minOvercrowd + 1);
  if (!crowded.length) return 0;
  const rebuild = (pts: Punto[]): string => {
    if (!pts.length) return '';
    let d = `M${pts[0]!.x},${pts[0]!.y}`;
    for (let i = 1; i < pts.length; i++) d += ` L${pts[i]!.x},${pts[i]!.y}`;
    return d;
  };
  const hitsBox = (a: Punto, b: Punto): boolean => {
    if (boxes.length === 0) return false;
    for (const c of boxes) {
      if (segmentoCortaCaja(a.x, a.y, b.x, b.y, inflateBox(c, EDGE_CLEARANCE / 2))) return true;
    }
    return false;
  };
  let relocated = 0;
  for (const cell of crowded) {
    const indices = [...cell.pathIdx];
    if (indices.length <= minOvercrowd + 1) continue;
    // Mantener la primera (la que primero eligió el corredor), desplazar el resto.
    const movable = indices.slice(1);
    // Distribuir offsets: la mitad a +lanePitch, la otra mitad a -lanePitch.
    // Ordenamos por índice para que el reparto sea estable.
    movable.sort((a, b) => a - b);
    const half = Math.ceil(movable.length / 2);
    for (let k = 0; k < movable.length; k++) {
      const idx = movable[k]!;
      const e = paths[idx];
      if (!e?.path) continue;
      const pts = pathPoints(e.path);
      if (pts.length < 4) continue;
      const offset = k < half ? step : -step;
      const axisKey = cell.axis;
      // Aplicar offset SOLO a los puntos intermedios que están en ese eje.
      // Tramos verticales (axis x) → cambia x; horizontales (axis y) → cambia y.
      let changed = false;
      for (let j = 1; j < pts.length - 1; j++) {
        const a = pts[j]!;
        const b = pts[j + 1]!;
        if (axisKey === 'x' && Math.abs(a.x - b.x) < 0.6 && Math.abs(a.x - cell.v) < step * 0.6) {
          // Verifica que el nuevo segmento no atraviese una caja.
          const newP = { x: a.x + offset, y: a.y };
          const newQ = { x: b.x + offset, y: b.y };
          if (hitsBox(newP, newQ)) continue;
          // Empuja también los puntos que estén en ese eje.
          for (let m = j; m < pts.length - 1; m++) {
            if (Math.abs(pts[m]!.x - a.x) < 0.6) {
              pts[m]!.x += offset;
              changed = true;
            } else break;
          }
        } else if (axisKey === 'y' && Math.abs(a.y - b.y) < 0.6 && Math.abs(a.y - cell.v) < step * 0.6) {
          const newP = { x: a.x, y: a.y + offset };
          const newQ = { x: b.x, y: b.y + offset };
          if (hitsBox(newP, newQ)) continue;
          for (let m = j; m < pts.length - 1; m++) {
            if (Math.abs(pts[m]!.y - a.y) < 0.6) {
              pts[m]!.y += offset;
              changed = true;
            } else break;
          }
        }
      }
      if (changed) {
        e.path = rebuild(pts);
        relocated++;
      }
    }
  }
  return relocated;
}

/**
 * W55: validador absoluto del muro duro `prohibido`. Tras todo el
 * pipeline de ruteo, comprueba que ninguna arista atraviese un paquete
 * prohibido. Devuelve la lista de aristas que SÍ lo atraviesan (para que
 * el caller las pueda recolocar o marcar como inválidas).
 *
 * Diferencia con `legal()`: este corre AL FINAL, después de los fallbacks
 * (incluido el "fallback absoluto" en component-spec.ts que genera un
 * path L-shape sin pasar por `legal()`).
 */
export function findProhibitedViolations(
  paths: ReadonlyArray<{ path?: string }>,
  prohibitedPkgs: readonly Caja[],
  inflate: number = EDGE_CLEARANCE,
): number[] {
  if (!prohibitedPkgs.length || !paths.length) return [];
  const walls: Caja[] = prohibitedPkgs.map((p) => inflateBox(p, inflate));
  const out: number[] = [];
  for (let i = 0; i < paths.length; i++) {
    const p = paths[i];
    if (!p?.path) continue;
    const pts = pathPoints(p.path);
    if (pts.length < 2) continue;
    if (pathHitsBoxes(pts, walls)) out.push(i);
  }
  return out;
}
