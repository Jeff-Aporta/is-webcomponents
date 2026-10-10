import { layoutNodeLink } from '../_shared/node-link-layout.js';
import { snapDiagramGrid } from '../_shared/diagram-grid.js';
import { routeEdges, planPorts, pointsToPath, simplifyOrthoPath } from './component-router.js';
import { readRoutingOverride } from './routing-costs.js';
import type { RouterEdge, RouterWorld } from './component-router.schemas.js';
import type { Caja, Lado, Punto } from '../_shared/diagram-tipos.js';
import { resolveTkHue } from '../_shared/tk-hue.js';
import { countIconTokens, stripIconTokensPlain } from '../_shared/tk-icon-inline.js';
import { applyEdgeActorLayout } from '../_shared/diagram-edge-actors.js';
import { assignEdgeHues } from '../_shared/diagram-edge-style.js';
import { wrapLabel } from './component-spec.js';
import { normalizeErPayload as _archifyNormalize } from './er-archify.js';
import type {
  BoxSide,
  DiagramGroup,
  EdgeStyleOverride,
  ErCardinality,
  ErDashStyle,
  ErRouteKind,
  ErSpec,
  ErSpecAttribute,
  ErSpecEntity,
  ErSpecRelation,
  ErLayout,
  EdgeVariant,
  NodeStyleOverride,
} from './diagram-types.js';
import type { ClusterBox, ClusterRaw } from "./er-spec.schemas.js";

/**
 * Especificación y layout de diagramas entidad-relación (sin Mermaid).
 *
 * Mismo contrato que flowchart-spec.js: JSON en, geometría pura fuera. Reutiliza
 * el motor node-link (capas + baricentro) para ubicar entidades y el A* de la
 * rejilla de costos para rutear relaciones alrededor de las cajas.
 */

const ROW_H = 18;
const HEADER_H = 24;
const MIN_W = 140;
const MAX_W = 280;
const PAD_X = 10;

const CARDS: Set<ErCardinality> = new Set(['one', 'many', 'zeroOrOne', 'zeroOrMany']);
const DIRECTIONS: Set<'TB' | 'BT' | 'LR' | 'RL'> = new Set(['TB', 'BT', 'LR', 'RL']);
const DEFAULT_HUES = [210, 239, 160, 38, 280, 199];

/** Ratio guía por defecto (ancho/alto): ligeramente apaisado, cómodo en pantalla. */
const DEFAULT_RATIO = 1.4;
/** Aire dentro del cajón de un grupo y alto de su cabecera. */
const CLUSTER_PAD = 20;
const CLUSTER_HEADER = 26;
/** Separación entre cajones y entre entidades sueltas de un mismo cajón. */
/**
 * Corredor entre cajones: aire de borde a cada lado (ER_BORDER_KEEP, donde
 * correr paralelo cuesta) + dos carriles. Con 56 px el pasillo era tan caro
 * que las aristas rodeaban cajones enteros.
 */
const ER_BORDER_KEEP = 40;
const CLUSTER_GAP = ER_BORDER_KEEP * 2 + 48;
/** Ruteo: aire arista↔entidad, tramo recto mínimo (pata de gallo) y carril. */
const ER_CLEARANCE = 20;
const ER_STUB = 32;
const ER_LANE_PITCH = 24;
const NODE_GAP = 84;

function asRecord(v: unknown): Record<string, any> {
  return v && typeof v === 'object' ? (v as Record<string, any>) : {};
}

function readAttribute(raw: unknown, i: number): ErSpecAttribute {
  const r = asRecord(raw);
  return {
    name: String(r.name ?? `attr${i}`),
    type: String(r.type ?? ''),
    key: r.key === 'PK' || r.key === 'FK' ? r.key : undefined,
    comment: undefined,
  };
}

function readEntity(raw: unknown, i: number): ErSpecEntity {
  const r = asRecord(raw);
  const rawAttrs: unknown[] = Array.isArray(r.attributes) ? r.attributes : [];
  const attributes: ErSpecAttribute[] = rawAttrs.map((a, j) => readAttribute(a, j));
  // `hue` opcional en la entidad: si esta presente, sobrevive a la normalizacion
  // y el layout lo usa como fallback cuando la entidad no pertenece a un grupo
  // con `hue`. Asi un JSON con `hue` por entidad (sin groups) sale con los
  // encabezados tintados, igual que si viniera de un grupo.
  const hue = resolveTkHue(r, undefined);
  const out: ErSpecEntity = {
    id: String(r.id ?? `e${i}`),
    name: String(r.name ?? r.label ?? r.id ?? `Entidad ${i + 1}`),
    group: String(r.group ?? '') || undefined,
    attributes,
  };
  if (hue != null) out.hue = hue;
  // Nuevos campos archify-style:
  if (Array.isArray(r.pos) && r.pos.length === 2 && Number.isFinite(r.pos[0]) && Number.isFinite(r.pos[1])) {
    out.pos = [Math.round(r.pos[0]), Math.round(r.pos[1])];
  }
  if (Array.isArray(r.size) && r.size.length === 2 && Number.isFinite(r.size[0]) && Number.isFinite(r.size[1]) && r.size[0] >= 40 && r.size[1] >= 24) {
    out.size = [Math.round(r.size[0]), Math.round(r.size[1])];
  }
  if (r.style && typeof r.style === 'object') {
    const s: NodeStyleOverride = {};
    if (typeof r.style.fill === 'string') s.fill = r.style.fill;
    if (typeof r.style.stroke === 'string') s.stroke = r.style.stroke;
    if (Number.isFinite(r.style.strokeWidth)) s.strokeWidth = Number(r.style.strokeWidth);
    if (Number.isFinite(r.style.paddingX)) s.paddingX = Number(r.style.paddingX);
    if (Number.isFinite(r.style.paddingY)) s.paddingY = Number(r.style.paddingY);
    if (Number.isFinite(r.style.marginX)) s.marginX = Number(r.style.marginX);
    if (Number.isFinite(r.style.marginY)) s.marginY = Number(r.style.marginY);
    if (Number.isFinite(r.style.radius)) s.radius = Number(r.style.radius);
    if (Number.isFinite(r.style.opacity)) s.opacity = Number(r.style.opacity);
    if (Object.keys(s).length) out.style = s;
  }
  return out;
}

/**
 * Sentido estándar de la animación de flujo en el DER: del lado N al lado 1 (la FK apunta a su
 * padre). En 1:1, del lado opcional (0..1, el dependiente) al obligatorio. `true` = al revés del
 * trazo (que va de `from` a `to`).
 */
export function sentidoFlujoEr(fromCard: ErCardinality, toCard: ErCardinality): boolean {
  const muchos = (c: ErCardinality) => c === 'many' || c === 'zeroOrMany';
  if (muchos(fromCard) !== muchos(toCard)) return muchos(toCard);
  if (!muchos(fromCard)) return fromCard === 'one' && toCard === 'zeroOrOne';
  return false;
}

