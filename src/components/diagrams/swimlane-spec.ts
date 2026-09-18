import { richTextPlain } from '../_shared/tk-rich-text.js';
import { diagramHeaderWidth } from '../_shared/diagram-header.js';
import { applyEdgeActorLayout } from '../_shared/diagram-edge-actors.js';
import { assignEdgeHues } from '../_shared/diagram-edge-style.js';
import type { EdgeWithHue } from '../_shared/diagram-edge-style.js';
import { resolveTkHue } from '../_shared/tk-hue.js';

/**
 * Especificación y layout de diagramas de carriles (cross-functional flowchart).
 *
 * Es el diagrama de actividad con carriles: cada fila es un responsable y cada
 * columna un momento del proceso. Responde una pregunta que el flowchart normal
 * no responde — **quién** hace cada paso — y por eso vive aparte y no como un
 * modo de `<is-flowchart>`.
 *
 * La columna de un paso se puede declarar (`column`) o se deduce por orden
 * topológico: un paso va siempre a la derecha de todos los que lo alimentan.
 */

const DEFAULT_HUES: number[] = [210, 239, 160, 38, 280, 199];

export const STEP_KINDS: Set<string> = new Set(['start', 'end', 'process', 'decision']);

const LANE_LABEL_W = 132;
const COL_W = 178;
const LANE_H = 96;
const STEP_H = 44;
const STEP_MIN_W = 108;
const STEP_MAX_W = 168;
const MARGIN = { top: 16, right: 24, bottom: 20, left: 20 };

export type SwimlaneStepKind = 'start' | 'end' | 'process' | 'decision';

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export interface SwimlaneLaneSpec {
  id: string;
  name: string;
  hue: number;
  description?: string;
}

export interface SwimlaneStepSpec {
  id: string;
  lane: string;
  label: string;
  kind: SwimlaneStepKind;
  column?: number;
  description?: string;
}

