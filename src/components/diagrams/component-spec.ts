/**
 * Especificación y layout de diagramas de componentes UML (sin Mermaid).
 *
 * A diferencia de flowchart/block, este modo tiene tres primitivas:
 * Alias aceptados, por consistencia con el resto de motores del kit:
 * `label` por `name` (nodos y paquetes) y `links` por `edges`.
 *
 *   - packages: carpetas con pestaña (tab) arriba a la izquierda.
 *   - components: rectángulos con estereotipo `<<name>>` sobre la etiqueta.
 *   - interfaces (lollipop): circulo hueco O (provided) o arco C (required)
 *     perpendicular al lado del componente. Una arista componente→componente
 *     sin interfaces se completa sola a conector UML `-(O-`.
 *
 * Las posiciones del payload son la semilla. Si hay paquetes, el motor
 * reordena columnas (corredor entre ellas) para que las aristas no atraviesen
 * cajas. El contorno del paquete es la unión ortogonal de sus hijos.
 *
 * Las aristas (`edges`) conectan interfaces (no componentes) para mantener
 * la semántica UML: "componente A expone interfaz I → componente B la
 * requiere". Si el usuario prefiere una arista cruda entre componentes, basta
 * con no declarar `via` y el router la resuelve de borde a borde.
 *
 *   <iswc-component-diagram>
 *     <script type="application/json">
 *       {
 *         "componentDiagram": {
 *           "packages": [
 *             { "id": "azure", "name": "Azure", "x": 100, "y": 30, "w": 800, "h": 600 }
 *           ],
 *           "components": [
 *             { "id": "ayudas", "package": "azure", "name": "AYUDASCP-IA",
 *               "stereotype": "component", "x": 220, "y": 120, "w": 240, "h": 64 }
 *           ],
 *           "interfaces": [
 *             { "id": "if1", "component": "ayudas", "side": "right", "offset": 30,
 *               "kind": "provided", "name": "IApi" }
 *           ],
 *           "edges": [
 *             { "from": "cliente", "to": "if1", "kind": "dependency" }
 *           ]
 *         }
 *       }
 *     </script>
 *   </iswc-component-diagram>
 *
 * Decisiones que NO son negociables sin pedir:
 *   - tema claro por defecto (prefijo `theme-light` en <html>).
 *   - fondo blanco siempre (los PNG van a la ficha y a chats).
 *   - sin auto-layout: la posición la pone el autor del payload.
 */

import { diagramHeaderWidth } from '../_shared/diagram-header.js';
import { applyEdgeActorLayout } from '../_shared/diagram-edge-actors.js';
import { packDiagram, layoutPackageOutlines, outlineToPath, routeAvoidingBoxes, pathIllegal, pathHasDiagonal, segsFromPath, pathHitsBoxes, pathCrossingCount, pathShareLen, resolvePackingGaps, inflateBox, inflateTitleObstacle, nudgePathsFromPackageBorders, countPuntoTurns, spreadEdges, findProhibitedViolations, pathPoints, COL_GUTTER, PKG_CORRIDOR, ROW_GAP, EDGE_CLEARANCE, TITLE_CLEARANCE, PKG_BORDER_CLEARANCE, LANE_PITCH } from './component-pack.js';
import { parsePathPoints } from '../_shared/diagram-edge-actors.js';
import { assignEdgeHues } from '../_shared/diagram-edge-style.js';
import type {
  Arista, Caja, Componente, InterfazUml, Lado, OpcionesEmpaque, Paquete, Punto,
} from '../_shared/diagram-tipos.js';
import type { HttpEndpoint, EdgeKind, SpecEdge, LayoutMode, ComponentSpecResult, WireResult, LayoutComponent, LayoutInterface, LayoutEdge, ComponentLayout } from "./component-spec.schemas.js";

const TAB_W = 56;
const TAB_H = 14;
const STEREO_GAP = 4;
/** Radio del lollipop / socket. Visible en PNG a tamaño ficha. */
export const LOLLI_R = 8;
/** Distancia borde → centro O. C acopla al O, no al origen. */
export const LOLLI_STEM = 18;
/** Aire boca-C vs borde-O. 1 px: enchufe junto, sin anidar. */
export const LOLLI_GAP = 1;
/** Aire extra caja↔caja además de 2 stems + O + C. */
const ASSEMBLY_ENTITY_PAD = 16;

/** Hueco mínimo entre bordes de cajas unidas por `-(O-`. */
export function assemblyEntityMargin(): number {
  return 2 * LOLLI_STEM + 2 * LOLLI_R + LOLLI_GAP + ASSEMBLY_ENTITY_PAD;
}

const LINE_H = 13;
const BUBBLE_H = 18;
const BUBBLE_GAP = 4;

/** Colores tipo Swagger/OpenAPI para el verbo HTTP. */
export const HTTP_METHOD_BADGE: Record<string, { fill: string; text: string }> = {
  GET: { fill: '#61affe', text: '#ffffff' },
  POST: { fill: '#49cc90', text: '#ffffff' },
  PUT: { fill: '#fca130', text: '#ffffff' },
  PATCH: { fill: '#50e3c2', text: '#14332c' },
  DELETE: { fill: '#f93e3e', text: '#ffffff' },
  QUERY: { fill: '#9012fe', text: '#ffffff' },
  HEAD: { fill: '#9012fe', text: '#ffffff' },
  OPTIONS: { fill: '#0d5aa7', text: '#ffffff' },
};

const HTTP_VERBS = 'GET|POST|PUT|PATCH|DELETE|QUERY|HEAD|OPTIONS';
const HTTP_METHOD_ORDER = ['GET', 'QUERY', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

/** Parsea `GET /x`, `GET|PUT /x` o `GET|POST|PUT /x`. */
export function parseHttpEndpoint(raw: unknown): HttpEndpoint {
  const s = String(raw ?? '').trim();
  const re = new RegExp(
    `^((?:${HTTP_VERBS})(?:\\s*\\|\\s*(?:${HTTP_VERBS}))*)\\b\\s*`,
    'i',
  );
  const m = re.exec(s);
  if (!m) return { methods: [], path: s };
  const methods = m[1]!.split(/\s*\|\s*/).map((x) => x.toUpperCase());
  return { methods, path: s.slice(m[0].length).trim() };
}

/** Une filas del mismo path (GET + PUT → una row con ambos badges). */
export function consolidateHttpEndpoints(items: unknown[]): HttpEndpoint[] {
  const parsed = items.map((it) => parseHttpEndpoint(it));
  const byKey = new Map<string, HttpEndpoint>();
  const order: string[] = [];
  for (const ep of parsed) {
    const key = ep.path || ep.methods.join('|') || '_';
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { methods: [...ep.methods], path: ep.path });
      order.push(key);
      continue;
    }
    for (const m of ep.methods) {
      if (!prev.methods.includes(m)) prev.methods.push(m);
    }
  }
  for (const ep of byKey.values()) {
    ep.methods.sort(
      (a, b) => (HTTP_METHOD_ORDER.indexOf(a) + 99) - (HTTP_METHOD_ORDER.indexOf(b) + 99),
    );
  }
  return order.map((k) => byKey.get(k)!);
}

function fittedHeight(c: Componente): number {
  const items = consolidateHttpEndpoints(c.items ?? []);
  if (!items.length) return c.h;
  const nameN = wrapLabel(c.name ?? '', c.w).length;
  const header = c.stereotype ? 18 : 8;
  return header + nameN * LINE_H + 10 + items.length * (BUBBLE_H + BUBBLE_GAP) + 6;
}

function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (v == null || v === '') return [];
  return [String(v).trim()].filter(Boolean);
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function readPackage(raw: unknown, i: number): Paquete {
  const r = asRecord(raw);
  const parent = String(r.parent ?? '').trim();
  return {
    id: String(r.id ?? `pkg-${i}`),
    name: String(r.name ?? r.label ?? r.id ?? `Paquete ${i + 1}`),
    stereotype: String(r.stereotype ?? '').trim() || undefined,
    hue: r.hue != null ? Number(r.hue) : undefined,
    parent: parent || undefined,
    x: Number(r.x ?? 0),
    y: Number(r.y ?? 0),
    w: Math.max(80, Number(r.w ?? 200)),
    h: Math.max(60, Number(r.h ?? 120)),
  };
}

function readComponent(raw: unknown, i: number): Componente {
  const r = asRecord(raw);
  return {
    id: String(r.id ?? `cmp-${i}`),
    name: String(r.label ?? r.name ?? r.id ?? `Componente ${i + 1}`),
    stereotype: String(r.stereotype ?? '').trim() || undefined,
    package: String(r.package ?? '') || undefined,
    hue: r.hue != null ? Number(r.hue) : undefined,
    color: typeof r.color === 'string' && r.color.trim() ? r.color.trim() : undefined,
    x: Number(r.x ?? 0),
    y: Number(r.y ?? 0),
    w: Math.max(72, Number(r.w ?? 160)),
    h: Math.max(36, Number(r.h ?? 56)),
    provides: asList(r.provides ?? r.expose ?? r.exposes),
    requires: asList(r.requires ?? r.consume ?? r.consumes ?? r.needs),
    connects: asList(r.connects ?? r.links ?? r.depends ?? r.uses ?? r.to),
    items: asList(r.items ?? r.endpoints ?? r.body),
  };
}

/** Guardia de lado: el unico sitio donde se valida contra los cuatro. */
function esLado(v: unknown): v is Lado {
  return v === 'top' || v === 'right' || v === 'bottom' || v === 'left';
}

