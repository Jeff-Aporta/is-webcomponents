/**
 * Empaque de componentes (distribución de entidades) + geometría compartida.
 *
 * Las posiciones del payload son la semilla. Si hay paquetes, se reordenan
 * en columnas con corredor; el contorno del paquete es la unión ortogonal
 * (ángulos rectos) de sus hijos, no un rectángulo vacío.
 *
 * El ruteo de aristas vive en `component-router.ts`; aquí quedan las
 * constantes de holgura/costo que comparten ambos y los chequeos
 * geométricos (`pathIllegal`, `segmentoCortaCaja`…) que usan los tests.
 */

import type { Arista, Caja, Componente, Lado, OpcionesEmpaque, Paquete, Punto } from '../_shared/diagram-tipos.js';
import type { ClusterColumn, GroupConv } from "./component-pack.schemas.js";

export const COL_GUTTER = 52;
export const PKG_CORRIDOR = 72;
export const PKG_PAD = 16;
export const PKG_TAB = 22;
/** Hueco filas: C+O+stem + un carril de arista (≈ assemblyEntityMargin). */
export const ROW_GAP = 72;
/** Hueco entre paquetes raíz apilados en la misma columna: 3U, para que no quede apretado. */
export const PKG_ROW_GAP = 60;
/** Distancia mínima entre cajas si el consumidor no pone `min-gap`. */
export const DEFAULT_MIN_GAP = ROW_GAP;
/** Holgura arista vs perímetro de componentes (≥20px pedido). */
export const EDGE_CLEARANCE = 22;
/** Margen arista ↔ borde de agrupador: correr paralelo a < esto cuesta. */
export const PKG_BORDER_CLEARANCE = 56;
/**
 * Distancia mínima entre rieles de aristas (carriles H/V).
 * Más cerca → más costo. Override: `layout.lanePitch`.
 */
export const LANE_PITCH = 20;
/**
 * Paso de la grilla del router: las aristas avanzan de nodo en nodo y los
 * nodos sobre entidades bloqueantes no existen en el grafo.
 */
export const GRID_STEP = 20;
/** Factor de costo si el tramo corre a < lanePitch de otro riel ajeno. */
export const LANE_NEAR_FACTOR = 28;
/** Factor de costo al correr paralelo cerca del borde de un agrupador. */
export const PKG_BORDER_NEAR_FACTOR = 9;
/**
 * Costo de caminar por el interior de agrupadores: × factor·nivel
 * (Azure+API = nivel 2 → ×2·factor). Fuera = ×1.
 */
export const PKG_CROSS_FACTOR = 3;
/** Hueco entre componentes dentro de paquetes anidados (p.ej. PatyIA API). */
export const NESTED_ROW_GAP = 36;
/**
 * W58: hueco horizontal mínimo entre paquetes hermanos anidados
 * (p.ej. PatyIA API ↔ clientesis). Más aire = más corredor para rieles.
 */
export const NESTED_PKG_GAP = 88;
/** W58: si uno de los hermanos es `prohibido`, el hueco sube. */
export const NESTED_PKG_GAP_PROHIBIDO = 128;
/**
 * W58: pad interior de paquete ≥ stem+radio O + aire vs borde.
 * Evita que el -(O- quede dibujado encima del trazo del agrupador.
 * (18 stem + 8 R + 14 keep ≈ 40).
 */
export const PKG_PAD_LOLLI = 40;
/** Aire extra alrededor del título de paquete. */
export const TITLE_CLEARANCE = 22;
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
  if (opts.mode === 'layers') {
    packLayers(packages, components, gaps, Number(opts.layerCols) || 6, Number(opts.nestedCols) || 2, opts.fitPackages !== false);
    return;
  }
  if (!packages?.length) return;
  packPackageColumns(
    packages, components,
    gaps.colGutter, gaps.pkgCorridor, gaps.rowGap, gaps.pkgRowGap, gaps.nestedRowGap,
    gaps.nestedPkgGap,
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
    nestedPkgGap: pickExact(opts.nestedPkgGap, NESTED_PKG_GAP),
  };
}