export interface SwimlaneLinkSpec {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface SwimlaneResolvedSpec {
  title?: string;
  subtitle?: string;
  lanes: SwimlaneLaneSpec[];
  steps: SwimlaneStepSpec[];
  links: SwimlaneLinkSpec[];
}

export interface SwimlaneLayoutLane {
  id: string;
  name: string;
  hue: number;
  description?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  labelW: number;
}

export interface SwimlaneLayoutStep {
  id: string;
  label: string;
  kind: SwimlaneStepKind;
  lane: string;
  description?: string;
  hue?: number;
  column: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SwimlaneLayoutLink {
  id: string;
  from: string;
  to: string;
  label?: string;
  forward: boolean;
  path: string;
  arrowTipX: number;
  arrowTipY: number;
  labelX: number;
  labelY: number;
  hue?: number;
}

export interface SwimlaneLayout {
  width: number;
  height: number;
  lanes: SwimlaneLayoutLane[];
  steps: SwimlaneLayoutStep[];
  links: SwimlaneLayoutLink[];
  columns: number;
  title?: string;
  subtitle?: string;
  titleY: number;
  subtitleY: number;
}

function readLane(raw: Record<string, unknown>, i: number): SwimlaneLaneSpec {
  return {
    id: String(raw.id ?? `lane${i}`),
    name: String(raw.name ?? raw.label ?? raw.id ?? `Carril ${i + 1}`),
    hue: resolveTkHue(raw, DEFAULT_HUES[i % DEFAULT_HUES.length]),
    description: String(raw.desc ?? raw.description ?? '').trim() || undefined,
  };
}

function readStep(raw: Record<string, unknown>, i: number): SwimlaneStepSpec {
  const kind = String(raw.kind ?? raw.type ?? 'process').toLowerCase();
  const column = Number(raw.column ?? raw.col);
  return {
    id: String(raw.id ?? `s${i}`),
    lane: String(raw.lane ?? ''),
    label: String(raw.label ?? raw.name ?? raw.id ?? `Paso ${i + 1}`),
    kind: STEP_KINDS.has(kind) ? (kind as SwimlaneStepKind) : 'process',
    column: Number.isFinite(column) && column >= 0 ? Math.floor(column) : undefined,
    description: String(raw.desc ?? raw.description ?? '').trim() || undefined,
  };
}

function readLink(raw: Record<string, unknown>, i: number): SwimlaneLinkSpec {
  return {
    id: String(raw.id ?? `l${i}`),
    from: String(raw.from ?? raw.source ?? ''),
    to: String(raw.to ?? r_targetAlias(raw) ?? ''),
    label: String(raw.label ?? '').trim() || undefined,
  };
}

function r_targetAlias(raw: Record<string, unknown>): unknown {
  return raw.target;
}

/** payload → spec normalizada, o null si no hay carriles ni pasos. */
export function resolveSwimlaneSpec(payload: unknown): SwimlaneResolvedSpec | null {
  const p = asRecord(payload);
  const src = asRecord(p.swimlane ?? p.swimlaneDiagram ?? p);
  const rawSteps = src.steps ?? src.activities ?? [];
  if (!Array.isArray(rawSteps) || !rawSteps.length) return null;

  const steps: SwimlaneStepSpec[] = rawSteps.map((raw, i: number) => readStep(asRecord(raw), i));
  const declaredLanes: SwimlaneLaneSpec[] = (Array.isArray(src.lanes) ? src.lanes : [])
    .map((raw: unknown, i: number) => readLane(asRecord(raw), i));
  const byId = new Map<string, SwimlaneLaneSpec>(declaredLanes.map((l) => [l.id, l]));
  // Un paso puede nombrar un carril no declarado: se crea para no perderlo.
  let auto = declaredLanes.length;
  for (const s of steps) {
    if (!s.lane) s.lane = declaredLanes[0]?.id ?? 'lane0';
    if (!byId.has(s.lane)) byId.set(s.lane, readLane({ id: s.lane, name: s.lane }, auto++));
  }

  const known = new Set<string>(steps.map((s) => s.id));
  const linksSrc: unknown[] = Array.isArray(src.links) ? src.links
    : Array.isArray(src.flows) ? src.flows
    : [];
  const links: SwimlaneLinkSpec[] = linksSrc
    .map((raw: unknown, i: number) => readLink(asRecord(raw), i))
    .filter((l) => known.has(l.from) && known.has(l.to) && l.from !== l.to);

  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? '') || undefined,
    lanes: [...byId.values()],
    steps,
    links,
  };
}

/** spec → objeto `swimlane` listo para persistir / mostrar en el editor. */
export function swimlaneSpecToJson(spec: SwimlaneResolvedSpec): Record<string, unknown> {
  const out: { title?: string; subtitle?: string; lanes: unknown[]; steps: unknown[]; links: unknown[] } = { lanes: [], steps: [], links: [] };
  if (spec.title) out.title = spec.title;
  if (spec.subtitle) out.subtitle = spec.subtitle;
  out.lanes = spec.lanes.map((l) => {
    const row: Record<string, unknown> = { id: l.id, name: l.name, hue: l.hue };
    if (l.description) row.desc = l.description;
    return row;
  });
  out.steps = spec.steps.map((s) => {
    const row: Record<string, unknown> = { id: s.id, lane: s.lane, label: s.label };
    if (s.kind !== 'process') row.kind = s.kind;
    if (s.column != null) row.column = s.column;
    if (s.description) row.desc = s.description;
    return row;
  });
  out.links = spec.links.map((l) => {
    const row: Record<string, unknown> = { from: l.from, to: l.to };
    if (l.label) row.label = l.label;
    return row;
  });
  return out as Record<string, unknown>;
}

/**
 * Aristas de retorno: las que cierran un ciclo (reproceso). Se detectan con un
 * DFS mirando si el destino sigue en la pila de recursión.
 *
 * Importa hacerlo ANTES de repartir columnas: un reproceso empuja para atrás,
 * y si se cuenta como avance infla la columna del paso al que vuelve — que fue
 * exactamente el error que este selfcheck pilló.
 */