function readRelation(raw: unknown, i: number): ErSpecRelation {
  const r = asRecord(raw);
  const fromCard = r.fromCard as ErCardinality | undefined;
  const toCard = r.toCard as ErCardinality | undefined;
  const route = r.route as ErRouteKind | undefined;
  const fromSide = r.fromSide as BoxSide | undefined;
  const toSide = r.toSide as BoxSide | undefined;
  const dashStyle = r.dashStyle as ErDashStyle | undefined;
  const variant = r.variant as EdgeVariant | undefined;

  const out: ErSpecRelation = {
    id: String(r.id ?? `r${i}`),
    from: String(r.from ?? r.source ?? ''),
    to: String(r.to ?? r.target ?? ''),
    label: String(r.label ?? '').trim() || undefined,
    fromCard: fromCard && CARDS.has(fromCard) ? fromCard : 'one',
    toCard: toCard && CARDS.has(toCard) ? toCard : 'many',
    identifying: r.identifying !== false,
  };
  // Nuevos campos archify-style (opcionales; defaults razonables):
  if (route && (route === 'auto' || route === 'straight' || route === 'orthogonal' ||
      route === 'orthogonal-h' || route === 'orthogonal-v')) {
    out.route = route;
  }
  if (typeof fromSide === 'string' && /^(left|right|top|bottom|auto)$/.test(fromSide) && fromSide !== 'auto') out.fromSide = fromSide;
  if (typeof toSide === 'string' && /^(left|right|top|bottom|auto)$/.test(toSide) && toSide !== 'auto') out.toSide = toSide;
  if (Array.isArray(r.via) && r.via.length) {
    out.via = r.via
      .filter((p): p is [number, number] => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .map((p) => [Math.round(p[0]), Math.round(p[1])] as [number, number]);
  }
  if (Array.isArray(r.labelAt) && r.labelAt.length === 2 && Number.isFinite(r.labelAt[0]) && Number.isFinite(r.labelAt[1])) {
    out.labelAt = [Math.round(r.labelAt[0]), Math.round(r.labelAt[1])];
  }
  if (typeof r.labelDx === 'number') out.labelDx = Number(r.labelDx);
  if (typeof r.labelDy === 'number') out.labelDy = Number(r.labelDy);
  if (Number.isInteger(r.labelSegment) && (r.labelSegment as number) >= 0) out.labelSegment = r.labelSegment;
  if (dashStyle && (dashStyle === 'solid' || dashStyle === 'dashed' || dashStyle === 'dotted')) out.dashStyle = dashStyle;
  if (r.reverse === true) out.reverse = true;
  if (Number.isFinite(r.width) && (r.width as number) > 0) out.width = Number(r.width);
  if (variant && (variant === 'default' || variant === 'emphasis' || variant === 'security' || variant === 'dashed')) out.variant = variant;
  // style override (solo claves seguras)
  if (r.style && typeof r.style === 'object') {
    const s: EdgeStyleOverride = {};
    if (typeof r.style.fill === 'string') s.fill = r.style.fill;
    if (typeof r.style.stroke === 'string') s.stroke = r.style.stroke;
    if (Number.isFinite(r.style.strokeWidth)) s.strokeWidth = Number(r.style.strokeWidth);
    if (Number.isFinite(r.style.paddingX)) s.paddingX = Number(r.style.paddingX);
    if (Number.isFinite(r.style.paddingY)) s.paddingY = Number(r.style.paddingY);
    if (Number.isFinite(r.style.marginX)) s.marginX = Number(r.style.marginX);
    if (Number.isFinite(r.style.marginY)) s.marginY = Number(r.style.marginY);
    if (Number.isFinite(r.style.radius)) s.radius = Number(r.style.radius);
    if (Number.isFinite(r.style.opacity)) s.opacity = Number(r.style.opacity);
    if (Object.keys(s).length) out.style = s;
  }
  return out;
}

function readGroups(src: Record<string, unknown>): DiagramGroup[] | undefined {
  const raw = src.groups;
  if (!Array.isArray(raw) || !raw.length) return undefined;
  const out: DiagramGroup[] = raw.map((g, i: number) => {
    const r = asRecord(g);
    const group: DiagramGroup = {
      id: String(r.id ?? `grp-${i}`),
      name: String(r.name ?? r.label ?? `Grupo ${i + 1}`),
      hue: resolveTkHue(r, DEFAULT_HUES[i % DEFAULT_HUES.length]),
    };
    if (typeof r.parent === 'string' && r.parent.length > 0) group.parent = r.parent;
    // `external`: servicio de otro dominio. `palette`: clave de
    // theme.cluster.palettes (p.ej. "warm") que fija el fondo del cajón.
    if (r.external === true) (group as DiagramGroup & { external?: boolean }).external = true;
    if (typeof r.palette === 'string' && r.palette) (group as DiagramGroup & { palette?: string }).palette = r.palette;
    return group;
  });
  return normalizeGroupParents(out);
}

/**
 * Ciclos y referencias inválidas en `parent` se limpian en pasada. Política:
 *   - parent apunta a un id inexistente → se descarta (sin parent);
 *   - ciclo A.parent=B, B.parent=A → ambos quedan sin parent. Es más barato
 *     que romper el ciclo en un eslabón arbitrario y deja el layout estable.
 * El algoritmo es O(n²) sobre el número de grupos — son pocos.
 */
function normalizeGroupParents(groups: DiagramGroup[]): DiagramGroup[] {
  if (!groups.length) return groups;
  const byId = new Map(groups.map((g) => [g.id, g] as const));
  // Recolectar todos los nodos que forman parte de un ciclo (drop parent).
  const cycleMembers = new Set<string>();
  for (const g of groups) {
    if (!g.parent) continue;
    const seen = new Set<string>();
    let cursor: string | undefined = g.id;
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      cursor = byId.get(cursor)?.parent;
    }
    if (cursor && seen.has(cursor)) {
      // cursor está en el recorrido → todos los vistos son parte del ciclo.
      for (const v of seen) cycleMembers.add(v);
    }
  }
  // Recolectar todos los nodos cuyo parent apunta a un id inexistente.
  const orphanParents = new Set<string>();
  for (const g of groups) {
    if (g.parent && !byId.has(g.parent)) orphanParents.add(g.id);
  }
  // Aplicar limpieza.
  return groups.map((g) => {
    if (cycleMembers.has(g.id) || orphanParents.has(g.id)) {
      const fixed: DiagramGroup = { id: g.id, name: g.name };
      if (g.hue != null) fixed.hue = g.hue;
      return fixed;
    }
    return g;
  });
}

/** payload → spec normalizada, o null si no hay entidades. */
export function erSpecFromPayload(payload: unknown): ErSpec | null {
  const p = asRecord(payload);
  const src = asRecord(p.erDiagram ?? p.er ?? p);
  const rawEntities = src.entities;
  if (!Array.isArray(rawEntities) || !rawEntities.length) return null;

  const entities: ErSpecEntity[] = rawEntities.map((e, i) => readEntity(e, i));
  const known = new Set(entities.map((e) => e.id));
  // Descarta relaciones colgantes: una relación a un id inexistente rompería el layout.
  const relations: ErSpecRelation[] = (Array.isArray(src.relations) ? src.relations : [])
    .map((r, i) => readRelation(r, i))
    .filter((r) => known.has(r.from) && known.has(r.to));

  const dir = String(src.direction ?? 'LR').toUpperCase();
  // Ratio guía (ancho/alto) al que el empaquetado intenta acercarse. No es una
  // restricción: si el contenido no da, se queda en el reparto más próximo.
  const ratio = Number(src.ratio ?? src.aspectRatio);
  // meta opcional con campos archify-style (animation, locale, etc.).
  let meta: ErSpec['meta'] = undefined;
  if (p.meta && typeof p.meta === 'object') {
    const m = p.meta;
    const built: NonNullable<ErSpec['meta']> = {};
    if (typeof m.title === 'string') built.title = m.title;
    if (typeof m.subtitle === 'string') built.subtitle = m.subtitle;
    if (m.animation === 'trace' || m.animation === 'none') built.animation = m.animation;
    if (m.locale === 'en' || m.locale === 'zh-CN') built.locale = m.locale;
    if (Object.keys(built).length) meta = built;
  }
  const direction = DIRECTIONS.has(dir as 'TB' | 'BT' | 'LR' | 'RL') ? (dir as 'TB' | 'BT' | 'LR' | 'RL') : 'LR';
  const out: ErSpec = {
    title: String(src.title ?? p.title ?? meta?.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? meta?.subtitle ?? '') || undefined,
    direction,
    ratio: Number.isFinite(ratio) && ratio > 0 ? ratio : DEFAULT_RATIO,
    groups: readGroups(src),
    entities,
    relations,
  };
  if (meta) out.meta = meta;
  const routing = readRoutingOverride(src.layout);
  if (routing) out.routing = routing as ErSpec['routing'];
  const lay = asRecord(src.layout);
  if (lay.consolidate !== undefined) out.consolidate = lay.consolidate as ErSpec['consolidate'];
  return out;
}

