import { layoutNodeLink, edgeAnchor, pickSides } from '../_shared/node-link-layout.js';
import { diagramHeaderWidth } from '../_shared/diagram-header.js';
import { applyEdgeActorLayout } from '../_shared/diagram-edge-actors.js';
import { assignEdgeHues } from '../_shared/diagram-edge-style.js';
import {
  makeCostGrid, blockRect, applyRectCost, snapDiagramGrid,
  readExclusionZones, nudgeRectFromZones, blockExclusionZones, snapPointAwayFromSide,
} from '../_shared/diagram-grid.js';
import { routeOrthogonal, pixelToGrid, gridPathToSvg, buildOrthogonalPath } from '../_shared/diagram-astar.js';
import { countIconTokens, extractLeadingIconToken } from '../_shared/tk-icon-inline.js';
import { richTextPlain } from '../_shared/tk-rich-text.js';
import { resolveTkHue } from '../_shared/tk-hue.js';

/**
 * Especificación y layout de diagramas de flujo (sin Mermaid).
 *
 * Mismo contrato que el diagrama de secuencia: la entrada es JSON, la salida es
 * geometría pura. Reutiliza el motor node-link (capas + baricentro) para colocar
 * y el A* de la rejilla de costos para rutear, de modo que las aristas rodean las
 * cajas en vez de atravesarlas.
 */

const ICON_INLINE_W = 16;
const MIN_W = 88;
const MAX_W = 260;
const NODE_H = 44;
const DIAMOND_PAD = 28;

/** Direcciones aceptadas (equivalen a las de Mermaid: TB/TD, BT, LR, RL). */
const DIRECTIONS = new Set(['TB', 'BT', 'LR', 'RL']);

/** Formas soportadas; el resto cae a 'rect'. */
export const FLOW_SHAPES = new Set([
  'rect', 'round', 'stadium', 'circle', 'diamond', 'hexagon', 'parallelogram', 'cylinder', 'subroutine',
]);

const DEFAULT_HUES = [210, 239, 160, 38, 280, 199];

function asRecord(v) {
  return v && typeof v === 'object' ? v : {};
}

/** Ancho estimado de la caja según su etiqueta, descontando tokens {{icon}}. */
function nodeWidth(label, shape) {
  const plain = richTextPlain(label);
  const icons = countIconTokens(label);
  const est = Math.ceil(plain.length * 7.1) + 32 + icons * ICON_INLINE_W;
  const base = snapDiagramGrid(Math.min(MAX_W, Math.max(MIN_W, est)));
  // Rombo y círculo necesitan más caja para que el texto no se salga del contorno.
  if (shape === 'diamond') return snapDiagramGrid(base + DIAMOND_PAD);
  if (shape === 'circle') return snapDiagramGrid(Math.max(base, NODE_H * 2));
  return base;
}

function nodeHeight(shape) {
  if (shape === 'circle') return snapDiagramGrid(NODE_H * 1.6);
  if (shape === 'diamond') return snapDiagramGrid(NODE_H * 1.35);
  return NODE_H;
}

function readNode(raw, i) {
  const r = asRecord(raw);
  const rawLabel = String(r.label ?? r.text ?? r.id ?? `Nodo ${i + 1}`);
  const leading = extractLeadingIconToken(rawLabel);
  const shape = FLOW_SHAPES.has(String(r.shape)) ? String(r.shape) : 'rect';
  return {
    id: String(r.id ?? `n${i}`),
    label: rawLabel,
    shape,
    icon: leading?.iconId ?? (r.icon != null ? String(r.icon) : undefined),
    hue: leading?.hue ?? (r.hue != null ? resolveTkHue(r) : undefined),
    group: String(r.group ?? '') || undefined,
    description: String(r.desc ?? r.description ?? '').trim() || undefined,
  };
}