export function findBackEdges(steps: SwimlaneStepSpec[], links: SwimlaneLinkSpec[]): Set<string> {
  const salidas = new Map<string, SwimlaneLinkSpec[]>(steps.map((s) => [s.id, []]));
  for (const l of links) salidas.get(l.from)?.push(l);
  const estado = new Map<string, number>(steps.map((s) => [s.id, 0])); // 0 nuevo · 1 en pila · 2 cerrado
  const back = new Set<string>();

  const visitar = (id: string): void => {
    estado.set(id, 1);
    for (const l of salidas.get(id) ?? []) {
      const st = estado.get(l.to);
      if (st === 1) back.add(l.id);
      else if (st === 0) visitar(l.to);
    }
    estado.set(id, 2);
  };
  for (const s of steps) if (estado.get(s.id) === 0) visitar(s.id);
  return back;
}

/**
 * Columna de cada paso: la declarada, o el camino más largo desde un inicio,
 * ignorando los retornos (si no, el ciclo empujaría las columnas sin fin).
 */
function assignColumns(steps: SwimlaneStepSpec[], links: SwimlaneLinkSpec[], back: Set<string>): Map<string, number> {
  const col = new Map<string, number>(steps.map((s) => [s.id, s.column ?? 0]));
  const fixed = new Set<string>(steps.filter((s) => s.column != null).map((s) => s.id));
  const avance = links.filter((l) => !back.has(l.id));
  const limit = steps.length + 1;
  for (let pass = 0; pass < limit; pass++) {
    let moved = false;
    for (const l of avance) {
      if (fixed.has(l.to)) continue;
      const next = (col.get(l.from) ?? 0) + 1;
      if (next > (col.get(l.to) ?? 0)) {
        col.set(l.to, next);
        moved = true;
      }
    }
    if (!moved) break;
  }
  return col;
}

function stepWidth(label: string): number {
  const plain = richTextPlain(label);
  return Math.min(STEP_MAX_W, Math.max(STEP_MIN_W, Math.ceil(plain.length * 6.9) + 26));
}

/** Codo ortogonal: sale por la derecha, gira en el punto medio y entra por la izquierda. */
function elbowPath(a: { x: number; y: number }, b: { x: number; y: number }): string {
  if (Math.abs(a.y - b.y) < 1) return `M${a.x},${a.y} L${b.x},${b.y}`;
  const midX = (a.x + b.x) / 2;
  return `M${a.x},${a.y} H${midX} V${b.y} H${b.x}`;
}

/** Camino de retorno (reproceso): sale por abajo y vuelve por debajo del carril. */
function returnPath(a: { x: number; y: number }, b: { x: number; y: number }, bottomY: number): string {
  return `M${a.x},${a.y} V${bottomY} H${b.x} V${b.y}`;
}

/**
 * spec → geometría lista para pintar.
 */