export function resolveErSpec(payload: unknown): ErSpec | null {
  return erSpecFromPayload(payload);
}

/* ───────────────────────── tamaño de caja ───────────────────────── */

function entityWidth(entity: ErSpecEntity): number {
  const chars = (text: string) => stripIconTokensPlain(text).length + countIconTokens(text) * 2;
  let maxChars = chars(entity.name) + 4;
  for (const a of entity.attributes) {
    const keyW = a.key ? 3 : 0;
    maxChars = Math.max(maxChars, keyW + chars(a.name) + 2 + (a.type?.length ?? 0));
  }
  const est = Math.ceil(maxChars * 6.4) + PAD_X * 2;
  return snapDiagramGrid(Math.min(MAX_W, Math.max(MIN_W, est)));
}

function entityHeight(entity: ErSpecEntity): number {
  const rows = entity.attributes.length;
  return snapDiagramGrid(HEADER_H + rows * ROW_H + 6);
}

/* ───────────────────────── cardinalidad (pata de gallo) ───────────────────────── */

/** Geometría local de la marca de cardinalidad; el anclaje queda en (0,0)
 * (sobre el borde de la caja) y "afuera" (hacia la otra entidad, siguiendo
 * la línea) es siempre -x local; se rota según el lado de entrada.
 * Pata de gallo (many): el abanico (3 puntas) va PEGADO al nodo — abre
 * justo en el anclaje — y converge en un solo punto hacia afuera. Con las
 * puntas en -x y el punto de unión en 0,0 quedaba invertido (parecía una
 * flecha "->" entrando al nodo en vez de una pata de gallo "-<" saliendo). */
function markGeometry(card: ErCardinality): { path: string; circle: { cx: number; cy: number; r: number } | null } {
  switch (card) {
    case 'one':
      return { path: 'M-9,-6 L-9,6', circle: null };
    case 'zeroOrOne':
      return { path: 'M-9,-6 L-9,6', circle: { cx: -17, cy: 0, r: 5 } };
    // Abanico ancho y largo: con ±7 sobre 13px la figura se leía como una
    // punta de flecha maciza ("->") en vez de una pata de gallo ("-<").
    case 'zeroOrMany':
      return { path: 'M0,-9 L-16,0 M0,0 L-16,0 M0,9 L-16,0', circle: { cx: -24, cy: 0, r: 5 } };
    case 'many':
    default:
      return { path: 'M0,-9 L-16,0 M0,0 L-16,0 M0,9 L-16,0', circle: null };
  }
}

/** Marca de cardinalidad en un extremo de relación, lista para pintar con un `transform`. */
function cardinalityMark(anchor: { x: number; y: number }, side: BoxSide, card: ErCardinality): { x: number; y: number; angle: number; path: string; circle?: { cx: number; cy: number; r: number } } {
  const angle = side === 'top' ? 90 : side === 'bottom' ? 270 : side === 'left' ? 0 : 180;
  const g = markGeometry(card);
  const out: { x: number; y: number; angle: number; path: string; circle?: { cx: number; cy: number; r: number } } = {
    x: anchor.x, y: anchor.y, angle, path: g.path,
  };
  if (g.circle) out.circle = g.circle;
  return out;
}

/* ───────────────────────── layout ───────────────────────── */

const MARGIN = { top: 16, right: 20, bottom: 20, left: 20 };

/**
 * Reparte las entidades en clústeres: uno por grupo declarado, más uno suelto
 * (sin cajón) con las que no declaran `group`. Cada cluster lleva su
 * `parentId` y `depth` para que el layout pueda dibujarlos anidados.
 */
function buildClusters(spec: ErSpec): ClusterRaw[] {
  const porGrupo = new Map<string, ClusterRaw>();
  // Profundidad por id: se propaga desde los roots (depth=0) hasta los
  // hijos siguiendo `parent`. Un hijo nunca puede tener depth > la del
  // padre + 1; en caso contrario, se considera huérfano (el padre podría
  // no existir — ya se limpió en `normalizeGroupParents`, pero nos
  // curamos en salud).
  const depthById = new Map<string, number>();
  const byId = new Map<string, DiagramGroup>();
  for (const g of spec.groups ?? []) byId.set(g.id, g);
  function depthOf(id: string): number {
    const cached = depthById.get(id);
    if (cached !== undefined) return cached;
    const g = byId.get(id);
    if (!g?.parent) { depthById.set(id, 0); return 0; }
    const parentDepth = byId.has(g.parent) ? depthOf(g.parent) : -1;
    const d = parentDepth >= 0 ? parentDepth + 1 : 0;
    depthById.set(id, d);
    return d;
  }
  for (const g of spec.groups ?? []) {
    const depth = depthOf(g.id);
    porGrupo.set(g.id, {
      id: g.id, name: g.name, hue: g.hue, ids: [], boxed: true,
      parentId: depth > 0 ? g.parent : undefined,
      depth,
    });
  }
  const sueltas: string[] = [];
  for (const e of spec.entities) {
    if (e.group && porGrupo.has(e.group)) porGrupo.get(e.group)!.ids.push(e.id);
    else sueltas.push(e.id);
  }
  // Se conserva todo cajón con entidades propias o en algún descendiente
  // (un grupo que solo contiene subgrupos —p.ej. «PatyIA»— también se dibuja).
  const conContenido = (id: string, guard = 0): boolean => {
    if ((porGrupo.get(id)?.ids.length ?? 0) > 0) return true;
    if (guard > 16) return false;
    return [...porGrupo.values()].some((c) => c.parentId === id && conContenido(c.id!, guard + 1));
  };
  const out: ClusterRaw[] = [...porGrupo.values()].filter((c) => conContenido(c.id!));
  if (sueltas.length) out.push({ id: null, name: '', hue: undefined, ids: sueltas, boxed: false, depth: 0 });
  return out;
}

/**
 * Empaqueta cajas en filas (shelf) probando cada número de columnas y se queda
 * con el reparto cuyo ratio ancho/alto quede más cerca del ratio guía. El ratio
 * es una preferencia, no una restricción: nunca deforma ni recorta una caja.
 */
