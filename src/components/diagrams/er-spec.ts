import { layoutNodeLink, edgeAnchor, pickSides } from '../_shared/node-link-layout.js';
import { makeCostGrid, blockRect, applyRectCost, snapDiagramGrid, snapPointAwayFromSide} from '../_shared/diagram-grid.js';
import { routeOrthogonal, pixelToGrid, gridPathToSvg, buildOrthogonalPath } from '../_shared/diagram-astar.js';
import { resolveTkHue } from '../_shared/tk-hue.js';
import { applyEdgeActorLayout } from '../_shared/diagram-edge-actors.js';
import { assignEdgeHues } from '../_shared/diagram-edge-style.js';
import { wrapLabel } from './component-spec.js';

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

const CARDS = new Set(['one', 'many', 'zeroOrOne', 'zeroOrMany']);
const DIRECTIONS = new Set(['TB', 'BT', 'LR', 'RL']);
const DEFAULT_HUES = [210, 239, 160, 38, 280, 199];

/** Ratio guía por defecto (ancho/alto): ligeramente apaisado, cómodo en pantalla. */
const DEFAULT_RATIO = 1.4;
/** Aire dentro del cajón de un grupo y alto de su cabecera. */
const CLUSTER_PAD = 20;
const CLUSTER_HEADER = 26;
/** Separación entre cajones y entre entidades sueltas de un mismo cajón. */
const CLUSTER_GAP = 56;
const NODE_GAP = 84;

function asRecord(v) {
  return v && typeof v === 'object' ? v : {};
}

function readAttribute(raw, i) {
  const r = asRecord(raw);
  return {
    name: String(r.name ?? `attr${i}`),
    type: String(r.type ?? ''),
    key: r.key === 'PK' || r.key === 'FK' ? r.key : undefined,
  };
}

function readEntity(raw, i: number) {
  const r = asRecord(raw);
  const attributes = Array.isArray(r.attributes) ? r.attributes.map(readAttribute) : [];
  return {
    id: String(r.id ?? `e${i}`),
    name: String(r.name ?? r.id ?? `Entidad ${i + 1}`),
    group: String(r.group ?? '') || undefined,
    attributes,
  };
}

function readRelation(raw, i) {
  const r = asRecord(raw);
  return {
    id: String(r.id ?? `r${i}`),
    from: String(r.from ?? r.source ?? ''),
    to: String(r.to ?? r.target ?? ''),
    label: String(r.label ?? '').trim() || undefined,
    fromCard: CARDS.has(r.fromCard) ? r.fromCard : 'one',
    toCard: CARDS.has(r.toCard) ? r.toCard : 'many',
    identifying: r.identifying !== false,
  };
}

function readGroups(src) {
  const raw = src.groups ?? [];
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
export function erSpecFromPayload(payload) {
  const p = asRecord(payload);
  const src = asRecord(p.erDiagram ?? p.er ?? p);
  const rawEntities = src.entities ?? [];
  if (!Array.isArray(rawEntities) || !rawEntities.length) return null;

  const entities = rawEntities.map(readEntity);
  const known = new Set(entities.map((e) => e.id));
  // Descarta relaciones colgantes: una relación a un id inexistente rompería el layout.
  const relations = (Array.isArray(src.relations) ? src.relations : [])
    .map(readRelation)
    .filter((r) => known.has(r.from) && known.has(r.to));

  const dir = String(src.direction ?? 'LR').toUpperCase();
  // Ratio guía (ancho/alto) al que el empaquetado intenta acercarse. No es una
  // restricción: si el contenido no da, se queda en el reparto más próximo.
  const ratio = Number(src.ratio ?? src.aspectRatio);
  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? '') || undefined,
    direction: DIRECTIONS.has(dir) ? dir : 'LR',
    ratio: Number.isFinite(ratio) && ratio > 0 ? ratio : DEFAULT_RATIO,
    groups: readGroups(src),
    entities,
    relations,
  };
}

export function resolveErSpec(payload) {
  return erSpecFromPayload(payload);
}

/* ───────────────────────── tamaño de caja ───────────────────────── */