export function computeSwimlaneLayout(spec: SwimlaneResolvedSpec): SwimlaneLayout {
  const title = spec.title ?? '';
  const subtitle = spec.subtitle ?? '';
  const titleY = title ? 22 : 14;
  const subtitleY = title ? 40 : 24;
  const headerH = title || subtitle ? (subtitle ? 54 : 36) : 0;

  const back = findBackEdges(spec.steps, spec.links);
  const colById = assignColumns(spec.steps, spec.links, back);
  const columns = Math.max(...[...colById.values()], 0) + 1;
  const laneIndex = new Map<string, number>(spec.lanes.map((l, i) => [l.id, i]));

  const originX = MARGIN.left;
  const originY = MARGIN.top + headerH;

  const lanes: SwimlaneLayoutLane[] = spec.lanes.map((l, i) => ({
    id: l.id,
    name: l.name,
    hue: l.hue,
    description: l.description,
    x: originX,
    y: originY + i * LANE_H,
    w: LANE_LABEL_W + columns * COL_W,
    h: LANE_H,
    labelW: LANE_LABEL_W,
  }));

  // Varios pasos en la misma celda (mismo carril y columna) se reparten en
  // vertical para que no queden uno encima de otro.
  const cell = new Map<string, string[]>();
  for (const s of spec.steps) {
    const key = `${s.lane}|${colById.get(s.id) ?? 0}`;
    const list = cell.get(key);
    if (list) list.push(s.id);
    else cell.set(key, [s.id]);
  }

  const steps: SwimlaneLayoutStep[] = spec.steps.map((s) => {
    const col = colById.get(s.id) ?? 0;
    const laneI = laneIndex.get(s.lane) ?? 0;
    const key = `${s.lane}|${col}`;
    const peers = cell.get(key) ?? [];
    const slot = peers.indexOf(s.id);
    const w = stepWidth(s.label);
    const cx = originX + LANE_LABEL_W + col * COL_W + COL_W / 2;
    const laneTop = originY + laneI * LANE_H;
    const spread = peers.length * (STEP_H + 10) - 10;
    const cy = laneTop + LANE_H / 2 - spread / 2 + slot * (STEP_H + 10) + STEP_H / 2;
    return {
      id: s.id,
      label: s.label,
      kind: s.kind,
      lane: s.lane,
      description: s.description,
      hue: spec.lanes[laneI]?.hue,
      column: col,
      x: cx - w / 2,
      y: cy - STEP_H / 2,
      w,
      h: STEP_H,
    };
  });

  const byId = new Map<string, SwimlaneLayoutStep>(steps.map((s) => [s.id, s]));
  const height = originY + spec.lanes.length * LANE_H + MARGIN.bottom;
  const width = Math.max(originX + LANE_LABEL_W + columns * COL_W + MARGIN.right, diagramHeaderWidth(title, subtitle));

  const links: SwimlaneLayoutLink[] = spec.links.map((l, i) => {
    const from = byId.get(l.from);
    const to = byId.get(l.to);
    if (!from || !to) {
      // Arista colgante: filtrada en resolveSwimlaneSpec, aquí no debería
      // aparecer, pero devolvemos un placeholder inocuo si llega.
      return {
        id: l.id ?? `l${i}`,
        from: l.from,
        to: l.to,
        label: l.label,
        forward: true,
        path: '',
        arrowTipX: 0,
        arrowTipY: 0,
        labelX: 0,
        labelY: 0,
        hue: undefined,
      };
    }
    // Un retorno se dibuja como reproceso aunque las columnas digan otra cosa.
    const forward = !back.has(l.id ?? `l${i}`)
      && (to.column > from.column || (to.column === from.column && to.y > from.y));
    const a = forward
      ? { x: from.x + from.w, y: from.y + from.h / 2 }
      : { x: from.x + from.w / 2, y: from.y + from.h };
    const b = forward
      ? { x: to.x, y: to.y + to.h / 2 }
      : { x: to.x + to.w / 2, y: to.y + to.h };
    const bottomY = Math.max(a.y, b.y) + 26;
    const path = forward ? elbowPath(a, b) : returnPath(a, b, bottomY);
    return {
      id: l.id ?? `l${i}`,
      from: l.from,
      to: l.to,
      label: l.label,
      forward,
      path,
      arrowTipX: b.x,
      arrowTipY: b.y,
      labelX: (a.x + b.x) / 2,
      labelY: forward ? Math.min(a.y, b.y) - 8 + (Math.abs(a.y - b.y) / 2) : bottomY - 6,
      hue: from.hue,
    };
  });

  assignEdgeHues(links as unknown as readonly EdgeWithHue[]);
  const layout: SwimlaneLayout = {
    width,
    height,
    lanes,
    steps,
    links,
    columns,
    title: title || undefined,
    subtitle: subtitle || undefined,
    titleY,
    subtitleY,
  };
  applyEdgeActorLayout(layout, steps.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h })));
  return layout;
}