/**
 * Modo `layers` (capas tipo OSI): cada paquete raíz es una franja horizontal
 * del MISMO ancho, apiladas en el orden del payload (arriba → abajo). Los
 * componentes de cada capa van en filas de hasta `cols`, centradas en la
 * franja. Entre franjas queda un corredor para los rieles (pkgRowGap, mín.
 * 2 × holgura de borde + 2 carriles).
 *
 * Una franja con subpaquetes (`parent`) los pone en una rejilla de
 * `nestedCols` columnas (o `p.cols` del padre) debajo de sus componentes
 * directos: una subcapa no ocupa toda la fila. Los hermanos de una misma
 * fila de la rejilla comparten ancho y alto, para que las columnas alineen.
 * La recursión admite subpaquetes dentro de subpaquetes.
 */
function packLayers(
  packages: Paquete[],
  components: Componente[],
  gaps: ReturnType<typeof resolvePackingGaps>,
  cols: number,
  nestedCols: number,
  fit: boolean = true,
): void {
  const pad = Math.max(PKG_PAD, PKG_PAD_LOLLI);
  const corridor = Math.max(gaps.pkgRowGap, 2 * PKG_BORDER_CLEARANCE + 2 * gaps.lanePitch);
  // Piso: un -(O- entre vecinos (fila o columna) cabe sin empujar cajas.
  const floor = 2 * LOLLI_STEM_PACK + 2 * LOLLI_R_PACK + 1 + 16;
  gaps = {
    ...gaps,
    colGutter: Math.max(gaps.colGutter, floor),
    nestedRowGap: Math.max(gaps.nestedRowGap, floor),
    nestedPkgGap: Math.max(gaps.nestedPkgGap, floor),
  };
  const chunk = <T>(xs: T[], n: number): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < xs.length; i += Math.max(1, n)) out.push(xs.slice(i, i + Math.max(1, n)));
    return out;
  };

  /** Bloque medido: tamaño natural y colocación con tamaño impuesto (≥ natural). */
  interface Bloque { w: number; h: number; place: (x: number, y: number, w: number, h: number) => void }

  const measure = (p: Paquete): Bloque | null => {
    const comps = components.filter((c) => c.package === p.id);
    const subs = packages.filter((q) => q.parent === p.id).map(measure).filter((b): b is Bloque => b !== null);
    if (!comps.length && !subs.length) return null;
    const cRows = chunk(comps, p.cols ?? (p.parent ? Math.min(cols, 3) : cols));
    const cRowW = cRows.map((r) => r.reduce((s, c) => s + c.w, 0) + gaps.colGutter * (r.length - 1));
    const cRowH = cRows.map((r) => Math.max(...r.map((c) => c.h)));
    const sRows = chunk(subs, p.cols && subs.length ? p.cols : nestedCols);
    // Hermanos de una fila: mismo alto. Mismo ancho (el mayor) solo si la
    // rejilla tiene varias filas, para que las columnas alineen; en una sola
    // fila cada subpaquete conserva su ancho y no sobra aire.
    // Con `fit` cada subpaquete conserva su ancho y su alto naturales.
    const igualAncho = !fit && sRows.length > 1;
    const anchoDe = (r: Bloque[], b: Bloque): number => (igualAncho ? Math.max(...r.map((o) => o.w)) : b.w);
    const sRowW = sRows.map((r) => r.reduce((acc, b) => acc + anchoDe(r, b), 0) + gaps.nestedPkgGap * (r.length - 1));
    const sRowH = sRows.map((r) => Math.max(...r.map((b) => b.h)));
    const titleW = packageTitleTextWidth(p);
    const innerW = Math.max(titleW, ...cRowW, ...sRowW);
    const sum = (xs: number[], gap: number) => xs.reduce((s, v) => s + v, 0) + gap * Math.max(0, xs.length - 1);
    const innerH = sum(cRowH, gaps.nestedRowGap)
      + (cRows.length && sRows.length ? gaps.nestedRowGap : 0)
      + sum(sRowH, gaps.nestedRowGap);
    return {
      w: innerW + 2 * pad,
      h: PKG_TAB + pad + innerH + pad,
      place: (x, y, w, h) => {
        p.x = x; p.y = y; p.w = w; p.h = h;
        p.titleAtCorner = true;
        const inner = w - 2 * pad;
        let ry = y + PKG_TAB + pad;
        cRows.forEach((r, k) => {
          let cx = x + pad + (inner - cRowW[k]!) / 2;
          for (const c of r) {
            c.x = cx;
            c.y = ry + (cRowH[k]! - c.h) / 2;
            cx += c.w + gaps.colGutter;
          }
          ry += cRowH[k]! + gaps.nestedRowGap;
        });
        sRows.forEach((r, k) => {
          let sx = x + pad + (inner - sRowW[k]!) / 2;
          for (const b of r) {
            const bw = anchoDe(r, b);
            b.place(sx, ry, bw, fit ? b.h : sRowH[k]!);
            sx += bw + gaps.nestedPkgGap;
          }
          ry += sRowH[k]! + gaps.nestedRowGap;
        });
      },
    };
  };

  const bands = packages.filter((p) => !p.parent)
    .map((p) => measure(p))
    .filter((b): b is Bloque => b !== null);
  const bandW = Math.max(...bands.map((b) => b.w));
  let y = 0;
  for (const b of bands) {
    // Fit: cada franja con su ancho natural, centrada sobre la más ancha.
    if (fit) b.place((bandW - b.w) / 2, y, b.w, b.h);
    else b.place(0, y, bandW, b.h);
    y += b.h + corridor;
  }
}