function entityWidth(entity) {
  let maxChars = entity.name.length + 4;
  for (const a of entity.attributes) {
    const keyW = a.key ? 3 : 0;
    maxChars = Math.max(maxChars, keyW + a.name.length + 2 + a.type.length);
  }
  const est = Math.ceil(maxChars * 6.4) + PAD_X * 2;
  return snapDiagramGrid(Math.min(MAX_W, Math.max(MIN_W, est)));
}

function entityHeight(entity) {
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
function markGeometry(card) {
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
function cardinalityMark(anchor, side, card) {
  const angle = side === 'top' ? 90 : side === 'bottom' ? 270 : side === 'left' ? 0 : 180;
  return { x: anchor.x, y: anchor.y, angle, ...markGeometry(card) };
}

/* ───────────────────────── layout ───────────────────────── */

const MARGIN = { top: 16, right: 20, bottom: 20, left: 20 };

/**
 * Reparte las entidades en clústeres: uno por grupo declarado, más uno suelto
 * (sin cajón) con las que no declaran `group`.
 */
function buildClusters(spec) {
  const porGrupo = new Map();
  for (const g of spec.groups ?? []) porGrupo.set(g.id, { id: g.id, name: g.name, hue: g.hue, ids: [] });
  const sueltas = [];
  for (const e of spec.entities) {
    if (e.group && porGrupo.has(e.group)) porGrupo.get(e.group).ids.push(e.id);
    else sueltas.push(e.id);
  }
  const out = [...porGrupo.values()].filter((c) => c.ids.length);
  if (sueltas.length) out.push({ id: null, name: '', hue: undefined, ids: sueltas, boxed: false });
  for (const c of out) if (c.boxed === undefined) c.boxed = true;
  return out;
}

/**
 * Empaqueta cajas en filas (shelf) probando cada número de columnas y se queda
 * con el reparto cuyo ratio ancho/alto quede más cerca del ratio guía. El ratio
 * es una preferencia, no una restricción: nunca deforma ni recorta una caja.
 */
function packShelves(cajas, ratioGuia: number, gap: number) {
  let mejor = null;
  for (let cols = 1; cols <= cajas.length; cols++) {
    const filas = [];
    for (let i = 0; i < cajas.length; i += cols) filas.push(cajas.slice(i, i + cols));
    let ancho = 0;
    let alto = 0;
    const pos = new Map();
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
  return mejor ?? { pos: new Map(), width: 0, height: 0 };
}

/** Permutaciones de un array corto (se usa solo con pocos clústeres). */
function permutaciones(arr) {
  if (arr.length <= 1) return [arr];
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const resto = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutaciones(resto)) out.push([arr[i], ...p]);
  }
  return out;
}

/**
 * spec → geometría lista para pintar.
 * @returns {{width:number, height:number, entities:Array, relations:Array, clusters:Array, groups?:Array, title?:string, subtitle?:string, titleLines?:string[], subtitleLines?:string[], titleY:number, subtitleY:number, legendX:number, legendY?:number}}
 */
export function computeErLayout(spec) {
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

  const sizeById = new Map(spec.entities.map((e) => [e.id, { id: e.id, w: entityWidth(e), h: entityHeight(e) }]));
  const specById = new Map(spec.entities.map((e) => [e.id, e]));
  const groupHue = new Map((spec.groups ?? []).map((g) => [g.id, g.hue]));

  const clusters = buildClusters(spec);
  const clusterDe = new Map();
  clusters.forEach((c, i) => { for (const id of c.ids) clusterDe.set(id, i); });

  // Cada clúster se resuelve como un diagrama independiente: las relaciones que
  // cruzan de un cajón a otro no participan del capado, así que no arrastran
  // entidades fuera de su grupo ni deforman el orden interno.
  const ratioGuia = spec.ratio ?? DEFAULT_RATIO;
  const cajas = clusters.map((c, i) => {
    const propias = new Set(c.ids);
    const interno = spec.relations.filter((r) => propias.has(r.from) && propias.has(r.to));
    // Las entidades sin ninguna relación dentro del cajón no tienen capa que las
    // ordene: el motor de capas las apila todas en la capa 0 y el cajón sale como
    // una tira vertical. Se resuelven aparte, empaquetadas en rejilla por ratio.
    const conectadas = new Set();
    for (const r of interno) { conectadas.add(r.from); conectadas.add(r.to); }
    const sueltas = c.ids.filter((id) => !conectadas.has(id));
    const enGrafo = c.ids.filter((id) => conectadas.has(id));

    const sub = enGrafo.length
      ? layoutNodeLink(enGrafo.map((id) => sizeById.get(id)), interno, {
        direction: spec.direction,
        // Separación holgada: con 120/56 las cajas grandes (muchos atributos) se
        // solapaban con sus vecinas de la misma capa.
        layerGap: 150,
        nodeGap: 84,
      })
      : { nodes: [], width: 0, height: 0 };

    if (sueltas.length) {
      const rejilla = packShelves(
        sueltas.map((id) => ({ ...sizeById.get(id), key: id })),
        ratioGuia,
        NODE_GAP,
      );
      // La rejilla de sueltas se cuelga debajo del sub-grafo, dentro del mismo cajón.
      const dy = sub.height ? sub.height + NODE_GAP : 0;
      for (const id of sueltas) {
        const p = rejilla.pos.get(id);
        const s = sizeById.get(id);
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
  let mejorPack = null;
  for (const orden of ordenes) {
    const pack = packShelves(orden.map((i) => cajas[i]), spec.ratio ?? DEFAULT_RATIO, CLUSTER_GAP);
    let distancia = 0;
    for (const r of cruzadas) {
      const a = pack.pos.get(clusterDe.get(r.from));
      const b = pack.pos.get(clusterDe.get(r.to));
      if (!a || !b) continue;
      distancia += Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
    // El ratio manda sobre la distancia; la distancia solo desempata.
    const score = pack.score * 10 + distancia / 10_000;
    if (!mejorPack || score < mejorPack.score) mejorPack = { ...pack, score, orden };
  }

  const offsetX = MARGIN.left;
  const offsetY = MARGIN.top + headerH;

  const entities = [];
  const cajones = [];
  for (const caja of cajas) {
    const p = mejorPack.pos.get(caja.key);
    const cx = offsetX + p.x;
    const cy = offsetY + p.y;
    const c = clusters[caja.key];
    if (c.boxed) cajones.push({ id: c.id, name: c.name, hue: c.hue, x: cx, y: cy, w: caja.w, h: caja.h });
    for (const n of caja.nodes) {
      const s = specById.get(n.id);
      entities.push({
        id: n.id,
        x: snapDiagramGrid(cx + caja.padLado + n.x),
        y: snapDiagramGrid(cy + caja.padTop + n.y),
        w: n.w,
        h: n.h,
        layer: n.layer,
        name: s.name,
        attributes: s.attributes,
        group: s.group,
        hue: s.group ? groupHue.get(s.group) : undefined,
      });
    }
  }
  const byId = new Map(entities.map((e) => [e.id, { ...e, layer: e.layer }]));

  const legendGroups = spec.groups?.length ? spec.groups : undefined;
  const LEGEND_GUTTER = 16;
  const legendW = legendGroups
    ? Math.max(...legendGroups.map((g) => Math.ceil(g.name.length * 6) + 24)) + 8
    : 0;

  const contentW = mejorPack.width + offsetX + MARGIN.right;
  const width = legendGroups
    ? Math.max(contentW + LEGEND_GUTTER + legendW, 160)
    : Math.max(contentW, 160);
  const height = mejorPack.height + offsetY + MARGIN.bottom;
  const legendX = legendGroups ? contentW + LEGEND_GUTTER : 0;
  const legendY = MARGIN.top + (subtitle ? 34 : title ? 22 : 0);
  const titleMaxW = Math.max(80, width - MARGIN.left - MARGIN.right - (legendGroups ? legendW + LEGEND_GUTTER : 0));
  const titleLines = title ? wrapLabel(title, titleMaxW, 13, 3) : [];
  const subtitleLines = subtitle ? wrapLabel(subtitle, titleMaxW, 11, 2) : [];

  // Rejilla de costos: las cajas se bloquean para que el A* las rodee.
  const grid = makeCostGrid(width, height);
  const posById = new Map(entities.map((e) => [e.id, e]));
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
      const da = Math.abs(pa.x - qa.x) + Math.abs(pa.y - qa.y);
      const db = Math.abs(pb.x - qb.x) + Math.abs(pb.y - qb.y);
      return da - db;
    });

  const ruteadas = new Array(spec.relations.length);
  for (const { r, i } of orden) {
    const from = posById.get(r.from);
    const to = posById.get(r.to);
    const sides = pickSides(byId.get(r.from), byId.get(r.to), spec.direction);
    const a = edgeAnchor(from, sides.fromSide);
    const b = edgeAnchor(to, sides.toSide);

    // Deja hueco para dibujar la marca de cardinalidad antes de salir a rutear.
    const out = stepOut(a, sides.fromSide, 18);
    const into = stepOut(b, sides.toSide, 18);
    // Snap direccional: nunca redondea de vuelta hacia el nodo del que se aleja
    // (ver snapPointAwayFromSide — corrige el redondeo-al-más-cercano de antes).
    const outSnap = snapPointAwayFromSide(out, sides.fromSide, grid.grid);
    const intoSnap = snapPointAwayFromSide(into, sides.toSide, grid.grid);
    const aGrid = pixelToGrid(outSnap.x, outSnap.y, grid.grid);
    const bGrid = pixelToGrid(intoSnap.x, intoSnap.y, grid.grid);
    const points = routeOrthogonal(aGrid, bGrid, grid);

    const path = buildOrthogonalPath(a, b, aGrid, bGrid, points, grid.grid);

    const crudo = points.length
      ? { x: points[Math.floor(points.length / 2)].col * grid.grid, y: points[Math.floor(points.length / 2)].row * grid.grid }
      : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    // Una arista que rodea por el borde deja su punto medio pegado al canto y la
    // etiqueta salía cortada por el viewBox; se confina al área útil del lienzo.
    const holgura = (r.label?.length ?? 0) * 2.8 + 12;
    const mid = {
      x: Math.min(width - holgura, Math.max(holgura, crudo.x)),
      y: Math.min(height - 12, Math.max(offsetY + 10, crudo.y)),
    };

    if (r.label) applyRectCost(grid, mid.x - 30, mid.y - 9, 60, 18, 6, true);

    // Peaje sobre el corredor recién usado: la siguiente arista prefiere otro
    // camino antes que correr encima de esta. No es un bloqueo — cruzarla sigue
    // siendo posible cuando es la única salida, solo deja de ser lo barato.
    for (const pt of points) {
      applyRectCost(grid, pt.col * grid.grid - grid.grid, pt.row * grid.grid - grid.grid, grid.grid * 3, grid.grid * 3, 9, true);
    }

    ruteadas[i] = {
      id: r.id ?? `r${i}`,
      from: r.from,
      to: r.to,
      label: r.label,
      hue: from?.hue === to?.hue ? from?.hue : 200,
      identifying: r.identifying,
      path,
      fromMark: cardinalityMark(a, sides.fromSide, r.fromCard),
      toMark: cardinalityMark(b, sides.toSide, r.toCard),
      labelX: mid.x,
      labelY: mid.y,
    };
  }
  const relations = assignEdgeHues(ruteadas);

  const layout = {
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
function stepOut(p, side, d) {
  if (side === 'top') return { x: p.x, y: p.y - d };
  if (side === 'bottom') return { x: p.x, y: p.y + d };
  if (side === 'left') return { x: p.x - d, y: p.y };
  return { x: p.x + d, y: p.y };
}

/** Contorno SVG de la caja de entidad: rectángulo redondeado. */
export function entityBoxPath(x, y, w, h) {
  const r = 8;
  return `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`;
}

export const ER_HEADER_H = HEADER_H;
export const ER_ROW_H = ROW_H;
