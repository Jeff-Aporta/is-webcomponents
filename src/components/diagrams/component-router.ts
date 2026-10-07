/**
 * component-router.ts — Router ortogonal de aristas del diagrama de componentes.
 *
 * Reemplaza la cadena W54–W69 (A* + nudge + spread + reparaciones post-ruta)
 * por un solo algoritmo cuyas reglas se cumplen POR CONSTRUCCIÓN:
 *
 *   1. Grilla: líneas cada `step` (20 px) + las líneas exactas de cada puerto.
 *      Los nodos encima de entidades, títulos, conectores -(O- y agrupadores
 *      prohibidos ajenos (todos inflados por `clearance`) NO EXISTEN.
 *   2. Stems: cada arista sale perpendicular de su cara hasta la punta A
 *      (fuera del hitbox) y llega en línea recta al conector desde la punta B
 *      (fuera del anillo). El A* solo recorre A→B, así que no puede salir por
 *      dentro ni rodear el perímetro de la entidad.
 *   3. CAMPO DE FACTORES. Cada nodo vale 1. Cada fuente emite un «brillo» con
 *      radio definido y caída lineal por distancia, y el costo del paso es el
 *      largo × el PRODUCTO de todos los brillos que lo alcanzan:
 *        · desincentivo (> 1): entidades (brillo alrededor del hitbox),
 *          bordes de agrupador (corriendo en paralelo), anidación, rieles
 *          ajenos (encima = alto; a < lanePitch = menor, decreciente),
 *          choque de frente, ir por detrás del origen, cruces, historial.
 *        · incentivo (< 1): puntas `->` de la misma clave, radio `shareRadius`
 *          (150 px): en la punta vale ~0 (unirse no cuesta), a 150 px vale 1.
 *          Dentro de ese radio los rieles de la misma clave no son ajenos.
 *      Lo único aditivo es el giro (penalización geométrica, no un campo).
 *   4. Negociación (rip-up & reroute, estilo PathFinder): todas las aristas se
 *      re-rutean varias veces; compartir riel o ir pegado a otro riel sube de
 *      precio en cada vuelta y deja historial donde hubo conflicto. Converge
 *      sin pases de “empujar” geometría a posteriori.
 *
 * `validateRoute` es el árbitro único de legalidad (lo usan el layout para
 * decidir re-empaque y el audit del lab).
 */

import type { Caja, Lado, Punto } from '../_shared/diagram-tipos.js';
import type { RouterBox, RouterPackage, RouterWorld, RouterEdge, RouterOpts, RouteResult, PortLink, PortPlan, RouterPort } from './component-router.schemas.js';
import { resolveRoutingCosts } from './routing-costs.js';

const DIRS: ReadonlyArray<readonly [number, number]> = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const SIDE_DIR: Record<Lado, number> = { right: 0, bottom: 1, left: 2, top: 3 };
// Los valores del campo (brillos, radios, límites) viven en
// `routing-costs.ts` y se sobreescriben por diagrama con `layout.routing`.
/** Lados perpendiculares (llegadas laterales al O). */
const PERP: Record<Lado, [Lado, Lado]> = {
  left: ['top', 'bottom'], right: ['top', 'bottom'], top: ['left', 'right'], bottom: ['left', 'right'],
};


const inside = (x: number, y: number, c: Caja, pad: number): boolean =>
  x > c.x - pad && x < c.x + c.w + pad && y > c.y - pad && y < c.y + c.h + pad;

/** Líneas de grilla: múltiplos de step + valores exactos (puertos). */
function gridLines(lo: number, hi: number, step: number, extra: number[]): number[] {
  const vals: number[] = [];
  for (let v = Math.floor(lo / step) * step; v <= hi; v += step) vals.push(v);
  vals.push(...extra);
  vals.sort((a, b) => a - b);
  const out: number[] = [];
  for (const v of vals) {
    const last = out[out.length - 1];
    if (last == null || v - last > 1) out.push(v);
    // Puerto a ≤1px de una línea: gana el puerto (stem exacto).
    else if (v % step !== 0) out[out.length - 1] = v;
  }
  return out;
}

/**
 * Puertos del perímetro de una caja: en cada lado, nodos a `step` (1U) entre
 * sí, nunca en las esquinas, y con la mitad del sobrante a cada extremo (el
 * reparto queda centrado). Son los candidatos entre los que el router elige.
 */
export function perimeterPorts(b: Caja, step: number = 20, sides: readonly Lado[] = ['top', 'right', 'bottom', 'left']): RouterPort[] {
  const out: RouterPort[] = [];
  for (const side of sides) {
    const L = side === 'top' || side === 'bottom' ? b.w : b.h;
    const n = Math.max(1, Math.floor((L - step) / step) + 1);
    const off0 = (L - (n - 1) * step) / 2;
    for (let i = 0; i < n; i++) {
      const off = off0 + i * step;
      if (side === 'top') out.push({ x: b.x + off, y: b.y, side });
      else if (side === 'bottom') out.push({ x: b.x + off, y: b.y + b.h, side });
      else if (side === 'left') out.push({ x: b.x, y: b.y + off, side });
      else out.push({ x: b.x + b.w, y: b.y + off, side });
    }
  }
  return out;
}

/** Heap binario mínimo sobre (f, state). */
class MinHeap {
  private f: number[] = [];
  private s: number[] = [];
  get size(): number { return this.s.length; }
  push(f: number, s: number): void {
    const F = this.f;
    const S = this.s;
    let i = S.length;
    F.push(f);
    S.push(s);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (F[p]! <= f) break;
      F[i] = F[p]!;
      S[i] = S[p]!;
      i = p;
    }
    F[i] = f;
    S[i] = s;
  }
  pop(): number {
    const F = this.f;
    const S = this.s;
    const top = S[0]!;
    const lf = F.pop()!;
    const ls = S.pop()!;
    const n = S.length;
    if (n) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        if (l >= n) break;
        const r = l + 1;
        const c = r < n && F[r]! < F[l]! ? r : l;
        if (F[c]! >= lf) break;
        F[i] = F[c]!;
        S[i] = S[c]!;
        i = c;
      }
      F[i] = lf;
      S[i] = ls;
    }
    return top;
  }
}

/** Quita puntos repetidos y colineales. */
export function simplifyOrthoPath(pts: readonly Punto[]): Punto[] {
  const out: Punto[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.5 && Math.abs(last.y - p.y) < 0.5) continue;
    out.push({ x: p.x, y: p.y });
    while (out.length >= 3) {
      const a = out[out.length - 3]!;
      const b = out[out.length - 2]!;
      const c = out[out.length - 1]!;
      const colX = Math.abs(a.x - b.x) < 0.5 && Math.abs(b.x - c.x) < 0.5;
      const colY = Math.abs(a.y - b.y) < 0.5 && Math.abs(b.y - c.y) < 0.5;
      if (!colX && !colY) break;
      out.splice(out.length - 2, 1);
    }
  }
  return out;
}

export function pointsToPath(pts: readonly Punto[]): string {
  if (!pts.length) return '';
  return `M${pts[0]!.x},${pts[0]!.y}` + pts.slice(1).map((p) => ` L${p.x},${p.y}`).join('');
}

/** ¿El segmento ortogonal a→b toca el interior de la caja? */
function segHitsBox(a: Punto, b: Punto, c: Caja): boolean {
  const x0 = Math.min(a.x, b.x);
  const x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const y1 = Math.max(a.y, b.y);
  return x1 > c.x && x0 < c.x + c.w && y1 > c.y && y0 < c.y + c.h;
}

const inflate = (c: Caja, p: number): Caja => ({ x: c.x - p, y: c.y - p, w: c.w + 2 * p, h: c.h + 2 * p });