function packShelves(
  cajas: Array<{ key: number; w: number; h: number }>,
  ratioGuia: number,
  gap: number,
): { score: number; pos: Map<number, { x: number; y: number }>; width: number; height: number } {
  let mejor: { score: number; pos: Map<number, { x: number; y: number }>; width: number; height: number } | null = null;
  for (let cols = 1; cols <= cajas.length; cols++) {
    const filas: Array<Array<{ key: number; w: number; h: number }>> = [];
    for (let i = 0; i < cajas.length; i += cols) filas.push(cajas.slice(i, i + cols));
    let ancho = 0;
    let alto = 0;
    const pos = new Map<number, { x: number; y: number }>();
    for (const fila of filas) {
      let x = 0;
      const filaAlto = Math.max(...fila.map((c) => c.h));
      for (const c of fila) {
        pos.set(c.key, { x, y: alto });
        x += c.w + gap;
      }
      ancho = Math.max(ancho, x - gap);
      alto += filaAlto + gap;
    }
    alto = Math.max(0, alto - gap);
    const ratio = alto > 0 ? ancho / alto : ratioGuia;
    // Distancia en escala logarítmica: penaliza igual quedarse el doble de
    // ancho que el doble de alto (en escala lineal el lado ancho pesaba más).
    const score = Math.abs(Math.log(ratio / ratioGuia));
    if (!mejor || score < mejor.score) mejor = { score, pos, width: ancho, height: alto };
  }
  return mejor ?? { score: 0, pos: new Map(), width: 0, height: 0 };
}

/**
 * Reparte cajas en filas centradas. Prueba permutaciones (≤ 6 cajas) × cortes
 * de fila y puntúa: desviación del ratio + espacio muerto + largo de los
 * enlaces entre cajas (centro a centro, normalizado al tamaño del lienzo).
 */
function arrangeRows(
  cajas: ReadonlyArray<{ key: number; w: number; h: number }>,
  links: ReadonlyArray<[number, number]>,
  ratioGuia: number,
  gap: number,
): { pos: Map<number, { x: number; y: number }>; width: number; height: number } {
  const n = cajas.length;
  if (!n) return { pos: new Map(), width: 0, height: 0 };
  const ordenes = n <= 6 ? permutaciones(cajas.map((_, i) => i)) : [cajas.map((_, i) => i)];
  const area = cajas.reduce((s, c) => s + c.w * c.h, 0);
  let mejor: { score: number; pos: Map<number, { x: number; y: number }>; width: number; height: number } | null = null;
  for (const orden of ordenes) {
    for (let mask = 0; mask < 1 << (n - 1); mask++) {
      const filas: number[][] = [[]];
      orden.forEach((i, k) => {
        filas[filas.length - 1]!.push(i);
        if (k < n - 1 && mask & (1 << k)) filas.push([]);
      });
      const anchos = filas.map((f) => f.reduce((s, i) => s + cajas[i]!.w, 0) + gap * (f.length - 1));
      const altos = filas.map((f) => Math.max(...f.map((i) => cajas[i]!.h)));
      const W = Math.max(...anchos);
      const H = altos.reduce((s, h) => s + h, 0) + gap * (filas.length - 1);
      const pos = new Map<number, { x: number; y: number }>();
      let y = 0;
      filas.forEach((f, r) => {
        let x = (W - anchos[r]!) / 2;
        for (const i of f) {
          const c = cajas[i]!;
          pos.set(c.key, { x: snapDiagramGrid(x), y: snapDiagramGrid(y + (altos[r]! - c.h) / 2) });
          x += c.w + gap;
        }
        y += altos[r]! + gap;
      });
      let dist = 0;
      for (const [a, b] of links) {
        const pa = pos.get(a);
        const pb = pos.get(b);
        const ca = cajas.find((c) => c.key === a);
        const cb = cajas.find((c) => c.key === b);
        if (!pa || !pb || !ca || !cb) continue;
        dist += Math.abs(pa.x + ca.w / 2 - pb.x - cb.w / 2) + Math.abs(pa.y + ca.h / 2 - pb.y - cb.h / 2);
      }
      const score = Math.abs(Math.log(W / Math.max(1, H) / ratioGuia))
        + 2 * (1 - area / (W * H))
        + dist / Math.max(1, (W + H) * Math.max(1, links.length));
      if (!mejor || score < mejor.score) mejor = { score, pos, width: W, height: H };
    }
  }
  return mejor!;
}

/** Permutaciones de un array corto (se usa solo con pocos clústeres). */
function permutaciones<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const resto = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutaciones(resto)) out.push([arr[i]!, ...p]);
  }
  return out;
}

/**
 * spec → geometría lista para pintar.
 */
/**
 * Tablas sin ninguna relación: dentro de su grupo se reúnen en un cajón
 * anidado (sin título; lo identifica el icono ER_ISOLATED_ICON) para que
 * aparezcan siempre juntas y se reconozcan de un vistazo. Solo si el grupo tiene también tablas con
 * relaciones (si todas están sueltas, el cajón propio ya las agrupa).
 */
function withIsolatedGroups(spec: ErSpec): ErSpec {
  const linked = new Set<string>();
  for (const r of spec.relations) { linked.add(r.from); linked.add(r.to); }
  const groups = [...(spec.groups ?? [])];
  const entities = spec.entities.map((e) => ({ ...e }));
  for (const g of spec.groups ?? []) {
    const own = entities.filter((e) => e.group === g.id);
    const isolated = own.filter((e) => !linked.has(e.id));
    if (!isolated.length || isolated.length === own.length) continue;
    const id = `${g.id}${ER_ISOLATED_SUFFIX}`;
    groups.push({ id, name: '', hue: g.hue, parent: g.id, icon: ER_ISOLATED_ICON } as DiagramGroup);
    for (const e of isolated) e.group = id;
  }
  return groups.length === (spec.groups ?? []).length ? spec : { ...spec, groups, entities };
}

