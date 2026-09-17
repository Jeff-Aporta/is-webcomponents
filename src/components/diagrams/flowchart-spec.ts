import { layoutNodeLink, edgeAnchor, pickSides } from '../_shared/node-link-layout.js';
import type { BoxSide } from './diagram-types.js';

// `BoxSide` admite `'auto'`; los anclajes efectivos del router son siempre
// una dirección cardinal. Estrechamos para satisfacer la firma del helper.
type AnchorSide = 'left' | 'right' | 'top' | 'bottom';
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
import { wrapText } from '../_shared/diagram-text-wrap.js';

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

export type FlowDirection = 'TB' | 'BT' | 'LR' | 'RL';
export type FlowShape = 'rect' | 'round' | 'stadium' | 'circle' | 'diamond' | 'hexagon' | 'parallelogram' | 'cylinder' | 'subroutine';
export type FlowEdgeKind = 'solid' | 'dashed' | 'thick';
export type FlowOverflow = 'grow' | 'ellipsis';

/** Direcciones aceptadas (equivalen a las de Mermaid: TB/TD, BT, LR, RL). */
const DIRECTIONS: Set<string> = new Set(['TB', 'BT', 'LR', 'RL']);

/** Formas soportadas; el resto cae a 'rect'. */
export const FLOW_SHAPES: Set<string> = new Set([
  'rect', 'round', 'stadium', 'circle', 'diamond', 'hexagon', 'parallelogram', 'cylinder', 'subroutine',
]);

const DEFAULT_HUES: number[] = [210, 239, 160, 38, 280, 199];

interface LeadingIconToken { iconId: string; hue?: number; rest: string }

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export interface FlowExclusionZone {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

export interface FlowNodeSpec {
  id: string;
  label: string;
  shape: FlowShape;
  icon?: string;
  hue?: number;
  group?: string;
  description?: string;
  overflow?: FlowOverflow;
}

export interface FlowEdgeSpec {
  id: string;
  from: string;
  to: string;
  label?: string;
  kind: FlowEdgeKind;
  group?: string;
  waypoints?: Array<{ x: number; y: number }>;
}

export interface FlowGroupSpec {
  id: string;
  name: string;
  hue: number;
}

export interface FlowResolvedSpec {
  title?: string;
  subtitle?: string;
  direction: FlowDirection;
  defaultOverflow: FlowOverflow;
  groups?: FlowGroupSpec[];
  exclusionZones?: FlowExclusionZone[];
  nodes: FlowNodeSpec[];
  edges: FlowEdgeSpec[];
}

export interface FlowLayoutNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  layer: number;
  label: string;
  shape: FlowShape;
  icon?: string;
  description?: string;
  hue?: number;
  group?: string;
}

export interface FlowLayoutEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  kind: FlowEdgeKind;
  path: string;
  arrowTipX: number;
  arrowTipY: number;
  arrowAngle: number;
  labelX: number;
  labelY: number;
  hue?: number;
}