/** ¿Dos segmentos ortogonales se cortan (o se solapan) fuera de extremos compartidos? */
function segsTouch(a1: Punto, a2: Punto, b1: Punto, b2: Punto): boolean {
  const ax0 = Math.min(a1.x, a2.x), ax1 = Math.max(a1.x, a2.x);
  const ay0 = Math.min(a1.y, a2.y), ay1 = Math.max(a1.y, a2.y);
  const bx0 = Math.min(b1.x, b2.x), bx1 = Math.max(b1.x, b2.x);
  const by0 = Math.min(b1.y, b2.y), by1 = Math.max(b1.y, b2.y);
  return ax0 <= bx1 && bx0 <= ax1 && ay0 <= by1 && by0 <= ay1;
}

/**
 * Árbitro único de reglas duras. Devuelve la lista de reglas violadas.
 *   diagonal · salida-no-perpendicular · llegada-por-el-componente ·
 *   encima-entidad:<id> · encima-titulo · encima-conector:<id> ·
 *   encima-prohibido:<id> · auto-cruce
 */
export function validateRoute(
  pts: readonly Punto[] | null,
  e: RouterEdge,
  world: RouterWorld,
  clearance: number,
): string[] {
  if (!pts || pts.length < 2) return ['sin-ruta'];
  const bad: string[] = [];
  for (let i = 1; i < pts.length; i++) {
    if (Math.abs(pts[i]!.x - pts[i - 1]!.x) > 0.5 && Math.abs(pts[i]!.y - pts[i - 1]!.y) > 0.5) {
      bad.push('diagonal');
      break;
    }
  }
  const dirOf = (a: Punto, b: Punto): number => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dy) < 0.5) return dx > 0 ? 0 : 2;
    return dy > 0 ? 1 : 3;
  };
  if (dirOf(pts[0]!, pts[1]!) !== SIDE_DIR[e.fromSide]) bad.push('salida-no-perpendicular');
  // Al O se llega por cualquier lado salvo el del componente (`(`); a una
  // cara de entidad, solo perpendicular.
  const lastDir = dirOf(pts[pts.length - 2]!, pts[pts.length - 1]!);
  if (e.toConnector ? lastDir === SIDE_DIR[e.toSide] : lastDir !== (SIDE_DIR[e.toSide] + 2) % 4) {
    bad.push(e.toConnector ? 'llegada-por-el-componente' : 'llegada-no-perpendicular');
  }
  const last = pts.length - 2;
  // Tolerancia 2px: el borde exacto del hitbox es legal.
  const keep = Math.max(0, clearance - 2);
  for (let i = 0; i <= last; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    for (const c of world.components) {
      // Stems propios: tocan la cara de su entidad por definición.
      if (i === 0 && c.id === e.fromBox.id) continue;
      if (i === last && c.id === e.toBox.id) continue;
      const pad = c.id === e.fromBox.id || c.id === e.toBox.id ? 0 : keep;
      if (segHitsBox(a, b, inflate(c, pad))) bad.push(`encima-entidad:${c.id}`);
    }
    for (const t of world.titles) if (segHitsBox(a, b, t)) bad.push('encima-titulo');
    for (const r of world.rings) {
      if (i === last && e.toRing && r.id === e.toRing.id) continue;
      if (segHitsBox(a, b, inflate(r, -2))) bad.push(`encima-conector:${r.id}`);
    }
    for (const p of world.packages) {
      if (!p.prohibido || e.fromPkgs.has(p.id)) continue;
      if (i === last && e.toPkgs.has(p.id)) continue;
      if (segHitsBox(a, b, inflate(p, keep))) bad.push(`encima-prohibido:${p.id}`);
    }
  }
  for (let i = 0; i < pts.length - 1 && !bad.includes('auto-cruce'); i++) {
    for (let j = i + 2; j < pts.length - 1; j++) {
      if (segsTouch(pts[i]!, pts[i + 1]!, pts[j]!, pts[j + 1]!)) {
        bad.push('auto-cruce');
        break;
      }
    }
  }
  return [...new Set(bad)];
}

/**
 * Rutea todas las aristas sobre una grilla compartida con negociación de
 * congestión. `paths[i]` incluye los stems: from → A … B → to.
 */