function readInterface(raw: unknown, i: number): InterfazUml {
  const r = asRecord(raw);
  const kind = String(r.kind ?? 'provided').toLowerCase();
  return {
    id: String(r.id ?? `if-${i}`),
    component: String(r.component ?? ''),
    name: String(r.name ?? '').trim() || undefined,
    // El `includes` no estrecha el `String(...)` de dentro: se calcula una vez
    // y se afirma, que es donde de verdad se comprobo.
    side: esLado(r.side) ? r.side : 'right',
    offset: Number(r.offset ?? 30),
    kind: kind === 'required' ? 'required' : 'provided',
  };
}

function readEdge(raw: unknown, i: number): SpecEdge {
  const r = asRecord(raw);
  const kind = String(r.kind ?? 'dependency').toLowerCase();
  const validKinds: EdgeKind[] = ['dependency', 'association', 'realization', 'assembly'];
  return {
    id: String(r.id ?? `e-${i}`),
    from: String(r.from ?? r.source ?? r.src ?? ''),
    to: String(r.to ?? r.target ?? r.dst ?? ''),
    fromInterface: String(r.fromInterface ?? r.fromIf ?? '') || undefined,
    toInterface: String(r.toInterface ?? r.toIf ?? '') || undefined,
    label: String(r.label ?? r.name ?? '').trim() || undefined,
    hue: r.hue != null ? Number(r.hue) : undefined,
    color: typeof r.color === 'string' && r.color.trim() ? r.color.trim() : undefined,
    kind: (validKinds.includes(kind as EdgeKind) ? kind : 'dependency') as EdgeKind,
  };
}

function readLayout(raw: unknown): OpcionesEmpaque {
  const r = asRecord(raw);
  const rawMode = String(r.mode);
  const mode: LayoutMode = ['pack', 'triptych', 'manual'].includes(rawMode) ? rawMode : 'pack';
  return {
    mode,
    ungroup: asList(r.ungroup),
    sources: asList(r.sources),
    sourceSides: asRecord(r.sourceSides),
    sourceGap: r.sourceGap != null ? Number(r.sourceGap) : undefined,
    colGutter: r.colGutter != null ? Number(r.colGutter) : undefined,
    pkgCorridor: r.pkgCorridor != null ? Number(r.pkgCorridor) : undefined,
    rowGap: r.rowGap != null ? Number(r.rowGap) : undefined,
    nestedRowGap: r.nestedRowGap != null ? Number(r.nestedRowGap) : undefined,
    pkgRowGap: r.pkgRowGap != null ? Number(r.pkgRowGap) : undefined,
    minGap: r.minGap != null ? Number(r.minGap) : undefined,
    lanePitch: r.lanePitch != null ? Number(r.lanePitch) : undefined,
    laneNearFactor: r.laneNearFactor != null ? Number(r.laneNearFactor) : undefined,
    pkgBorderClearance: r.pkgBorderClearance != null ? Number(r.pkgBorderClearance) : undefined,
    pkgCrossFactor: r.pkgCrossFactor != null ? Number(r.pkgCrossFactor) : undefined,
    allowDiagonal: r.allowDiagonal === true,
  };
}

/** payload → spec normalizada, o null si no hay componentes. */
export function resolveComponentSpec(payload: unknown, host: Record<string, unknown> = {}): ComponentSpecResult | null {
  const p = asRecord(payload);
  const src = asRecord(p.componentDiagram ?? p);
  const rawComponents = src.components ?? [];
  if (!Array.isArray(rawComponents) || !rawComponents.length) return null;

  const packages: Paquete[] = (Array.isArray(src.packages) ? src.packages : []).map(readPackage);
  const components: Componente[] = rawComponents.map(readComponent).map((c) => ({ ...c, h: fittedHeight(c) }));
  const compIds = new Set<string>(components.map((c) => c.id));
  // Interfaces huérfanas (component inexistente): se descartan como las aristas
  // colgantes; si no, caían a cx/cy=(0,0) y se dibujaban sueltas en la esquina.
  const interfaces: InterfazUml[] = (Array.isArray(src.interfaces) ? src.interfaces : [])
    .map(readInterface)
    .filter((i) => compIds.has(i.component));
  const rawEdges = src.edges ?? src.links ?? src.connections ?? src.relations;
  const edges: SpecEdge[] = (Array.isArray(rawEdges) ? rawEdges : []).map(readEdge);
  const layout = readLayout(src.layout);
  if (layout.minGap == null && host.minGap != null) layout.minGap = Number(host.minGap);
  if (layout.mode !== 'manual') packDiagram(packages, components, edges, layout);

  const wired = wireComponentDiagram(components, interfaces, edges);
  // Tras sintetizar -(O-: aleja cajas para que O/C no se peguen al borde.
  enforceAssemblyEntityMargins(wired.components, wired.edges, wired.interfaces);

  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? '') || undefined,
    layout,
    packages,
    components: wired.components,
    interfaces: wired.interfaces,
    edges: wired.edges,
  };
}

function isAssemblyEdge(e: SpecEdge): boolean {
  return e.kind === 'assembly' || Boolean(e.fromInterface && e.toInterface);
}

function assemblyAxis(
  fromSide: Lado | undefined,
  toSide: Lado | undefined,
  a: Caja,
  b: Caja,
): 'h' | 'v' {
  const lr = (s: Lado) => s === 'left' || s === 'right';
  const tb = (s: Lado) => s === 'top' || s === 'bottom';
  if (fromSide && toSide) {
    if (lr(fromSide) && lr(toSide)) return 'h';
    if (tb(fromSide) && tb(toSide)) return 'v';
  }
  const dx = Math.abs((a.x + a.w / 2) - (b.x + b.w / 2));
  const dy = Math.abs((a.y + a.h / 2) - (b.y + b.h / 2));
  return dx >= dy ? 'h' : 'v';
}

/**
 * Obliga hueco ≥ assemblyEntityMargin() entre cajas de un conector `-(O-`.
 * Empuja la caja lejana (derecha/abajo) para no pegar O/( al borde.
 */
export function enforceAssemblyEntityMargins(
  components: Componente[],
  edges: readonly SpecEdge[],
  interfaces: readonly InterfazUml[] = [],
): void {
  const byId = new Map(components.map((c) => [c.id, c]));
  const ifById = new Map(interfaces.map((i) => [i.id, i]));
  const minGap = assemblyEntityMargin();
  let moved = true;
  for (let guard = 0; moved && guard < 12; guard++) {
    moved = false;
    for (const e of edges) {
      if (!isAssemblyEdge(e)) continue;
      const a = byId.get(e.from);
      const b = byId.get(e.to);
      if (!a || !b || a === b) continue;
      const fi = e.fromInterface ? ifById.get(e.fromInterface) : undefined;
      const ti = e.toInterface ? ifById.get(e.toInterface) : undefined;
      const axis = assemblyAxis(fi?.side, ti?.side, a, b);
      if (axis === 'h') {
        const left = a.x <= b.x ? a : b;
        const right = a.x <= b.x ? b : a;
        const gap = right.x - (left.x + left.w);
        if (gap < minGap) {
          right.x += minGap - gap;
          moved = true;
        }
      } else {
        const top = a.y <= b.y ? a : b;
        const bot = a.y <= b.y ? b : a;
        const gap = bot.y - (top.y + top.h);
        if (gap < minGap) {
          bot.y += minGap - gap;
          moved = true;
        }
      }
    }
  }
}

function boundsOfComps(comps: readonly Caja[]): Caja {
  const x = Math.min(...comps.map((c) => c.x));
  const y = Math.min(...comps.map((c) => c.y));
  return {
    x,
    y,
    w: Math.max(...comps.map((c) => c.x + c.w)) - x,
    h: Math.max(...comps.map((c) => c.y + c.h)) - y,
  };
}

/** Cara del rectángulo que mira al destino (o al origen). */
function rankSides(from: Caja, to: Caja): Lado[] {
  const dx = (to.x + to.w / 2) - (from.x + from.w / 2);
  const dy = (to.y + to.h / 2) - (from.y + from.h / 2);
  // `as const` fija los literales: sin el, TypeScript los ensancha a `string[]`
  // y el retorno deja de encajar en `Lado[]`.
  const lr: readonly Lado[] = dx >= 0 ? (['right', 'left'] as const) : (['left', 'right'] as const);
  const tb: readonly Lado[] = dy >= 0 ? (['bottom', 'top'] as const) : (['top', 'bottom'] as const);
  const sameColumn = Math.abs(dx) < Math.max(from.w, to.w) * 0.35;
  if (sameColumn) return [tb[0]!, lr[0]!, lr[1]!, tb[1]!];
  // Distribución lateral: prioriza left/right siempre que no sea misma columna.
  return [lr[0]!, lr[1]!, tb[0]!, tb[1]!];
}

/**
 * Lados del destino desde el más exterior del clúster: así las llegadas
 * no se acumulan todas a la izquierda.
 * El borde superior del paquete es el título: no aparcar el O ahí.
 */
function outerSides(comp: Componente, cluster: Caja, sibs: readonly Componente[] = []): Lado[] {
  const cx = comp.x + comp.w / 2;
  const cy = comp.y + comp.h / 2;
  const dx = cx - (cluster.x + cluster.w / 2);
  const dy = cy - (cluster.y + cluster.h / 2);
  // Anotado: sin el, la primera asignacion fija `string[]` y el retorno falla.
  let ranked: Lado[];
  if (Math.abs(dx) >= Math.abs(dy)) {
    ranked = dx >= 0
      ? ['right', 'top', 'bottom', 'left']
      : ['left', 'top', 'bottom', 'right'];
  } else {
    ranked = dy >= 0
      ? ['bottom', 'left', 'right', 'top']
      : ['top', 'left', 'right', 'bottom'];
  }
  const topY = sibs.length ? Math.min(...sibs.map((c) => c.y)) : null;
  if (topY != null && comp.y <= topY + 8) {
    const without: Lado[] = ranked.filter((s): s is Exclude<Lado, 'top'> => s !== 'top');
    without.push('top');
    ranked = without;
  }
  return ranked;
}