export interface FlowLayoutExclusionZone {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

export interface FlowLayout {
  width: number;
  height: number;
  nodes: FlowLayoutNode[];
  edges: FlowLayoutEdge[];
  groups?: FlowGroupSpec[];
  exclusionZones?: FlowLayoutExclusionZone[];
  title?: string;
  subtitle?: string;
  titleY: number;
  subtitleY: number;
  legendX: number;
}

export interface FlowLayoutOverrides {
  nodes?: Record<string, { x?: number; y?: number; label?: string; hue?: number }>;
  edges?: Record<string, { label?: string; hue?: number }>;
}

/** Ancho estimado de la caja según su etiqueta, descontando tokens {{icon}}.
 *
 * Ademas de la estimacion lineal `chars * factor`, se considera el ancho
 * real de la PALABRA MAS LARGA del label: el wrap no parte palabras, asi que
 * si una sola palabra es mas ancha que la caja, el texto se desborda fuera
 * del borde. Para evitarlo se toma el max entre la estimacion agregada y
 * el ancho de la palabra mas larga, mas un pequeno margen. */
function nodeWidth(label: string, shape: string): number {
  const plain = richTextPlain(label);
  const icons = countIconTokens(label);
  let longestWord = 0;
  for (const w of plain.split(/\s+/)) {
    if (!w) continue;
    const chars = w.length;
    // Misma relacion aprox que el factor 7.1/char del estimador agregado:
    // cada glyph mide ~7.1px a fontSize 11 con Poppins; corregimos por longitud.
    const wordEst = Math.ceil(chars * 7.1) + 8;
    if (wordEst > longestWord) longestWord = wordEst;
  }
  const est = Math.ceil(plain.length * 7.1) + 32 + icons * ICON_INLINE_W;
  // Tomamos el MAYOR entre la estimacion agregada (caja normal) y la palabra
  // mas larga (para que el wrap no desborde). Esto sacrifica un poco de ancho
  // en labels cortos con palabras muy largas, pero arregla los desbordes.
  const base = snapDiagramGrid(Math.min(MAX_W, Math.max(MIN_W, Math.max(est, longestWord))));
  // Rombo y círculo necesitan más caja para que el texto no se salga del contorno.
  if (shape === 'diamond') return snapDiagramGrid(base + DIAMOND_PAD);
  if (shape === 'circle') return snapDiagramGrid(Math.max(base, NODE_H * 2));
  return base;
}

function nodeHeight(shape: string): number {
  if (shape === 'circle') return snapDiagramGrid(NODE_H * 1.6);
  if (shape === 'diamond') return snapDiagramGrid(NODE_H * 1.35);
  return NODE_H;
}

function readNode(raw: Record<string, unknown>, i: number): FlowNodeSpec {
  const rawLabel = String(raw.label ?? raw.text ?? raw.id ?? `Nodo ${i + 1}`);
  const leading = extractLeadingIconToken(rawLabel) as LeadingIconToken | null;
  const shapeStr = String(raw.shape ?? '');
  const shape = (FLOW_SHAPES.has(shapeStr) ? shapeStr : 'rect') as FlowShape;
  const overflowRaw = String(raw.overflow ?? '').trim();
  const overflow: FlowOverflow | undefined = overflowRaw === 'grow' || overflowRaw === 'ellipsis'
    ? (overflowRaw as FlowOverflow)
    : undefined;
  return {
    id: String(raw.id ?? `n${i}`),
    label: rawLabel,
    shape,
    icon: leading?.iconId ?? (raw.icon != null ? String(raw.icon) : undefined),
    hue: leading?.hue ?? (raw.hue != null ? resolveTkHue(raw) : undefined),
    group: String(raw.group ?? '') || undefined,
    description: String(raw.desc ?? raw.description ?? '').trim() || undefined,
    overflow,
  };
}

function readEdge(raw: Record<string, unknown>, i: number): FlowEdgeSpec {
  // Waypoints opcionales: fuerzan el A* a pasar por coordenadas en píxeles.
  // Cada item es { x, y } en el plano del SVG. Sirven para guiar la ruta
  // estéticamente cuando el algoritmo directo cae en zigzag.
  const waypoints: Array<{ x: number; y: number }> | undefined = Array.isArray(raw.waypoints)
    ? raw.waypoints
        .map((w: unknown) => asRecord(w))
        .filter((w) => Number.isFinite(w.x) && Number.isFinite(w.y))
        .map((w) => ({ x: Number(w.x), y: Number(w.y) }))
    : undefined;
  return {
    id: String(raw.id ?? `e${i}`),
    from: String(raw.from ?? raw.source ?? ''),
    to: String(raw.to ?? raw.target ?? ''),
    label: String(raw.label ?? '').trim() || undefined,
    kind: raw.kind === 'dashed' || raw.kind === 'thick' ? (raw.kind as FlowEdgeKind) : 'solid',
    group: String(raw.group ?? '') || undefined,
    waypoints: waypoints?.length ? waypoints : undefined,
  };
}

function readGroups(src: Record<string, unknown>): FlowGroupSpec[] | undefined {
  const raw = src.groups;
  const list = Array.isArray(raw) ? raw : [];
  if (!list.length) return undefined;
  return list.map((g: unknown, i: number) => {
    const r = asRecord(g);
    return {
      id: String(r.id ?? `grp-${i}`),
      name: String(r.name ?? r.label ?? `Grupo ${i + 1}`),
      hue: resolveTkHue(r, DEFAULT_HUES[i % DEFAULT_HUES.length]),
    };
  });
}

/** payload → spec normalizada, o null si no hay nodos. */
export function flowchartSpecFromPayload(payload: unknown): FlowResolvedSpec | null {
  const p = asRecord(payload);
  const src = asRecord(p.flowchart ?? p.flow ?? p);
  const rawNodes = src.nodes;
  if (!Array.isArray(rawNodes) || !rawNodes.length) return null;

  const nodes: FlowNodeSpec[] = rawNodes.map((raw: unknown, i: number) => readNode(asRecord(raw), i));
  const known = new Set<string>(nodes.map((n) => n.id));
  // Descarta aristas colgantes: una arista a un id inexistente rompería el layout.
  const rawEdges = Array.isArray(src.edges) ? src.edges : [];
  const edges: FlowEdgeSpec[] = rawEdges
    .map((raw: unknown, i: number) => readEdge(asRecord(raw), i))
    .filter((e) => known.has(e.from) && known.has(e.to));

  const dir = String(src.direction ?? 'TB').toUpperCase();
  const defaultOverflowRaw = String(src.defaultOverflow ?? 'grow').trim();
  const defaultOverflow: FlowOverflow = defaultOverflowRaw === 'ellipsis' ? 'ellipsis' : 'grow';
  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? '') || undefined,
    direction: DIRECTIONS.has(dir) ? (dir as FlowDirection) : (dir === 'TD' ? 'TB' : 'TB'),
    defaultOverflow,
    groups: readGroups(src),
    // Zonas donde nodos y aristas tienen prohibido entrar (espaciado estético).
    // Mismo espacio de coordenadas que los nodos, antes del margen del lienzo.
    exclusionZones: readExclusionZones(src.exclusionZones) as FlowExclusionZone[] | undefined,
    nodes: nodes.map((n) => ({ ...n, overflow: n.overflow ?? defaultOverflow })),
    edges,
  };
}