export function routeEdges(world: RouterWorld, edges: readonly RouterEdge[], opts: RouterOpts = {}): RouteResult {
  // Config compartida (defaults + `layout.routing`); las opciones sueltas
  // del llamador (perillas históricas del payload) ganan sobre ella.
  const C = resolveRoutingCosts(opts.costs);
  const step = opts.step ?? C.grid.step;
  const clearance = opts.clearance ?? C.grid.clearance;
  const pitch = Math.max(step, opts.lanePitch ?? C.grid.lanePitch);
  // `laneNearFactor` del payload se conserva por contrato; el brillo de riel
  // vecino es `rail.near` con radio `lanePitch`.
  void opts.laneNearFactor;
  const borderKeep = opts.pkgBorderClearance ?? C.package.borderRadius;
  const borderFactor = opts.pkgBorderNearFactor ?? C.package.borderGlow;
  const crossFactor = Math.max(1, opts.pkgCrossFactor ?? C.package.nestingFactor);
  const turnPenalty = opts.turnPenalty ?? C.grid.turnPenalty;
  const iterations = opts.iterations ?? C.grid.iterations;
  const stub = Math.max(clearance, opts.stub ?? C.grid.stub);
  const shareRadius = opts.shareRadius ?? C.share.radius;
  const entityGlowR = opts.entityGlow ?? C.entity.radius;
  const OVERLAP_MUL = C.rail.overlap;
  const MERGE_RADIUS_PITCHES = C.rail.mergePitches;
  const RETREAT_MUL = C.rail.retreat;
  const SAME_FUNNEL_MUL = C.rail.sameFunnel;
  const NEAR_RAIL_MUL = C.rail.near;
  const ENTITY_GLOW_MUL = C.entity.glow;
  const CROSS_MUL = C.rail.cross;
  const HEAD_ON_MUL = C.rail.headOn;
  const MIN_MUL = C.grid.minFactor;
  const HISTORY_MUL = C.rail.history;
  const JOIN_TAIL_MUL = C.share.joinTail;
  const NEW_TIP_COST = C.share.newTip;

  // ── Grilla ────────────────────────────────────────────────────────────
  const all: Caja[] = [...world.components, ...world.packages, ...world.titles, ...world.rings];
  const margin = Math.max(160, borderKeep * 2);
  const minX = Math.min(...all.map((c) => c.x)) - margin;
  const minY = Math.min(...all.map((c) => c.y)) - margin;
  const maxX = Math.max(...all.map((c) => c.x + c.w)) + margin;
  const maxY = Math.max(...all.map((c) => c.y + c.h)) + margin;
  const extraX: number[] = [];
  const extraY: number[] = [];
  for (const e of edges) {
    if (e.fromSide === 'left' || e.fromSide === 'right') extraY.push(e.from.y); else extraX.push(e.from.x);
    // El O admite llegada por 3 lados: ambas líneas por su centro.
    extraX.push(e.to.x);
    extraY.push(e.to.y);
    // Cada puerto candidato se proyecta a la grilla: su línea existe, así el
    // riel sale perpendicular y los vértices quedan a 90°.
    for (const c of [...(e.fromCandidates ?? []), ...(e.toCandidates ?? [])]) {
      if (c.side === 'left' || c.side === 'right') extraY.push(c.y); else extraX.push(c.x);
    }
  }
  const xs = gridLines(minX, maxX, step, extraX);
  const ys = gridLines(minY, maxY, step, extraY);
  const nx = xs.length;
  const ny = ys.length;
  const N = nx * ny;
  const idx = (i: number, j: number): number => j * nx + i;

  // ── Campo estático ────────────────────────────────────────────────────
  // blocked: entidades / títulos / conectores. prohOwner: índice del
  // prohibido que cubre el nodo (muro solo para aristas ajenas).
  const blocked = new Uint8Array(N);
  const ringOwner = new Int32Array(N).fill(-1);
  const prohOwner = new Int32Array(N).fill(-1);
  // baseMul = anidación × brillo de entidades (isótropo). Parte de 1.
  const baseMul = new Float32Array(N);
  // Máscara de agrupadores que contienen cada nodo (hasta 32): entrar o salir
  // de uno suma un costo fijo por cruce.
  const pkgMask = new Uint32Array(N);
  const ENTER_COST = C.package.enter;
  const EXIT_COST = C.package.exit;
  const popcount = (v: number): number => { let c = 0; v >>>= 0; while (v) { v &= v - 1; c++; } return c; };
  // Cercanía a borde de agrupador por orientación del paso: correr PARALELO
  // a un borde cuesta; cruzarlo perpendicular no. [0] = paso H (bordes
  // horizontales cerca), [1] = paso V (bordes verticales cerca).
  const borderMul = [new Float32Array(N), new Float32Array(N)];
  const prohibited = world.packages.filter((p) => p.prohibido);
  for (let j = 0; j < ny; j++) {
    const y = ys[j]!;
    for (let i = 0; i < nx; i++) {
      const x = xs[i]!;
      const k = idx(i, j);
      if (world.components.some((c) => inside(x, y, c, clearance))) blocked[k] = 1;
      else if (world.titles.some((t) => inside(x, y, t, 0))) blocked[k] = 1;
      // Brillo de entidad: fuera del hitbox, decrece lineal hasta `entityGlowR`.
      let glow = 1;
      if (!blocked[k] && entityGlowR > 0) {
        for (const c of world.components) {
          const ddx = Math.max(c.x - clearance - x, 0, x - (c.x + c.w + clearance));
          const ddy = Math.max(c.y - clearance - y, 0, y - (c.y + c.h + clearance));
          const d = Math.max(ddx, ddy);
          if (d < entityGlowR) glow = Math.max(glow, 1 + ENTITY_GLOW_MUL * (1 - d / entityGlowR));
        }
      }
      for (let r = 0; r < world.rings.length; r++) {
        if (inside(x, y, world.rings[r]!, 0)) { ringOwner[k] = r; break; }
      }
      for (let p = 0; p < prohibited.length; p++) {
        if (inside(x, y, prohibited[p]!, clearance)) { prohOwner[k] = p; break; }
      }
      // Anidación: ×(crossFactor · nivel).
      let depth = 0;
      let mask = 0;
      // Brillo de borde con radio acotado al pasillo: el borde más cercano a
      // cada lado del nodo (arriba/abajo para pasos H, izquierda/derecha para
      // pasos V). Si dos bordes se enfrentan (un corredor), el radio se
      // reduce a un tercio del corredor para que su centro quede libre; si
      // no, los rieles escapaban por fuera de todo el diagrama.
      let dUp = Infinity;
      let dDown = Infinity;
      let dLeft = Infinity;
      let dRight = Infinity;
      for (let pi = 0; pi < world.packages.length; pi++) {
        const p = world.packages[pi]!;
        if (inside(x, y, p, 0)) { depth++; if (pi < 32) mask |= 1 << pi; }
        if (x >= p.x && x <= p.x + p.w) {
          for (const by of [p.y, p.y + p.h]) {
            if (by <= y) dUp = Math.min(dUp, y - by); else dDown = Math.min(dDown, by - y);
          }
        }
        if (y >= p.y && y <= p.y + p.h) {
          for (const bx of [p.x, p.x + p.w]) {
            if (bx <= x) dLeft = Math.min(dLeft, x - bx); else dRight = Math.min(dRight, bx - x);
          }
        }
      }
      const glowBorde = (dA: number, dB: number): number => {
        const d = Math.min(dA, dB);
        if (!Number.isFinite(d)) return 0;
        // Corredor: el tercio central queda sin brillo (las líneas de la
        // grilla rara vez caen en el centro exacto).
        const radio = Number.isFinite(dA) && Number.isFinite(dB) ? Math.min(borderKeep, (dA + dB) / 3) : borderKeep;
        return d < radio && radio > 0 ? 1 - d / radio : 0;
      };
      const nearH = glowBorde(dUp, dDown);
      const nearV = glowBorde(dLeft, dRight);
      baseMul[k] = (depth > 0 ? crossFactor * depth : 1) * glow;
      pkgMask[k] = mask >>> 0;
      borderMul[0]![k] = 1 + borderFactor * nearH;
      borderMul[1]![k] = 1 + borderFactor * nearV;
    }
  }

  // ── Puntas A/B (fuera de hitbox) ───────────────────────────────────────
  const lineIndex = (arr: number[], v: number): number => {
    let best = 0;
    for (let i = 1; i < arr.length; i++) if (Math.abs(arr[i]! - v) < Math.abs(arr[best]! - v)) best = i;
    return best;
  };
  /**
   * Primer nodo libre sobre el rayo desde `p` hacia `side`, a ≥ minOut.
   * `strict`: si ese nodo está ocupado no se busca más lejos (-1): el stub
   * pasaría por encima de lo que lo bloquea.
   */
  const tipFor = (p: Punto, side: Lado, minOut: number, free: (k: number) => boolean, strict = false): number => {
    const d = SIDE_DIR[side];
    const [dx, dy] = DIRS[d]!;
    let i = lineIndex(xs, p.x);
    let j = lineIndex(ys, p.y);
    // Avanzar hasta superar minOut.
    while (i > 0 && i < nx - 1 && j > 0 && j < ny - 1
      && Math.abs(xs[i]! - p.x) + Math.abs(ys[j]! - p.y) < minOut - 0.5) {
      i += dx;
      j += dy;
    }
    if (strict && !free(idx(i, j))) return -1;
    // Y hasta un nodo libre (máx. 12 pasos extra).
    for (let g = 0; g < 12 && !free(idx(i, j)); g++) {
      if (i <= 0 || i >= nx - 1 || j <= 0 || j >= ny - 1) break;
      i += dx;
      j += dy;
    }
    return idx(i, j);
  };

  // ── Ocupación compartida ───────────────────────────────────────────────
  const occ = [new Int16Array(N), new Int16Array(N)];
  const hist = new Float32Array(N);
  const groupOf = edges.map((e) => `${Math.round(e.to.x)},${Math.round(e.to.y)}`);
  const groupOcc = new Map<string, Int16Array[]>();
  for (const g of new Set(groupOf)) groupOcc.set(g, [new Int16Array(N), new Int16Array(N)]);
  // Ocupación por clave `->`: rieles que comparten punta no se penalizan entre sí.
  const keyOf = edges.map((e) => e.shareKey ?? null);
  const startKeyOf = edges.map((e) => e.startKey ?? null);
  const keyOcc = new Map<string, Int16Array[]>();
  for (const kk of new Set(keyOf.filter((x): x is string => x != null))) keyOcc.set(kk, [new Int16Array(N), new Int16Array(N)]);
  const skeyOcc = new Map<string, Int16Array[]>();
  for (const kk of new Set(startKeyOf.filter((x): x is string => x != null))) skeyOcc.set(kk, [new Int16Array(N), new Int16Array(N)]);
  /** A qué arista (y en qué nodo de su camino) se unió cada una. */
  const joinOf: Array<{ host: number; t: number } | null> = edges.map(() => null);
  /** Puertos elegidos por arista (con candidatos los decide el router). */
  const chosen: Array<{ from: RouterPort; to: RouterPort } | null> = edges.map(() => null);
  const costOf: number[] = edges.map(() => Infinity);
  /** Ocupación de puertos: `x,y` → aristas que lo usan. */
  const portUse = new Map<string, Set<number>>();
  const pk = (p: { x: number; y: number }): string => `${Math.round(p.x)},${Math.round(p.y)}`;
  const portTaken = (p: { x: number; y: number }, ei: number): boolean => {
    const users = portUse.get(pk(p));
    if (!users) return false;
    for (const u of users) {
      if (u === ei) continue;
      const mismaLlegada = keyOf[ei] != null && keyOf[u] === keyOf[ei];
      const mismaSalida = startKeyOf[ei] != null && startKeyOf[u] === startKeyOf[ei];
      if (!mismaLlegada && !mismaSalida) return true;
    }
    return false;
  };
  const fromOf = (ei: number): RouterPort => chosen[ei]?.from ?? { x: edges[ei]!.from.x, y: edges[ei]!.from.y, side: edges[ei]!.fromSide };
  const toOf = (ei: number): RouterPort => chosen[ei]?.to ?? { x: edges[ei]!.to.x, y: edges[ei]!.to.y, side: edges[ei]!.toSide };
  const nodes: Array<number[] | null> = edges.map(() => null);
  const orients: Array<number[] | null> = edges.map(() => null);
  // Dirección con que cada arista ENTRA a cada nodo (para choques de frente).
  const dirsIn: Array<number[] | null> = edges.map(() => null);
  const dirOcc = new Int16Array(N * 4);

  const mark = (ei: number, sign: 1 | -1): void => {
    // Puertos: se toman/sueltan junto con el riel.
    if (chosen[ei]) {
      for (const p of [chosen[ei]!.from, chosen[ei]!.to]) {
        const k = pk(p);
        if (sign > 0) portUse.set(k, (portUse.get(k) ?? new Set()).add(ei));
        else portUse.get(k)?.delete(ei);
      }
    }
    const ns = nodes[ei];
    const os = orients[ei];
    if (!ns || !os) return;
    const go = groupOcc.get(groupOf[ei]!)!;
    const ko = keyOf[ei] ? keyOcc.get(keyOf[ei]!)! : null;
    const sko = startKeyOf[ei] ? skeyOcc.get(startKeyOf[ei]!)! : null;
    for (let t = 0; t < ns.length; t++) {
      const k = ns[t]!;
      const o = os[t]!;
      for (const oo of [0, 1]) {
        if (!(o & (1 << oo))) continue;
        occ[oo]![k] += sign;
        go[oo]![k] += sign;
        if (ko) ko[oo]![k] += sign;
        if (sko) sko[oo]![k] += sign;
      }
      dirOcc[k * 4 + dirsIn[ei]![t]!] += sign;
    }
  };

  // ── A* (estado = nodo × dirección) ──────────────────────────────────────
  /** Raíz de la cadena de uniones (la arista cuya punta se usa al final). */
  const rootOf = (ei: number): number => {
    const seen = new Set<number>();
    let cur = ei;
    while (joinOf[cur] && !seen.has(cur)) { seen.add(cur); cur = joinOf[cur]!.host; }
    return cur;
  };
  const route = (ei: number, pf: number, allowJoin = true): { st: number[] | null; join: { host: number; t: number } | null; ports: { from: RouterPort; to: RouterPort } | null; cost: number } => {
    const e = edges[ei]!;
    const go = groupOcc.get(groupOf[ei]!)!;
    const key = keyOf[ei];
    const ko = key ? keyOcc.get(key)! : null;
    // Campo de incentivo `->`: alrededor de cada punta de la misma clave, el
    // factor va de ~0 en la punta a 1 a `shareRadius`. Dentro de ese radio
    // los rieles de la misma clave no son ajenos (ahí se juntan).
    const skey = startKeyOf[ei];
    const shareField = key || skey ? new Float32Array(N).fill(1) : null;
    // Puertos de salida de la misma clave de salida: incentivo igual al de
    // las puntas (0 en el puerto, 1 en el radio) y rieles no ajenos ahí.
    const startNear = new Uint8Array(N);
    if (skey && shareField) {
      for (let oj = 0; oj < edges.length; oj++) {
        if (oj === ei || startKeyOf[oj] !== skey || !nodes[oj]) continue;
        const sp = fromOf(oj);
        for (let jj = 0; jj < ny; jj++) {
          const dy = Math.abs(ys[jj]! - sp.y);
          if (dy >= shareRadius) continue;
          for (let ii = 0; ii < nx; ii++) {
            const d = Math.abs(xs[ii]! - sp.x) + dy;
            if (d >= shareRadius) continue;
            const kk = idx(ii, jj);
            const f = d / shareRadius;
            if (f < shareField[kk]!) shareField[kk] = f;
            startNear[kk] = 1;
          }
        }
      }
    }
    const skOcc = skey ? skeyOcc.get(skey)! : null;
    // Metas alternativas: nodos de rieles de la misma clave (no de la propia
    // cadena) dentro del radio de incentivo de su punta.
    const joinAt = new Map<number, { host: number; t: number; dirOut: number; tail: number }>();
    if (key && shareField) {
      for (let oj = 0; oj < edges.length; oj++) {
        if (oj === ei || keyOf[oj] !== key || !nodes[oj]) continue;
        if (rootOf(oj) === ei) continue;
        const ns = nodes[oj]!;
        const dIn = dirsIn[oj]!;
        // Largo restante del camino ajeno desde cada nodo hasta su punta.
        const tail = new Float64Array(ns.length);
        const endK = ns[ns.length - 1]!;
        // Punta real del anfitrión: el puerto que eligió (o el de su raíz).
        const hostTip = toOf(rootOf(oj));
        tail[ns.length - 1] = Math.abs(xs[endK % nx]! - hostTip.x) + Math.abs(ys[Math.floor(endK / nx)]! - hostTip.y);
        for (let t = ns.length - 2; t >= 0; t--) {
          const a = ns[t]!;
          const b = ns[t + 1]!;
          tail[t] = tail[t + 1]! + Math.abs(xs[a % nx]! - xs[b % nx]!) + Math.abs(ys[Math.floor(a / nx)]! - ys[Math.floor(b / nx)]!);
        }
        // Brillo de la punta de la raíz de ese riel (la punta real).
        const tx = hostTip.x;
        const ty = hostTip.y;
        for (let jj = 0; jj < ny; jj++) {
          const dy = Math.abs(ys[jj]! - ty);
          if (dy >= shareRadius) continue;
          for (let ii = 0; ii < nx; ii++) {
            const d = Math.abs(xs[ii]! - tx) + dy;
            if (d >= shareRadius) continue;
            const kk = idx(ii, jj);
            const f = d / shareRadius;
            if (f < shareField[kk]!) shareField[kk] = f;
          }
        }
        for (let t = 0; t < ns.length; t++) {
          const k = ns[t]!;
          // Unirse en cualquier punto del riel anfitrión (lejos de su stub
          // de salida): desde ahí son UNA sola línea, no dos rieles. Lo que
          // se penaliza es correr en paralelo a un riel ajeno.
          if (allowJoin && t >= 2 && t < ns.length - 1) {
            const dirOut = dIn[t + 1]!;
            const prev = joinAt.get(k);
            if (!prev || tail[t]! < prev.tail) joinAt.set(k, { host: oj, t, dirOut, tail: tail[t]! });
          }
        }
      }
    }
    const prohAllowed = prohibited.map((p) => e.fromPkgs.has(p.id));
    const free = (k: number): boolean =>
      !blocked[k]
      && (ringOwner[k] < 0)
      && (prohOwner[k] < 0 || prohAllowed[prohOwner[k]!]!);
    const ringOut = (side: Lado, p: Punto, r?: Caja): number => {
      if (!r) return clearance;
      if (side === 'right') return r.x + r.w - p.x;
      if (side === 'left') return p.x - r.x;
      if (side === 'bottom') return r.y + r.h - p.y;
      return p.y - r.y;
    };
    // Candidatos de salida y llegada: con `fromCandidates`/`toCandidates` el
    // router prueba todas las parejas (multi-origen, multi-destino) y se
    // queda con la más barata; un puerto tomado por una arista ajena no vale.
    const libres = (cs: RouterPort[]): RouterPort[] => {
      const ok = cs.filter((c) => !portTaken(c, ei));
      return ok.length ? ok : cs;
    };
    const fromCands = libres(e.fromCandidates?.length ? e.fromCandidates : [{ x: e.from.x, y: e.from.y, side: e.fromSide }]);
    const toCands = libres(e.toCandidates?.length ? e.toCandidates : [{ x: e.to.x, y: e.to.y, side: e.toSide }]);
    // Arranques: punta A de cada candidato de salida (estado = nodo × dirección).
    const startOf = new Map<number, RouterPort>();
    for (const c of fromCands) {
      const A = tipFor(c, c.side, stub, free);
      if (A < 0 || !free(A)) continue;
      const s0 = A * 4 + SIDE_DIR[c.side];
      if (!startOf.has(s0)) startOf.set(s0, c);
    }
    // Llegadas: al O por cualquiera de sus 3 lados libres (no por el del
    // componente / `(`); a una cara, perpendicular. Una punta B por lado y
    // por candidato: el A* elige la mejor.
    const goals = new Map<number, { dir: number; port: RouterPort }>();
    for (const c of toCands) {
      const arrivalSides = (e.toConnector ? [c.side, ...PERP[c.side]] : [c.side]) as Lado[];
      arrivalSides.forEach((t, n) => {
        const k = tipFor(c, t, Math.max(stub, ringOut(t, c, e.toRing)), free, n > 0);
        if (k >= 0 && !goals.has(k)) goals.set(k, { dir: (SIDE_DIR[t] + 2) % 4, port: c });
      });
    }
    const goalPts = [...goals.keys()].map((k) => ({ x: xs[k % nx]!, y: ys[Math.floor(k / nx)]! }));
    const conCandidatos = Boolean(e.fromCandidates?.length || e.toCandidates?.length);
    const destino = toCands[0]!;
    const S = N * 4;
    const gCost = new Float64Array(S).fill(Infinity);
    const came = new Int32Array(S).fill(-1);
    const heap = new MinHeap();
    const mergeR = pitch * MERGE_RADIUS_PITCHES;
    const nearGoal = (x: number, y: number): boolean =>
      goalPts.some((g) => Math.abs(x - g.x) + Math.abs(y - g.y) <= mergeR);
    // W68: “por detrás” = detrás de la cara de salida, o del lado de la
    // caja de origen opuesto al destino (rodeos por la espalda).
    const fb = e.fromBox;
    // Con candidatos la cara de salida no es fija: solo cuenta el lado de la
    // caja opuesto al destino.
    const behind = (x: number, y: number): boolean =>
      (!conCandidatos && e.fromSide === 'right' && x < e.from.x)
      || (!conCandidatos && e.fromSide === 'left' && x > e.from.x)
      || (!conCandidatos && e.fromSide === 'bottom' && y < e.from.y)
      || (!conCandidatos && e.fromSide === 'top' && y > e.from.y)
      || (destino.x > fb.x + fb.w && x < fb.x)
      || (destino.x < fb.x && x > fb.x + fb.w)
      || (destino.y > fb.y + fb.h && y < fb.y)
      || (destino.y < fb.y && y > fb.y + fb.h);
    const hScale = key ? MIN_MUL : 1;
    const h = (k: number): number => {
      const x = xs[k % nx]!;
      const y = ys[Math.floor(k / nx)]!;
      let m = Infinity;
      for (const g of goalPts) m = Math.min(m, Math.abs(x - g.x) + Math.abs(y - g.y));
      return m * hScale;
    };
    let bestJoin: { cost: number; parent: number; last: number; host: number; t: number } | null = null;
    for (const s0 of startOf.keys()) {
      gCost[s0] = 0;
      heap.push(h(s0 >> 2), s0);
    }
    let goal = -1;
    while (heap.size) {
      const s = heap.pop();
      const k = s >> 2;
      const d = s & 3;
      // Una unión ya encontrada que nada en la cola puede mejorar: gana.
      if (bestJoin && bestJoin.cost <= gCost[s]! + h(k)) break;
      if (goals.has(k)) { goal = s; break; }
      const gk = gCost[s]!;
      const i = k % nx;
      const j = (k - i) / nx;
      for (let nd = 0; nd < 4; nd++) {
        if (nd === ((d + 2) & 3)) continue; // sin marcha atrás
        const [dx, dy] = DIRS[nd]!;
        const ni = i + dx;
        const nj = j + dy;
        if (ni < 0 || nj < 0 || ni >= nx || nj >= ny) continue;
        const nk = idx(ni, nj);
        if (!goals.has(nk) && !free(nk)) continue;
        const len = Math.abs(xs[ni]! - xs[i]!) + Math.abs(ys[nj]! - ys[j]!);
        const o = dx !== 0 ? 0 : 1; // 0 = horizontal, 1 = vertical
        // Costos ADITIVOS: cada regla suma su parte; ninguna anula a otra.
        // Mismo destino: en el embudo final junto a B compartir cuesta menos,
        // pero nunca es gratis (si no, se juntan aunque haya otro lado libre).
        const merge = nearGoal(xs[ni]!, ys[nj]!);
        // Dentro del radio de incentivo de una punta de la misma clave, los
        // rieles de esa clave no son ajenos (ahí es donde se juntan).
        const enIncentivo = shareField ? shareField[nk]! < 1 : false;
        const own = (oo: number, k2: number): number =>
          Math.max(merge ? go[oo]![k2]! : 0, ko && enIncentivo ? ko[oo]![k2]! : 0, skOcc && startNear[k2] ? skOcc[oo]![k2]! : 0);
        const others = occ[o]![nk]! - own(o, nk);
        const sameFunnel = merge && !(ko && enIncentivo && ko[o]![nk]! > 0) ? go[o]![nk]! : 0;
        // ── Campo de factores: producto de brillos; cada nodo parte de 1 ──
        let mul = baseMul[nk]! * borderMul[o]![nk]! * (1 + hist[nk]! * HISTORY_MUL);
        if (behind(xs[ni]!, ys[nj]!)) mul *= 1 + RETREAT_MUL;
        if (others > 0) mul *= 1 + OVERLAP_MUL * others * pf;
        if (sameFunnel > 0) mul *= SAME_FUNNEL_MUL;
        // De frente contra otra arista (verde baja, café sube al mismo nodo):
        // se lee como una sola línea que sigue. Brilla como riel compartido.
        if (dirOcc[nk * 4 + ((nd + 2) & 3)]! > 0 && others > 0) mul *= 1 + HEAD_ON_MUL * pf;
        // Rieles ajenos paralelos a < pitch: brillo decreciente con la distancia.
        const nearRail = (dist: number, n2: number): number => 1 + NEAR_RAIL_MUL * n2 * (1 - dist / pitch) * pf;
        if (o === 0) {
          for (let jj = nj - 1; jj >= 0 && ys[nj]! - ys[jj]! < pitch; jj--) {
            const n2 = occ[0]![idx(ni, jj)]! - own(0, idx(ni, jj));
            if (n2 > 0) mul *= nearRail(ys[nj]! - ys[jj]!, n2);
          }
          for (let jj = nj + 1; jj < ny && ys[jj]! - ys[nj]! < pitch; jj++) {
            const n2 = occ[0]![idx(ni, jj)]! - own(0, idx(ni, jj));
            if (n2 > 0) mul *= nearRail(ys[jj]! - ys[nj]!, n2);
          }
        } else {
          for (let ii = ni - 1; ii >= 0 && xs[ni]! - xs[ii]! < pitch; ii--) {
            const n2 = occ[1]![idx(ii, nj)]! - own(1, idx(ii, nj));
            if (n2 > 0) mul *= nearRail(xs[ni]! - xs[ii]!, n2);
          }
          for (let ii = ni + 1; ii < nx && xs[ii]! - xs[ni]! < pitch; ii++) {
            const n2 = occ[1]![idx(ii, nj)]! - own(1, idx(ii, nj));
            if (n2 > 0) mul *= nearRail(xs[ii]! - xs[ni]!, n2);
          }
        }
        // Cruzar perpendicular un riel ajeno: brillo en ese nodo.
        if (occ[1 - o]![nk]! - own(1 - o, nk) > 0) mul *= CROSS_MUL;
        // Incentivo `->`: factor < 1 cerca de una punta de la misma clave.
        if (shareField) mul *= shareField[nk]!;
        mul = Math.max(MIN_MUL, mul);
        let cost = len * mul;
        // Sumas fijas (no brillos): cada giro +B; cada entrada/salida de un
        // agrupador +A. Así el riel gira y cruza agrupadores solo cuando no
        // hay otra opción.
        if (nd !== d) cost += turnPenalty;
        if (goals.has(nk) && nd !== goals.get(nk)!.dir) cost += turnPenalty;
        const cruce = (pkgMask[nk]! ^ pkgMask[k]!) >>> 0;
        if (cruce) cost += ENTER_COST * popcount(cruce & pkgMask[nk]!) + EXIT_COST * popcount(cruce & pkgMask[k]!);
        const ns = nk * 4 + nd;
        const ng = gk + cost;
        // Unirse a otra `->` en este nodo: sigue su camino hasta su punta. Se
        // entra en su sentido o perpendicular (nunca de frente); el tramo
        // reutilizado cuesta poco (ya está dibujado).
        const union = joinAt.get(nk);
        if (union && nd !== ((union.dirOut + 2) & 3)) {
          const total = ng + (nd !== union.dirOut ? turnPenalty : 0) + union.tail * JOIN_TAIL_MUL;
          if (!bestJoin || total < bestJoin.cost) bestJoin = { cost: total, parent: s, last: ns, host: union.host, t: union.t };
        }
        if (ng >= gCost[ns]!) continue;
        gCost[ns] = ng;
        came[ns] = s;
        heap.push(ng + h(nk), ns);
      }
    }
    // La unión gana si cuesta menos que la punta propia (o si no hay propia).
    // Abrir una punta propia teniendo otra de la misma clave a la vista
    // (hay uniones posibles) cuesta +newTip: así las `->` convergen.
    const propio = goal < 0 ? Infinity : gCost[goal]! + (joinAt.size ? NEW_TIP_COST : 0);
    const useJoin = bestJoin != null && bestJoin.cost < propio;
    if (!useJoin && goal < 0) return { st: null, join: null, ports: null, cost: Infinity };
    // La unión se registró al relajar con su padre fijo (otra ruta pudo
    // mejorar ese estado después): se reconstruye desde ese padre.
    const out: number[] = [];
    let raizEstado = -1;
    for (let s = useJoin ? bestJoin!.parent : goal; s >= 0; s = came[s]!) { out.push(s); raizEstado = s; }
    out.reverse();
    if (useJoin) out.push(bestJoin!.last);
    const fromPort = startOf.get(raizEstado) ?? fromCands[0]!;
    const toPort = useJoin ? toOf(rootOf(bestJoin!.host)) : goals.get(goal >> 2)!.port;
    return {
      st: out,
      join: useJoin ? { host: bestJoin!.host, t: bestJoin!.t } : null,
      ports: { from: fromPort, to: toPort },
      cost: useJoin ? bestJoin!.cost : gCost[goal]!,
    };
  };

  /** Estados → nodos + orientación ocupada (bit0 = H, bit1 = V). */
  const commit = (ei: number, states: number[] | null): void => {
    if (!states) { nodes[ei] = null; orients[ei] = null; dirsIn[ei] = null; return; }
    const ns: number[] = [];
    const os: number[] = [];
    for (let t = 0; t < states.length; t++) {
      const k = states[t]! >> 2;
      const dIn = states[t]! & 3;
      const dOut = t + 1 < states.length ? states[t + 1]! & 3 : dIn;
      let o = 0;
      for (const d of [dIn, dOut]) o |= d === 0 || d === 2 ? 1 : 2;
      ns.push(k);
      os.push(o);
    }
    nodes[ei] = ns;
    orients[ei] = os;
    dirsIn[ei] = states.map((st) => st & 3);
  };

  // Cortas primero: ocupan su corredor natural; las largas negocian.
  const order = edges
    .map((e, i) => ({ i, d: Math.abs(e.from.x - e.to.x) + Math.abs(e.from.y - e.to.y) }))
    .sort((a, b) => a.d - b.d)
    .map((o) => o.i);
  const states: Array<number[] | null> = edges.map(() => null);
  for (let it = 0; it < iterations; it++) {
    const pf = 1 + it * 0.25;
    let changed = false;
    for (const ei of order) {
      mark(ei, -1);
      const r = route(ei, pf);
      const st = r.st;
      if (JSON.stringify(st) !== JSON.stringify(states[ei]) || JSON.stringify(r.join) !== JSON.stringify(joinOf[ei])) changed = true;
      states[ei] = st;
      joinOf[ei] = r.join;
      chosen[ei] = r.ports;
      costOf[ei] = r.cost;
      commit(ei, st);
      mark(ei, 1);
    }
    // Conflictos = nodos con rieles de distintos destinos en la misma orientación.
    let conflicts = 0;
    for (let k = 0; k < N; k++) {
      for (const o of [0, 1]) {
        const tot = occ[o]![k]!;
        if (tot < 2) continue;
        let maxGroup = 0;
        for (const go of groupOcc.values()) maxGroup = Math.max(maxGroup, go[o]![k]!);
        for (const ko of keyOcc.values()) maxGroup = Math.max(maxGroup, ko[o]![k]!);
        if (tot - maxGroup > 0) { conflicts++; hist[k] += 1; }
      }
    }
    if (!changed || (conflicts === 0 && it > 0)) break;
  }

  // Uniones vigentes: el anfitrión tiene que seguir pasando por el nodo de
  // unión (pudo re-rutearse después). Si no, la arista vuelve a su punta propia.
  for (let pass = 0; pass < 4; pass++) {
    let fixed = false;
    for (let ei = 0; ei < edges.length; ei++) {
      const j = joinOf[ei];
      if (!j) continue;
      const hn = nodes[j.host];
      const own = nodes[ei];
      if (hn && own && hn[j.t] === own[own.length - 1] && rootOf(ei) !== ei) continue;
      // Las dos primeras pasadas re-rutean con uniones permitidas (los
      // anfitriones ya no se mueven, así la unión queda consistente); la
      // última cierra con punta propia lo que siga sin encajar.
      mark(ei, -1);
      const r = route(ei, 1 + iterations * 0.25, pass < 2);
      states[ei] = r.st;
      joinOf[ei] = pass < 2 ? r.join : null;
      chosen[ei] = r.ports;
      costOf[ei] = r.cost;
      commit(ei, r.st);
      mark(ei, 1);
      fixed = true;
    }
    if (!fixed) break;
  }
  /** Nodos completos: los propios + la cola del anfitrión desde la unión. */
  const fullNodes = (ei: number, depth = 0): number[] => {
    const own = nodes[ei] ?? [];
    const j = joinOf[ei];
    if (!j || depth > edges.length) return own;
    return [...own, ...fullNodes(j.host, depth + 1).slice(j.t + 1)];
  };
  /** La arista tal como termina: con la punta de la raíz si se unió. */
  const effEdge = (ei: number): RouterEdge => {
    const f = fromOf(ei);
    const base: RouterEdge = { ...edges[ei]!, from: { x: f.x, y: f.y }, fromSide: f.side };
    if (!joinOf[ei]) {
      const t = toOf(ei);
      return { ...base, to: { x: t.x, y: t.y }, toSide: t.side };
    }
    const ri = rootOf(ei);
    const r = edges[ri]!;
    const t = toOf(ri);
    return { ...base, to: { x: t.x, y: t.y }, toSide: t.side, toBox: r.toBox, toRing: r.toRing, toConnector: r.toConnector, toPkgs: r.toPkgs };
  };
  const shared = new Set<number>();
  joinOf.forEach((j, ei) => { if (j) { shared.add(ei); shared.add(rootOf(ei)); shared.add(j.host); } });

  const paths = edges.map((e0, ei) => {
    const e = effEdge(ei);
    if (joinOf[ei]) {
      const pts: Punto[] = [{ x: e.from.x, y: e.from.y }];
      for (const k of fullNodes(ei)) pts.push({ x: xs[k % nx]!, y: ys[Math.floor(k / nx)]! });
      pts.push({ x: e.to.x, y: e.to.y });
      return simplifyOrthoPath(pts);
    }
    void e0;
    // Ensamble directo: caras enfrentadas y alineadas → recta P→Q (sin
    // pasar por la grilla; con cajas cercanas las puntas A/B se cruzan).
    const facing = SIDE_DIR[e.toSide] === (SIDE_DIR[e.fromSide] + 2) % 4;
    const aligned = e.fromSide === 'left' || e.fromSide === 'right'
      ? Math.abs(e.from.y - e.to.y) < 0.5 && Math.sign(e.to.x - e.from.x) === DIRS[SIDE_DIR[e.fromSide]]![0]
      : Math.abs(e.from.x - e.to.x) < 0.5 && Math.sign(e.to.y - e.from.y) === DIRS[SIDE_DIR[e.fromSide]]![1];
    if (facing && aligned) {
      const straight = [{ ...e.from }, { ...e.to }];
      if (!validateRoute(straight, e, world, clearance).length) return straight;
    }
    const st = states[ei];
    if (!st) return null;
    const pts: Punto[] = [{ x: e.from.x, y: e.from.y }];
    for (const s of st) {
      const k = s >> 2;
      pts.push({ x: xs[k % nx]!, y: ys[Math.floor(k / nx)]! });
    }
    pts.push({ x: e.to.x, y: e.to.y });
    return simplifyOrthoPath(pts);
  });
  // Atajos: une dos vértices con una sola esquina si el resultado tiene
  // menos vértices, sigue legal, no pisa rieles ajenos y no suma cruces.
  // Quita jogs en Z y bolsillos en C que el A* deja al esquivar costos.
  // Es el único retoque post-A* y re-valida todo.
  const segsOf = (pts: readonly Punto[]): Array<[Punto, Punto]> =>
    pts.slice(1).map((p, i) => [pts[i]!, p]);
  const isV = (a: Punto, b: Punto): boolean => Math.abs(a.x - b.x) < 0.5;
  const funnel = pitch * MERGE_RADIUS_PITCHES + 2 * clearance;
  const clash = (pts: readonly Punto[], ei: number): { overlap: boolean; crosses: number } => {
    let crosses = 0;
    let overlap = false;
    for (let oj = 0; oj < paths.length; oj++) {
      if (oj === ei || !paths[oj]) continue;
      // Misma clave `->`: compartir riel es lo buscado, no un choque.
      if (keyOf[ei] && keyOf[oj] === keyOf[ei]) continue;
      const sameGroup = groupOf[oj] === groupOf[ei];
      for (const [a1, a2] of segsOf(pts)) {
        for (const [b1, b2] of segsOf(paths[oj]!)) {
          const av = isV(a1, a2);
          if (av === isV(b1, b2)) {
            if (av ? Math.abs(a1.x - b1.x) >= pitch : Math.abs(a1.y - b1.y) >= pitch) continue;
            const [p, q, r, t] = av ? [a1.y, a2.y, b1.y, b2.y] : [a1.x, a2.x, b1.x, b2.x];
            const ov = Math.min(Math.max(p, q), Math.max(r, t)) - Math.max(Math.min(p, q), Math.min(r, t));
            // Mismo conector: se juntan solo en el embudo final.
            if (ov > (sameGroup ? funnel : 1)) overlap = true;
          } else if (!sameGroup) {
            const [v1, v2, h1, h2] = av ? [a1, a2, b1, b2] : [b1, b2, a1, a2];
            if (v1.x > Math.min(h1.x, h2.x) && v1.x < Math.max(h1.x, h2.x)
              && h1.y > Math.min(v1.y, v2.y) && h1.y < Math.max(v1.y, v2.y)) crosses++;
          }
        }
      }
    }
    return { overlap, crosses };
  };
  // Largo (ponderado) corriendo paralelo a < borderKeep de un borde de
  // agrupador: el atajo no puede empeorarlo (el A* lo evitaba por costo).
  const borderHug = (pts: readonly Punto[]): number => {
    let hug = 0;
    for (const [a, b] of segsOf(pts)) {
      const v = isV(a, b);
      for (const p of world.packages) {
        const lines = v ? [p.x, p.x + p.w] : [p.y, p.y + p.h];
        const c = v ? a.x : a.y;
        const [lo, hi] = v ? [p.y, p.y + p.h] : [p.x, p.x + p.w];
        const [s0, s1] = v ? [Math.min(a.y, b.y), Math.max(a.y, b.y)] : [Math.min(a.x, b.x), Math.max(a.x, b.x)];
        const ov = Math.min(s1, hi) - Math.max(s0, lo);
        if (ov <= 0) continue;
        for (const l of lines) {
          const d = Math.abs(c - l);
          if (d < borderKeep) hug += ov * (1 - d / borderKeep);
        }
      }
    }
    return hug;
  };
  for (let ei = 0; ei < paths.length; ei++) {
    let pts = paths[ei];
    if (!pts) continue;
    // Un riel compartido no se retoca: el atajo de uno despegaría al otro.
    if (shared.has(ei)) continue;
    let base = clash(pts, ei);
    let baseHug = borderHug(pts);
    for (let guard = 0; guard < 12; guard++) {
      let improved = false;
      const n = pts.length;
      // i ≥ 1 y j ≤ n-2: la cara (0) y el conector (n-1) no se mueven.
      for (let i = 1; i < n - 2 && !improved; i++) {
        for (let j = n - 2; j > i + 1 && !improved; j--) {
          const pi = pts[i]!;
          const pj = pts[j]!;
          for (const corner of [{ x: pi.x, y: pj.y }, { x: pj.x, y: pi.y }]) {
            const cand = simplifyOrthoPath([...pts.slice(0, i + 1), corner, ...pts.slice(j)]);
            if (cand.length >= n) continue;
            if (validateRoute(cand, edges[ei]!, world, clearance).length) continue;
            const c = clash(cand, ei);
            // Sin solape nuevo; cruces iguales o menos (o quita un solape).
            if (c.overlap || (c.crosses > base.crosses && !base.overlap)) continue;
            const hug = borderHug(cand);
            if (hug > baseHug + 1) continue;
            pts = cand;
            base = c;
            baseHug = hug;
            improved = true;
            break;
          }
        }
      }
      if (!improved) break;
    }
    paths[ei] = pts;
  }
  const violations = paths.map((p, i) => validateRoute(p, effEdge(i), world, clearance));
  let crowding = 0;
  edges.forEach((_, ei) => {
    const ns = nodes[ei];
    const os = orients[ei];
    if (!ns || !os) return;
    const go = groupOcc.get(groupOf[ei]!)!;
    const end = ns[ns.length - 1]!;
    const ex = xs[end % nx]!;
    const ey = ys[Math.floor(end / nx)]!;
    for (let t = 0; t < ns.length; t++) {
      const k = ns[t]!;
      const i = k % nx;
      const j = (k - i) / nx;
      if (Math.abs(xs[i]! - ex) + Math.abs(ys[j]! - ey) <= pitch * MERGE_RADIUS_PITCHES) continue;
      const ko = keyOf[ei] ? keyOcc.get(keyOf[ei]!)! : null;
      const near = (o: number, k2: number): boolean => occ[o]![k2]! - Math.max(go[o]![k2]!, ko ? ko[o]![k2]! : 0) > 0;
      if (os[t]! & 1) {
        for (let jj = j - 1; jj >= 0 && ys[j]! - ys[jj]! < pitch; jj--) if (near(0, idx(i, jj))) crowding += step;
        for (let jj = j + 1; jj < ny && ys[jj]! - ys[j]! < pitch; jj++) if (near(0, idx(i, jj))) crowding += step;
      }
      if (os[t]! & 2) {
        for (let ii = i - 1; ii >= 0 && xs[i]! - xs[ii]! < pitch; ii--) if (near(1, idx(ii, j))) crowding += step;
        for (let ii = i + 1; ii < nx && xs[ii]! - xs[i]! < pitch; ii++) if (near(1, idx(ii, j))) crowding += step;
      }
    }
  });
  const joinedTo = edges.map((_, ei) => (joinOf[ei] ? rootOf(ei) : null));
  const fromPorts = edges.map((_, ei) => (paths[ei] ? fromOf(ei) : null));
  const toPorts = edges.map((_, ei) => (paths[ei] ? (joinOf[ei] ? toOf(rootOf(ei)) : toOf(ei)) : null));
  return { paths, violations, crowding, joinedTo, costs: costOf, fromPorts, toPorts };
}