/**
 * W54: castigo extra cuando el punto del conector cae cerca del borde
 * de un agrupador (`PKG_BORDER_CLEARANCE` = 40). El conector en un borde
 * de paquete es "malo" — la arista que sale de él tiene que rodear el
 * paquete para alejarse, lo que multiplica la longitud de la polilínea.
 *
 * NOTA: implementada pero no enchufada al `estimateAssemblyCost` (en
 * `component-spec.ts`) porque añadir un parámetro `packages` al
 * `wireComponentDiagram` rompe el flujo de empaquetado (los paquetes
 * todavía no tienen `x/y/w/h` definitivos al planificar las aristas).
 * La heurística del brute-force ya prefiere caras que dan al corredor
 * exterior del paquete, y `borderProximityCost` en el router final
 * penaliza los tramos largos pegados al borde.
 */
function connectorBorderPenalty(
  pt: Punto,
  packages: readonly Caja[],
  clearance: number = PKG_BORDER_CLEARANCE,
): number {
  if (!packages.length) return 0;
  let cost = 0;
  for (const p of packages) {
    const distToBorder = Math.min(
      Math.abs(pt.x - p.x),
      Math.abs(pt.x - (p.x + p.w)),
      Math.abs(pt.y - p.y),
      Math.abs(pt.y - (p.y + p.h)),
    );
    if (distToBorder < clearance) {
      // 0px = pegado al borde (coste alto); clearance-1 = casi rozando (también alto).
      const proximity = (clearance - distToBorder) / clearance;
      cost += proximity * 280; // proporcional a la cercanía
    }
  }
  return cost;
}

/**
 * Costo estimado del par de lados expositor/consumidor.
 * Favorece caras que se miran y caminos cortos; castiga salir “al revés”.
 */
function estimateAssemblyCost(
  from: Caja,
  fs: Lado,
  to: Caja,
  ts: Lado,
  fromSibs: readonly Componente[] = [],
  toSibs: readonly Componente[] = [],
): number {
  const a = componentSidePoint(from as Componente, fs, sideOffset(from as Componente, fs, 0, 1));
  const b = componentSidePoint(to as Componente, ts, sideOffset(to as Componente, ts, 0, 1));
  const manh = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const facing =
    (fs === 'right' && ts === 'left')
    || (fs === 'left' && ts === 'right')
    || (fs === 'bottom' && ts === 'top')
    || (fs === 'top' && ts === 'bottom');
  const mixed =
    ((fs === 'left' || fs === 'right') && (ts === 'top' || ts === 'bottom'))
    || ((fs === 'top' || fs === 'bottom') && (ts === 'left' || ts === 'right'));
  let cost = manh + (facing ? 0 : mixed ? 90 : 180);
  const dx = (to.x + to.w / 2) - (from.x + from.w / 2);
  const dy = (to.y + to.h / 2) - (from.y + from.h / 2);
  // Consumidor: salir hacia el expositor.
  if (fs === 'right' && dx < -4) cost += 220;
  if (fs === 'left' && dx > 4) cost += 220;
  if (fs === 'bottom' && dy < -4) cost += 220;
  if (fs === 'top' && dy > 4) cost += 220;
  // Expositor: el -( debe mirar al consumidor (no al borde exterior del paquete).
  if (ts === 'right' && dx > 4) cost += 220;
  if (ts === 'left' && dx < -4) cost += 220;
  if (ts === 'bottom' && dy > 4) cost += 220;
  if (ts === 'top' && dy < -4) cost += 220;
  // Título del paquete: no aparcar O en el borde superior del hermano de arriba.
  if (ts === 'top' && toSibs.length) {
    const topY = Math.min(...toSibs.map((c) => c.y));
    if (to.y <= topY + 8) cost += 140;
  }
  if (fs === 'top' && fromSibs.length) {
    const topY = Math.min(...fromSibs.map((c) => c.y));
    if (from.y <= topY + 8) cost += 80;
  }
  return cost;
}

function sideOffset(comp: Componente, side: Lado, index: number, total: number): number {
  const t = (index + 1) / (total + 1);
  if (side === 'top' || side === 'bottom') return Math.max(12, Math.min(comp.w - 12, comp.w * t));
  return Math.max(12, Math.min(comp.h - 12, comp.h * t));
}

/**
 * Completa el diagrama UML:
 *   1. `connects` en el componente → aristas.
 *   2. `provides` / `requires` → lollipops y, si hay nombre en común, arista.
 *   3. Arista componente→componente sin interfaz → socket (C) en el origen
 *      y lollipop (O) en el destino. Sin esto el PNG solo enseña cajas.
 */