function readEdge(raw, i) {
  const r = asRecord(raw);
  // Waypoints opcionales: fuerzan el A* a pasar por coordenadas en píxeles.
  // Cada item es { x, y } en el plano del SVG. Sirven para guiar la ruta
  // estéticamente cuando el algoritmo directo cae en zigzag.
  const waypoints = Array.isArray(r.waypoints)
    ? r.waypoints
        .map((w) => asRecord(w))
        .filter((w) => Number.isFinite(w.x) && Number.isFinite(w.y))
        .map((w) => ({ x: Number(w.x), y: Number(w.y) }))
    : undefined;
  return {
    id: String(r.id ?? `e${i}`),
    from: String(r.from ?? r.source ?? ''),
    to: String(r.to ?? r.target ?? ''),
    label: String(r.label ?? '').trim() || undefined,
    kind: r.kind === 'dashed' || r.kind === 'thick' ? r.kind : 'solid',
    group: String(r.group ?? '') || undefined,
    waypoints: waypoints?.length ? waypoints : undefined,
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

/** payload → spec normalizada, o null si no hay nodos. */
export function flowchartSpecFromPayload(payload) {
  const p = asRecord(payload);
  const src = asRecord(p.flowchart ?? p.flow ?? p);
  const rawNodes = src.nodes ?? [];
  if (!Array.isArray(rawNodes) || !rawNodes.length) return null;

  const nodes = rawNodes.map(readNode);
  const known = new Set(nodes.map((n) => n.id));
  // Descarta aristas colgantes: una arista a un id inexistente rompería el layout.
  const edges = (Array.isArray(src.edges) ? src.edges : [])
    .map(readEdge)
    .filter((e) => known.has(e.from) && known.has(e.to));

  const dir = String(src.direction ?? 'TB').toUpperCase();
  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? '') || undefined,
    direction: DIRECTIONS.has(dir) ? dir : (dir === 'TD' ? 'TB' : 'TB'),
    groups: readGroups(src),
    // Zonas donde nodos y aristas tienen prohibido entrar (espaciado estético).
    // Mismo espacio de coordenadas que los nodos, antes del margen del lienzo.
    exclusionZones: readExclusionZones(src.exclusionZones),
    nodes,
    edges,
  };
}

export function resolveFlowchartSpec(payload) {
  return flowchartSpecFromPayload(payload);
}

/** spec → objeto `flowchart` listo para persistir / mostrar en el editor. */
export function flowchartSpecToJson(spec) {
  const out = { direction: spec.direction, nodes: [], edges: [] };
  if (spec.title) out.title = spec.title;
  if (spec.subtitle) out.subtitle = spec.subtitle;
  if (spec.groups?.length) out.groups = spec.groups;
  if (spec.exclusionZones?.length) out.exclusionZones = spec.exclusionZones;
  out.nodes = spec.nodes.map((n) => {
    const row = { id: n.id, label: n.label };
    if (n.shape !== 'rect') row.shape = n.shape;
    if (n.group) row.group = n.group;
    if (n.description) row.desc = n.description;
    return row;
  });
  out.edges = spec.edges.map((e) => {
    const row = { from: e.from, to: e.to };
    if (e.label) row.label = e.label;
    if (e.kind !== 'solid') row.kind = e.kind;
    if (e.group) row.group = e.group;
    if (e.waypoints?.length) row.waypoints = e.waypoints;
    return row;
  });
  return out;
}

export function expandFlowchartPayloadForJson(payload) {
  const out = { ...asRecord(payload) };
  const spec = resolveFlowchartSpec(out);
  if (spec) out.flowchart = flowchartSpecToJson(spec);
  return out;
}

/* ───────────────────────── formas ───────────────────────── */

/** Contorno SVG de una caja según su forma. x/y = esquina superior izquierda. */
export function shapePath(shape, x, y, w, h) {
  const r = 8;
  const cx = x + w / 2;
  const cy = y + h / 2;
  switch (shape) {
    case 'round':
      return `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`;
    case 'stadium': {
      const rr = h / 2;
      return `M${x + rr},${y} H${x + w - rr} A${rr},${rr} 0 0 1 ${x + w - rr},${y + h} H${x + rr} A${rr},${rr} 0 0 1 ${x + rr},${y} Z`;
    }
    case 'circle': {
      const rad = Math.min(w, h) / 2;
      return `M${cx - rad},${cy} a${rad},${rad} 0 1 0 ${rad * 2},0 a${rad},${rad} 0 1 0 ${-rad * 2},0 Z`;
    }
    case 'diamond':
      return `M${cx},${y} L${x + w},${cy} L${cx},${y + h} L${x},${cy} Z`;
    case 'hexagon': {
      const k = Math.min(20, w / 4);
      return `M${x + k},${y} H${x + w - k} L${x + w},${cy} L${x + w - k},${y + h} H${x + k} L${x},${cy} Z`;
    }
    case 'parallelogram': {
      const k = Math.min(18, w / 5);
      return `M${x + k},${y} H${x + w} L${x + w - k},${y + h} H${x} Z`;
    }
    case 'cylinder': {
      const ry = Math.min(9, h / 5);
      return `M${x},${y + ry} a${w / 2},${ry} 0 0 1 ${w},0 V${y + h - ry} a${w / 2},${ry} 0 0 1 ${-w},0 Z`;
    }
    case 'subroutine':
      return `M${x},${y} H${x + w} V${y + h} H${x} Z M${x + 8},${y} V${y + h} M${x + w - 8},${y} V${y + h}`;
    default:
      return `M${x},${y} H${x + w} V${y + h} H${x} Z`;
  }
}