/* ─────────────────────── Distribución de puertos ─────────────────────── */

const FACE_SIDES: readonly Lado[] = ['right', 'left', 'bottom', 'top'];
const faceLen = (b: Caja, s: Lado): number => (s === 'top' || s === 'bottom' ? b.w : b.h);
/** Puertos que caben en la cara a `pitch` (12px de aire por punta). */
export function faceCapacity(b: Caja, s: Lado, pitch: number): number {
  return Math.max(1, Math.floor((faceLen(b, s) - 24) / pitch) + 1);
}
const facePoint = (b: Caja, s: Lado, off: number): Punto => {
  if (s === 'top') return { x: b.x + off, y: b.y };
  if (s === 'bottom') return { x: b.x + off, y: b.y + b.h };
  if (s === 'left') return { x: b.x, y: b.y + off };
  return { x: b.x + b.w, y: b.y + off };
};

/**
 * Reparte los extremos de las aristas por el PERÍMETRO de las cajas, con las
 * mismas reglas que el diagrama de componentes:
 *   - cara por costo: enfrentada al otro extremo, sin vecino delante a menos
 *     de `room`, sin mirar “hacia atrás”, carga y capacidad de la cara (cara
 *     llena → otra cara, no se agranda la caja);
 *   - en cada cara, puertos ordenados por ángulo al otro extremo (no se
 *     cruzan al salir) y separados a `pitch`, centrados.
 */