function wireComponentDiagram(components: Componente[], interfaces: InterfazUml[], edges: SpecEdge[]): WireResult {
  const known = new Set<string>(components.map((c) => c.id));
  const byId = new Map<string, Componente>(components.map((c) => [c.id, c]));
  const ifaces: InterfazUml[] = interfaces.slice();
  const knownIf = new Set<string>(ifaces.map((i) => i.id));
  const outEdges: SpecEdge[] = [];
  const seenPair = new Set<string>();

  const pushEdge = (e: SpecEdge): void => {
    const key = `${e.from}|${e.to}|${e.fromInterface ?? ''}|${e.toInterface ?? ''}`;
    if (seenPair.has(key)) return;
    seenPair.add(key);
    outEdges.push(e);
  };

  for (const e of edges) pushEdge(e);

  for (const c of components) {
    for (const toRaw of c.connects ?? []) {
      const to = String(toRaw);
      if (!known.has(to) || to === c.id) continue;
      pushEdge({
        id: `e-${c.id}-${to}`,
        from: c.id,
        to,
        kind: 'dependency',
      });
    }
  }

  let ifaceSeq = ifaces.length;
  const addIface = (partial: Partial<InterfazUml> & { id?: string; component?: string; kind: 'provided' | 'required'; side: Lado }): InterfazUml => {
    const id = partial.id || `if-${ifaceSeq++}`;
    if (knownIf.has(id)) return ifaces.find((i) => i.id === id) ?? { id, component: '', side: 'right', offset: 30, kind: 'provided' };
    const iface = {
      ...partial,
      id,
      offset: partial.offset ?? 30,
      kind: partial.kind ?? 'provided',
      side: partial.side ?? 'right',
      component: partial.component ?? '',
    } as InterfazUml;
    ifaces.push(iface);
    knownIf.add(id);
    return iface;
  };

  for (const c of components) {
    const provides = (c.provides ?? []).map((x: unknown) => String(x));
    const requires = (c.requires ?? []).map((x: unknown) => String(x));
    provides.forEach((name, i) => {
      if (ifaces.some((x) => x.component === c.id && x.kind === 'provided' && x.name === name)) return;
      addIface({
        id: `if-${c.id}-prv-${i}`,
        component: c.id,
        name,
        kind: 'provided',
        side: 'right',
        offset: sideOffset(c, 'right', i, Math.max(provides.length, 1)),
      });
    });
    requires.forEach((name, i) => {
      if (ifaces.some((x) => x.component === c.id && x.kind === 'required' && x.name === name)) return;
      addIface({
        id: `if-${c.id}-req-${i}`,
        component: c.id,
        name,
        kind: 'required',
        side: 'left',
        offset: sideOffset(c, 'left', i, Math.max(requires.length, 1)),
      });
    });
  }

  for (const req of ifaces.filter((i) => i.kind === 'required' && i.name)) {
    const prv = ifaces.find((i) => i.kind === 'provided' && i.name === req.name && i.component !== req.component);
    if (!prv) continue;
    pushEdge({
      id: `e-${req.id}-${prv.id}`,
      from: req.component,
      to: prv.component,
      fromInterface: req.id,
      toInterface: prv.id,
      label: req.name,
      kind: 'assembly',
    });
  }

  const loads = new Map<string, number>();
  type Pending = { e: SpecEdge; fromC: Componente; toC: Componente };
  const pending: Pending[] = [];
  for (const e of outEdges) {
    const fromC = byId.get(e.from);
    const toC = byId.get(e.to);
    if (!fromC || !toC) continue;
    if (e.fromInterface || e.toInterface || knownIf.has(e.from) || knownIf.has(e.to)) continue;
    pending.push({ e, fromC, toC });
  }
  pending.sort((a, b) => {
    // Cortas primero: ocupan el corredor; las largas rodean sin cruzarlas.
    const da = Math.hypot(
      (a.toC.x + a.toC.w / 2) - (a.fromC.x + a.fromC.w / 2),
      (a.toC.y + a.toC.h / 2) - (a.fromC.y + a.fromC.h / 2),
    );
    const db = Math.hypot(
      (b.toC.x + b.toC.w / 2) - (b.fromC.x + b.fromC.w / 2),
      (b.toC.y + b.toC.h / 2) - (b.fromC.y + b.fromC.h / 2),
    );
    if (Math.abs(da - db) > 8) return da - db;
    const aa = Math.atan2(
      (a.toC.y + a.toC.h / 2) - (a.fromC.y + a.fromC.h / 2),
      (a.toC.x + a.toC.w / 2) - (a.fromC.x + a.fromC.w / 2),
    );
    const bb = Math.atan2(
      (b.toC.y + b.toC.h / 2) - (b.fromC.y + b.fromC.h / 2),
      (b.toC.x + b.toC.w / 2) - (b.fromC.x + b.fromC.w / 2),
    );
    return aa - bb || String(a.e.id).localeCompare(String(b.e.id));
  });

  const clusterOf = (comp: Componente): Caja => {
    const sibs = comp.package
      ? components.filter((c) => c.package === comp.package)
      : [comp];
    return sibs.length > 1 ? boundsOfComps(sibs) : { x: comp.x, y: comp.y, w: comp.w, h: comp.h };
  };

  // W54: la heurística del brute-force ya estaba implementada (for fs / for
  // ts, líneas más abajo). Solo la dejamos documentada; el resto de los
  // cambios (penalización de borde, A* aditivo) ya cubren las reglas 5/6.
  const planned: Array<{ e: SpecEdge; fs: Lado; ts: Lado; fromC: Componente; toC: Componente }> = [];
  const ALL_SIDES: readonly Lado[] = ['right', 'left', 'bottom', 'top'];
  for (const item of pending) {
    const { e, fromC, toC } = item;
    const fromSibs = fromC.package ? components.filter((c) => c.package === fromC.package) : [];
    const toSibs = toC.package ? components.filter((c) => c.package === toC.package) : [];
    const toCluster = clusterOf(toC);
    const isLone = toCluster.w <= toC.w && toCluster.h <= toC.h;
    // Candidatos: ranking geométrico + todos los lados (el costo decide).
    const fromRanked = [...new Set([...rankSides(fromC, toC), ...ALL_SIDES])];
    const toRanked = [...new Set([
      ...(isLone ? rankSides(toC, fromC) : outerSides(toC, toCluster, toSibs)),
      ...rankSides(toC, fromC),
      ...ALL_SIDES,
    ])];
    let bestFs: Lado = fromRanked[0]!;
    let bestTs: Lado = toRanked[0]!;
    let bestScore = Infinity;
    // W54: brute-force sobre las 4 lateralidades (N/E/S/W) en ambos
    // extremos. Cada combinación se puntúa con `estimateAssemblyCost`.
    // El par con menor coste gana. Es O(4×4) por arista.
    for (const fs of fromRanked) {
      for (const ts of toRanked) {
        const base = estimateAssemblyCost(fromC, fs, toC, ts, fromSibs, toSibs);
        // Carga de carril: preferir lados libres sin forzar el exterior del paquete.
        const loadTax =
          (loads.get(`${fromC.id}:${fs}`) ?? 0) * 35
          + (loads.get(`${toC.id}:${ts}`) ?? 0) * 45;
        const score = base + loadTax;
        if (score < bestScore) {
          bestScore = score;
          bestFs = fs;
          bestTs = ts;
        }
      }
    }
    loads.set(`${fromC.id}:${bestFs}`, (loads.get(`${fromC.id}:${bestFs}`) ?? 0) + 1);
    loads.set(`${toC.id}:${bestTs}`, (loads.get(`${toC.id}:${bestTs}`) ?? 0) + 1);
    planned.push({ e, fs: bestFs, ts: bestTs, fromC, toC });
  }

  const slots = new Map<string, number>();
  const slotKey = (compId: string, side: Lado): string => `${compId}:${side}`;
  const takeSlot = (comp: Componente, side: Lado): number => {
    const k = slotKey(comp.id, side);
    const n = slots.get(k) ?? 0;
    slots.set(k, n + 1);
    return n;
  };
  const countSlots = new Map<string, number>();
  for (const p of planned) {
    countSlots.set(slotKey(p.fromC.id, p.fs), (countSlots.get(slotKey(p.fromC.id, p.fs)) ?? 0) + 1);
    countSlots.set(slotKey(p.toC.id, p.ts), (countSlots.get(slotKey(p.toC.id, p.ts)) ?? 0) + 1);
  }

  // Máx. 1 puesto -(O- (provided) por expositor; todos los consumidores reusan ese.
  const providedByTarget = new Map<string, InterfazUml>();
  const providedListByComp = new Map<string, InterfazUml[]>();
  const pickClosestPrv = (list: InterfazUml[], fromC: Componente, toC: Componente): InterfazUml => {
    let best = list[0]!;
    let bestD = Infinity;
    const fx = fromC.x + fromC.w / 2;
    const fy = fromC.y + fromC.h / 2;
    for (const prv of list) {
      const pt = componentSidePoint(toC, prv.side, prv.offset);
      const d = Math.abs(pt.x - fx) + Math.abs(pt.y - fy);
      if (d < bestD) { bestD = d; best = prv; }
    }
    return best;
  };
  for (const p of planned) {
    const { e, fs, ts, fromC, toC } = p;
    const fi = takeSlot(fromC, fs);
    const key = slotKey(toC.id, ts);
    let prv = providedByTarget.get(key);
    if (!prv) {
      const list = providedListByComp.get(toC.id) ?? [];
      if (list.length >= 1) {
        // Ya hay 1 -(O- : reusar (no abrir otro lado).
        prv = pickClosestPrv(list, fromC, toC);
        providedByTarget.set(key, prv);
      } else {
        prv = addIface({
          id: `if-${toC.id}-prv`,
          component: toC.id,
          kind: 'provided',
          side: ts,
          offset: sideOffset(toC, ts, 0, 1),
        });
        list.push(prv);
        providedListByComp.set(toC.id, list);
        providedByTarget.set(key, prv);
      }
    }
    const req = addIface({
      id: `if-${e.id}-req`,
      component: fromC.id,
      kind: 'required',
      side: fs,
      offset: sideOffset(fromC, fs, fi, countSlots.get(slotKey(fromC.id, fs)) || 1),
    });
    const unoSolo = (countSlots.get(slotKey(fromC.id, fs)) || 1) === 1
      && (countSlots.get(key) || 1) === 1
      && (providedListByComp.get(toC.id)?.length ?? 0) <= 1;
    const sameAxisTB = (fs === 'top' || fs === 'bottom') && (ts === 'top' || ts === 'bottom');
    const sameAxisLR = (fs === 'left' || fs === 'right') && (ts === 'left' || ts === 'right');
    if (unoSolo && (sameAxisTB || sameAxisLR) && prv.side === ts) {
      const alongX = sameAxisTB;
      const desde = alongX ? [fromC.x, fromC.x + fromC.w] : [fromC.y, fromC.y + fromC.h];
      const hasta = alongX ? [toC.x, toC.x + toC.w] : [toC.y, toC.y + toC.h];
      const a = Math.max(desde[0]!, hasta[0]!);
      const b = Math.min(desde[1]!, hasta[1]!);
      if (b > a) {
        const centro = (a + b) / 2;
        req.offset = centro - (alongX ? fromC.x : fromC.y);
        prv.offset = centro - (alongX ? toC.x : toC.y);
      }
    }
    e.fromInterface = req.id;
    e.toInterface = prv.id;
  }

  const safeEdges = outEdges.filter((e) => {
    const fromOk = known.has(e.from) || knownIf.has(e.from) || knownIf.has(e.fromInterface ?? '');
    const toOk = known.has(e.to) || knownIf.has(e.to) || knownIf.has(e.toInterface ?? '');
    return fromOk && toOk && e.from && e.to;
  });

  // Solo interfaces cableadas: evita O/C huérfanos «expuestos» sin arista.
  const usedIf = new Set<string>();
  for (const e of safeEdges) {
    if (e.fromInterface) usedIf.add(e.fromInterface);
    if (e.toInterface) usedIf.add(e.toInterface);
  }
  const keptIfaces = ifaces.filter((i) => usedIf.has(i.id));

  return { components, interfaces: keptIfaces, edges: safeEdges };
}

function interfaceAnchor(iface: InterfazUml, comp: Componente): Punto {
  // El lollipop asoma perpendicular al lado; el centro queda a LOLLI_STEM
  // del borde para que el O y la C se lean en el PNG (14 px se perdía).
  const stem = LOLLI_STEM;
  switch (iface.side) {
    case 'top':    return { x: comp.x + iface.offset, y: comp.y - stem };
    case 'bottom': return { x: comp.x + iface.offset, y: comp.y + comp.h + stem };
    case 'left':   return { x: comp.x - stem, y: comp.y + iface.offset };
    case 'right':
    default:       return { x: comp.x + comp.w + stem, y: comp.y + iface.offset };
  }
}

/** Punto de la arista: dorso de la C, alineado al centro del O. */
function ifaceLineEnd(iface: InterfazUml): Punto {
  const r = LOLLI_R;
  if (iface.kind === 'required' && iface.docked) {
    switch (iface.side) {
      case 'right':  return { x: iface.cx! - r, y: iface.cy! };
      case 'left':   return { x: iface.cx! + r, y: iface.cy! };
      case 'bottom': return { x: iface.cx!, y: iface.cy! - r };
      default:       return { x: iface.cx!, y: iface.cy! + r };
    }
  }
  return ifaceOuterPoint(iface);
}

function componentSidePoint(comp: Componente, side: Lado, offset: number): Punto {
  switch (side) {
    case 'top':    return { x: comp.x + offset, y: comp.y };
    case 'bottom': return { x: comp.x + offset, y: comp.y + comp.h };
    case 'left':   return { x: comp.x, y: comp.y + offset };
    default:       return { x: comp.x + comp.w, y: comp.y + offset };
  }
}

function oppositeDrawSide(side: Lado): Lado {
  if (side === 'left') return 'right';
  if (side === 'right') return 'left';
  if (side === 'top') return 'bottom';
  return 'top';
}

