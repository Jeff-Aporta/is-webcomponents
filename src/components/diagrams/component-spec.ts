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
import { packDiagram, packRowGapKey, layoutPackageOutlines, outlineToPath, resolvePackingGaps, inflateTitleObstacle, EDGE_CLEARANCE, GRID_STEP, TITLE_CLEARANCE, PKG_BORDER_CLEARANCE, LANE_PITCH } from './component-pack.js';
import { routeEdges, pointsToPath, simplifyOrthoPath } from './component-router.js';
import type { RouterEdge, RouterWorld } from './component-router.schemas.js';
import { parsePathPoints } from '../_shared/diagram-edge-actors.js';
import { assignEdgeHues, assignEmitterReceiverPalette } from '../_shared/diagram-edge-style.js';
import { layoutNodeLink } from '../_shared/node-link-layout.js';
import type {
  Caja, Componente, InterfazUml, Lado, OpcionesEmpaque, Paquete, Punto,
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

/** Aire mínimo arista ↔ glifo -(O- ajeno. */
const CONNECTOR_KEEP = 20;

/**
 * Hitbox de un conector -(O-: O + C(s) acopladas + aire. Ninguna arista
 * ajena pasa por aquí; la propia llega en recta desde fuera del hitbox.
 */
function connectorHitbox(prv: InterfazUml, all: readonly InterfazUml[]): { id: string } & Caja {
  const r = LOLLI_R;
  const pts: Punto[] = [{ x: prv.cx!, y: prv.cy! }];
  for (const i of all) {
    if (i.docked && Math.abs(i.cx! - prv.cx!) <= r * 3 && Math.abs(i.cy! - prv.cy!) <= r * 3) {
      pts.push({ x: i.cx!, y: i.cy! });
    }
  }
  const pad = r + CONNECTOR_KEEP;
  const x0 = Math.min(...pts.map((p) => p.x)) - pad;
  const y0 = Math.min(...pts.map((p) => p.y)) - pad;
  const x1 = Math.max(...pts.map((p) => p.x)) + pad;
  const y1 = Math.max(...pts.map((p) => p.y)) + pad;
  return { id: `ring-${prv.id}`, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Cara de la caja más cercana al punto. */
function faceOf(c: Caja, p: Punto): Lado {
  const d: Array<[Lado, number]> = [
    ['left', Math.abs(p.x - c.x)],
    ['right', Math.abs(p.x - (c.x + c.w))],
    ['top', Math.abs(p.y - c.y)],
    ['bottom', Math.abs(p.y - (c.y + c.h))],
  ];
  return d.sort((a, b) => a[1] - b[1])[0]![0];
}

const LINE_H = 13;
/** Tarjeta (`boxStyle: 'card'`): x del texto respecto a la caja (tras el avatar). */
export const CARD_TEXT_X = 50;
/** Tarjeta: separación vertical nombre → estereotipo. */
export const CARD_STEREO_DY = 14;
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

/**
 * Ancho ajustado al contenido (fit size) cuando el payload no trae `w`:
 * el nombre en una línea (negrita 11.5 px ≈ 7.2 px/carácter), el
 * estereotipo y el ítem más ancho (badges de método + ruta), con 2U de aire.
 * Acotado a [120, 320] para que una ruta larga no desborde la franja.
 */
function fittedWidth(c: Componente): number {
  const nameW = Math.ceil(String(c.name ?? '').length * 7.2);
  const stW = c.stereotype ? Math.ceil((c.stereotype.length + 2) * 6.4) : 0;
  const items = consolidateHttpEndpoints(c.items ?? []);
  const itemW = items.length
    ? Math.max(...items.map((it) => it.methods.length * 42 + Math.ceil(it.path.length * 6.2)))
    : 0;
  return Math.min(320, Math.max(120, Math.max(nameW, stW, itemW) + 40));
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
    // W57: sin esto, `prohibido: true` del payload se pierde y el
    // muro de clientesis nunca se arma en el post-check.
    prohibido: r.prohibido === true ? true : undefined,
    ...(r.cols != null && Number(r.cols) > 0 ? { cols: Number(r.cols) } : {}),
    // Paleta explícita: clave de theme.cluster.palettes o "#RRGGBB".
    ...(typeof r.palette === 'string' && r.palette ? { palette: r.palette } : {}),
    ...(typeof r.icon === 'string' && r.icon.trim() ? { icon: r.icon.trim() } : {}),
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
    icon: typeof r.icon === 'string' && r.icon.trim() ? r.icon.trim() : undefined,
    fill: typeof r.fill === 'string' && r.fill.trim() ? r.fill.trim() : undefined,
    x: Number(r.x ?? 0),
    y: Number(r.y ?? 0),
    w: Math.max(72, Number(r.w ?? 160)),
    h: Math.max(36, Number(r.h ?? 56)),
    // Defaults inteligentes: sin x/y lo coloca el algoritmo; sin w, fit size.
    ...(r.x == null && r.y == null ? { autoPos: true } : {}),
    ...(r.w == null ? { autoSize: true } : {}),
    provides: asList(r.provides ?? r.expose ?? r.exposes),
    requires: asList(r.requires ?? r.consume ?? r.consumes ?? r.needs),
    connects: asList(r.connects ?? r.links ?? r.depends ?? r.uses ?? r.to),
    items: asList(r.items ?? r.endpoints ?? r.body),
  };
}

/**
 * Componentes sin `x`/`y` ni paquete (el empaque solo coloca los que tienen
 * paquete): se distribuyen con el layout por capas (Sugiyama), que reparte
 * los nodos por niveles y centra cada nivel: equilibrio simétrico que acorta
 * las rutas. Sin paquetes es el único algoritmo; con paquetes, los libres van
 * en una columna a la izquierda del bloque empacado, centrados en su alto.
 */
function placeAutoComponents(packages: Paquete[], components: Componente[], edges: readonly SpecEdge[], gap: number): void {
  const libres = components.filter((c) => c.autoPos && !c.package);
  if (!libres.length) return;
  const ids = new Set(libres.map((c) => c.id));
  const internos = edges.filter((e) => ids.has(e.from) && ids.has(e.to)).map((e) => ({ from: e.from, to: e.to }));
  const res = layoutNodeLink(libres.map((c) => ({ id: c.id, w: c.w, h: c.h })), internos, {
    direction: packages.length ? 'TB' : 'LR', layerGap: Math.max(64, 3 * gap), nodeGap: Math.max(28, 2 * gap), align: 'center',
  });
  const pos = new Map(res.nodes.map((n) => [n.id, n]));
  if (!packages.length) {
    for (const c of libres) { const n = pos.get(c.id); if (n) { c.x = n.x; c.y = n.y; } }
    return;
  }
  // Con paquetes: columna a la izquierda del bloque, centrada en su alto.
  const empacados = components.filter((c) => !ids.has(c.id));
  const cajas = [...packages, ...empacados];
  const minX = Math.min(...cajas.map((b) => b.x));
  const minY = Math.min(...cajas.map((b) => b.y));
  const maxY = Math.max(...cajas.map((b) => b.y + b.h));
  const colW = Math.max(...libres.map((c) => c.w));
  const x0 = minX - colW - Math.max(120, 4 * gap);
  const y0 = (minY + maxY) / 2 - res.height / 2;
  for (const c of libres) {
    const n = pos.get(c.id);
    if (!n) continue;
    c.x = x0 + (colW - c.w) / 2 + (n.x - Math.min(...res.nodes.map((m) => m.x)));
    c.y = y0 + n.y;
  }
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
  const mode: LayoutMode = ['pack', 'triptych', 'manual', 'layers'].includes(rawMode) ? rawMode : 'pack';
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
    pkgBorderNearFactor: r.pkgBorderNearFactor != null ? Number(r.pkgBorderNearFactor) : undefined,
    pkgCrossFactor: r.pkgCrossFactor != null ? Number(r.pkgCrossFactor) : undefined,
    nestedPkgGap: r.nestedPkgGap != null ? Number(r.nestedPkgGap) : undefined,
    allowDiagonal: r.allowDiagonal === true,
    // Modo `layers`: componentes por fila dentro de cada franja.
    ...(r.layerCols != null ? { layerCols: Number(r.layerCols) } : {}),
    ...(r.fitPackages === false ? { fitPackages: false } : {}),
    ...(r.nestedCols != null ? { nestedCols: Number(r.nestedCols) } : {}),
    ...(r.boxStyle === 'card' || r.boxStyle === 'uml' || r.boxStyle === 'vp' ? { boxStyle: r.boxStyle } : {}),
    ...(r.connector === 'arrow' || r.connector === 'assembly' ? { connector: r.connector } : {}),
    ...(r.edgeStyle === 'curved' || r.edgeStyle === 'orthogonal' || r.edgeStyle === 'straight' ? { edgeStyle: r.edgeStyle } : {}),
    ...(r.routing && typeof r.routing === 'object' ? { routing: r.routing as Record<string, Record<string, number>> } : {}),
    ...(r.consolidate !== undefined ? { consolidate: r.consolidate as ComponentLayout['consolidate'] } : {}),
  };
}

/** payload → spec normalizada, o null si no hay componentes. */
export function resolveComponentSpec(payload: unknown, host: Record<string, unknown> = {}): ComponentSpecResult | null {
  const p = asRecord(payload);
  const src = asRecord(p.componentDiagram ?? p);
  const rawComponents = src.components ?? [];
  if (!Array.isArray(rawComponents) || !rawComponents.length) return null;

  const packages: Paquete[] = (Array.isArray(src.packages) ? src.packages : []).map(readPackage);
  const components: Componente[] = rawComponents.map(readComponent)
    .map((c) => (c.autoSize ? { ...c, w: fittedWidth(c) } : c))
    .map((c) => ({ ...c, h: fittedHeight(c) }));
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
  const lanePitch = resolvePackingGaps(layout).lanePitch;
  // Empacar → cablear. Si alguna cara no tiene alto para sus puertos a
  // `lanePitch`, crece y se re-empaca (el cableado muta aristas: copias).
  const plan = (): WireResult => {
    if (layout.mode !== 'manual') {
      packDiagram(packages, components, edges, layout);
      placeAutoComponents(packages, components, edges, lanePitch);
    }
    return wireComponentDiagram(
      components, interfaces.map((i) => ({ ...i })), edges.map((e) => ({ ...e })), packages, lanePitch,
      layout.connector === 'arrow' ? 'arrow' : 'assembly',
    );
  };
  let wired = plan();
  if (layout.mode !== 'manual' && growFacesForPorts(wired.components, wired.interfaces, lanePitch)) {
    wired = plan();
  }
  // Hermanos enfrentados con puertos en esas caras: el hueco debe caber
  // conector + rieles; si no, se abre el hueco de filas/columnas y se
  // re-empaca (el cableado puede cambiar de caras con más aire).
  for (let pass = 0; pass < 3 && layout.mode !== 'manual'; pass++) {
    const need = siblingGapNeeds(packages, wired.components, wired.interfaces, wired.edges, lanePitch);
    const gaps = resolvePackingGaps(layout);
    let grew = false;
    for (const [k, v] of Object.entries(need) as Array<[keyof typeof need, number]>) {
      if (v > (gaps[k] ?? 0)) { (layout as Record<string, unknown>)[k] = v; grew = true; }
    }
    if (!grew) break;
    wired = plan();
  }
  // `layers` ya empaca con huecos ≥ margen de ensamble y aire de lollipop
  // (packLayers): empujar cajas aquí las sacaba de su fila y de su subcapa.
  if (layout.mode !== 'layers') {
    // Tras sintetizar -(O-: aleja cajas para que O/C no se peguen al borde.
    enforceAssemblyEntityMargins(wired.components, wired.edges, wired.interfaces);
    // W58: O/C lejos de bordes de agrupador y fuera de paquetes prohibidos.
    enforceLollipopPackageClearance(packages, wired.components, wired.interfaces);
  }

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

/**
 * Alto/ancho mínimo de cada cara para sus puertos a `lanePitch`
 * (12px de aire en cada punta). Devuelve true si alguna caja creció.
 */
function growFacesForPorts(
  components: Componente[],
  interfaces: readonly InterfazUml[],
  lanePitch: number,
): boolean {
  const count = new Map<string, number>();
  for (const i of interfaces) {
    const k = `${i.component}|${i.side}`;
    count.set(k, (count.get(k) ?? 0) + 1);
  }
  let grew = false;
  for (const c of components) {
    for (const side of ['left', 'right', 'top', 'bottom'] as const) {
      const n = count.get(`${c.id}|${side}`) ?? 0;
      if (n < 2) continue;
      const need = 24 + (n - 1) * lanePitch;
      if (side === 'left' || side === 'right') {
        if (c.h < need) { c.h = need; grew = true; }
      } else if (c.w < need) {
        c.w = need;
        grew = true;
      }
    }
  }
  return grew;
}

/**
 * Hueco mínimo entre hermanos de paquete que se miran con puertos:
 * -(O- (si hay) + aire a ambos lados + un riel por puerto. Devuelve el
 * rowGap / nestedRowGap / colGutter que haría falta.
 */
function siblingGapNeeds(
  packages: readonly Paquete[],
  components: readonly Componente[],
  interfaces: readonly InterfazUml[],
  edges: readonly SpecEdge[],
  lanePitch: number,
): { rowGap?: number; nestedRowGap?: number; colGutter?: number } {
  // Puertos de la cara que NO son el ensamble directo con `other` (ese va
  // recto por el hueco y ya lo cubre enforceAssemblyEntityMargins).
  const ports = (c: Componente, side: Lado, other: Componente): { n: number; o: boolean } => {
    const direct = new Set<string>();
    for (const e of edges) {
      if ((e.from === c.id && e.to === other.id) || (e.from === other.id && e.to === c.id)) {
        if (e.fromInterface) direct.add(e.fromInterface);
        if (e.toInterface) direct.add(e.toInterface);
      }
    }
    const on = interfaces.filter((i) => i.component === c.id && i.side === side && !direct.has(i.id));
    return { n: on.length, o: on.some((i) => i.kind === 'provided') };
  };
  const out: { rowGap?: number; nestedRowGap?: number; colGutter?: number } = {};
  const bump = (k: keyof typeof out, v: number): void => { out[k] = Math.max(out[k] ?? 0, Math.ceil(v)); };
  for (const p of packages) {
    const kids = components.filter((c) => c.package === p.id);
    for (const a of kids) {
      for (const b of kids) {
        if (a === b) continue;
        const xOver = a.x < b.x + b.w && b.x < a.x + a.w;
        const yOver = a.y < b.y + b.h && b.y < a.y + a.h;
        if (xOver && b.y >= a.y + a.h) {
          const pa = ports(a, 'bottom', b);
          const pb = ports(b, 'top', a);
          const n = pa.n + pb.n;
          if (!n) continue;
          const need = 2 * EDGE_CLEARANCE + n * lanePitch + (pa.o || pb.o ? assemblyEntityMargin() : 0);
          const gap = b.y - (a.y + a.h);
          if (gap < need) bump(packRowGapKey(p), need);
        } else if (yOver && b.x >= a.x + a.w) {
          const pa = ports(a, 'right', b);
          const pb = ports(b, 'left', a);
          const n = pa.n + pb.n;
          if (!n) continue;
          const need = 2 * EDGE_CLEARANCE + n * lanePitch + (pa.o || pb.o ? assemblyEntityMargin() : 0);
          if (b.x - (a.x + a.w) < need) bump('colGutter', need);
        }
      }
    }
  }
  return out;
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
 * W54/W58: castigo cuando el punto del conector cae cerca del borde
 * de un agrupador. El conector en un borde de paquete es ilegible —
 * la arista que sale de él tiene que rodear el paquete.
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
      const proximity = (clearance - distToBorder) / clearance;
      cost += proximity * 420;
    }
  }
  return cost;
}

