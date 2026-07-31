import { layoutNodeLink, edgeAnchor, pickSides } from '../_shared/node-link-layout.js';
import { makeCostGrid, blockRect, applyRectCost, snapDiagramGrid } from '../_shared/diagram-grid.js';
import { routeOrthogonal, pixelToGrid, gridPathToSvg } from '../_shared/diagram-astar.js';
import { richTextPlain } from '../_shared/tk-rich-text.js';
import { resolveTkHue } from '../_shared/tk-hue.js';

/**
 * Especificación y layout de diagramas de estado (sin Mermaid).
 *
 * Mismo contrato que flowchart-spec: JSON → geometría pura, reutilizando el
 * motor node-link para colocar y el A* de la rejilla de costos para rutear.
 */

const MIN_W = 88;
const MAX_W = 260;
const NODE_H = 44;
const DIAMOND_PAD = 28;
const START_R = 10;
const END_R = 10;
const END_PAD = 5;

/** Tipos de estado soportados; cualquier otro valor cae a 'normal'. */
export const STATE_KINDS = new Set(['start', 'end', 'normal', 'choice']);

const DEFAULT_HUES = [210, 239, 160, 38, 280, 199];

function asRecord(v) {
  return v && typeof v === 'object' ? v : {};
}

function stateSize(kind, label) {
  if (kind === 'start') return { w: START_R * 2, h: START_R * 2 };
  if (kind === 'end') { const d = (END_R + END_PAD) * 2; return { w: d, h: d }; }
  const plain = richTextPlain(label);
  const est = Math.ceil(plain.length * 7.1) + 32;
  const base = snapDiagramGrid(Math.min(MAX_W, Math.max(MIN_W, est)));
  if (kind === 'choice') {
    return { w: snapDiagramGrid(base + DIAMOND_PAD), h: snapDiagramGrid(NODE_H * 1.35) };
  }
  return { w: base, h: NODE_H };
}

function readState(raw, i) {
  const r = asRecord(raw);
  const kind = STATE_KINDS.has(String(r.kind)) ? String(r.kind) : 'normal';
  const label = String(r.label ?? r.id ?? (kind === 'start' ? '' : kind === 'end' ? '' : `Estado ${i + 1}`));
  return {
    id: String(r.id ?? `s${i}`),
    label,
    kind,
    group: String(r.group ?? '') || undefined,
    hue: r.hue != null ? resolveTkHue(r) : undefined,
    description: String(r.desc ?? r.description ?? '').trim() || undefined,
  };
}

function readTransition(raw, i) {
  const r = asRecord(raw);
  return {
    id: String(r.id ?? `t${i}`),
    from: String(r.from ?? r.source ?? ''),
    to: String(r.to ?? r.target ?? ''),
    label: String(r.label ?? '').trim() || undefined,
    group: String(r.group ?? '') || undefined,
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

/** payload → spec normalizada, o null si no hay estados. */
export function resolveStateSpec(payload) {
  const p = asRecord(payload);
  const src = asRecord(p.stateDiagram ?? p.state ?? p);
  const rawStates = src.states ?? [];
  if (!Array.isArray(rawStates) || !rawStates.length) return null;

  const states = rawStates.map(readState);
  const known = new Set(states.map((s) => s.id));
  // Descarta transiciones colgantes: una transición a un id inexistente rompería el layout.
  const transitions = (Array.isArray(src.transitions) ? src.transitions : [])
    .map(readTransition)
    .filter((t) => known.has(t.from) && known.has(t.to));

  const dir = String(src.direction ?? 'TB').toUpperCase();
  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? '') || undefined,
    direction: ['TB', 'BT', 'LR', 'RL'].includes(dir) ? dir : (dir === 'TD' ? 'TB' : 'TB'),
    groups: readGroups(src),
    states,
    transitions,
  };
}

/** spec → objeto `stateDiagram` listo para persistir / mostrar en el editor. */
export function stateSpecToJson(spec) {
  const out = { direction: spec.direction, states: [], transitions: [] };
  if (spec.title) out.title = spec.title;
  if (spec.subtitle) out.subtitle = spec.subtitle;
  if (spec.groups?.length) out.groups = spec.groups;
  out.states = spec.states.map((s) => {
    const row = { id: s.id, label: s.label };
    if (s.kind !== 'normal') row.kind = s.kind;
    if (s.group) row.group = s.group;
    if (s.description) row.desc = s.description;
    return row;
  });
  out.transitions = spec.transitions.map((t) => {
    const row = { from: t.from, to: t.to };
    if (t.label) row.label = t.label;
    return row;
  });
  return out;
}