/** C al dorso del O: centros a 2R+GAP. Abertura de C mira al O. */
function dockRequiredToProvided(req: InterfazUml, prv: InterfazUml): void {
  const d = LOLLI_R + LOLLI_GAP;
  (req as InterfazUml & { attachSide?: Lado }).attachSide = req.side;
  req.docked = true;
  req.side = oppositeDrawSide(prv.side);
  switch (prv.side) {
    case 'left':
      req.cx = prv.cx! - d;
      req.cy = prv.cy!;
      break;
    case 'right':
      req.cx = prv.cx! + d;
      req.cy = prv.cy!;
      break;
    case 'top':
      req.cx = prv.cx!;
      req.cy = prv.cy! - d;
      break;
    default:
      req.cx = prv.cx!;
      req.cy = prv.cy! + d;
      break;
  }
}

function ifaceOuterPoint(iface: InterfazUml): Punto {
  const r = LOLLI_R;
  switch (iface.side) {
    case 'top':    return { x: iface.cx!, y: iface.cy! - r };
    case 'bottom': return { x: iface.cx!, y: iface.cy! + r };
    case 'left':   return { x: iface.cx! - r, y: iface.cy! };
    case 'right':
    default:       return { x: iface.cx! + r, y: iface.cy! };
  }
}

function componentAnchorPoint(comp: Componente, side: Lado): Punto {
  switch (side) {
    case 'top':    return { x: comp.x + comp.w / 2, y: comp.y };
    case 'bottom': return { x: comp.x + comp.w / 2, y: comp.y + comp.h };
    case 'left':   return { x: comp.x, y: comp.y + comp.h / 2 };
    case 'right':
    default:       return { x: comp.x + comp.w, y: comp.y + comp.h / 2 };
  }
}

/**
 * spec → geometría lista para pintar.
 */