/** Glifo -(O- (espejo de LOLLI_STEM / LOLLI_R de component-spec, sin ciclo de import). */
const LOLLI_STEM_PACK = 18;
const LOLLI_R_PACK = 8;

/** Ancho aproximado del rótulo «estereotipo» nombre (cursiva 11px). */
function packageTitleTextWidth(p: Paquete): number {
  const t = p.stereotype ? `«${p.stereotype}» ${p.name ?? ''}` : String(p.name ?? '');
  return Math.ceil(t.length * 7.2) + 24;
}

/** Qué hueco de filas usa el paquete: solo «ISW» Apps (raíz) usa rowGap amplio. */
export function packRowGapKey(p: Paquete): 'rowGap' | 'nestedRowGap' {
  return !p.parent && (p.id === 'pkg-apps' || p.stereotype === 'ISW') ? 'rowGap' : 'nestedRowGap';
}

function packPackageColumns(
  packages: Paquete[],
  components: Componente[],
  gut: number = COL_GUTTER,
  corridor: number = PKG_CORRIDOR,
  rowGap: number = ROW_GAP,
  pkgRowGap: number = PKG_ROW_GAP,
  nestedRowGap: number = NESTED_ROW_GAP,
  nestedPkgGap: number = NESTED_PKG_GAP,
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
      packPackage(p, comps, gut, packRowGapKey(p) === 'rowGap' ? rowGap : nestedRowGap);
    }
    const nested = childPkgsOf(p);
    if (!nested.length) return;
    // W58: separar hermanos anidados en X (API ↔ clientesis) para
    // abrir corredor de rieles. Si alguno es prohibido, hueco mayor.
    const byX = nested.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    for (let i = 1; i < byX.length; i++) {
      const prev = byX[i - 1]!;
      const cur = byX[i]!;
      const need = (prev.prohibido || cur.prohibido)
        ? Math.max(nestedPkgGap, NESTED_PKG_GAP_PROHIBIDO)
        : nestedPkgGap;
      const gap = cur.x - (prev.x + prev.w);
      if (gap < need) shiftPackageTree(cur, packages, components, need - gap, 0);
    }
    // Envuelve hijos-paquete + componentes propios.
    const boxes: Caja[] = [
      ...comps,
      ...nested,
    ];
    if (!boxes.length) return;
    // Pad izq/der ≥ lollipop para que el O no se pegue al trazo del agrupador.
    const pad = Math.max(PKG_PAD, PKG_PAD_LOLLI);
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
      (opts as OpcionesEmpaque).nestedPkgGap ?? NESTED_PKG_GAP,
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
  // W58: pad ≥ lollipop salvo `prohibido` (O en perímetro, pad chico).
  const pad = pkg.prohibido ? PKG_PAD : Math.max(PKG_PAD, PKG_PAD_LOLLI);
  let x = pkg.x + pad;
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
  pkg.w = Math.max(80, maxRight + pad - pkg.x);
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
    if (isNested || hasChildPkgs || opts.mode === 'layers') {
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
  // W69: stem (0→1) y approach (penúltimo→último) no cuentan — dos
  // aristas al mismo O deben poder compartir la llegada sin peaje.
  // Solo el corredor medio debe estar en rieles distintos.
  for (let i = 1; i < pts.length - 2; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    for (const u of usedSegs) {
      n += collinearOverlap(a, b, u.a, u.b, tol);
    }
  }
  return n;
}