export function resolveFlowchartSpec(payload: unknown): FlowResolvedSpec | null {
  return flowchartSpecFromPayload(payload);
}

/** spec → objeto `flowchart` listo para persistir / mostrar en el editor. */
export function flowchartSpecToJson(spec: FlowResolvedSpec): Record<string, unknown> {
  const out: Record<string, unknown> = { direction: spec.direction, nodes: [], edges: [] };
  if (spec.title) out.title = spec.title;
  if (spec.subtitle) out.subtitle = spec.subtitle;
  if (spec.groups?.length) out.groups = spec.groups;
  if (spec.exclusionZones?.length) out.exclusionZones = spec.exclusionZones;
  out.nodes = spec.nodes.map((n) => {
    const row: Record<string, unknown> = { id: n.id, label: n.label };
    if (n.shape !== 'rect') row.shape = n.shape;
    if (n.group) row.group = n.group;
    if (n.description) row.desc = n.description;
    return row;
  });
  out.edges = spec.edges.map((e) => {
    const row: Record<string, unknown> = { from: e.from, to: e.to };
    if (e.label) row.label = e.label;
    if (e.kind !== 'solid') row.kind = e.kind;
    if (e.group) row.group = e.group;
    if (e.waypoints?.length) row.waypoints = e.waypoints;
    return row;
  });
  return out;
}

export function expandFlowchartPayloadForJson(payload: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = { ...asRecord(payload) };
  const spec = resolveFlowchartSpec(out);
  if (spec) out.flowchart = flowchartSpecToJson(spec);
  return out;
}

/* ───────────────────────── formas ───────────────────────── */