export function computeComponentLayout(spec: ComponentSpecResult): ComponentLayout {
  const PAD = 24;
  const titleH = spec.title ? 28 : 0;
  const subtitleH = spec.subtitle ? 18 : 0;

  // Los lollipops salen del rectángulo del componente: si el autor pone x=0,
  // el O de la izquierda queda en negativo y overflow:hidden lo recorta.
  let minX = 0;
  let minY = 0;
  for (const p of spec.packages) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
  }
  for (const c of spec.components) {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
  }
  for (const iface of spec.interfaces) {
    const comp = spec.components.find((c) => c.id === iface.component);
    if (!comp) continue;
    const { x, y } = interfaceAnchor(iface, comp);
    minX = Math.min(minX, x - LOLLI_R - 8);
    minY = Math.min(minY, y - LOLLI_R - 8);
  }
  const ox = Math.max(0, PAD - minX);
  const oy = Math.max(0, titleH + subtitleH + PAD - minY);

  const packages: Paquete[] = spec.packages.map((p) => ({ ...p, x: p.x + ox, y: p.y + oy }));
  const shiftedComps: Componente[] = spec.components.map((c) => ({ ...c, x: c.x + ox, y: c.y + oy }));
  const compById = new Map<string, Componente>(shiftedComps.map((c) => [c.id, c]));

  const components: LayoutComponent[] = shiftedComps.map((c) => {
    const lines = wrapLabel(c.name ?? '', c.w);
    const parsed: HttpEndpoint[] = consolidateHttpEndpoints(c.items ?? []);
    const topLibre = c.y + (c.stereotype ? 16 : 0);
    const labelY = parsed.length
      ? topLibre + 12
      : topLibre + (c.y + c.h - topLibre) / 2 - ((lines.length - 1) * LINE_H) / 2 + 4;
    const itemsY = labelY + (lines.length - 1) * LINE_H + 10;
    const badgeW = 34;
    const itemBubbles = parsed.map((ep, i) => {
      const nBadges = Math.max(1, ep.methods.length);
      const badgesW = ep.methods.length ? nBadges * badgeW + (nBadges - 1) * 2 : 0;
      const pathBudget = c.w - (badgesW ? badgesW + 16 : 16);
      return {
        methods: ep.methods,
        path: wrapLabel(ep.path || ep.methods.join('|'), Math.max(pathBudget, 280), 9, 2, { ellipsis: false }).join(''),
        x: c.x + 7,
        y: itemsY + i * (BUBBLE_H + BUBBLE_GAP),
        w: c.w - 14,
        h: BUBBLE_H,
        badgeW,
      };
    });
    return {
      ...c,
      stereoY: c.y + (c.stereotype ? 14 : 0),
      lines,
      itemLines: parsed.map((ep) => [...ep.methods, ep.path].filter(Boolean).join(' ')),
      itemBubbles,
      itemsY,
      itemLineHeight: BUBBLE_H + BUBBLE_GAP,
      labelY,
      lineHeight: LINE_H,
    };
  });

  const interfaces: LayoutInterface[] = spec.interfaces.map((iface) => {
    const comp = compById.get(iface.component);
    const { x, y } = comp ? interfaceAnchor(iface, comp) : { x: 0, y: 0 };
    return { ...iface, cx: x, cy: y };
  });

  // Importante: este mapa se rellena DESPUÉS de calcular cx/cy de cada interfaz;
  // si se construye sobre `spec.interfaces` (sin geometría), las aristas caen a
  // (0, 0) y desaparecen del render sin error visible.
  const ifaceById = new Map<string, LayoutInterface>(interfaces.map((i) => [i.id, i]));

  for (const e of spec.edges) {
    if (!e.fromInterface || !e.toInterface) continue;
    const req = ifaceById.get(e.fromInterface);
    const prv = ifaceById.get(e.toInterface);
    if (req?.kind === 'required' && prv?.kind === 'provided') {
      dockRequiredToProvided(req, prv);
    }
  }

  const pointOf = (iface: LayoutInterface | undefined): Punto | null =>
    iface ? ifaceLineEnd(iface) : null;

  // `hue` declarado por arista en el payload se honra; si no viene, la paleta
  // ciclada de assignEdgeHues le asigna uno. Antes se pisaba SIEMPRE después
  // de leerlo (lectura muerta).
  const userHue = new Map<SpecEdge, number | undefined>();
  for (const e of spec.edges) userHue.set(e, e.hue);
  assignEdgeHues(spec.edges);
  const edges: LayoutEdge[] = spec.edges.map((e) => {
    const hue = userHue.get(e) ?? e.hue;
    const req = e.fromInterface ? ifaceById.get(e.fromInterface) : null;
    const prv = e.toInterface ? ifaceById.get(e.toInterface) : null;
    if (req) req.hue = hue;
    if (prv) prv.hue = hue;

    let fromPt: Punto | null = null;
    let toPt: Punto | null = null;
    if (req?.docked && compById.has(e.from)) {
      fromPt = componentSidePoint(compById.get(e.from)!, (req as InterfazUml & { attachSide?: Lado }).attachSide ?? req.side, req.offset);
      // Llegada al centro del -O (invertAssembly: O = required dockado al expositor).
      toPt = (req.cx != null && req.cy != null)
        ? { x: req.cx, y: req.cy }
        : ifaceLineEnd(req);
    } else {
      if (e.fromInterface && ifaceById.has(e.fromInterface)) {
        const fi = ifaceById.get(e.fromInterface);
        if (fi) fromPt = pointOf(fi) ?? null;
      } else if (ifaceById.has(e.from)) {
        const fi = ifaceById.get(e.from);
        if (fi) fromPt = pointOf(fi) ?? null;
      } else if (compById.has(e.from)) {
        const fromComp = compById.get(e.from)!;
        if (e.toInterface) {
          const ti = ifaceById.get(e.toInterface);
          fromPt = ti ? pointOf(ti) : nearestSidePoint(fromComp, null);
        } else if (compById.has(e.to)) {
          fromPt = nearestSidePoint(fromComp, nearestSidePoint(compById.get(e.to)!, compById.get(e.from)!, true));
        } else {
          fromPt = nearestSidePoint(fromComp, null);
        }
      }

      if (e.toInterface && ifaceById.has(e.toInterface)) {
        const ti = ifaceById.get(e.toInterface);
        if (ti) toPt = pointOf(ti) ?? null;
      } else if (ifaceById.has(e.to)) {
        const ti = ifaceById.get(e.to);
        if (ti) toPt = pointOf(ti) ?? null;
      } else if (compById.has(e.to)) {
        toPt = nearestSidePoint(compById.get(e.to)!, fromPt);
      }
    }

    return {
      ...e,
      hue,
      color: e.color
        || (compById.get(e.from) as (Componente & { color?: string }) | undefined)?.color
        || undefined,
      fromX: fromPt?.x ?? 0, fromY: fromPt?.y ?? 0,
      toX: toPt?.x ?? 0, toY: toPt?.y ?? 0,
      path: '',
      _fromPt: fromPt,
      _toPt: toPt,
      _fromSide: (req as InterfazUml & { attachSide?: Lado }).attachSide ?? req?.side,
      _toSide: prv?.side,
    };
  });

  const ranked = edges
    .map((e, i) => ({ e, i, mid: (e.fromY + e.toY) / 2 }))
    .sort((a, b) => a.mid - b.mid || a.i - b.i);
  const usedSegs: Array<{ a: Punto; b: Punto }> = [];
  const sourceSet = new Set<string>(((spec.layout?.sources ?? []) as unknown[]).map((x: unknown) => String(x)));
  const titleBoxes: Caja[] = packages.map((p) => packageTitleBox(p, shiftedComps));
  const titleObst: Caja[] = titleBoxes.map((tb, i) => {
    const kids = shiftedComps.filter((c) => c.package === packages[i]!.id);
    const yClip = kids.length ? Math.min(...kids.map((c) => c.y)) - 8 : undefined;
    return inflateTitleObstacle(tb, TITLE_CLEARANCE, yClip!);
  });
  const frame: Caja = {
    x: Math.min(...shiftedComps.map((c) => c.x)),
    y: Math.min(...shiftedComps.map((c) => c.y)),
    w: Math.max(...shiftedComps.map((c) => c.x + c.w)) - Math.min(...shiftedComps.map((c) => c.x)),
    h: Math.max(...shiftedComps.map((c) => c.y + c.h)) - Math.min(...shiftedComps.map((c) => c.y)),
  };
  const layoutGaps = resolvePackingGaps(spec.layout ?? {});
  const routeLanePitch = layoutGaps.lanePitch;
  const routePkgBorder = layoutGaps.pkgBorderClearance;
  const pkgById = new Map(packages.map((p) => [p.id, p]));
  const ancestorsOf = (pkgId: string | undefined): Set<string> => {
    const out = new Set<string>();
    let cur = pkgId;
    while (cur) {
      out.add(cur);
      cur = pkgById.get(cur)?.parent;
    }
    return out;
  };
  /**
   * W55 (Phase 4): extrae el contexto de ruteo de cada arista para que la
   * optimización iterativa pueda re-invocar el router con diferentes
   * `usedSegs` sin tener que re-derivar todo. Es una pre-computación
   * barata (O(edges) en lookups) que se amortiza con K iteraciones.
   */
  const edgeRoutingCtx = edges.map((e) => {
    const fromBox = compById.get(e.from);
    const toBox = compById.get(e.to);
    const allowedPkgs = new Set([
      ...ancestorsOf(fromBox?.package),
      ...ancestorsOf(toBox?.package),
    ]);
    const foreignPkgs: Caja[] = packages
      .filter((p) => !allowedPkgs.has(p.id))
      .map((p) => inflateBox({
        id: `pkg-${p.id}`,
        x: p.x, y: p.y, w: p.w, h: p.h,
      }, Math.min(16, PKG_BORDER_CLEARANCE / 2)));
    const pkgBoxes: Caja[] = packages.map((p) => ({
      id: `pkg-${p.id}`, x: p.x, y: p.y, w: p.w, h: p.h,
    }));
    const prohibitedPkgBoxes: Caja[] = packages
      .filter((p) => p.prohibido && !allowedPkgs.has(p.id))
      .map((p) => ({ id: `prohibited-${p.id}`, x: p.x, y: p.y, w: p.w, h: p.h }));
    const ringObst: Caja[] = interfaces
      .filter((i) => i.id !== e.fromInterface && i.id !== e.toInterface && i.cx > 0)
      .map((i) => ({
        id: `ring-${i.id}`,
        x: i.cx - LOLLI_R - 2,
        y: i.cy - LOLLI_R - 2,
        w: LOLLI_R * 2 + 4,
        h: LOLLI_R * 2 + 4,
      }));
    const obstaculos: Caja[] = [
      ...shiftedComps.filter((c) => c.id !== e.from && c.id !== e.to),
      ...titleObst,
      ...ringObst,
    ];
    const hardComps = shiftedComps.filter((c) => c.id !== e.from && c.id !== e.to);
    const wrapBoxes = [
      ...obstaculos.filter((c) => !sourceSet.has((c as Caja & { id?: string }).id ?? '')),
      ...packages
        .filter((p) => allowedPkgs.has(p.id))
        .map((p) => ({ id: `wrap-${p.id}`, x: p.x, y: p.y, w: p.w, h: p.h })),
      ...foreignPkgs.map((p) => ({ ...p, id: `wrap-foreign-${(p as Caja & { id?: string }).id ?? ''}` })),
    ];
    const fromPkgBox = fromBox?.package ? pkgById.get(fromBox.package) : undefined;
    const toPkgBox = toBox?.package ? pkgById.get(toBox.package) : undefined;
    return {
      e,
      fromBox, toBox,
      fromPkgBox, toPkgBox,
      allowedPkgs, foreignPkgs, pkgBoxes, prohibitedPkgBoxes,
      obstaculos, hardComps, wrapBoxes, ringObst,
    };
  });
  /**
   * Router reutilizable: dado el contexto pre-computado y `usedSegs`,
   * devuelve el path string. Es el mismo flujo que el loop inline:
   * diagonal → routeAvoidingBoxes (wrap) → routeAvoidingBoxes (sin
   * ajenos) → fallback absoluto (con muro duro sobre componentes y
   * prohibidos) → routeAvoidingBoxes _loose.
   */
  const routeEdgeWithSegs = (ctx: typeof edgeRoutingCtx[number], usedSegsArg: ReadonlyArray<{ a: Punto; b: Punto }>, rank: number): string => {
    const { e, fromBox, toBox, fromPkgBox, toPkgBox, foreignPkgs, pkgBoxes, prohibitedPkgBoxes, obstaculos, hardComps, wrapBoxes } = ctx;
    const fromPt = { x: e.fromX, y: e.fromY };
    const toPt = { x: e.toX, y: e.toY };
    const fromSide = (e as Arista & { _fromSide?: Lado })._fromSide;
    const toSide = (e as Arista & { _toSide?: Lado })._toSide;
    const routeOptsBase = {
      fromSide, toSide, fromBox, toBox,
      clearance: EDGE_CLEARANCE, usedSegs: usedSegsArg as { a: Punto; b: Punto }[], frame, pkgBoxes,
      lanePitch: routeLanePitch,
      laneNearFactor: layoutGaps.laneNearFactor,
      pkgBorderClearance: routePkgBorder,
      pkgCrossFactor: layoutGaps.pkgCrossFactor,
      softPkgs: pkgBoxes,
      textBoxes: titleObst,
      prohibitedPkgs: prohibitedPkgBoxes,
    } as const;
    const allowDiag = Boolean((spec.layout as OpcionesEmpaque | undefined)?.allowDiagonal);
    let path: string | null = null;
    if (allowDiag) {
      const straight = [fromPt, toPt];
      const ownPkgHit = (fromPkgBox && pathHitsBoxes(straight, [inflateBox(fromPkgBox, 2)]))
        || (toPkgBox && pathHitsBoxes(straight, [inflateBox(toPkgBox, 2)]));
      const hitsForeign = pathHitsBoxes(straight, foreignPkgs.map((p) => inflateBox(p, 4)));
      const hitsComps = pathHitsBoxes(
        straight,
        hardComps.map((c) => inflateBox(c, EDGE_CLEARANCE)),
      );
      const hitsUsed = pathCrossingCount(straight, usedSegsArg) > 0
        || pathShareLen(straight, usedSegsArg) > 8;
      const distinctPkgs = fromBox?.package && toBox?.package && fromBox.package !== toBox.package;
      if (!hitsForeign && !hitsComps && !hitsUsed && !(distinctPkgs && ownPkgHit)) {
        path = `M${fromPt.x},${fromPt.y} L${toPt.x},${toPt.y}`;
      }
    }
    if (!path) {
      path = routeAvoidingBoxes(fromPt, toPt, obstaculos, rank, ranked.length, {
        ...routeOptsBase,
        fromPkg: fromPkgBox ? { x: fromPkgBox.x, y: fromPkgBox.y, w: fromPkgBox.w, h: fromPkgBox.h } : undefined,
        toPkg: toPkgBox ? { x: toPkgBox.x, y: toPkgBox.y, w: toPkgBox.w, h: toPkgBox.h } : undefined,
        wrapBoxes,
      });
    }
    if (!path) {
      path = routeAvoidingBoxes(
        fromPt, toPt,
        [
          ...hardComps,
          ...titleObst,
          ...ctx.ringObst,
        ],
        rank, ranked.length,
        {
          ...routeOptsBase,
          fromPkg: fromPkgBox ? { x: fromPkgBox.x, y: fromPkgBox.y, w: fromPkgBox.w, h: fromPkgBox.h } : undefined,
          toPkg: toPkgBox ? { x: toPkgBox.x, y: toPkgBox.y, w: toPkgBox.w, h: toPkgBox.h } : undefined,
        },
      );
    }
    if (!path) {
      const pitch = routeLanePitch;
      const outBase = fromSide === 'right' || fromSide === 'left' || fromSide === 'bottom' || fromSide === 'top'
        ? Math.max(36, routePkgBorder) + rank * pitch
        : 48 + rank * pitch;
      const a = (fromSide === 'left' || fromSide === 'right' || !fromSide)
        ? { x: fromPt.x + (fromSide === 'left' ? -outBase : outBase), y: fromPt.y }
        : { x: fromPt.x, y: fromPt.y + (fromSide === 'top' ? -outBase : outBase) };
      const b = (fromSide === 'left' || fromSide === 'right' || !fromSide)
        ? { x: a.x, y: toPt.y }
        : { x: toPt.x, y: a.y };
      const candidate = [fromPt, a, b, toPt];
      // W55: el fallback absoluto AHORA valida también prohibidos — antes
      // podía colar paths que atravesaban `pkg-db` por la ruta L simple.
      const walls = [
        ...shiftedComps, ...titleObst,
        ...prohibitedPkgBoxes.map((p) => inflateBox(p, EDGE_CLEARANCE)),
      ];
      if (!pathIllegal(candidate, walls, e.from, e.to, EDGE_CLEARANCE)) {
        path = `M${fromPt.x},${fromPt.y} L${a.x},${a.y} L${b.x},${b.y} L${toPt.x},${toPt.y}`;
      }
    }
    if (!path) {
      path = routeAvoidingBoxes(fromPt, toPt, hardComps, rank, ranked.length, {
        ...routeOptsBase,
        clearance: Math.max(10, EDGE_CLEARANCE - 4),
        _loose: true,
      });
    }
    return path ?? `M${fromPt.x},${fromPt.y} L${toPt.x},${toPt.y}`;
  };

  /**
   * Primera pasada (original). Calcula e.path de forma secuencial —
   * cada arista ve `usedSegs` acumulados de las anteriores. Esto es el
   * comportamiento heredado que produce los problemas del usuario:
   * las primeras aristas eligen el mejor carril gratis, las últimas
   * pagan el coste de congestión.
   */
  ranked.forEach((item, rank) => {
    const e = item.e;
    if (!e._fromPt || !e._toPt) return;
    e.path = routeEdgeWithSegs(edgeRoutingCtx[item.i]!, usedSegs, rank);
    // No registrar en usedSegs un tramo que aún pisa moradas: ensucia carriles.
    const pts = parsePathPoints(e.path);
    if (pts.length && !pathIllegal(pts, edgeRoutingCtx[item.i]!.hardComps, e.from, e.to, EDGE_CLEARANCE)) {
      usedSegs.push(...segsFromPath(pts));
    }
  });

  /**
   * W55 (Phase 4): optimización iterativa. Cada arista se re-rutea K
   * veces usando `usedSegs` = segmentos de TODAS las OTRAS aristas
   * (los suyos propios excluidos). Esto le da a cada una un field of
   * view equivalente: en la primera pasada, las primeras elegían su
   * mejor ruta sin peaje; aquí todas pagan el mismo coste de
   * congestión → tienden a separarse en carriles distintos desde el
   * origen, evitando el apiñamiento cerca del destino.
   *
   * W55+ (Phase 5): MAX_ITERS baja de 4 a 2. La pasada 1 ya consigue
   * la mayor parte de la mejora (carriles separados en el origen);
   * pasarla 4 veces duplica el coste de CPU sin ganancia visible en el
   * SVG y puede agotar el timeout del render con payloads grandes
   * (caso del intento anterior). Con 2 iters + spreadEdges agresivo
   * se llega a un resultado equivalente en 1/2 del tiempo.
   *
   * Convergencia: paramos cuando ningún path cambia entre iteraciones
   * (o llegamos a MAX_ITERS).
   */
  const MAX_ITERS = 2;
  for (let iter = 0; iter < MAX_ITERS; iter++) {
    // Construir el snapshot GLOBAL de segmentos tras la pasada previa.
    const globalSegs: Array<{ a: Punto; b: Punto }> = [];
    for (const ee of edges) {
      const pts = parsePathPoints(ee.path);
      if (pts.length >= 2) globalSegs.push(...segsFromPath(pts));
    }
    let changed = false;
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i]!;
      if (!e._fromPt || !e._toPt) continue;
      // Segmentos de "los otros" = global - míos. Comparamos por igualdad
      // exacta de coordenadas (los segmentos son inmutables entre pasadas).
      const myPts = parsePathPoints(e.path);
      const mySegs = myPts.length >= 2 ? segsFromPath(myPts) : [];
      const myKey = (s: { a: Punto; b: Punto }): string =>
        `${s.a.x},${s.a.y}|${s.b.x},${s.b.y}`;
      const myKeys = new Set(mySegs.map(myKey));
      const otherSegs = globalSegs.filter((s) => !myKeys.has(myKey(s)));
      const rank = ranked.findIndex((r) => r.i === i);
      const newPath = routeEdgeWithSegs(edgeRoutingCtx[i]!, otherSegs, rank);
      if (newPath !== e.path) {
        e.path = newPath;
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Alejar corredores de bordes de agrupador (como si fueran otras aristas).
  nudgePathsFromPackageBorders(
    edges,
    packages.map((p) => ({ id: p.id, x: p.x, y: p.y, w: p.w, h: p.h })),
    Math.max(28, Math.round(routePkgBorder * 0.7)),
  );

  /**
   * W55: separador de corredores. Tras nudgePaths, varios orígenes que
   * comparten destino pueden seguir apiñados sobre el mismo eje (el
   * nudge los aleja de paquetes pero no entre sí). spreadEdges detecta
   * celdas con >2 aristas y desplaza ±lanePitch a la mitad de ellas.
   */
  spreadEdges(
    edges,
    [...shiftedComps, ...packages.map((p) => ({ id: `pkg-${p.id}`, x: p.x, y: p.y, w: p.w, h: p.h }))],
    Math.max(LANE_PITCH, Number(routeLanePitch) || LANE_PITCH),
  );

  /**
   * W55: validador absoluto del muro `prohibido`. Tras todos los
   * fallbacks, ningún path puede atravesar un paquete prohibido. Si
   * alguno lo hace, lo recolocamos:
   *   1. Plan A: nudgePaths round 2 con las cajas prohibidas como
   *      bordes (las empuja perpendicularmente).
   *   2. Plan B: re-ruteo completo del edge con un contexto reforzado
   *      donde la caja prohibida se añade como muro duro del A* (mayor
   *      clearance). Si esto no produce un path válido, conservamos el
   *      path viejo (preferible a una recta rota) — el caller verá la
   *      superposición como overlap.
   */
  const prohibitedPkgBoxes: Caja[] = packages
    .filter((p) => (p as Paquete & { prohibido?: boolean }).prohibido && !sourceSet.has(p.id))
    .map((p) => ({ id: `prohibited-${p.id}`, x: p.x, y: p.y, w: p.w, h: p.h }));
  if (prohibitedPkgBoxes.length) {
    let violators = findProhibitedViolations(edges, prohibitedPkgBoxes, EDGE_CLEARANCE);
    if (violators.length) {
      // Plan A: nudgePaths con las prohibidas como bordes.
      nudgePathsFromPackageBorders(
        edges.filter((_, i) => violators.includes(i)),
        prohibitedPkgBoxes,
        Math.max(EDGE_CLEARANCE, routePkgBorder),
      );
      // Re-validar; si todavía quedan, plan B (re-ruteo reforzado).
      violators = findProhibitedViolations(edges, prohibitedPkgBoxes, EDGE_CLEARANCE);
      if (violators.length) {
        for (const vi of violators) {
          const e = edges[vi];
          if (!e?._fromPt || !e?._toPt) continue;
          const ctx = edgeRoutingCtx[vi];
          if (!ctx) continue;
          const walls = prohibitedPkgBoxes.map((p) => inflateBox(p, Math.max(EDGE_CLEARANCE + 8, routePkgBorder)));
          const hardObstaculos: Caja[] = [...ctx.obstaculos, ...walls];
          const fromPt = { x: e.fromX, y: e.fromY };
          const toPt = { x: e.toX, y: e.toY };
          const fromSide = (e as Arista & { _fromSide?: Lado })._fromSide;
          const toSide = (e as Arista & { _toSide?: Lado })._toSide;
          const alt = routeAvoidingBoxes(fromPt, toPt, hardObstaculos, 0, 1, {
            fromSide, toSide,
            fromBox: ctx.fromBox, toBox: ctx.toBox,
            clearance: EDGE_CLEARANCE + 4,
            usedSegs: [],
            frame,
            pkgBoxes: ctx.pkgBoxes,
            lanePitch: routeLanePitch,
            laneNearFactor: layoutGaps.laneNearFactor,
            pkgBorderClearance: routePkgBorder,
            pkgCrossFactor: layoutGaps.pkgCrossFactor,
            softPkgs: ctx.pkgBoxes,
            textBoxes: titleObst,
            prohibitedPkgs: ctx.prohibitedPkgBoxes,
          });
          if (alt && !pathIllegal(parsePathPoints(alt), prohibitedPkgBoxes, undefined, undefined, EDGE_CLEARANCE)) {
            e.path = alt;
          }
        }
      }
    }
  }

  const allowDiag = Boolean((spec.layout as OpcionesEmpaque | undefined)?.allowDiagonal);
  const mustRelax = edges.some((e) => {
    const pts = parsePathPoints(e.path);
    if (!e.path || pts.length < 2) return true;
    if (pathHasDiagonal(pts)) return !allowDiag; // diagonal solo con allowDiagonal
    return pathIllegal(pts, [...shiftedComps, ...titleObst], e.from, e.to, EDGE_CLEARANCE);
  });
  const relaxN = (spec as ComponentSpecResult & { _relax?: number })._relax ?? 0;
  if (mustRelax && relaxN < 3) {
    (spec as ComponentSpecResult & { _relax?: number })._relax = relaxN + 1;
    const b = (spec as ComponentSpecResult & { _relax?: number })._relax!;
    const gaps = resolvePackingGaps(spec.layout ?? {});
    packDiagram(spec.packages, spec.components, spec.edges, {
      ...spec.layout,
      colGutter: (gaps.colGutter ?? 0) + b * 8,
      pkgCorridor: (gaps.pkgCorridor ?? 0) + b * 10,
      sourceGap: (gaps.sourceGap ?? 0) + b * 8,
      rowGap: (gaps.rowGap ?? 0) + b * 8,
      pkgRowGap: (gaps.pkgRowGap ?? 0) + b * 4,
    });
    enforceAssemblyEntityMargins(spec.components, spec.edges, spec.interfaces);
    return computeComponentLayout(spec);
  }

  layoutPackageOutlines(packages, components, { pad: 14, tabH: TAB_H + 4 });
  for (const p of packages) (p as Paquete & { titleBox?: Caja }).titleBox = packageTitleBox(p, components);

  const hit = (box: { minX: number; minY: number; maxX: number; maxY: number }, x: number, y: number): void => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    box.minX = Math.min(box.minX, x);
    box.minY = Math.min(box.minY, y);
    box.maxX = Math.max(box.maxX, x);
    box.maxY = Math.max(box.maxY, y);
  };
  const extent = (): { minX: number; minY: number; maxX: number; maxY: number } => {
    const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (const p of packages) {
      hit(box, p.x, p.y);
      hit(box, p.x + p.w + 4, p.y + p.h + 4);
      for (const q of (p as Paquete & { outline?: Punto[] }).outline ?? []) hit(box, q.x, q.y);
      const tb = (p as Paquete & { titleBox?: Caja }).titleBox;
      if (tb) {
        hit(box, tb.x, tb.y);
        hit(box, tb.x + tb.w, tb.y + tb.h);
      }
    }
    for (const c of components) {
      hit(box, c.x, c.y);
      hit(box, c.x + c.w, c.y + c.h);
    }
    for (const i of interfaces) {
      hit(box, i.cx - LOLLI_R - 8, i.cy - LOLLI_R - 8);
      hit(box, i.cx + LOLLI_R + 8, i.cy + LOLLI_R + 8);
      if (i.name) {
        const lw = (i.name.length + 4) * 6;
        if (i.side === 'right') hit(box, i.cx + LOLLI_R + lw, i.cy);
        if (i.side === 'bottom') hit(box, i.cx, i.cy + LOLLI_R + 18);
        // Nombres a izquierda/arriba también ocupan lienzo: sin estas cajas el
        // rótulo de una interfaz del borde se recortaba en el PNG.
        if (i.side === 'left') hit(box, i.cx - LOLLI_R - lw, i.cy);
        if (i.side === 'top') hit(box, i.cx, i.cy - LOLLI_R - 18);
      }
    }
    for (const e of edges) {
      hit(box, e.fromX, e.fromY);
      hit(box, e.toX, e.toY);
      for (const pt of parsePathPoints(e.path)) hit(box, pt.x, pt.y);
    }
    return box;
  };
  let box = extent();
  const dx = Number.isFinite(box.minX) ? Math.max(0, PAD - box.minX) : 0;
  const dy = Number.isFinite(box.minY) ? Math.max(0, titleH + subtitleH + PAD - box.minY) : 0;
  if (dx || dy) {
    for (const p of packages) {
      p.x += dx;
      p.y += dy;
      for (const q of (p as Paquete & { outline?: Punto[] }).outline ?? []) {
        q.x += dx;
        q.y += dy;
      }
    }
    for (const c of components) {
      c.x += dx;
      c.y += dy;
      if (c.stereoY != null) c.stereoY += dy;
      if (c.labelY != null) c.labelY += dy;
      if (c.itemsY != null) c.itemsY += dy;
      for (const b of c.itemBubbles ?? []) {
        b.x += dx;
        b.y += dy;
      }
    }
    for (const i of interfaces) {
      i.cx += dx;
      i.cy += dy;
    }
    for (const e of edges) {
      e.fromX += dx;
      e.fromY += dy;
      e.toX += dx;
      e.toY += dy;
      const pts = parsePathPoints(e.path);
      if (pts.length) {
        e.path = `M${pts[0]!.x + dx},${pts[0]!.y + dy} ` + pts.slice(1).map((pt) => `L${pt.x + dx},${pt.y + dy}`).join(' ');
      }
    }
    for (const p of packages) (p as Paquete & { titleBox?: Caja }).titleBox = packageTitleBox(p, components);
    box = extent();
  }
  for (const p of packages) (p as Paquete & { titleBox?: Caja }).titleBox = packageTitleBox(p, components);
  const maxX = Number.isFinite(box.maxX) ? box.maxX : 0;
  const maxY = Number.isFinite(box.maxY) ? box.maxY : 0;

  const width = Math.max(640, maxX + PAD, diagramHeaderWidth(spec.title, spec.subtitle));
  const height = Math.max(360, maxY + PAD);

  const layout: ComponentLayout = {
    width,
    height,
    title: spec.title,
    subtitle: spec.subtitle,
    titleY: 20,
    subtitleY: titleH ? 38 : 0,
    packages,
    components,
    interfaces,
    edges,
  };
  applyEdgeActorLayout(layout, [
    ...components.map((c) => ({ x: c.x, y: c.y, w: c.w, h: c.h })),
    ...packages.map((p) => {
      const tb = (p as Paquete & { titleBox?: Caja }).titleBox;
      if (!tb) return null;
      const kids = components.filter((c) => c.package === p.id);
      const yClip = kids.length ? Math.min(...kids.map((c) => c.y)) - 8 : undefined;
      return inflateTitleObstacle(tb, TITLE_CLEARANCE, yClip!);
    }).filter((x): x is Caja => Boolean(x)),
  ], { glue: true, spread: false });
  return layout;
}

