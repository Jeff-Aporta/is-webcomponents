import { layoutNodeLink, edgeAnchor, pickSides } from '../_shared/node-link-layout.js';
import { diagramHeaderWidth } from '../_shared/diagram-header.js';
import { applyEdgeActorLayout } from '../_shared/diagram-edge-actors.js';
import { assignEdgeHues } from '../_shared/diagram-edge-style.js';
import { makeCostGrid, blockRect, applyRectCost, snapDiagramGrid, snapPointAwayFromSide} from '../_shared/diagram-grid.js';
import { routeOrthogonal, pixelToGrid, gridPathToSvg, buildOrthogonalPath } from '../_shared/diagram-astar.js';
import { richTextPlain } from '../_shared/tk-rich-text.js';
import { resolveTkHue } from '../_shared/tk-hue.js';
import type { BoxSide } from './diagram-types.js';

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
export const STATE_KINDS: Set<string> = new Set(['start', 'end', 'normal', 'choice']);

export type StateKind = 'start' | 'end' | 'normal' | 'choice';
export type StateDirection = 'TB' | 'BT' | 'LR' | 'RL';

const DEFAULT_HUES: number[] = [210, 239, 160, 38, 280, 199];

// BoxSide admite `'auto'`; los anclajes efectivos del router son siempre
// una dirección cardinal. Estrechamos para satisfacer la firma del helper.
type AnchorSide = 'left' | 'right' | 'top' | 'bottom';

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export interface StateSpec {
  id: string;
  label: string;
  kind: StateKind;
  group?: string;
  hue?: number;
  description?: string;
}

export interface StateTransitionSpec {
  id: string;
  from: string;
  to: string;
  label?: string;
  group?: string;
}

export interface StateGroupSpec {
  id: string;
  name: string;
  hue: number;
}

export interface StateResolvedSpec {
  title?: string;
  subtitle?: string;
  direction: StateDirection;
  groups?: StateGroupSpec[];
  states: StateSpec[];
  transitions: StateTransitionSpec[];
}

export interface StateLayoutNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  layer: number;
  label: string;
  kind: StateKind;
  description?: string;
  hue?: number;
  group?: string;
}

export interface StateLayoutTransition {
  id: string;
  from: string;
  to: string;
  label?: string;
  path: string;
  arrowTipX: number;
  arrowTipY: number;
  arrowAngle: number;
  labelX: number;
  labelY: number;
  hue?: number;
}

export interface StateLayout {
  width: number;
  height: number;
  nodes: StateLayoutNode[];
  edges: StateLayoutTransition[];
  groups?: StateGroupSpec[];
  title?: string;
  subtitle?: string;
  titleY: number;
  subtitleY: number;
  legendX: number;
}

function stateSize(kind: StateKind, label: string): { w: number; h: number } {
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

function readState(raw: Record<string, unknown>, i: number): StateSpec {
  const kindStr = String(raw.kind ?? '');
  const kind = (STATE_KINDS.has(kindStr) ? kindStr : 'normal') as StateKind;
  const label = String(raw.label ?? raw.id ?? (kind === 'start' ? '' : kind === 'end' ? '' : `Estado ${i + 1}`));
  return {
    id: String(raw.id ?? `s${i}`),
    label,
    kind,
    group: String(raw.group ?? '') || undefined,
    hue: raw.hue != null ? resolveTkHue(raw) : undefined,
    description: String(raw.desc ?? raw.description ?? '').trim() || undefined,
  };
}

function readTransition(raw: Record<string, unknown>, i: number): StateTransitionSpec {
  return {
    id: String(raw.id ?? `t${i}`),
    from: String(raw.from ?? raw.source ?? ''),
    to: String(raw.to ?? raw.target ?? ''),
    label: String(raw.label ?? '').trim() || undefined,
    group: String(raw.group ?? '') || undefined,
  };
}

function readGroups(src: Record<string, unknown>): StateGroupSpec[] | undefined {
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

/** payload → spec normalizada, o null si no hay estados. */
export function resolveStateSpec(payload: unknown): StateResolvedSpec | null {
  const p = asRecord(payload);
  const src = asRecord(p.stateDiagram ?? p.state ?? p);
  const rawStates = src.states;
  if (!Array.isArray(rawStates) || !rawStates.length) return null;

  const states: StateSpec[] = rawStates.map((raw: unknown, i: number) => readState(asRecord(raw), i));
  const known = new Set<string>(states.map((s) => s.id));
  // Descarta transiciones colgantes: una transición a un id inexistente rompería el layout.
  const transitions: StateTransitionSpec[] = (Array.isArray(src.transitions) ? src.transitions : [])
    .map((raw: unknown, i: number) => readTransition(asRecord(raw), i))
    .filter((t) => known.has(t.from) && known.has(t.to));

  const dir = String(src.direction ?? 'TB').toUpperCase();
  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? '') || undefined,
    direction: (['TB', 'BT', 'LR', 'RL'].includes(dir) ? dir : (dir === 'TD' ? 'TB' : 'TB')) as StateDirection,
    groups: readGroups(src),
    states,
    transitions,
  };
}

