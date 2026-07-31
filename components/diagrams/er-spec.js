import { layoutNodeLink, edgeAnchor, pickSides } from '../_shared/node-link-layout.js';
import { makeCostGrid, blockRect, applyRectCost, snapDiagramGrid, snapPointAwayFromSide} from '../_shared/diagram-grid.js';
import { routeOrthogonal, pixelToGrid, gridPathToSvg, buildOrthogonalPath } from '../_shared/diagram-astar.js';
import { resolveTkHue } from '../_shared/tk-hue.js';

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

function readEntity(raw, i) {
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
  return raw.map((g, i) => {
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
  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? '') || undefined,
    direction: DIRECTIONS.has(dir) ? dir : 'LR',
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

/** Geometría local de la marca de cardinalidad; el anclaje queda en (0,0) y el
 * trazo se extiende hacia -x (fuera de la caja); se rota según el lado de entrada. */
function markGeometry(card) {
  switch (card) {
    case 'one':
      return { path: 'M-9,-6 L-9,6', circle: null };
    case 'zeroOrOne':
      return { path: 'M-9,-6 L-9,6', circle: { cx: -17, cy: 0, r: 5 } };
    case 'zeroOrMany':
      return { path: 'M-13,-7 L0,0 M-13,0 L0,0 M-13,7 L0,0', circle: { cx: -21, cy: 0, r: 5 } };
    case 'many':
    default:
      return { path: 'M-13,-7 L0,0 M-13,0 L0,0 M-13,7 L0,0', circle: null };
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
 * spec → geometría lista para pintar.
 * @returns {{width:number, height:number, entities:Array, relations:Array, groups?:Array, title?:string, subtitle?:string, titleY:number, subtitleY:number, legendX:number}}
 */
export function computeErLayout(spec) {
  const title = spec.title ?? '';
  const subtitle = spec.subtitle ?? '';
  const hasHeader = !!(title || subtitle);
  const titleY = title ? 22 : 14;
  const subtitleY = title ? 40 : 24;
  const headerH = hasHeader ? (subtitle ? 54 : 36) : 0;

  const sized = spec.entities.map((e) => ({ id: e.id, w: entityWidth(e), h: entityHeight(e) }));

  const placed = layoutNodeLink(sized, spec.relations, {
    direction: spec.direction,
    layerGap: 96,
    nodeGap: 40,
  });

  const byId = new Map(placed.nodes.map((n) => [n.id, n]));
  const specById = new Map(spec.entities.map((e) => [e.id, e]));
  const groupHue = new Map((spec.groups ?? []).map((g) => [g.id, g.hue]));

  const offsetX = MARGIN.left;
  const offsetY = MARGIN.top + headerH;

  const entities = placed.nodes.map((n) => {
    const s = specById.get(n.id);
    return {
      id: n.id,
      x: n.x + offsetX,
      y: n.y + offsetY,
      w: n.w,
      h: n.h,
      layer: n.layer,
      name: s.name,
      attributes: s.attributes,
      group: s.group,
      hue: s.group ? groupHue.get(s.group) : undefined,
    };
  });

  const legendGroups = spec.groups?.length ? spec.groups : undefined;
  const legendW = legendGroups
    ? Math.max(...legendGroups.map((g) => Math.ceil(g.name.length * 6) + 30))
    : 0;

  const contentW = placed.width + offsetX + MARGIN.right;
  const width = Math.max(legendGroups ? Math.max(contentW, legendW + 180) : contentW, 160);
  const height = placed.height + offsetY + MARGIN.bottom;
  const legendX = legendGroups ? Math.max(8, width - legendW - 8) : 0;

  // Rejilla de costos: las cajas se bloquean para que el A* las rodee.
  const grid = makeCostGrid(width, height);
  const posById = new Map(entities.map((e) => [e.id, e]));
  for (const e of entities) blockRect(grid, e.x - 6, e.y - 6, e.w + 12, e.h + 12);

  const relations = spec.relations.map((r, i) => {
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

    const mid = points.length
      ? { x: points[Math.floor(points.length / 2)].col * grid.grid, y: points[Math.floor(points.length / 2)].row * grid.grid }
      : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

    if (r.label) applyRectCost(grid, mid.x - 30, mid.y - 9, 60, 18, 6, true);

    return {
      id: r.id ?? `r${i}`,
      from: r.from,
      to: r.to,
      label: r.label,
      identifying: r.identifying,
      path,
      fromMark: cardinalityMark(a, sides.fromSide, r.fromCard),
      toMark: cardinalityMark(b, sides.toSide, r.toCard),
      labelX: mid.x,
      labelY: mid.y,
    };
  });

  return {
    width,
    height,
    entities,
    relations,
    groups: legendGroups,
    title: title || undefined,
    subtitle: subtitle || undefined,
    titleY,
    subtitleY,
    legendX,
  };
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