function nearestSidePoint(comp: Componente, target: { x?: number; y?: number; cx?: number; cy?: number } | null, reverse = false): Punto {
  if (!target) return componentAnchorPoint(comp, 'right');
  const tx = target.x ?? target.cx ?? 0;
  const ty = target.y ?? target.cy ?? 0;
  const dx = tx - (comp.x + comp.w / 2);
  const dy = ty - (comp.y + comp.h / 2);
  if (reverse) {
    // Para "from", queremos el lado que mira al destino. Aquí solo se llama
    // desde el cálculo de toPt; los casos de fromInterface/fromComponent
    // se resuelven arriba.
  }
  if (Math.abs(dx) >= Math.abs(dy)) {
    return componentAnchorPoint(comp, dx >= 0 ? 'right' : 'left');
  }
  return componentAnchorPoint(comp, dy >= 0 ? 'bottom' : 'top');
}

export function packageTitleText(p: Paquete): string {
  return p.stereotype ? `«${p.stereotype}» ${p.name ?? ''}` : String(p.name ?? '');
}

/** Ancho de tinta del título (cursiva 11px; 6.2 recortaba y las aristas lo cruzaban). */
export function packageTitleInkWidth(p: Paquete): number {
  return Math.max(TAB_W, Math.ceil(packageTitleText(p).length * 7.2));
}