/**
 * W58: aleja componentes para que el círculo del -(O- no quede encima
 * del trazo del agrupador ni dentro de un paquete `prohibido` ajeno.
 * Empuja la caja hacia el interior del propio paquete — excepto si el
 * propio paquete es `prohibido`: ahí el O debe quedar en el perímetro
 * (lado corredor) para que las aristas no entren al interior.
 */
export function enforceLollipopPackageClearance(
  packages: Paquete[],
  components: Componente[],
  interfaces: readonly InterfazUml[],
  keep: number = 12,
): void {
  if (!packages.length || !interfaces.length) return;
  const byId = new Map(components.map((c) => [c.id, c]));
  const pkgById = new Map(packages.map((p) => [p.id, p]));
  const ancestors = (pkgId: string | undefined): Paquete[] => {
    const out: Paquete[] = [];
    let cur = pkgId ? pkgById.get(pkgId) : undefined;
    while (cur) {
      out.push(cur);
      cur = cur.parent ? pkgById.get(cur.parent) : undefined;
    }
    return out;
  };
  const needInside = LOLLI_STEM + LOLLI_R + keep;
  let moved = true;
  for (let guard = 0; moved && guard < 10; guard++) {
    moved = false;
    for (const iface of interfaces) {
      const comp = byId.get(iface.component);
      if (!comp) continue;
      const ownPkgs = ancestors(comp.package);
      const ownProhibido = ownPkgs.some((p) => p.prohibido);
      // 1) Aire vs borde del propio paquete (salvo prohibido: O en perímetro).
      if (!ownProhibido) {
        for (const pkg of ownPkgs) {
          if (iface.side === 'left') {
            const minX = pkg.x + needInside;
            if (comp.x < minX) { comp.x = minX; moved = true; }
          } else if (iface.side === 'right') {
            const maxRight = pkg.x + pkg.w - needInside;
            if (comp.x + comp.w > maxRight) {
              comp.x = maxRight - comp.w;
              moved = true;
            }
          } else if (iface.side === 'top') {
            const minY = pkg.y + 22 + needInside;
            if (comp.y < minY) { comp.y = minY; moved = true; }
          } else if (iface.side === 'bottom') {
            const maxBot = pkg.y + pkg.h - needInside;
            if (comp.y + comp.h > maxBot) {
              comp.y = maxBot - comp.h;
              moved = true;
            }
          }
        }
      } else {
        // Prohibido: pegar el componente al borde del lado del O para que
        // el lollipop quede en el perímetro (aristas no atraviesan el fill).
        for (const pkg of ownPkgs.filter((p) => p.prohibido)) {
          const edgePad = 16;
          if (iface.side === 'left' && Math.abs(comp.x - (pkg.x + edgePad)) > 1) {
            comp.x = pkg.x + edgePad;
            moved = true;
          } else if (iface.side === 'right') {
            const want = pkg.x + pkg.w - edgePad - comp.w;
            if (Math.abs(comp.x - want) > 1) { comp.x = want; moved = true; }
          }
          // O fuera del borde del prohibido a ≥ holgura de arista: así se
          // puede llegar por arriba/abajo sin correr sobre el borde.
          (iface as InterfazUml & { stem?: number }).stem = edgePad + EDGE_CLEARANCE + LOLLI_R;
        }
      }
      // 2) Nunca encima de paquetes prohibidos ajenos (hitbox del O).
      const anchor = interfaceAnchor(iface, comp);
      for (const pkg of packages) {
        if (!pkg.prohibido) continue;
        if (ownPkgs.some((p) => p.id === pkg.id)) continue;
        const hit =
          anchor.x + LOLLI_R > pkg.x - keep
          && anchor.x - LOLLI_R < pkg.x + pkg.w + keep
          && anchor.y + LOLLI_R > pkg.y - keep
          && anchor.y - LOLLI_R < pkg.y + pkg.h + keep;
        if (!hit) continue;
        const cx = pkg.x + pkg.w / 2;
        const cy = pkg.y + pkg.h / 2;
        if (Math.abs(anchor.x - cx) >= Math.abs(anchor.y - cy)) {
          comp.x += anchor.x < cx ? -needInside : needInside;
        } else {
          comp.y += anchor.y < cy ? -needInside : needInside;
        }
        moved = true;
      }
    }
  }
  // Re-envolver paquetes tras empujar hijos.
  const pad = Math.max(16, needInside);
  for (const pkg of packages) {
    const kids = components.filter((c) => c.package === pkg.id);
    const childPkgs = packages.filter((c) => c.parent === pkg.id);
    const boxes: Caja[] = [...kids, ...childPkgs];
    if (!boxes.length) continue;
    // Prohibido: pad pequeño en el lado del socket (no engullir el O).
    const usePad = pkg.prohibido ? 16 : pad;
    const x = Math.min(...boxes.map((b) => b.x)) - usePad;
    const y = Math.min(...boxes.map((b) => b.y)) - 22;
    const r = Math.max(...boxes.map((b) => b.x + b.w)) + usePad;
    const btm = Math.max(...boxes.map((b) => b.y + b.h)) + usePad;
    pkg.x = Math.min(pkg.x, x);
    pkg.y = Math.min(pkg.y, y);
    pkg.w = Math.max(pkg.w, r - pkg.x);
    pkg.h = Math.max(pkg.h, btm - pkg.y);
  }
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
  packages: readonly Caja[] = [],
  lanePitch: number = LANE_PITCH,
  fromLoad: number = 0,
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
  // W58: preferir caras cuyo O no nace pegado al perímetro del agrupador.
  if (packages.length) {
    cost += connectorBorderPenalty(a, packages);
    cost += connectorBorderPenalty(b, packages);
  }
  // W60/W63: salir hacia un hermano = atravesarlo. Castigo duro.
  // Antes solo sondeaba 48px y fallaba si el hueco al hermano era mayor
  // (conversacion→db elegía bottom y atravesaba mensaje a 80px).
  // Solo cuenta si el vecino queda más cerca que el espacio del -(O- +
  // aire de ruteo; más lejos, el router lo rodea sin problema.
  const room = assemblyEntityMargin() + EDGE_CLEARANCE;
  const stemHit = (origin: Caja, side: Lado, sibs: readonly Componente[]): number => {
    if (!sibs.length) return 0;
    const oid = (origin as Componente).id;
    let hit = 0;
    for (const s of sibs) {
      if (s === origin || (s as Componente).id === oid) continue;
      if (s === from || s === to) continue;
      const gap = side === 'bottom' ? s.y - (origin.y + origin.h)
        : side === 'top' ? origin.y - (s.y + s.h)
          : side === 'right' ? s.x - (origin.x + origin.w)
            : origin.x - (s.x + s.w);
      // El hueco debe caber el -(O- y los rieles que ya salen por esa cara.
      const rails = origin === from ? fromLoad + 1 : 1;
      if (gap > room + rails * lanePitch) continue;
      // Misma columna (tb) o misma fila (lr): el rayo del lado pega al hermano.
      const overlapX = !(s.x + s.w < origin.x - 8 || s.x > origin.x + origin.w + 8);
      const overlapY = !(s.y + s.h < origin.y - 8 || s.y > origin.y + origin.h + 8);
      let facing = false;
      if (side === 'bottom' && overlapX && s.y >= origin.y + origin.h - 2) facing = true;
      else if (side === 'top' && overlapX && s.y + s.h <= origin.y + 2) facing = true;
      else if (side === 'right' && overlapY && s.x >= origin.x + origin.w - 2) facing = true;
      else if (side === 'left' && overlapY && s.x + s.w <= origin.x + 2) facing = true;
      if (facing) hit += 1200;
    }
    return hit;
  };
  cost += stemHit(from, fs, fromSibs);
  cost += stemHit(to, ts, toSibs);
  return cost;
}