export function planPorts(
  boxes: readonly RouterBox[],
  links: readonly PortLink[],
  opts: { pitch: number; room: number; obstacles?: readonly Caja[]; obstacleRoom?: number },
): Array<PortPlan | null> {
  const byId = new Map(boxes.map((b) => [b.id, b]));
  const cx = (b: Caja): number => b.x + b.w / 2;
  const cy = (b: Caja): number => b.y + b.h / 2;
  const load = new Map<string, number>();
  const sideOf: Array<{ fs: Lado; ts: Lado } | null> = links.map(() => null);
  // Vecinos que tapan una cara: otras cajas y obstáculos (títulos, leyenda…).
  // Un título solo exige stub + holgura (no el aire de una caja con puertos).
  const obstacles = new Set<Caja>(opts.obstacles ?? []);
  const walls: Caja[] = [...boxes, ...obstacles];
  const blockedAhead = (b: RouterBox, s: Lado, other: RouterBox): boolean => walls.some((o) => {
    if (o === b || o === other) return false;
    const room = obstacles.has(o) ? (opts.obstacleRoom ?? opts.room) : opts.room;
    const ovX = o.x < b.x + b.w + 8 && o.x + o.w > b.x - 8;
    const ovY = o.y < b.y + b.h + 8 && o.y + o.h > b.y - 8;
    if (s === 'bottom') return ovX && o.y >= b.y + b.h - 2 && o.y - (b.y + b.h) < room;
    if (s === 'top') return ovX && o.y + o.h <= b.y + 2 && b.y - (o.y + o.h) < room;
    if (s === 'right') return ovY && o.x >= b.x + b.w - 2 && o.x - (b.x + b.w) < room;
    return ovY && o.x + o.w <= b.x + 2 && b.x - (o.x + o.w) < room;
  });
  // Cortas primero: eligen la cara natural; las largas se adaptan.
  const order = links.map((l, i) => ({ l, i })).filter(({ l }) => byId.has(l.from) && byId.has(l.to))
    .sort((p, q) => {
      const d = (l: PortLink): number => {
        const a = byId.get(l.from)!;
        const b = byId.get(l.to)!;
        return Math.abs(cx(a) - cx(b)) + Math.abs(cy(a) - cy(b));
      };
      return d(p.l) - d(q.l);
    });
  for (const { l, i } of order) {
    const a = byId.get(l.from)!;
    const b = byId.get(l.to)!;
    const dx = cx(b) - cx(a);
    const dy = cy(b) - cy(a);
    let best: { fs: Lado; ts: Lado; c: number } | null = null;
    for (const fs of l.fromSide ? [l.fromSide] : FACE_SIDES) {
      for (const ts of l.toSide ? [l.toSide] : FACE_SIDES) {
        // Auto-lazo: dos caras ADYACENTES (lazo corto en la esquina).
        if (a === b && (fs === ts || SIDE_DIR[fs] % 2 === SIDE_DIR[ts] % 2)) continue;
        const p = facePoint(a, fs, faceLen(a, fs) / 2);
        const q = facePoint(b, ts, faceLen(b, ts) / 2);
        let c = Math.abs(p.x - q.x) + Math.abs(p.y - q.y);
        const facing = SIDE_DIR[ts] === (SIDE_DIR[fs] + 2) % 4;
        const mixed = SIDE_DIR[fs] % 2 !== SIDE_DIR[ts] % 2;
        if (a !== b) c += facing ? 0 : mixed ? 90 : 180;
        // Salir dando la espalda al otro extremo.
        if (a !== b) {
          if ((fs === 'right' && dx < -4) || (fs === 'left' && dx > 4)
            || (fs === 'bottom' && dy < -4) || (fs === 'top' && dy > 4)) c += 220;
          if ((ts === 'right' && dx > 4) || (ts === 'left' && dx < -4)
            || (ts === 'bottom' && dy > 4) || (ts === 'top' && dy < -4)) c += 220;
        }
        if (blockedAhead(a, fs, b)) c += 1200;
        if (blockedAhead(b, ts, a)) c += 1200;
        const la = load.get(`${a.id}|${fs}`) ?? 0;
        const lb = load.get(`${b.id}|${ts}`) ?? 0;
        c += la * 35 + lb * 35;
        if (la + 1 > faceCapacity(a, fs, opts.pitch)) c += 2400;
        if (lb + 1 > faceCapacity(b, ts, opts.pitch)) c += 2400;
        if (!best || c < best.c) best = { fs, ts, c };
      }
    }
    sideOf[i] = { fs: best!.fs, ts: best!.ts };
    load.set(`${a.id}|${best!.fs}`, (load.get(`${a.id}|${best!.fs}`) ?? 0) + 1);
    load.set(`${b.id}|${best!.ts}`, (load.get(`${b.id}|${best!.ts}`) ?? 0) + 1);
  }
  // Puertos: por cara, orden angular hacia el otro extremo y paso `pitch`.
  type End = { i: number; end: 'from' | 'to'; box: RouterBox; side: Lado; other: RouterBox };
  const faces = new Map<string, End[]>();
  links.forEach((l, i) => {
    const sd = sideOf[i];
    if (!sd) return;
    const a = byId.get(l.from)!;
    const b = byId.get(l.to)!;
    for (const en of [
      { i, end: 'from' as const, box: a, side: sd.fs, other: b },
      { i, end: 'to' as const, box: b, side: sd.ts, other: a },
    ]) {
      const k = `${en.box.id}|${en.side}`;
      faces.set(k, [...(faces.get(k) ?? []), en]);
    }
  });
  const pts = new Map<string, Punto>();
  for (const list of faces.values()) {
    const along = (en: End): number => {
      const ang = Math.atan2(cy(en.other) - cy(en.box), cx(en.other) - cx(en.box));
      if (en.side === 'right' || en.side === 'top') return ang;
      if (en.side === 'bottom') return -ang;
      return -(ang < 0 ? ang + 2 * Math.PI : ang);
    };
    list.sort((p, q) => along(p) - along(q) || p.i - q.i);
    const len = faceLen(list[0]!.box, list[0]!.side);
    const n = list.length;
    const usable = Math.max(0, len - 24);
    const step = n > 1 ? Math.min(opts.pitch, usable / (n - 1)) : 0;
    const start = n > 1 ? 12 + (usable - step * (n - 1)) / 2 : len / 2;
    list.forEach((en, k) => pts.set(`${en.i}|${en.end}`, facePoint(en.box, en.side, start + k * step)));
  }
  return links.map((_, i) => {
    const sd = sideOf[i];
    if (!sd) return null;
    return { fromSide: sd.fs, toSide: sd.ts, from: pts.get(`${i}|from`)!, to: pts.get(`${i}|to`)! };
  });
}