const OUTLINE_PAD = 14;
const OUTLINE_TAB = TAB_H + 4;

/** Caja del rótulo = pestaña del paquete. Las aristas la rodean. */
export function packageTitleBox(p: Paquete, components: Componente[] = []): Caja & { id: string } {
  const w = packageTitleInkWidth(p);
  const h = OUTLINE_TAB + 6;
  const kids = components.filter((c) => c.package === p.id);
  // Sin hijos directos (agrupador anidado): título en esquina del propio rect.
  if (!kids.length) {
    return { id: `${p.id}::title`, x: p.x, y: p.y, w, h };
  }
  const x0 = Math.min(...kids.map((c) => c.x));
  const y0 = Math.min(...kids.map((c) => c.y));
  return {
    id: `${p.id}::title`,
    x: x0 - OUTLINE_PAD,
    y: y0 - OUTLINE_PAD - OUTLINE_TAB,
    w,
    h,
  };
}

/**
 * Ancho de la pestaña del paquete.
 *
 * Va con el nombre y no fijo: `min(56, w*0.4)` recortaba «Servicio» y
 * «Consulta» a media palabra. El título largo es obstáculo de aristas.
 */
export function packageTabWidth(p: Paquete): number {
  return packageTitleInkWidth(p);
}

const MAX_LINEAS = 3;

/**
 * Parte una etiqueta en las líneas que quepan dentro de `ancho`.
 *
 * Los componentes traen nombres reales («payload JSON por mensaje»,
 * «PR_TIPO_CONSULTAS, PR_EXTRACTOR…»), no identificadores de tres letras, y
 * el texto se pintaba en una sola línea centrada: se salía de la caja por los
 * dos lados y se montaba con el componente de al lado.
 *
 * Una palabra más larga que la caja se parte por caracteres —feo, pero
 * legible y dentro del marco, que es lo que no se puede negociar en un PNG
 * que va a la documentación oficial.
 */
export function wrapLabel(
  texto: string,
  ancho: number,
  fontPx: number = 11.5,
  maxLineas: number = MAX_LINEAS,
  opts: { ellipsis?: boolean } = {},
): string[] {
  const porChar = fontPx * 0.58;
  const max = Math.max(4, Math.floor((ancho - 16) / porChar));
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of String(texto ?? '').split(/\s+/).filter(Boolean)) {
    const cand = actual ? `${actual} ${palabra}` : palabra;
    if (cand.length <= max) { actual = cand; continue; }
    if (actual) { lineas.push(actual); actual = ''; }
    if (palabra.length > max) {
      let resto = palabra;
      while (resto.length > max) { lineas.push(resto.slice(0, max)); resto = resto.slice(max); }
      actual = resto;
    } else actual = palabra;
  }
  if (actual) lineas.push(actual);
  if (!lineas.length) return [''];
  if (lineas.length <= maxLineas) return lineas;
  const cortadas = lineas.slice(0, maxLineas);
  // EPs / paths: nunca «…»; se deja la última línea completa truncada sin elipsis.
  if (opts.ellipsis === false) {
    cortadas[maxLineas - 1] = lineas[maxLineas - 1] ?? cortadas[maxLineas - 1]!;
    return cortadas;
  }
  cortadas[maxLineas - 1] = `${cortadas[maxLineas - 1]!.slice(0, Math.max(1, max - 1))}…`;
  return cortadas;
}

/** Forma UML de paquete: rectángulo (InSoft) o carpeta con pestaña. */
export function packageShapePath(
  p: Paquete & { outline?: Punto[] },
  opts: { noTab?: boolean } = {},
): string {
  const { x, y, w, h } = p;
  // InSoft CD: rectángulo puro — el outline del packer trae pestaña folder.
  if (opts.noTab) {
    return `M${x},${y} L${x + w},${y} L${x + w},${y + h} L${x},${y + h} Z`;
  }
  if (p.outline && p.outline.length >= 4) return outlineToPath(p.outline);
  const tabW = packageTabWidth(p);
  const tabH = TAB_H;
  return `M${x + tabW},${y} L${x + w},${y} L${x + w},${y + h} L${x},${y + h} L${x},${y + tabH} L${x + tabW},${y + tabH} Z`;
}