export function segsFromPath(pts: readonly Punto[]): Array<{ a: Punto; b: Punto }> {
  const out: Array<{ a: Punto; b: Punto }> = [];
  // Incluye tramos tras el stem inicial (antes se cortaba en length-2 y
  // los verticales del corredor no se registraban → cruces posteriores).
  for (let i = 1; i < pts.length - 1; i++) out.push({ a: pts[i]!, b: pts[i + 1]! });
  return out;
}

/** Hit-test módulo-level: ¿(x, y) cae dentro de la caja? (W54 — usado en
 * `pathIllegal` que no tiene acceso al `hit` local de `gridRoute`). */
function puntoEnCaja(x: number, y: number, c: Caja): boolean {
  return x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h;
}

/** True si camino pisa caja ajena, diagonal, o origen/destino más de 1 toque. */
export function pathIllegal(pts: Punto[], comps: Caja[], fromId?: string, toId?: string, clearance = EDGE_CLEARANCE): boolean {
  if (!pts?.length || pathHasDiagonal(pts)) return true;
  // W59: auto-cruce se limpia con sanitizeEdgePath; NO entra aquí —
  // pathIllegal dispara mustRelax (re-layout completo) y un spur
  // residual no debe multiplicar 4× el A* del lab.
  const keep = Math.max(20, clearance);
  const fromBox = comps.find((c) => (c as Caja & { id?: string }).id === fromId);
  const toBox = comps.find((c) => (c as Caja & { id?: string }).id === toId);
  for (const c of comps) {
    const cid = (c as Caja & { id?: string }).id;
    // Rings ya traen su aire. Origen/destino: pad mínimo en
    // extremos; ajenas: keep completo.
    const pad = cid?.startsWith('ring-')
      ? 0
      : (cid === fromId || cid === toId ? 1 : keep);
    const padded = inflateBox(c, pad);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      if (!segmentoCortaCaja(a.x, a.y, b.x, b.y, padded)) continue;
      const extremoOrigen = cid === fromId && i === 0;
      const extremoDestino = cid === toId && i === pts.length - 2;
      // W61/W63: stem origen no reentra ni ATRAVIESA el interior
      // (p.ej. M top→abajo por dentro del box hasta salir abajo).
      if (extremoOrigen) {
        if (puntoEnCaja(b.x, b.y, inflateBox(c, 1))) return true;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (puntoEnCaja(mid.x, mid.y, c)) return true;
        continue;
      }
      if (extremoDestino) continue;
      return true;
    }
  }
  // Prohibido absoluto: reentrar origen/destino (ni rozar a < keep).
  if (fromBox && rutaChoca(pts.slice(1), [inflateBox(fromBox, keep)])) return true;
  if (toBox && rutaChoca(pts.slice(0, -1), [inflateBox(toBox, keep)])) return true;
  return false;
}