export function computeErLayout(specIn: ErSpec): ErLayout {
  const spec = withIsolatedGroups(specIn);
  const title = spec.title ?? '';
  const subtitle = spec.subtitle ?? '';
  const hasHeader = !!(title || subtitle);
  const estWrapW = Math.max(
    240,
    ...spec.entities.map((e) => entityWidth(e)),
    ...(spec.groups ?? []).map((g) => String(g.name ?? '').length * 7 + 40),
  );
  const titleLinesEst = title ? wrapLabel(title, estWrapW - MARGIN.left - MARGIN.right, 13, 3) : [];
  const subtitleLinesEst = subtitle ? wrapLabel(subtitle, estWrapW - MARGIN.left - MARGIN.right, 11, 2) : [];
  const titleY = titleLinesEst.length ? 18 : 14;
  const subtitleY = subtitle
    ? titleY + titleLinesEst.length * 16 + 4
    : (title ? 40 : 24);
  // Igual que en block-spec: fuera de la rejilla de 8 los anclajes quedan
  // descuadrados y el A* devuelve tramos en diagonal.
  const headerH = snapDiagramGrid(
    (titleLinesEst.length ? 8 + titleLinesEst.length * 16 : 0)
    + (subtitleLinesEst.length ? 6 + subtitleLinesEst.length * 14 : 0)
    || (hasHeader ? (subtitle ? 54 : 36) : 0),
  );

  const sizeById = new Map(spec.entities.map((e) => [e.id, { id: e.id, w: entityWidth(e), h: entityHeight(e) }] as const));
  const specById = new Map(spec.entities.map((e) => [e.id, e] as const));
  const groupHue = new Map((spec.groups ?? []).map((g) => [g.id, g.hue] as const));

  const clusters = buildClusters(spec);
  const clusterDe = new Map<string, number>();
  clusters.forEach((c, i) => { for (const id of c.ids) clusterDe.set(id, i); });

  // Mapa parentId -> indices de clusters hijos (vive en este módulo, no en
  // types, porque es transitorio del layout).
  const childrenByParent = new Map<string | null, number[]>();
  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i]!;
    const key = c.parentId ?? null;
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key)!.push(i);
  }

  // Cada clúster se resuelve como un diagrama independiente: las relaciones que
  // cruzan de un cajón a otro no participan del capado, así que no arrastran
  // entidades fuera de su grupo ni deforman el orden interno.
  const ratioGuia = spec.ratio ?? DEFAULT_RATIO;
  const cajas: ClusterBox[] = clusters.map((c, i) => {
    const propias = new Set(c.ids);
    const interno = spec.relations.filter((r) => propias.has(r.from) && propias.has(r.to));
    // Las entidades sin ninguna relación dentro del cajón no tienen capa que las
    // ordene: el motor de capas las apila todas en la capa 0 y el cajón sale como
    // una tira vertical. Se resuelven aparte, empaquetadas en rejilla por ratio.
    const conectadas = new Set<string>();
    for (const r of interno) { conectadas.add(r.from); conectadas.add(r.to); }
    const sueltas = c.ids.filter((id) => !conectadas.has(id));
    const enGrafo = c.ids.filter((id) => conectadas.has(id));

    interface SubLayout { nodes: Array<{ id: string; x: number; y: number; w: number; h: number; layer: number; order: number }>; width: number; height: number; }
    const sub: SubLayout = enGrafo.length
      ? layoutNodeLink(enGrafo.map((id) => sizeById.get(id)!), interno, {
        direction: spec.direction,
        // Separación holgada: con 120/56 las cajas grandes (muchos atributos) se
        // solapaban con sus vecinas de la misma capa.
        layerGap: 150,
        nodeGap: 84,
      }) as SubLayout
      : { nodes: [], width: 0, height: 0 };

    if (sueltas.length) {
      // Clave = índice (antes Number(id) || id.length: ids del mismo largo
      // colisionaban y todas las sueltas caían en la misma celda).
      const rejilla = packShelves(
        sueltas.map((id, k) => ({ ...(sizeById.get(id) as { id: string; w: number; h: number }), key: k })),
        ratioGuia,
        NODE_GAP,
      );
      // La rejilla de sueltas se cuelga debajo del sub-grafo, dentro del mismo cajón.
      const dy = sub.height ? sub.height + NODE_GAP : 0;
      for (const [k, id] of sueltas.entries()) {
        const p = rejilla.pos.get(k);
        const s = sizeById.get(id);
        if (!p || !s) continue;
        sub.nodes.push({ id, x: p.x, y: p.y + dy, w: s.w, h: s.h, layer: 0, order: 0 });
      }
      sub.width = Math.max(sub.width, rejilla.width);
      sub.height = dy + rejilla.height;
    }
    // Bajo el título queda aire para un stub + holgura: las entidades de la
    // primera fila también pueden recibir aristas por arriba.
    // (El cajón de tablas sin relaciones no recibe aristas: solo el icono.)
    const sinAristas = c.id?.endsWith(ER_ISOLATED_SUFFIX);
    const padTop = !c.boxed ? 0 : sinAristas ? CLUSTER_HEADER + 8 : CLUSTER_HEADER + ER_STUB + ER_CLEARANCE;
    const padLado = c.boxed ? CLUSTER_PAD : 0;
    return {
      key: i,
      nodes: sub.nodes,
      padTop,
      padLado,
      w: snapDiagramGrid(sub.width + padLado * 2),
      h: snapDiagramGrid(sub.height + padTop + padLado),
    };
  });

  // Post-proceso: si un cluster es padre de otros, su bbox debe ser al menos
  // tan ancho/alto como la suma de los hijos (más un margen interno). Esto se
  // calcula AQUÍ — antes del pack — para que el shelf-packer del root tenga
  // en cuenta el espacio reservado por los hijos. Sin esto, un outer
  // pequeñito se quedaría sin hueco para los hijos y el layout no podría
  // meterlos dentro.
  //
  // IMPORTANTE: procesamos en orden de PROFUNDIDAD DESCENDENTE — los hijos
  // más profundos primero. Si iteramos por índice, los padres se evalúan con
  // el bbox ORIGINAL de los hijos (entity-only), no con el bbox final que ya
  // incluye a sus propios hijos. En un anidamiento A>B>C, A terminaría de
  // tamaño insuficiente para contener a B+C.
  const depthByIdx = new Map<number, number>();
  for (let i = 0; i < clusters.length; i++) depthByIdx.set(i, clusters[i]!.depth);
  const orderByDepthDesc = [...Array(cajas.length).keys()]
    .filter((i) => clusters[i]!.id != null)
    .sort((a, b) => (depthByIdx.get(b) ?? 0) - (depthByIdx.get(a) ?? 0));
  const childTop = new Map<number, number>();
  for (const i of orderByDepthDesc) {
    const c = clusters[i]!;
    if (c.id == null) continue;
    // Calcula el bbox combinado de los hijos del cluster i.
    const childIndices = childrenByParent.get(c.id) ?? [];
    if (!childIndices.length) continue;
    // Calcula pack local de los hijos para reservar ancho/alto suficiente.
    const childSizes = childIndices.map((j) => ({ key: j, w: cajas[j]!.w, h: cajas[j]!.h }));
    if (!childSizes.length) continue;
    const childPack = arrangeRows(childSizes, [], ratioGuia, CLUSTER_GAP);
    // Reservamos ancho para los hijos + padding lateral a cada lado. El alto
    // del padre debe acomodar cabecera + cluster hijo + padding abajo.
    const childReserveW = childPack.width + CLUSTER_PAD * 2;
    // Los hijos van DEBAJO de las entidades propias del padre (antes se
    // montaban encima de ellas).
    const ownH = cajas[i]!.nodes.length ? Math.max(...cajas[i]!.nodes.map((n) => n.y + n.h)) : 0;
    const top = ownH ? cajas[i]!.padTop + ownH + CLUSTER_PAD * 2 : CLUSTER_PAD + CLUSTER_HEADER;
    childTop.set(i, top);
    cajas[i]!.w = snapDiagramGrid(Math.max(cajas[i]!.w, childReserveW));
    cajas[i]!.h = snapDiagramGrid(Math.max(ownH ? 0 : cajas[i]!.h, top + childPack.height + CLUSTER_PAD));
  }

  // Cajones en filas: se prueban permutaciones × cortes de fila y gana el
  // reparto más compacto (poco espacio muerto), cercano al ratio guía y con
  // las relaciones entre cajones cortas. Filas centradas; cajones centrados
  // en el alto de su fila.
  const cruzadas = spec.relations.filter((r) => clusterDe.get(r.from) !== clusterDe.get(r.to));
  // Solo cajones raíz: los anidados los coloca su padre (si entraban aquí
  // ocupaban un hueco de fila que luego quedaba vacío).
  const raizDe = (i: number): number => {
    let k = i;
    for (let guard = 0; clusters[k]?.parentId && guard < 16; guard++) {
      const pi = clusters.findIndex((c) => c.id === clusters[k]!.parentId);
      if (pi < 0) break;
      k = pi;
    }
    return k;
  };
  const mejorPack = arrangeRows(
    cajas.filter((_, i) => !clusters[i]!.parentId),
    cruzadas.map((r) => [raizDe(clusterDe.get(r.from) ?? -1), raizDe(clusterDe.get(r.to) ?? -1)] as [number, number]),
    spec.ratio ?? DEFAULT_RATIO,
    CLUSTER_GAP,
  );

  const offsetX = MARGIN.left;
  const offsetY = MARGIN.top + headerH;

  const entities: NonNullable<ErLayout['entities']> = [];
  const cajones: NonNullable<ErLayout['clusters']> = [];
  // Mapa de posiciones lockeadas por el autor (archify-style `pos`).
  const locked = new Map<string, { x: number; y: number; w: number | undefined; h: number | undefined }>();
  for (const e of spec.entities ?? []) {
    if (Array.isArray(e.pos) && e.pos.length === 2) {
      locked.set(e.id, {
        x: snapDiagramGrid(e.pos[0]),
        y: snapDiagramGrid(e.pos[1]),
        w: Array.isArray(e.size) ? e.size[0] : undefined,
        h: Array.isArray(e.size) ? e.size[1] : undefined,
      });
    }
  }
  const effPalette = new Map<string, string | undefined>();
  for (const caja of cajas) {
    if (!mejorPack) continue;
    // Anidados: posición provisional; el bloque de anidamiento los mete en su padre.
    const p = mejorPack.pos.get(caja.key) ?? (clusters[caja.key]?.parentId ? { x: 0, y: 0 } : undefined);
    if (!p) continue;
    const cx = offsetX + p.x;
    const cy = offsetY + p.y;
    const c = clusters[caja.key];
    if (!c) continue;
    if (c.boxed) {
      cajones.push({ id: c.id, name: c.name, hue: c.hue, parentId: c.parentId, x: cx, y: cy, w: caja.w, h: caja.h, depth: c.depth });
      const g = (spec.groups ?? []).find((gg) => gg.id === c.id) as (DiagramGroup & { external?: boolean; palette?: string }) | undefined;
      // Otro dominio con pocas tablas → gris neutro (se lee como “de paso”).
      const total = spec.entities.filter((e) => e.group === c.id || (spec.groups ?? []).some((gg) => gg.parent === c.id && gg.id === e.group)).length;
      // Paleta (referencia InSoft / Visual Paradigm): raíz = primary (azul),
      // anidado = secondary (turquesa), otro dominio con < 3 tablas = neutral.
      // Anidado sin paleta propia: alterna con la del padre para contrastar
      // (padre turquesa → hijo azul; si no → turquesa).
      const parentPal = c.parentId ? effPalette.get(c.parentId) : undefined;
      const turquesa = (k?: string): boolean => k === 'secondary' || k?.toUpperCase() === '#00C3C4';
      const palette = g?.palette
        ?? (g?.external && total < 3 ? 'neutral'
          : c.parentId ? (turquesa(parentPal) ? 'primary' : 'secondary') : undefined);
      if (c.id) effPalette.set(c.id, palette);
      if (palette) (cajones[cajones.length - 1] as { palette?: string }).palette = palette;
      const icon = (g as { icon?: string } | undefined)?.icon;
      if (icon) (cajones[cajones.length - 1] as { icon?: string }).icon = icon;
    }
    for (const n of caja.nodes) {
      const s = specById.get(n.id);
      if (!s) continue;
      const lk = locked.get(n.id);
      // Si el autor lockeó la posición, se respeta literalmente (el empaquetado
      // automático solo calcula la posición inicial; después el autor tiene la
      // última palabra — como en archify).
      const ex = lk ? lk.x : snapDiagramGrid(cx + caja.padLado + n.x);
      const ey = lk ? lk.y : snapDiagramGrid(cy + caja.padTop + n.y);
      const ew = lk?.w || n.w;
      const eh = lk?.h || n.h;
      const entity: NonNullable<ErLayout['entities']>[number] = {
        id: n.id,
        x: ex,
        y: ey,
        w: ew,
        h: eh,
        layer: n.layer,
        name: s.name,
        attributes: s.attributes,
        group: s.group,
        // Precedencia de hue: (1) el declarado en la propia entidad;
        // (2) el del grupo al que pertenece; (3) sin color. Asi un JSON con
        // `hue` por entidad sale coloreado aunque no declare groups.
        hue: s.hue ?? (s.group ? groupHue.get(s.group) : undefined),
      };
      if (s.style) entity.style = s.style;
      if (lk) entity.locked = true;
      entities.push(entity);
    }
  }

  // Posicionar clusters anidados: cada cluster con parentId se mete DENTRO
  // del bbox de su padre (con padding). Esto se hace tras el pack porque
  // las posiciones absolutas del padre ya están fijadas.
  if (cajones.length) {
    // Mapa rápido id -> cajón en layout (omite el null suelto).
    const byClusterId = new Map<string, NonNullable<ErLayout['clusters']>[number]>();
    for (const cj of cajones) {
      if (cj.id != null) byClusterId.set(cj.id, cj);
    }
    // Mapa id cluster -> offset (dx, dy) que el cluster hijo debe aplicar a
    // las coordenadas de sus entidades para que sigan al bbox reubicado.
    const childTranslate = new Map<string, { dx: number; dy: number }>();
    // Posiciones originales (antes del anidamiento) — guardadas por si
    // necesitamos re-traducir.
    const oldPos = new Map<string, { x: number; y: number }>();
    for (const cj of cajones) {
      if (cj.id != null) oldPos.set(cj.id, { x: cj.x, y: cj.y });
    }
    // Orden topológico por profundidad ascendente: padres primero.
    const ordered = [...cajones].sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0));
    for (const cj of ordered) {
      if (!cj.parentId) continue;
      const parent = byClusterId.get(cj.parentId);
      if (!parent) continue;
      // Pack interno de los hijos de este parent para obtener posiciones
      // locales (relativas al padre).
      const childIndices = childrenByParent.get(parent.id) ?? [];
      if (!childIndices.length) continue;
      const childPack = arrangeRows(
        childIndices.map((j) => ({ key: j, w: cajas[j]!.w, h: cajas[j]!.h })),
        [], ratioGuia, CLUSTER_GAP,
      );
      const childIndex = clusters.findIndex((c) => c.id === cj.id);
      if (childIndex < 0) continue;
      const localPos = childPack.pos.get(childIndex);
      if (!localPos) continue;
      // Padding entre el borde del padre y el cluster hijo. Reservamos la
      // cabecera (header) del padre en el TOP — el resto del espacio está
      // disponible para los hijos.
      const nestPad = CLUSTER_PAD;
      const parentIdx = clusters.findIndex((c) => c.id === parent.id);
      const headerReserve = childTop.get(parentIdx)
        ?? ((parent.depth ?? 0) === 0 ? (CLUSTER_PAD + CLUSTER_HEADER) : nestPad);
      const innerX = parent.x + nestPad;
      const innerY = parent.y + headerReserve;
      const innerW = Math.max(parent.w - nestPad * 2, 0);
      const innerH = Math.max(parent.h - headerReserve - nestPad, 0);
      // Bloque de hijos centrado en el ancho del padre.
      const desiredX = innerX + Math.max(0, (innerW - childPack.width) / 2) + localPos.x;
      const desiredY = innerY + localPos.y;
      // Clamp al interior del padre: si el hijo no cabe, lo pegamos al borde
      // y listo (caso degenerado de un JSON muy estrecho — preferible a un
      // NaN o a salirse del lienzo).
      const x = innerW >= cj.w
        ? Math.max(innerX, Math.min(desiredX, innerX + innerW - cj.w))
        : innerX;
      const y = innerH >= cj.h
        ? Math.max(innerY, Math.min(desiredY, innerY + innerH - cj.h))
        : innerY;
      const old = oldPos.get(cj.id!) ?? { x: 0, y: 0 };
      const newX = snapDiagramGrid(x);
      const newY = snapDiagramGrid(y);
      cj.x = newX;
      cj.y = newY;
      // Las entidades del cluster hijo se habían colocado respecto a `old`;
      // las desplazamos por (newX-old.x, newY-old.y).
      childTranslate.set(cj.id!, { dx: newX - old.x, dy: newY - old.y });
    }
    // Re-traducir entidades de clusters hijos.
    if (childTranslate.size) {
      for (const ent of entities) {
        if (!ent.group) continue;
        const t = childTranslate.get(ent.group);
        if (!t) continue;
        ent.x = snapDiagramGrid(ent.x + t.dx);
        ent.y = snapDiagramGrid(ent.y + t.dy);
      }
    }
  }
  // Si una entidad lockeada se sale del viewBox que el empaquetado calculó,
  // hay que expandir el lienzo. archify hace lo mismo: el viewBox abraza
  // a las cajas, no al revés.
  let lockedMaxX = 0;
  let lockedMaxY = 0;
  for (const e of entities) {
    lockedMaxX = Math.max(lockedMaxX, e.x + e.w);
    lockedMaxY = Math.max(lockedMaxY, e.y + e.h);
  }

  // Leyenda solo si los grupos no se ven como cajones con título (si no,
  // duplica la información y reserva una franja vacía a la derecha).
  const legendGroups = spec.groups?.length && !cajones.length ? spec.groups : undefined;
  const LEGEND_GUTTER = 16;
  const legendW = legendGroups
    ? Math.max(...legendGroups.map((g) => Math.ceil(g.name.length * 6) + 24)) + 8
    : 0;

  // El viewBox abraza a las cajas (incluso a las lockeadas que el empaquetado
  // ignoró). Bug histórico: lockedMax{X,Y} se calculaban pero no se usaban,
  // lo que recortaba entidades que el usuario posicionó fuera del rectángulo
  // de packing (cubierto por er-stagehand.test.mjs).
  const baseW = (mejorPack?.width ?? 0) + offsetX + MARGIN.right;
  const minRight = Math.max(baseW, lockedMaxX + MARGIN.right);
  const contentW = legendGroups
    ? Math.max(minRight + LEGEND_GUTTER + legendW, 160)
    : Math.max(minRight, 160);
  let width = contentW;
  const legendX = legendGroups ? contentW + LEGEND_GUTTER : 0;
  const legendY = MARGIN.top + (subtitle ? 34 : title ? 22 : 0);
  const baseHeight = (mejorPack?.height ?? 0) + offsetY + MARGIN.bottom;
  const minBottom = Math.max(baseHeight, lockedMaxY + MARGIN.bottom);
  let height = legendGroups
    ? Math.max(minBottom, legendY + legendGroups.length * 16 + 24)
    : minBottom;
  const titleMaxW = Math.max(80, width - MARGIN.left - MARGIN.right - (legendGroups ? legendW + LEGEND_GUTTER : 0));
  const titleLines = title ? wrapLabel(title, titleMaxW, 13, 3) : [];
  const subtitleLines = subtitle ? wrapLabel(subtitle, titleMaxW, 11, 2) : [];

  // ── Ruteo de relaciones: mismo sistema que el diagrama de componentes ──
  // Puertos repartidos por el perímetro (planPorts), grilla con zonas
  // prohibidas, costos aditivos y negociación (routeEdges). Solo cambia el
  // glifo del extremo: aquí, la marca de cardinalidad (pata de gallo).
  const posById = new Map(entities.map((e) => [e.id, e] as const));
  const portBoxes = entities.map((e) => ({ id: e.id, x: e.x, y: e.y, w: e.w, h: e.h }));
  const titleBoxes: Caja[] = [
    ...cajones.map((c) => ({ x: c.x, y: c.y, w: Math.min(c.w, String(c.name ?? '').length * 7 + 28 + ((c as { icon?: string }).icon ? 20 : 0)), h: CLUSTER_HEADER })),
    ...(legendGroups ? [{ x: legendX - 8, y: 0, w: legendW + 16, h: legendGroups.length * 16 + 40 }] : []),
  ];
  const plans = planPorts(portBoxes, spec.relations.map((r) => ({
    from: r.from,
    to: r.to,
    fromSide: r.fromSide && r.fromSide !== 'auto' ? r.fromSide as Lado : undefined,
    toSide: r.toSide && r.toSide !== 'auto' ? r.toSide as Lado : undefined,
  })), {
    pitch: ER_LANE_PITCH,
    room: ER_STUB * 2 + ER_CLEARANCE,
    obstacles: titleBoxes,
    obstacleRoom: ER_STUB + ER_CLEARANCE,
  });
  const sides = plans.map((p) => (p ? { fromSide: p.fromSide as BoxSide, toSide: p.toSide as BoxSide } : null));
  const anchorAt = (i: number, end: 'from' | 'to'): Punto => plans[i]![end];

  const routerWorld: RouterWorld = {
    components: entities.map((e) => ({ id: e.id, x: e.x, y: e.y, w: e.w, h: e.h })),
    packages: cajones.filter((c) => c.id != null).map((c) => ({ id: String(c.id), x: c.x, y: c.y, w: c.w, h: c.h })),
    titles: titleBoxes,
    rings: [],
  };
  const routerIdx: number[] = [];
  const routerEdges: RouterEdge[] = [];
  spec.relations.forEach((r, i) => {
    const sd = sides[i];
    const from = posById.get(r.from);
    const to = posById.get(r.to);
    const route = r.route ?? 'orthogonal';
    if (!sd || !from || !to || route === 'straight' || route === 'orthogonal-h' || route === 'orthogonal-v') return;
    if (Array.isArray(r.via) && r.via.length) return;
    routerIdx.push(i);
    routerEdges.push({
      id: r.id ?? `r${i}`,
      from: anchorAt(i, 'from'),
      fromSide: sd.fromSide as Lado,
      to: anchorAt(i, 'to'),
      toSide: sd.toSide as Lado,
      fromBox: routerWorld.components.find((c) => c.id === r.from)!,
      toBox: routerWorld.components.find((c) => c.id === r.to)!,
      fromPkgs: new Set(from.group ? [from.group] : []),
      toPkgs: new Set(to.group ? [to.group] : []),
    });
  });
  const routed = routeEdges(routerWorld, routerEdges, {
    clearance: ER_CLEARANCE,
    stub: ER_STUB,
    lanePitch: ER_LANE_PITCH,
    laneNearFactor: 48,
    pkgBorderClearance: ER_BORDER_KEEP,
    pkgBorderNearFactor: 6,
    pkgCrossFactor: 2,
    // Mismo campo de costos que componentes y clases (y su `layout.routing`).
    ...(spec.routing ? { costs: spec.routing } : {}),
    ...(spec.consolidate !== undefined ? { consolidate: spec.consolidate } : {}),
  });
  const routedPts = new Map<number, Punto[] | null>();
  routerIdx.forEach((ri, k) => routedPts.set(ri, routed.paths[k] ?? null));

  // Lienzo: abraza cajones, entidades y rieles con margen uniforme; el grupo
  // queda centrado bajo el título (que se pinta en W/2).
  const FIT_MARGIN = 32;
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const hit = (x: number, y: number): void => {
    box.x0 = Math.min(box.x0, x); box.y0 = Math.min(box.y0, y);
    box.x1 = Math.max(box.x1, x); box.y1 = Math.max(box.y1, y);
  };
  for (const c of [...cajones, ...entities]) { hit(c.x, c.y); hit(c.x + c.w, c.y + c.h); }
  for (const pts of routedPts.values()) for (const p of pts ?? []) hit(p.x, p.y);
  const shiftX = Number.isFinite(box.x0) ? FIT_MARGIN - box.x0 : 0;
  const shiftY = Number.isFinite(box.y0) ? MARGIN.top + headerH - box.y0 : 0;
  if (Number.isFinite(box.x0) && !legendGroups) {
    width = Math.max(160, box.x1 - box.x0 + FIT_MARGIN * 2);
    height = box.y1 - box.y0 + MARGIN.top + headerH + FIT_MARGIN;
    for (const c of [...cajones, ...entities]) { c.x += shiftX; c.y += shiftY; }
    for (const [k, pts] of routedPts) routedPts.set(k, pts?.map((p) => ({ x: p.x + shiftX, y: p.y + shiftY })) ?? null);
    plans.forEach((p) => {
      if (!p) return;
      p.from = { x: p.from.x + shiftX, y: p.from.y + shiftY };
      p.to = { x: p.to.x + shiftX, y: p.to.y + shiftY };
    });
  }

  const ruteadas: Array<NonNullable<ErLayout['relations']>[number] | undefined> = new Array(spec.relations.length);
  spec.relations.forEach((r, i) => {
    const sd = sides[i];
    const from = posById.get(r.from);
    const to = posById.get(r.to);
    if (!sd || !from || !to) return;
    const { fromSide, toSide } = sd;
    const a = anchorAt(i, 'from');
    const b = anchorAt(i, 'to');
    const route: ErRouteKind = r.route ?? 'orthogonal';
    let pts: Punto[];
    if (route === 'straight') pts = [a, b];
    else if (route === 'orthogonal-h') pts = simplifyOrthoPath([a, { x: (a.x + b.x) / 2, y: a.y }, { x: (a.x + b.x) / 2, y: b.y }, b]);
    else if (route === 'orthogonal-v') pts = simplifyOrthoPath([a, { x: a.x, y: (a.y + b.y) / 2 }, { x: b.x, y: (a.y + b.y) / 2 }, b]);
    else if (Array.isArray(r.via) && r.via.length) {
      // Waypoints del autor (archify): unión ortogonal en L entre ellos.
      const raw = [a, stepOut(a, fromSide, ER_STUB), ...r.via.map(([x, y]) => ({ x, y })), stepOut(b, toSide, ER_STUB), b];
      const l: Punto[] = [raw[0]!];
      for (let k = 1; k < raw.length; k++) {
        const p = l[l.length - 1]!;
        const q = raw[k]!;
        if (Math.abs(p.x - q.x) > 0.5 && Math.abs(p.y - q.y) > 0.5) l.push({ x: q.x, y: p.y });
        l.push(q);
      }
      pts = simplifyOrthoPath(l);
    } else {
      pts = routedPts.get(i) ?? simplifyOrthoPath([a, { x: b.x, y: a.y }, b]);
    }
    // Etiqueta en el centro del tramo más largo (lejos de las marcas).
    let mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    let best = -1;
    for (let k = 1; k < pts.length; k++) {
      const len = Math.abs(pts[k]!.x - pts[k - 1]!.x) + Math.abs(pts[k]!.y - pts[k - 1]!.y);
      if (len > best) {
        best = len;
        mid = { x: (pts[k]!.x + pts[k - 1]!.x) / 2, y: (pts[k]!.y + pts[k - 1]!.y) / 2 };
      }
    }
    if (Array.isArray(r.labelAt) && r.labelAt.length === 2) mid = { x: r.labelAt[0], y: r.labelAt[1] };
    const edge: NonNullable<ErLayout['relations']>[number] = {
      id: r.id ?? `r${i}`,
      from: r.from,
      to: r.to,
      label: r.label,
      hue: from.hue === to.hue ? from.hue : 200,
      identifying: r.identifying,
      path: pointsToPath(pts),
      fromMark: cardinalityMark(a, fromSide, r.fromCard),
      toMark: cardinalityMark(b, toSide, r.toCard),
      labelX: mid.x,
      labelY: mid.y,
      route,
      fromSide,
      toSide,
    };
    if (r.dashStyle) edge.dashStyle = r.dashStyle;
    if (r.variant) edge.variant = r.variant;
    if (sentidoFlujoEr(r.fromCard, r.toCard) !== !!r.reverse) edge.reverse = true;
    if (typeof r.width === 'number') edge.width = r.width;
    if (r.style) edge.style = r.style;
    ruteadas[i] = edge;
  });
  const routeViolations = routerIdx
    .map((ri, k) => ({ id: spec.relations[ri]!.id ?? `r${ri}`, rules: routed.violations[k]! }))
    .filter((v) => v.rules.length);
  const relations: NonNullable<ErLayout['relations']> = (assignEdgeHues(ruteadas as unknown as Parameters<typeof assignEdgeHues>[0]) as unknown as NonNullable<ErLayout['relations']>)
    .filter((e): e is NonNullable<ErLayout['relations']>[number] => e !== undefined);

  const layout: ErLayout = {
    width,
    height,
    entities,
    relations,
    clusters: cajones,
    ratio: height > 0 ? width / height : undefined,
    groups: legendGroups,
    title: title || undefined,
    subtitle: subtitle || undefined,
    titleY,
    subtitleY,
    titleLines: titleLines.length ? titleLines : undefined,
    subtitleLines: subtitleLines.length ? subtitleLines : undefined,
    legendX,
    legendY,
  };
  // Diagnóstico (audit del lab): relaciones que violan reglas duras.
  (layout as ErLayout & { _routeViolations?: unknown })._routeViolations = routeViolations;
  applyEdgeActorLayout(layout, entities.map((e) => ({ x: e.x, y: e.y, w: e.w, h: e.h })));
  return layout;
}