/** spec → objeto `stateDiagram` listo para persistir / mostrar en el editor. */
export function stateSpecToJson(spec: StateResolvedSpec): Record<string, unknown> {
  const out: Record<string, unknown> = { direction: spec.direction, states: [], transitions: [] };
  if (spec.title) out.title = spec.title;
  if (spec.subtitle) out.subtitle = spec.subtitle;
  if (spec.groups?.length) out.groups = spec.groups;
  out.states = spec.states.map((s) => {
    const row: Record<string, unknown> = { id: s.id, label: s.label };
    if (s.kind !== 'normal') row.kind = s.kind;
    if (s.group) row.group = s.group;
    if (s.description) row.desc = s.description;
    return row;
  });
  out.transitions = spec.transitions.map((t) => {
    const row: Record<string, unknown> = { from: t.from, to: t.to };
    if (t.label) row.label = t.label;
    return row;
  });
  return out;
}

/* ───────────────────────── layout ───────────────────────── */

const MARGIN = { top: 16, right: 20, bottom: 20, left: 20 };

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

/** Lados de anclaje; para self-transitions fuerza lados distintos (loop visible). */
function sidesFor(fromNode: { x: number; y: number; w: number; h: number }, toNode: { x: number; y: number; w: number; h: number }, direction: StateDirection, isSelf: boolean): { fromSide: AnchorSide; toSide: AnchorSide } {
  if (isSelf) return { fromSide: 'right', toSide: 'top' };
  // pickSides devuelve BoxSide; los narrow explícitos aquí.
  const s = pickSides(fromNode, toNode, direction);
  return { fromSide: s.fromSide as AnchorSide, toSide: s.toSide as AnchorSide };
}

/**
 * spec → geometría lista para pintar.
 */
export function computeStateLayout(spec: StateResolvedSpec): StateLayout {
  const title = spec.title ?? '';
  const subtitle = spec.subtitle ?? '';
  const hasHeader = !!(title || subtitle);
  const titleY = title ? 22 : 14;
  const subtitleY = title ? 40 : 24;
  const headerH = hasHeader ? (subtitle ? 54 : 36) : 0;

  const sized: Array<{ id: string; w: number; h: number }> = spec.states.map((s) => {
    const { w, h } = stateSize(s.kind, s.label);
    return { id: s.id, w, h };
  });

  const placed = layoutNodeLink(sized, spec.transitions, {
    direction: spec.direction,
    layerGap: spec.transitions.some((t) => t.label) ? 80 : 64,
    nodeGap: 32,
  });

  const byId = new Map<string, { id: string; x: number; y: number; w: number; h: number; layer: number }>(
    placed.nodes.map((n) => [n.id, n]),
  );
  const specById = new Map<string, StateSpec>(spec.states.map((s) => [s.id, s]));
  const groupHue = new Map<string, number>((spec.groups ?? []).map((g) => [g.id, g.hue]));

  const offsetX = MARGIN.left;
  const offsetY = MARGIN.top + headerH;

  const nodes: StateLayoutNode[] = placed.nodes.map((n) => {
    const s = specById.get(n.id);
    return {
      id: n.id,
      x: n.x + offsetX,
      y: n.y + offsetY,
      w: n.w,
      h: n.h,
      layer: n.layer,
      label: s?.label ?? '',
      kind: (s?.kind ?? 'normal') as StateKind,
      description: s?.description,
      hue: s?.hue ?? (s?.group ? groupHue.get(s.group) : undefined),
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

  // Rejilla de costos: los estados se bloquean para que el A* los rodee.
  const grid = makeCostGrid(width, height);
  const posById = new Map<string, StateLayoutNode>(nodes.map((n) => [n.id, n]));
  for (const n of nodes) blockRect(grid, n.x - 6, n.y - 6, n.w + 12, n.h + 12);

  const routed: StateLayoutTransition[] = spec.transitions.map((t, i) => {
    const isSelf = t.from === t.to;
    const from = posById.get(t.from);
    const to = posById.get(t.to);
    if (!from || !to) {
      // Transición colgante: filtrada en resolveStateSpec, defensivo.
      return {
        id: t.id ?? `t${i}`,
        from: t.from,
        to: t.to,
        label: t.label,
        path: '',
        arrowTipX: 0, arrowTipY: 0, arrowAngle: 0,
        labelX: 0, labelY: 0,
        hue: undefined,
      };
    }
    const sides = sidesFor(byId.get(t.from)!, byId.get(t.to)!, spec.direction, isSelf);
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
    const points = routeOrthogonal(aGrid, bGrid, grid);

    const path = buildOrthogonalPath(a, b, aGrid, bGrid, points, grid.grid);
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

  assignEdgeHues(routed);
  const layout: StateLayout = {
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
  applyEdgeActorLayout(layout, nodes.map((n) => ({ x: n.x, y: n.y, w: n.w, h: n.h })));
  return layout;
}

// Tipo importado para mantener el contrato (evita noUnusedLocals en strict).
export type { BoxSide };