/* ───────────────────────── layout ───────────────────────── */

const MARGIN = { top: 16, right: 20, bottom: 20, left: 20 };

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

/** Lados de anclaje; para self-transitions fuerza lados distintos (loop visible). */
function sidesFor(fromNode, toNode, direction, isSelf) {
  if (isSelf) return { fromSide: 'right', toSide: 'top' };
  return pickSides(fromNode, toNode, direction);
}

/**
 * spec → geometría lista para pintar.
 * @returns {{width:number, height:number, nodes:Array, edges:Array, groups?:Array, title?:string, subtitle?:string, titleY:number, subtitleY:number, legendX:number}}
 */
export function computeStateLayout(spec) {
  const title = spec.title ?? '';
  const subtitle = spec.subtitle ?? '';
  const hasHeader = !!(title || subtitle);
  const titleY = title ? 22 : 14;
  const subtitleY = title ? 40 : 24;
  const headerH = hasHeader ? (subtitle ? 54 : 36) : 0;

  const sized = spec.states.map((s) => {
    const { w, h } = stateSize(s.kind, s.label);
    return { id: s.id, w, h };
  });

  const placed = layoutNodeLink(sized, spec.transitions, {
    direction: spec.direction,
    layerGap: spec.transitions.some((t) => t.label) ? 80 : 64,
    nodeGap: 32,
  });

  const byId = new Map(placed.nodes.map((n) => [n.id, n]));
  const specById = new Map(spec.states.map((s) => [s.id, s]));
  const groupHue = new Map((spec.groups ?? []).map((g) => [g.id, g.hue]));

  const offsetX = MARGIN.left;
  const offsetY = MARGIN.top + headerH;

  const nodes = placed.nodes.map((n) => {
    const s = specById.get(n.id);
    return {
      id: n.id,
      x: n.x + offsetX,
      y: n.y + offsetY,
      w: n.w,
      h: n.h,
      layer: n.layer,
      label: s.label,
      kind: s.kind,
      description: s.description,
      hue: s.hue ?? (s.group ? groupHue.get(s.group) : undefined),
      group: s.group,
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

  // Rejilla de costos: los estados se bloquean para que el A* los rodee.
  const grid = makeCostGrid(width, height);
  const posById = new Map(nodes.map((n) => [n.id, n]));
  for (const n of nodes) blockRect(grid, n.x - 6, n.y - 6, n.w + 12, n.h + 12);

  const routed = spec.transitions.map((t, i) => {
    const isSelf = t.from === t.to;
    const from = posById.get(t.from);
    const to = posById.get(t.to);
    const sides = sidesFor(byId.get(t.from), byId.get(t.to), spec.direction, isSelf);
    const a = edgeAnchor(from, sides.fromSide);
    const b = edgeAnchor(to, sides.toSide);

    // El anclaje cae sobre el borde bloqueado: se sale un paso antes de rutear.
    const out = stepOut(a, sides.fromSide, 10);
    const into = stepOut(b, sides.toSide, 10);
    const points = routeOrthogonal(
      pixelToGrid(snapDiagramGrid(out.x), snapDiagramGrid(out.y), grid.grid),
      pixelToGrid(snapDiagramGrid(into.x), snapDiagramGrid(into.y), grid.grid),
      grid,
    );

    const path = `M${a.x},${a.y} ${gridPathToSvg(points, grid.grid).slice(1)} L${b.x},${b.y}`;
    const tip = arrowTip(b, sides.toSide);
    const mid = points.length
      ? { x: points[Math.floor(points.length / 2)].col * grid.grid, y: points[Math.floor(points.length / 2)].row * grid.grid }
      : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

    // La etiqueta ocupa espacio: encarece la zona para que otras transiciones la esquiven.
    if (t.label) applyRectCost(grid, mid.x - 30, mid.y - 9, 60, 18, 6, true);

    return {
      id: t.id ?? `t${i}`,
      from: t.from,
      to: t.to,
      label: t.label,
      path,
      arrowTipX: tip.x,
      arrowTipY: tip.y,
      arrowAngle: tip.angle,
      labelX: mid.x,
      labelY: mid.y,
      hue: t.group ? groupHue.get(t.group) : undefined,
    };
  });

  return {
    width,
    height,
    nodes,
    edges: routed,
    groups: legendGroups,
    title: title || undefined,
    subtitle: subtitle || undefined,
    titleY,
    subtitleY,
    legendX,
  };
}