/** Puertos que caben en la cara a `lanePitch` (12px de aire por punta). */
function faceCapacity(comp: Caja, side: Lado, lanePitch: number): number {
  const len = side === 'top' || side === 'bottom' ? comp.w : comp.h;
  return Math.max(1, Math.floor((len - 24) / lanePitch) + 1);
}

function sideOffset(comp: Componente, side: Lado, index: number, total: number, lanePitch: number = LANE_PITCH): number {
  const len = (side === 'top' || side === 'bottom') ? comp.w : comp.h;
  if (total <= 1) {
    const t = (index + 1) / (total + 1);
    return Math.max(12, Math.min(len - 12, len * t));
  }
  // Puertos a `lanePitch` centrados en la cara. growFacesForPorts garantiza
  // que quepan; si no (modo manual), se comprimen dentro de [12, len-12].
  const usable = Math.max(0, len - 24);
  const pitch = Math.min(lanePitch, usable / Math.max(1, total - 1));
  const span = (total - 1) * pitch;
  const start = 12 + (usable - span) / 2;
  return start + index * pitch;
}

/**
 * Completa el diagrama UML:
 *   1. `connects` en el componente → aristas.
 *   2. `provides` / `requires` → lollipops y, si hay nombre en común, arista.
 *   3. Arista componente→componente sin interfaz → socket (C) en el origen
 *      y lollipop (O) en el destino. Sin esto el PNG solo enseña cajas.
 */