/* ───────────────────────── layout ───────────────────────── */

const MARGIN = { top: 16, right: 20, bottom: 20, left: 20 };

/**
 * spec → geometría lista para pintar.
 * @returns {{width:number, height:number, nodes:Array, edges:Array, groups?:Array, title?:string, subtitle?:string, titleY:number, subtitleY:number, legendX:number}}
 */
/**
 * spec → objeto listo para pintar.
 *
 * Acepta un parámetro opcional `overrides` con la forma:
 *   { nodes: { [id]: { x?, y?, label?, hue? } }, edges: { [id]: { label?, hue? } } }
 * Si un nodo tiene x/y en overrides, se respeta esa posición exacta en lugar
 * de la calculada por el layout Sugiyama. Sirve para el modo edición.
 */
export function computeFlowchartLayout(spec, overrides = null) {
  const title = spec.title ?? '';
  const subtitle = spec.subtitle ?? '';
  const hasHeader = !!(title || subtitle);
  const titleY = title ? 22 : 14;
  const subtitleY = title ? 40 : 24;
  const headerH = hasHeader ? (subtitle ? 54 : 36) : 0;

  const sized = spec.nodes.map((n) => ({
    id: n.id,
    w: nodeWidth(n.label, n.shape),
    h: nodeHeight(n.shape),
  }));

  const placed = layoutNodeLink(sized, spec.edges, {
    direction: spec.direction,
    layerGap: spec.edges.some((e) => e.label) ? 80 : 64,
    nodeGap: 32,
  });

  const byId = new Map(placed.nodes.map((n) => [n.id, n]));
  const specById = new Map(spec.nodes.map((n) => [n.id, n]));
  const groupHue = new Map((spec.groups ?? []).map((g) => [g.id, g.hue]));

  const offsetX = MARGIN.left;
  const offsetY = MARGIN.top + headerH;
  const zones = spec.exclusionZones ?? [];

  const nodes = placed.nodes.map((n) => {
    const s = specById.get(n.id);
    const ov = overrides?.nodes?.[n.id];
    const hasOverridePos = ov?.x != null && ov?.y != null;
    // Una posición editada a mano gana sobre el auto-layout: no se nudgea.
    const auto = !hasOverridePos && zones.length
      ? nudgeRectFromZones({ x: n.x, y: n.y, w: n.w, h: n.h }, zones)
      : n;
    return {
      id: n.id,
      x: (ov?.x ?? auto.x) + offsetX,
      y: (ov?.y ?? auto.y) + offsetY,
      w: n.w,
      h: n.h,
      layer: n.layer,
      label: ov?.label ?? s.label,
      shape: s.shape,
      icon: s.icon,
      description: s.description,
      hue: ov?.hue ?? s.hue ?? (s.group ? groupHue.get(s.group) : undefined),
      group: s.group,
    };
  });

  const legendGroups = spec.groups?.length ? spec.groups : undefined;
  const legendW = legendGroups
    ? Math.max(...legendGroups.map((g) => Math.ceil(g.name.length * 6) + 30))
    : 0;

  const contentW = placed.width + offsetX + MARGIN.right;
  const width = Math.max(legendGroups ? Math.max(contentW, legendW + 180) : contentW, 160, diagramHeaderWidth(title, subtitle));
  const height = placed.height + offsetY + MARGIN.bottom;
  const legendX = legendGroups ? Math.max(8, width - legendW - 8) : 0;

  // Rejilla de costos: las cajas se bloquean para que el A* las rodee.
  const grid = makeCostGrid(width, height);
  const posById = new Map(nodes.map((n) => [n.id, n]));
  for (const n of nodes) blockRect(grid, n.x - 6, n.y - 6, n.w + 12, n.h + 12);
  // Zonas de exclusión: ni nodos (ya nudgeados) ni aristas pueden cruzarlas.
  blockExclusionZones(grid, zones, offsetX, offsetY);

  const routed = spec.edges.map((e, i) => {
    const from = posById.get(e.from);
    const to = posById.get(e.to);
    const sides = pickSides(byId.get(e.from), byId.get(e.to), spec.direction);
    const a = edgeAnchor(from, sides.fromSide);
    const b = edgeAnchor(to, sides.toSide);

    // El anclaje cae sobre el borde bloqueado: se sale un paso antes de rutear.
    const out = stepOut(a, sides.fromSide, 16);
    const into = stepOut(b, sides.toSide, 16);
    // Snap direccional: nunca redondea de vuelta hacia el nodo del que se aleja
    // (ver snapPointAwayFromSide — corrige el redondeo-al-más-cercano de antes).
    const outSnap = snapPointAwayFromSide(out, sides.fromSide, grid.grid);
    const intoSnap = snapPointAwayFromSide(into, sides.toSide, grid.grid);
    const aGrid = pixelToGrid(outSnap.x, outSnap.y, grid.grid);
    const bGrid = pixelToGrid(intoSnap.x, intoSnap.y, grid.grid);
    // Convierte waypoints píxel → grid antes de pasarlos al A*, recortados al
    // lienzo: un waypoint fuera de rango (dato de usuario, no del layout) no
    // debe forzar a A* fuera de la rejilla, donde cae en su fallback recto.
    const wpGrid = (e.waypoints ?? []).map((w) => {
      const cell = pixelToGrid(snapDiagramGrid(w.x), snapDiagramGrid(w.y), grid.grid);
      return {
        col: Math.max(0, Math.min(grid.cols - 1, cell.col)),
        row: Math.max(0, Math.min(grid.rows - 1, cell.row)),
      };
    });
    const points = wpGrid.length
      ? routeOrthogonal(aGrid, bGrid, grid, { waypoints: wpGrid })
      : routeOrthogonal(aGrid, bGrid, grid);

    const path = buildOrthogonalPath(a, b, aGrid, bGrid, points, grid.grid);
    const tip = arrowTip(b, sides.toSide);
    const mid = points.length
      ? { x: points[Math.floor(points.length / 2)].col * grid.grid, y: points[Math.floor(points.length / 2)].row * grid.grid }
      : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

    // La etiqueta ocupa espacio: encarece la zona para que otras aristas la esquiven.
    if (e.label) applyRectCost(grid, mid.x - 30, mid.y - 9, 60, 18, 6, true);

    const eOv = overrides?.edges?.[e.id];
    return {
      id: e.id ?? `e${i}`,
      from: e.from,
      to: e.to,
      label: eOv?.label ?? e.label,
      kind: e.kind,
      path,
      arrowTipX: tip.x,
      arrowTipY: tip.y,
      arrowAngle: tip.angle,
      labelX: mid.x,
      labelY: mid.y,
      hue: eOv?.hue ?? (e.group ? groupHue.get(e.group) : undefined),
    };
  });

  assignEdgeHues(routed);
  const layout = {
    width,
    height,
    nodes,
    edges: routed,
    groups: legendGroups,
    // Rects en coords del lienzo final (con el mismo offset que los nodos),
    // listos para dibujarse como zona sutil sin recalcular nada en el componente.
    exclusionZones: zones.map((z) => ({ x: z.x + offsetX, y: z.y + offsetY, w: z.w, h: z.h, label: z.label })),
    title: title || undefined,
    subtitle: subtitle || undefined,
    titleY,
    subtitleY,
    legendX,
  };
  applyEdgeActorLayout(layout, nodes.map((n) => ({ x: n.x, y: n.y, w: n.w, h: n.h })));
  return layout;
}

/** Desplaza un punto hacia afuera del nodo, en la dirección de su lado. */
function stepOut(p, side, d) {
  if (side === 'top') return { x: p.x, y: p.y - d };
  if (side === 'bottom') return { x: p.x, y: p.y + d };
  if (side === 'left') return { x: p.x - d, y: p.y };
  return { x: p.x + d, y: p.y };
}

/** Punta de flecha: posición y ángulo de rotación según el lado de llegada. */
function arrowTip(p, side) {
  const angle = side === 'top' ? 90 : side === 'bottom' ? 270 : side === 'left' ? 0 : 180;
  return { x: p.x, y: p.y, angle };
}