/** Desplaza un punto hacia afuera de la entidad, en la dirección de su lado. */
function stepOut(p: { x: number; y: number }, side: BoxSide, d: number): { x: number; y: number } {
  if (side === 'top') return { x: p.x, y: p.y - d };
  if (side === 'bottom') return { x: p.x, y: p.y + d };
  if (side === 'left') return { x: p.x - d, y: p.y };
  return { x: p.x + d, y: p.y };
}

/** Contorno SVG de la caja de entidad: rectángulo redondeado. */
export function entityBoxPath(x: number, y: number, w: number, h: number, radius: number): string {
  const r = Number.isFinite(radius) ? Math.min(radius, w / 2, h / 2) : 8;
  return `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`;
}

export const ER_HEADER_H = HEADER_H;
export const ER_ROW_H = ROW_H;

/**
 * Iconos que representan los marcadores PK/FK en el cuerpo de cada entidad.
 * Antes se emitían como `<text>PK</text>` / `<text>FK</text>` (texto monoespaciado
 * bold); ahora son iconos del sistema de iconos del kit (Material Design Icons
 * via Iconify). La elección favorece metáforas de "llave" porque el lector
 * asocia PK=primary key y FK=foreign key con llaves/foráneas.
 *
 * Si en el futuro el autor del JSON quiere sobreescribir el icono por atributo
 * (p.ej. "audit column marker"), basta con añadir `a.key: 'AUDIT'` en
 * `ErSpecAttribute.key` y mapear aquí. Mantener el conjunto cerrado: PK/FK
 * son las dos variantes que el motor entiende hoy.
 */
/** Icono del cajón de tablas sin relaciones (eslabón tachado). */
export const ER_ISOLATED_ICON = 'mdi:link-variant-off';
const ER_ISOLATED_SUFFIX = '__sin_relaciones';

export const ER_KEY_ICON_IDS: Record<string, string> = {
  PK: 'mdi:key-variant',
  FK: 'mdi:key-link',
};

/** Tamaño (px) del icono PK/FK en el cuerpo de la entidad. */
export const ER_KEY_ICON_SIZE = 12;