/** Contorno SVG de una caja según su forma. x/y = esquina superior izquierda. */
export function shapePath(shape: string, x: number, y: number, w: number, h: number): string {
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
 *
 * Acepta un parámetro opcional `overrides` con la forma:
 *   { nodes: { [id]: { x?, y?, label?, hue? } }, edges: { [id]: { label?, hue? } } }
 * Si un nodo tiene x/y en overrides, se respeta esa posición exacta en lugar
 * de la calculada por el layout Sugiyama. Sirve para el modo edición.
 */
export function computeFlowchartLayout(spec: FlowResolvedSpec, overrides: FlowLayoutOverrides | null = null): FlowLayout {
  const title = spec.title ?? '';
  const subtitle = spec.subtitle ?? '';
  const hasHeader = !!(title || subtitle);
  const titleY = title ? 22 : 14;
  const subtitleY = title ? 40 : 24;
  const headerH = hasHeader ? (subtitle ? 54 : 36) : 0;

  // Si el diagrama declara `overflow: 'grow'` en un nodo, el wrap puede
  // necesitar más líneas de las que caben en el alto inicial; ajustamos la
  // altura del nodo antes del layout Sugiyama para que el A* de aristas
  // coloque las cajas con el alto real.
  const FONT_SIZE = 11;
  const FONT_FAMILY = 'Tahoma,Arial,sans-serif';

  const sized: Array<{ id: string; w: number; h: number }> = spec.nodes.map((n) => {
    const w = nodeWidth(n.label, n.shape);
    const baseH = nodeHeight(n.shape);
    if (n.overflow === 'grow' && n.label && !/[*`\[]/.test(n.label) && !n.label.includes('{{')) {
      const wrap = wrapText({
        text: n.label, maxWidth: w, maxHeight: baseH,
        fontSize: FONT_SIZE, fontFamily: FONT_FAMILY, overflow: 'grow',
      });
      return { id: n.id, w, h: Math.ceil(wrap.requiredHeightUsed) };
    }
    return { id: n.id, w, h: baseH };
  });

  const placed = layoutNodeLink(sized, spec.edges, {
    direction: spec.direction,
    layerGap: spec.edges.some((e) => e.label) ? 80 : 64,
    nodeGap: 32,
  });

  const byId = new Map<string, { id: string; x: number; y: number; w: number; h: number; layer: number }>(
    placed.nodes.map((n) => [n.id, n]),
  );
  const specById = new Map<string, FlowNodeSpec>(spec.nodes.map((n) => [n.id, n]));
  const groupHue = new Map<string, number>((spec.groups ?? []).map((g) => [g.id, g.hue]));

  const offsetX = MARGIN.left;
  const offsetY = MARGIN.top + headerH;
  const zones = spec.exclusionZones ?? [];

  const nodes: FlowLayoutNode[] = placed.nodes.map((n) => {
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
      label: ov?.label ?? (s?.label ?? ''),
      shape: (s?.shape ?? 'rect') as FlowShape,
      icon: s?.icon,
      description: s?.description,
      hue: ov?.hue ?? s?.hue ?? (s?.group ? groupHue.get(s.group) : undefined),
      group: s?.group,
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
  const posById = new Map<string, FlowLayoutNode>(nodes.map((n) => [n.id, n]));
  for (const n of nodes) blockRect(grid, n.x - 6, n.y - 6, n.w + 12, n.h + 12);
  // Zonas de exclusión: ni nodos (ya nudgeados) ni aristas pueden cruzarlas.
  blockExclusionZones(grid, zones, offsetX, offsetY);

  const routed: FlowLayoutEdge[] = spec.edges.map((e, i) => {
    const from = posById.get(e.from);
    const to = posById.get(e.to);
    const sides = pickSides(byId.get(e.from), byId.get(e.to), spec.direction);
    // `pickSides` devuelve `sides` con `fromSide`/`toSide` como `string` (no
    // tipado en el helper); los narrow explícitos aquí para mantener el
    // contrato BoxSide en el resto del pipeline.
    const fromSide = sides.fromSide as AnchorSide;
    const toSide = sides.toSide as AnchorSide;
    const a = edgeAnchor(from, fromSide);
    const b = edgeAnchor(to, toSide);

    // El anclaje cae sobre el borde bloqueado: se sale un paso antes de rutear.
    const out = stepOut(a, fromSide, 16);
    const into = stepOut(b, toSide, 16);
    // Snap direccional: nunca redondea de vuelta hacia el nodo del que se aleja
    // (ver snapPointAwayFromSide — corrige el redondeo-al-más-cercano de antes).
    const outSnap = snapPointAwayFromSide(out, fromSide, grid.grid);
    const intoSnap = snapPointAwayFromSide(into, toSide, grid.grid);
    const aGrid = pixelToGrid(outSnap.x, outSnap.y, grid.grid);
    const bGrid = pixelToGrid(intoSnap.x, intoSnap.y, grid.grid);
    // Convierte waypoints píxel → grid antes de pasarlos al A*, recortados al
    // lienzo: un waypoint fuera de rango (dato de usuario, no del layout) no
    // debe forzar a A* fuera de la rejilla, donde cae en su fallback recto.
    const wpGrid: Array<{ col: number; row: number }> = (e.waypoints ?? []).map((w) => {
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
    const tip = arrowTip(b, toSide);
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
  const layout: FlowLayout = {
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
function stepOut(p: { x: number; y: number }, side: AnchorSide, d: number): { x: number; y: number } {
  if (side === 'top') return { x: p.x, y: p.y - d };
  if (side === 'bottom') return { x: p.x, y: p.y + d };
  if (side === 'left') return { x: p.x - d, y: p.y };
  return { x: p.x + d, y: p.y };
}

/** Punta de flecha: posición y ángulo de rotación según el lado de llegada. */
function arrowTip(p: { x: number; y: number }, side: AnchorSide): { x: number; y: number; angle: number } {
  const angle = side === 'top' ? 90 : side === 'bottom' ? 270 : side === 'left' ? 0 : 180;
  return { x: p.x, y: p.y, angle };
}