function wireComponentDiagram(
  components: Componente[],
  interfaces: InterfazUml[],
  edges: SpecEdge[],
  packages: readonly Paquete[] = [],
  lanePitch: number = LANE_PITCH,
  connector: 'assembly' | 'arrow' = 'assembly',
): WireResult {
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
    // Vecinos que una cara puede “mirar”: hermanos de paquete o, sin
    // paquete, las demás cajas sueltas (si no, un -(O- nace contra otra caja).
    const sibsOf = (c: Componente): Componente[] =>
      components.filter((o) => (o.package ?? '') === (c.package ?? ''));
    const fromSibs = sibsOf(fromC);
    const toSibs = sibsOf(toC);
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
    const fromLoad0 = (fs: Lado): number => loads.get(`${fromC.id}:${fs}`) ?? 0;
    // W54: brute-force sobre las 4 lateralidades (N/E/S/W) en ambos
    // extremos. Cada combinación se puntúa con `estimateAssemblyCost`.
    // El par con menor coste gana. Es O(4×4) por arista.
    for (const fs of fromRanked) {
      for (const ts of toRanked) {
        const base = estimateAssemblyCost(fromC, fs, toC, ts, fromSibs, toSibs, packages, lanePitch, fromLoad0(fs));
        // Carga de carril: preferir lados libres sin forzar el exterior del paquete.
        const fromLoad = loads.get(`${fromC.id}:${fs}`) ?? 0;
        const loadTax =
          fromLoad * 35
          + (loads.get(`${toC.id}:${ts}`) ?? 0) * 45
          // Cara llena (sus puertos ya no caben a lanePitch): repartir a
          // otra cara antes que agrandar la entidad.
          + (fromLoad + 1 > faceCapacity(fromC, fs, lanePitch) ? 2400 : 0);
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
  // Orden de puertos en la cara = orden del destino a lo largo de la cara
  // (de arriba abajo / izq. a der.): las aristas salen sin cruzarse.
  const slotIndex = new Map<SpecEdge, number>();
  const bySlot = new Map<string, typeof planned>();
  for (const p of planned) {
    const k = slotKey(p.fromC.id, p.fs);
    bySlot.set(k, [...(bySlot.get(k) ?? []), p]);
  }
  for (const list of bySlot.values()) {
    // Por ángulo origen→destino, en el sentido de la cara (der./izq.:
    // arriba→abajo; arriba/abajo: izq.→der.): los rieles no se cruzan.
    const along = (p: typeof planned[number]): number => {
      const a = Math.atan2(
        (p.toC.y + p.toC.h / 2) - (p.fromC.y + p.fromC.h / 2),
        (p.toC.x + p.toC.w / 2) - (p.fromC.x + p.fromC.w / 2),
      );
      if (p.fs === 'right' || p.fs === 'top') return a;
      if (p.fs === 'bottom') return -a;
      return -(a < 0 ? a + 2 * Math.PI : a);
    };
    list.sort((a, b) => along(a) - along(b));
    list.forEach((p, i) => slotIndex.set(p.e, i));
  }
  // Remate `arrow`: no hay interfaz UML compartida; cada flecha llega a su
  // propio puerto de la cara destino, ordenado por la posición del origen a
  // lo largo de la cara para que las llegadas no se crucen ni se monten.
  const arrowSlot = new Map<SpecEdge, number>();
  const byToSlot = new Map<string, typeof planned>();
  if (connector === 'arrow') {
    for (const p of planned) {
      const k = slotKey(p.toC.id, p.ts);
      byToSlot.set(k, [...(byToSlot.get(k) ?? []), p]);
    }
    for (const list of byToSlot.values()) {
      const along = (p: typeof planned[number]): number =>
        p.ts === 'top' || p.ts === 'bottom'
          ? p.fromC.x + p.fromC.w / 2
          : p.fromC.y + p.fromC.h / 2;
      list.sort((a, b) => along(a) - along(b));
      list.forEach((p, i) => arrowSlot.set(p.e, i));
    }
  }
  for (const p of planned) {
    const { e, fs, ts, fromC, toC } = p;
    const fi = slotIndex.get(e) ?? takeSlot(fromC, fs);
    const key = slotKey(toC.id, ts);
    let prv = connector === 'arrow'
      ? addIface({
        id: `if-${e.id}-prv`,
        component: toC.id,
        kind: 'provided',
        side: ts,
        offset: sideOffset(toC, ts, arrowSlot.get(e) ?? 0, byToSlot.get(key)?.length || 1, lanePitch),
      })
      : providedByTarget.get(key);
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
      offset: sideOffset(fromC, fs, fi, bySlot.get(slotKey(fromC.id, fs))?.length || 1, lanePitch),
    });
    const unoSolo = (countSlots.get(slotKey(fromC.id, fs)) || 1) === 1
      && (countSlots.get(key) || 1) === 1
      && (connector !== 'arrow' || (byToSlot.get(key)?.length ?? 1) === 1)
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
  // `stem` propio: conectores en el perímetro de un prohibido se alargan
  // para que el O quede fuera del borde y acepte llegadas por 3 lados.
  const stem = (iface as InterfazUml & { stem?: number }).stem ?? LOLLI_STEM;
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

/** Ilegales pesan más que cualquier apiñamiento. */
function relaxScore(l: ComponentLayout): number {
  const x = l as ComponentLayout & { _routeViolations?: unknown[]; _crowding?: number };
  return (x._routeViolations?.length ?? 0) * 1e6 + (x._crowding ?? 0);
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
  // W60: paleta emisor/receptor antes de pintar / cablear colores de arista.
  assignEmitterReceiverPalette(
    shiftedComps as Array<Componente & { color?: string }>,
    spec.edges as Array<{ from: string; to: string; color?: string }>,
  );
  const compById = new Map<string, Componente>(shiftedComps.map((c) => [c.id, c]));

  const card = spec.layout?.boxStyle === 'card';
  const vp = spec.layout?.boxStyle === 'vp';
  const components: LayoutComponent[] = shiftedComps.map((c) => {
    // Tarjeta: el avatar ocupa la franja izquierda; el texto va a su derecha.
    // VP: texto centrado con aire a la derecha para el glifo de componente.
    const lines = wrapLabel(c.name ?? '', card ? c.w - CARD_TEXT_X + 8 : vp ? c.w - 40 : c.w);
    const parsed: HttpEndpoint[] = consolidateHttpEndpoints(c.items ?? []);
    const topLibre = c.y + (c.stereotype && !card ? 16 : 0);
    // Tarjeta: nombre + estereotipo forman un bloque centrado en vertical.
    const cardBlockH = (lines.length - 1) * LINE_H + (c.stereotype ? CARD_STEREO_DY : 0);
    const labelY = vp && !parsed.length
      ? c.y + c.h / 2 + (c.stereotype ? 9 : 4) - ((lines.length - 1) * LINE_H) / 2
      : card && !parsed.length
      ? c.y + c.h / 2 - cardBlockH / 2 + 4
      : parsed.length
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

  // ── Ruteo de aristas (component-router.ts) ────────────────────────────
  const layoutGaps = resolvePackingGaps(spec.layout ?? {});
  const titleObst: Caja[] = packages.map((p) => {
    const kids = shiftedComps.filter((c) => c.package === p.id);
    const yClip = kids.length ? Math.min(...kids.map((c) => c.y)) - 8 : undefined;
    return inflateTitleObstacle(packageTitleBox(p, shiftedComps), TITLE_CLEARANCE, yClip!);
  });
  const pkgById = new Map(packages.map((p) => [p.id, p]));
  const ancestorsOf = (pkgId: string | undefined): Set<string> => {
    const out = new Set<string>();
    for (let cur = pkgId; cur; cur = pkgById.get(cur)?.parent) out.add(cur);
    return out;
  };
  const rings = interfaces
    .filter((i) => i.kind === 'provided' && !i.docked)
    .map((i) => connectorHitbox(i, interfaces));
  const ringOf = new Map(rings.map((r) => [r.id, r]));
  const world: RouterWorld = {
    components: shiftedComps.map((c) => ({ id: c.id, x: c.x, y: c.y, w: c.w, h: c.h })),
    packages: packages.map((p) => ({
      id: p.id, x: p.x, y: p.y, w: p.w, h: p.h, prohibido: Boolean(p.prohibido),
    })),
    titles: titleObst,
    rings,
  };
  const routable: Array<{ e: LayoutEdge; re: RouterEdge }> = [];
  for (const e of edges) {
    const fromC = compById.get(e.from) ?? compById.get(ifaceById.get(e.from)?.component ?? '');
    const toC = compById.get(e.to) ?? compById.get(ifaceById.get(e.to)?.component ?? '');
    if (!e._fromPt || !e._toPt || !fromC || !toC) continue;
    const from = { x: e.fromX, y: e.fromY };
    const to = { x: e.toX, y: e.toY };
    const prv = e.toInterface ? ifaceById.get(e.toInterface) : undefined;
    routable.push({
      e,
      re: {
        id: e.id ?? `${e.from}->${e.to}`,
        from,
        fromSide: (e._fromSide as Lado | undefined) ?? faceOf(fromC, from),
        to,
        toSide: (e._toSide as Lado | undefined) ?? faceOf(toC, to),
        fromBox: world.components.find((c) => c.id === fromC.id)!,
        toBox: world.components.find((c) => c.id === toC.id)!,
        toRing: prv ? ringOf.get(`ring-${prv.id}`) : undefined,
        fromPkgs: ancestorsOf(fromC.package),
        toPkgs: ancestorsOf(toC.package),
        toConnector: true,
        // Clave de llegada compartida: las `->` al mismo destino, y los
        // conectores al MISMO O. En ambos casos las aristas convergen en
        // abanico (rieles paralelos a corta distancia dentro del radio de
        // incentivo, una sola punta): es el efecto estándar de consolidación.
        // El `-(O-` sigue siendo único por interfaz expuesta: la clave es la
        // interfaz, no el componente.
        ...(spec.layout?.connector === 'arrow'
          ? { shareKey: `${toC.id}::arrow`, startKey: `${fromC.id}::arrow` }
          // Conector -(O-: SIN clave compartida. La clave activa el bus (las
          // aristas se unen y viajan por el mismo riel); al -( deben llegar en
          // abanico: rieles propios, paralelos y pegados (los hermanos que
          // convergen en el mismo O no se cobran cercanía: filtro
          // convolucional), entrando por los 3 lados libres del O.
          : {}),
      },
    });
  }
  const routed = routeEdges(world, routable.map((r) => r.re), {
    step: GRID_STEP,
    clearance: EDGE_CLEARANCE,
    lanePitch: layoutGaps.lanePitch,
    laneNearFactor: layoutGaps.laneNearFactor,
    pkgBorderClearance: layoutGaps.pkgBorderClearance,
    pkgBorderNearFactor: layoutGaps.pkgBorderNearFactor,
    pkgCrossFactor: layoutGaps.pkgCrossFactor,
    ...(spec.layout?.routing ? { costs: spec.layout.routing } : {}),
    ...(spec.layout?.consolidate !== undefined ? { consolidate: spec.layout.consolidate } : {}),
  });
  routable.forEach(({ e, re }, i) => {
    const pts = routed.paths[i];
    // Unida a otra `->`: termina en la interfaz (y la cara) de la raíz y no
    // pinta su propia punta.
    const raiz = routed.joinedTo[i];
    if (raiz != null) {
      const host = routable[raiz]!.e;
      e.toInterface = host.toInterface;
      e.toX = host.toX;
      e.toY = host.toY;
      (e as LayoutEdge & { sharedTip?: boolean }).sharedTip = true;
    }
    // El router pudo salir por otra cara (la asignada no tenía salida).
    const fp = routed.fromPorts[i];
    if (pts && fp) {
      e.fromX = fp.x;
      e.fromY = fp.y;
    }
    // Sin ruta: L ortogonal visible (y re-empaque abajo) antes que perder la arista.
    e.path = pointsToPath(pts ?? simplifyOrthoPath([
      re.from, { x: re.to.x, y: re.from.y }, re.to,
    ]));
  });
  const routeViolations = routable
    .map(({ re }, i) => ({ id: re.id, rules: routed.violations[i]! }))
    .filter((v) => v.rules.length);
  // Re-empacar si hay reglas duras rotas o rieles apiñados (falta hueco).
  const mustRelax = routeViolations.length > 0 || routed.crowding > 0;

  layoutPackageOutlines(packages, components, { pad: 14, tabH: TAB_H + 4, mode: spec.layout?.mode });
  // `vp`: rótulo arriba a la izquierda (no centrado). Centrado caía justo
  // donde cruzan las verticales entre franjas y obligaba a rodearlo.
  if (spec.layout?.boxStyle === 'vp') for (const p of packages) p.titleCenter = false;
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
  // Centrado: el rectángulo de unión de todo lo pintado (agrupadores, cajas,
  // conectores y rieles) se centra en el lienzo. El ancho del lienzo es el
  // del contenido + PAD a cada lado, o el de la cabecera si es mayor; en
  // ese caso el contenido se corre para quedar centrado bajo el título.
  const contentW = Number.isFinite(box.minX) ? box.maxX - box.minX : 0;
  const canvasW = Math.max(640, contentW + 2 * PAD, diagramHeaderWidth(spec.title, spec.subtitle));
  const dx = Number.isFinite(box.minX) ? (canvasW - contentW) / 2 - box.minX : 0;
  const dy = Number.isFinite(box.minY) ? titleH + subtitleH + PAD - box.minY : 0;
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

  const width = Math.max(canvasW, maxX + PAD);
  const height = Math.max(360, maxY + PAD);

  const layout: ComponentLayout = {
    width,
    height,
    title: spec.title,
    subtitle: spec.subtitle,
    titleY: 20,
    subtitleY: titleH ? 38 : 0,
    ...(card ? { boxStyle: 'card' as const } : vp ? { boxStyle: 'vp' as const } : {}),
    packages,
    components,
    interfaces,
    edges,
  };
  if (spec.layout?.connector === 'arrow') applyArrowConnectors(layout);
  // Diagnóstico (audit del lab): aristas que aún violan reglas duras.
  (layout as ComponentLayout & { _routeViolations?: unknown })._routeViolations = routeViolations;
  (layout as ComponentLayout & { _crowding?: number })._crowding = routed.crowding;
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
  // Re-empaque: más hueco y nueva vuelta; gana la mejor (no la última).
  const relaxN = (spec as ComponentSpecResult & { _relax?: number })._relax ?? 0;
  if (mustRelax && relaxN < 3) {
    (spec as ComponentSpecResult & { _relax?: number })._relax = relaxN + 1;
    const b = (spec as ComponentSpecResult & { _relax?: number })._relax!;
    const gaps = resolvePackingGaps(spec.layout ?? {});
    packDiagram(spec.packages, spec.components, spec.edges, {
      ...spec.layout,
      // Cada vuelta abre un riel más en corredores y entre hermanos anidados.
      colGutter: (gaps.colGutter ?? 0) + b * gaps.lanePitch,
      pkgCorridor: (gaps.pkgCorridor ?? 0) + b * gaps.lanePitch,
      nestedPkgGap: (gaps.nestedPkgGap ?? 0) + b * gaps.lanePitch * 2,
      sourceGap: (gaps.sourceGap ?? 0) + b * 8,
      rowGap: (gaps.rowGap ?? 0) + b * 8,
      pkgRowGap: (gaps.pkgRowGap ?? 0) + b * 4,
    });
    if (spec.layout?.mode !== 'layers') {
      enforceAssemblyEntityMargins(spec.components, spec.edges, spec.interfaces);
      enforceLollipopPackageClearance(spec.packages, spec.components, spec.interfaces);
    }
    const next = computeComponentLayout(spec);
    return relaxScore(next) < relaxScore(layout) ? next : layout;
  }

  return layout;
}

/**
 * Remate `arrow`: el ruteo ya llega en recta perpendicular al -(O- del
 * destino (stem del lollipop); se prolonga ese último tramo hasta la cara
 * de la caja y se retiran los glifos O/C. La punta queda sobre la cara y
 * mirando hacia adentro, perpendicular, sin un segundo ruteo.
 */
function applyArrowConnectors(layout: ComponentLayout): void {
  // Cajas finales del layout: las de la spec quedan desplazadas tras el ruteo.
  const compById = new Map(layout.components.map((c) => [(c as Componente).id, c as Componente]));
  const ifById = new Map(layout.interfaces.map((i) => [i.id, i as InterfazUml]));
  for (const e of layout.edges as Array<LayoutEdge & SpecEdge>) {
    const prv = e.toInterface ? ifById.get(e.toInterface) : undefined;
    const to = compById.get(e.to);
    if (!prv || !to || !e.path) continue;
    const face = componentSidePoint(to, prv.side, prv.offset);
    e.path = `${e.path} L${face.x},${face.y}`;
    e.toX = face.x;
    e.toY = face.y;
    e.kind = 'association';
    e.fromInterface = undefined;
    e.toInterface = undefined;
  }
  layout.interfaces = [];
  layout.connector = 'arrow';
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

/** Ancho de tinta del título (cursiva 11px; 6.2 recortaba y las aristas lo cruzaban). + icono si lo hay. */
export function packageTitleInkWidth(p: Paquete): number {
  return Math.max(TAB_W, Math.ceil(packageTitleText(p).length * 7.2) + (p.icon ? 24 : 0));
}

const OUTLINE_PAD = 14;
const OUTLINE_TAB = TAB_H + 4;

/** Caja del rótulo = pestaña del paquete. Las aristas la rodean. */
export function packageTitleBox(p: Paquete, components: Componente[] = []): Caja & { id: string } {
  const w = packageTitleInkWidth(p);
  const h = OUTLINE_TAB + 6;
  const kids = components.filter((c) => c.package === p.id);
  // `vp`: rótulo centrado en la franja superior, bajo la pestaña.
  if (p.titleCenter) {
    return { id: `${p.id}::title`, x: p.x + p.w / 2 - w / 2, y: p.y, w, h: h + 6 };
  }
  // Sin hijos directos (agrupador anidado) o empaque `layers`: título en
  // esquina del propio rect.
  if (!kids.length || p.titleAtCorner) {
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