import { layoutNodeLink, edgeAnchor, pickSides } from '../_shared/node-link-layout.js';
import { makeCostGrid, blockRect, applyRectCost, snapDiagramGrid, snapPointAwayFromSide} from '../_shared/diagram-grid.js';
import { routeOrthogonal, pixelToGrid, gridPathToSvg, buildOrthogonalPath } from '../_shared/diagram-astar.js';
import { resolveTkHue } from '../_shared/tk-hue.js';
import { applyEdgeActorLayout } from '../_shared/diagram-edge-actors.js';
import { assignEdgeHues } from '../_shared/diagram-edge-style.js';
import { wrapLabel } from './component-spec.js';
import type { DiagramSide } from '../_shared/diagram-grid.js';
import {
  normalizeErPayload as _archifyNormalize,
  pickSidesArchify,
  straightPath,
  orthogonalHPath,
  orthogonalVPath,
} from './er-archify.js';
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
const CLUSTER_GAP = 56;
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
  return raw.map((g, i: number) => {
    const r = asRecord(g);
    return {
      id: String(r.id ?? `grp-${i}`),
      name: String(r.name ?? r.label ?? `Grupo ${i + 1}`),
      hue: resolveTkHue(r, DEFAULT_HUES[i % DEFAULT_HUES.length]),
    };
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
  return out;
}

export function resolveErSpec(payload: unknown): ErSpec | null {
  return erSpecFromPayload(payload);
}

/* ───────────────────────── tamaño de caja ───────────────────────── */

function entityWidth(entity: ErSpecEntity): number {
  let maxChars = entity.name.length + 4;
  for (const a of entity.attributes) {
    const keyW = a.key ? 3 : 0;
    maxChars = Math.max(maxChars, keyW + a.name.length + 2 + (a.type?.length ?? 0));
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

interface ClusterBox {
  key: number;
  nodes: Array<{ id: string; x: number; y: number; w: number; h: number; layer: number; order: number }>;
  padTop: number;
  padLado: number;
  w: number;
  h: number;
}
interface ClusterRaw {
  id: string | null;
  name: string;
  hue: number | undefined;
  ids: string[];
  boxed: boolean;
}

/**
 * Reparte las entidades en clústeres: uno por grupo declarado, más uno suelto
 * (sin cajón) con las que no declaran `group`.
 */
function buildClusters(spec: ErSpec): ClusterRaw[] {
  const porGrupo = new Map<string, ClusterRaw>();
  for (const g of spec.groups ?? []) porGrupo.set(g.id, { id: g.id, name: g.name, hue: g.hue, ids: [], boxed: true });
  const sueltas: string[] = [];
  for (const e of spec.entities) {
    if (e.group && porGrupo.has(e.group)) porGrupo.get(e.group)!.ids.push(e.id);
    else sueltas.push(e.id);
  }
  const out: ClusterRaw[] = [...porGrupo.values()].filter((c) => c.ids.length);
  if (sueltas.length) out.push({ id: null, name: '', hue: undefined, ids: sueltas, boxed: false });
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
export function computeErLayout(spec: ErSpec): ErLayout {
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
      const rejilla = packShelves(
        sueltas.map((id) => ({ ...(sizeById.get(id) as { id: string; w: number; h: number }), key: Number(id) || id.length })),
        ratioGuia,
        NODE_GAP,
      );
      // La rejilla de sueltas se cuelga debajo del sub-grafo, dentro del mismo cajón.
      const dy = sub.height ? sub.height + NODE_GAP : 0;
      for (const id of sueltas) {
        const p = rejilla.pos.get(Number(id) || id.length);
        const s = sizeById.get(id);
        if (!p || !s) continue;
        sub.nodes.push({ id, x: p.x, y: p.y + dy, w: s.w, h: s.h, layer: 0, order: 0 });
      }
      sub.width = Math.max(sub.width, rejilla.width);
      sub.height = dy + rejilla.height;
    }
    const padTop = c.boxed ? CLUSTER_PAD + CLUSTER_HEADER : 0;
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

  // Orden de los cajones: se prueba cada permutación (son pocos) y gana la que
  // deja más cerca los extremos de las relaciones que cruzan entre cajones.
  const cruzadas = spec.relations.filter((r) => clusterDe.get(r.from) !== clusterDe.get(r.to));
  const ordenes = cajas.length <= 5 ? permutaciones(cajas.map((_, i) => i)) : [cajas.map((_, i) => i)];
  let mejorPack: ({ score: number; pos: Map<number, { x: number; y: number }>; width: number; height: number; orden?: number[] }) | null = null;
  for (const orden of ordenes) {
    const pack = packShelves(orden.map((i) => cajas[i]!), spec.ratio ?? DEFAULT_RATIO, CLUSTER_GAP);
    let distancia = 0;
    for (const r of cruzadas) {
      const a = pack.pos.get(clusterDe.get(r.from) ?? -1);
      const b = pack.pos.get(clusterDe.get(r.to) ?? -1);
      if (!a || !b) continue;
      distancia += Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
    // El ratio manda sobre la distancia; la distancia solo desempata.
    const score = pack.score * 10 + distancia / 10_000;
    if (!mejorPack || score < mejorPack.score) mejorPack = { ...pack, score, orden };
  }

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
  for (const caja of cajas) {
    if (!mejorPack) continue;
    const p = mejorPack.pos.get(caja.key);
    if (!p) continue;
    const cx = offsetX + p.x;
    const cy = offsetY + p.y;
    const c = clusters[caja.key];
    if (!c) continue;
    if (c.boxed) cajones.push({ id: c.id, name: c.name, hue: c.hue, x: cx, y: cy, w: caja.w, h: caja.h });
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
  // Si una entidad lockeada se sale del viewBox que el empaquetado calculó,
  // hay que expandir el lienzo. archify hace lo mismo: el viewBox abraza
  // a las cajas, no al revés.
  let lockedMaxX = 0;
  let lockedMaxY = 0;
  for (const e of entities) {
    lockedMaxX = Math.max(lockedMaxX, e.x + e.w);
    lockedMaxY = Math.max(lockedMaxY, e.y + e.h);
  }
  const byId = new Map(entities.map((e) => [e.id, { ...e, layer: e.layer }] as const));

  const legendGroups = spec.groups?.length ? spec.groups : undefined;
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
  const width = contentW;
  const legendX = legendGroups ? contentW + LEGEND_GUTTER : 0;
  const legendY = MARGIN.top + (subtitle ? 34 : title ? 22 : 0);
  const baseHeight = (mejorPack?.height ?? 0) + offsetY + MARGIN.bottom;
  const minBottom = Math.max(baseHeight, lockedMaxY + MARGIN.bottom);
  const height = legendGroups
    ? Math.max(minBottom, legendY + legendGroups.length * 16 + 24)
    : minBottom;
  const titleMaxW = Math.max(80, width - MARGIN.left - MARGIN.right - (legendGroups ? legendW + LEGEND_GUTTER : 0));
  const titleLines = title ? wrapLabel(title, titleMaxW, 13, 3) : [];
  const subtitleLines = subtitle ? wrapLabel(subtitle, titleMaxW, 11, 2) : [];

  // Rejilla de costos: las cajas se bloquean para que el A* las rodee.
  const grid = makeCostGrid(width, height);
  const posById = new Map(entities.map((e) => [e.id, e] as const));
  for (const e of entities) blockRect(grid, e.x - 6, e.y - 6, e.w + 12, e.h + 12);
  if (legendGroups) blockRect(grid, legendX - 8, 0, legendW + 16, legendGroups.length * 16 + 40);
  // La cabecera del cajón es texto: encarecerla evita que una arista la tache.
  for (const c of cajones) applyRectCost(grid, c.x, c.y, c.w, CLUSTER_HEADER + 4, 12, true);
  // Peaje suave dentro de cada cajón: una arista que va de un cajón a otro
  // prefiere rodear por fuera antes que atravesar el territorio ajeno. Suave a
  // propósito — las aristas internas del propio cajón deben seguir pudiendo pasar.
  for (const c of cajones) applyRectCost(grid, c.x, c.y, c.w, c.h, 2, true);

  // Rutear primero lo corto deja los pasillos libres para lo largo, que es lo
  // que de verdad necesita rodeo; al revés, las aristas largas ocupaban el
  // centro y las cortas terminaban cruzándolas.
  const orden = spec.relations
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const pa = posById.get(a.r.from);
      const qa = posById.get(a.r.to);
      const pb = posById.get(b.r.from);
      const qb = posById.get(b.r.to);
      if (!pa || !qa || !pb || !qb) return 0;
      const da = Math.abs(pa.x - qa.x) + Math.abs(pa.y - qa.y);
      const db = Math.abs(pb.x - qb.x) + Math.abs(pb.y - qb.y);
      return da - db;
    });

  const ruteadas: Array<NonNullable<ErLayout['relations']>[number] | undefined> = new Array(spec.relations.length);
  for (const { r, i } of orden) {
    const from = posById.get(r.from);
    const to = posById.get(r.to);
    if (!from || !to) continue;
    // Sides: del archify-style (`fromSide`/`toSide`) si están fijados;
    // si no, heurística según `direction`. `auto` activa pickSidesArchify.
    let fromSide: BoxSide = r.fromSide ?? 'auto';
    let toSide: BoxSide = r.toSide ?? 'auto';
    const fromCx = from.x + from.w / 2;
    const fromCy = from.y + from.h / 2;
    const toCx = to.x + to.w / 2;
    const toCy = to.y + to.h / 2;
    if (fromSide === 'auto') {
      const arch = pickSidesArchify({ cx: fromCx, cy: fromCy }, { cx: toCx, cy: toCy });
      fromSide = arch.fromSide;
    }
    if (toSide === 'auto') {
      const arch = pickSidesArchify({ cx: fromCx, cy: fromCy }, { cx: toCx, cy: toCy });
      toSide = arch.toSide;
    }
    // Fallback al `pickSides` histórico si el autor no fija nada:
    if (fromSide === 'auto') {
      const fallback = byId.get(r.from);
      const fallback2 = byId.get(r.to);
      fromSide = fallback && fallback2 ? pickSides(fallback, fallback2, spec.direction).fromSide as BoxSide : 'right';
    }
    if (toSide === 'auto') {
      const fallback = byId.get(r.from);
      const fallback2 = byId.get(r.to);
      toSide = fallback && fallback2 ? pickSides(fallback, fallback2, spec.direction).toSide as BoxSide : 'left';
    }
    const a = edgeAnchor(from, fromSide === 'auto' ? 'top' : fromSide);
    const b = edgeAnchor(to, toSide === 'auto' ? 'top' : toSide);

    const route: ErRouteKind = r.route ?? 'orthogonal'; // default ISWC: ortogonal
    let path: string;
    let mid: { x: number; y: number }; // {x, y} posición para la etiqueta

    if (route === 'straight') {
      // Línea recta entre los anclas (sin dogleg, sin A*).
      path = straightPath(a, b);
      mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    } else if (route === 'orthogonal-h' || route === 'orthogonal-v') {
      path = route === 'orthogonal-h' ? orthogonalHPath(a, b) : orthogonalVPath(a, b);
      mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    } else {
      // auto / orthogonal — ruta histórica con A*.
      const out = stepOut(a, fromSide, 18);
      const into = stepOut(b, toSide, 18);
      const outSnap = snapPointAwayFromSide(out, fromSide as DiagramSide, grid.grid);
      const intoSnap = snapPointAwayFromSide(into, toSide as DiagramSide, grid.grid);
      const aGrid = pixelToGrid(outSnap.x, outSnap.y, grid.grid);
      const bGrid = pixelToGrid(intoSnap.x, intoSnap.y, grid.grid);
      // Si el autor dio `via` explícitos, los inyectamos como waypoints antes
      // del A*. El primer waypoint reemplaza a aGrid, los intermedios se
      // insertan en la ruta, el último reemplaza a bGrid.
      let points: Array<{ col: number; row: number }>;
      if (Array.isArray(r.via) && r.via.length) {
        const midArr = r.via.map(([vx, vy]) => pixelToGrid(vx, vy, grid.grid));
        // path = [aGrid, ...mid, bGrid]
        const aP = pixelToGrid(a.x, a.y, grid.grid);
        const bP = pixelToGrid(b.x, b.y, grid.grid);
        const rawRoute = [aP, ...midArr, bP];
        // Llamamos a routeOrthogonal por tramos para atravesar los waypoints
        points = [];
        let prev = rawRoute[0]!;
        for (let k = 1; k < rawRoute.length; k++) {
          const seg = routeOrthogonal(prev, rawRoute[k]!, grid);
          if (k === 1) points.push(...seg);
          else points.push(...seg.slice(1));
          prev = rawRoute[k]!;
        }
      } else {
        points = routeOrthogonal(aGrid, bGrid, grid);
      }
      path = buildOrthogonalPath(a, b, aGrid, bGrid, points, grid.grid);
      const midPt = points.length
        ? points[Math.floor(points.length / 2)]!
        : null;
      const crudo = midPt
        ? { x: midPt.col * grid.grid, y: midPt.row * grid.grid }
        : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      mid = crudo;
      if (r.label) applyRectCost(grid, mid.x - 30, mid.y - 9, 60, 18, 6, true);
      for (const pt of points) {
        applyRectCost(grid, pt.col * grid.grid - grid.grid, pt.row * grid.grid - grid.grid, grid.grid * 3, grid.grid * 3, 9, true);
      }
    }

    // Si el autor dio `labelAt` explícito, gana sobre el mid calculado.
    if (Array.isArray(r.labelAt) && r.labelAt.length === 2) {
      mid = { x: r.labelAt[0], y: r.labelAt[1] };
    }

    // holgura para mantener el label dentro del viewBox
    const holgura = (r.label?.length ?? 0) * 2.8 + 12;
    mid = {
      x: Math.min(width - holgura, Math.max(holgura, mid.x)),
      y: Math.min(height - 12, Math.max(offsetY + 10, mid.y)),
    };

    const edge: NonNullable<ErLayout['relations']>[number] = {
      id: r.id ?? `r${i}`,
      from: r.from,
      to: r.to,
      label: r.label,
      hue: from.hue === to.hue ? from.hue : 200,
      identifying: r.identifying,
      path,
      fromMark: cardinalityMark(a, fromSide, r.fromCard),
      toMark: cardinalityMark(b, toSide, r.toCard),
      labelX: mid.x,
      labelY: mid.y,
      // Campos nuevos (consumidos por er-diagram.ts al pintar):
      route,
      fromSide,
      toSide,
    };
    if (r.dashStyle) edge.dashStyle = r.dashStyle;
    if (r.variant) edge.variant = r.variant;
    if (typeof r.width === 'number') edge.width = r.width;
    if (r.style) edge.style = r.style;
    ruteadas[i] = edge;
  }
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
