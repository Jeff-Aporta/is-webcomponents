import { richTextPlain } from '../_shared/tk-rich-text.js';
import { diagramHeaderWidth } from '../_shared/diagram-header.js';
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

const DEFAULT_HUES = [210, 239, 160, 38, 280, 199];

export const STEP_KINDS = new Set(['start', 'end', 'process', 'decision']);

const LANE_LABEL_W = 132;
const COL_W = 178;
const LANE_H = 96;
const STEP_H = 44;
const STEP_MIN_W = 108;
const STEP_MAX_W = 168;
const MARGIN = { top: 16, right: 24, bottom: 20, left: 20 };

function asRecord(v) {
  return v && typeof v === 'object' ? v : {};
}

function readLane(raw, i) {
  const r = asRecord(raw);
  return {
    id: String(r.id ?? `lane${i}`),
    name: String(r.name ?? r.label ?? r.id ?? `Carril ${i + 1}`),
    hue: resolveTkHue(r, DEFAULT_HUES[i % DEFAULT_HUES.length]),
    description: String(r.desc ?? r.description ?? '').trim() || undefined,
  };
}

function readStep(raw, i) {
  const r = asRecord(raw);
  const kind = String(r.kind ?? r.type ?? 'process').toLowerCase();
  const column = Number(r.column ?? r.col);
  return {
    id: String(r.id ?? `s${i}`),
    lane: String(r.lane ?? ''),
    label: String(r.label ?? r.name ?? r.id ?? `Paso ${i + 1}`),
    kind: STEP_KINDS.has(kind) ? kind : 'process',
    column: Number.isFinite(column) && column >= 0 ? Math.floor(column) : undefined,
    description: String(r.desc ?? r.description ?? '').trim() || undefined,
  };
}

function readLink(raw, i) {
  const r = asRecord(raw);
  return {
    id: String(r.id ?? `l${i}`),
    from: String(r.from ?? r.source ?? ''),
    to: String(r.to ?? r.target ?? ''),
    label: String(r.label ?? '').trim() || undefined,
  };
}

/** payload → spec normalizada, o null si no hay carriles ni pasos. */
export function resolveSwimlaneSpec(payload) {
  const p = asRecord(payload);
  const src = asRecord(p.swimlane ?? p.swimlaneDiagram ?? p);
  const rawSteps = src.steps ?? src.activities ?? [];
  if (!Array.isArray(rawSteps) || !rawSteps.length) return null;

  const steps = rawSteps.map(readStep);
  const declaredLanes = (Array.isArray(src.lanes) ? src.lanes : []).map(readLane);
  const byId = new Map(declaredLanes.map((l) => [l.id, l]));
  // Un paso puede nombrar un carril no declarado: se crea para no perderlo.
  let auto = declaredLanes.length;
  for (const s of steps) {
    if (!s.lane) s.lane = declaredLanes[0]?.id ?? 'lane0';
    if (!byId.has(s.lane)) byId.set(s.lane, readLane({ id: s.lane, name: s.lane }, auto++));
  }

  const known = new Set(steps.map((s) => s.id));
  const links = (Array.isArray(src.links ?? src.flows) ? (src.links ?? src.flows) : [])
    .map(readLink)
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
export function swimlaneSpecToJson(spec) {
  const out = { lanes: [], steps: [], links: [] };
  if (spec.title) out.title = spec.title;
  if (spec.subtitle) out.subtitle = spec.subtitle;
  out.lanes = spec.lanes.map((l) => {
    const row = { id: l.id, name: l.name, hue: l.hue };
    if (l.description) row.desc = l.description;
    return row;
  });
  out.steps = spec.steps.map((s) => {
    const row = { id: s.id, lane: s.lane, label: s.label };
    if (s.kind !== 'process') row.kind = s.kind;
    if (s.column != null) row.column = s.column;
    if (s.description) row.desc = s.description;
    return row;
  });
  out.links = spec.links.map((l) => {
    const row = { from: l.from, to: l.to };
    if (l.label) row.label = l.label;
    return row;
  });
  return out;
}

/**
 * Aristas de retorno: las que cierran un ciclo (reproceso). Se detectan con un
 * DFS mirando si el destino sigue en la pila de recursión.
 *
 * Importa hacerlo ANTES de repartir columnas: un reproceso empuja para atrás,
 * y si se cuenta como avance infla la columna del paso al que vuelve — que fue
 * exactamente el error que este selfcheck pilló.
 */
export function findBackEdges(steps, links) {
  const salidas = new Map(steps.map((s) => [s.id, []]));
  for (const l of links) salidas.get(l.from)?.push(l);
  const estado = new Map(steps.map((s) => [s.id, 0])); // 0 nuevo · 1 en pila · 2 cerrado
  const back = new Set();

  const visitar = (id) => {
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
function assignColumns(steps, links, back) {
  const col = new Map(steps.map((s) => [s.id, s.column ?? 0]));
  const fixed = new Set(steps.filter((s) => s.column != null).map((s) => s.id));
  const avance = links.filter((l) => !back.has(l.id));
  const limit = steps.length + 1;
  for (let pass = 0; pass < limit; pass++) {
    let moved = false;
    for (const l of avance) {
      if (fixed.has(l.to)) continue;
      const next = col.get(l.from) + 1;
      if (next > col.get(l.to)) {
        col.set(l.to, next);
        moved = true;
      }
    }
    if (!moved) break;
  }
  return col;
}

function stepWidth(label) {
  const plain = richTextPlain(label);
  return Math.min(STEP_MAX_W, Math.max(STEP_MIN_W, Math.ceil(plain.length * 6.9) + 26));
}

/** Codo ortogonal: sale por la derecha, gira en el punto medio y entra por la izquierda. */
function elbowPath(a, b) {
  if (Math.abs(a.y - b.y) < 1) return `M${a.x},${a.y} L${b.x},${b.y}`;
  const midX = (a.x + b.x) / 2;
  return `M${a.x},${a.y} H${midX} V${b.y} H${b.x}`;
}

/** Camino de retorno (reproceso): sale por abajo y vuelve por debajo del carril. */
function returnPath(a, b, bottomY) {
  return `M${a.x},${a.y} V${bottomY} H${b.x} V${b.y}`;
}

/**
 * spec → geometría lista para pintar.
 * @returns {{width:number, height:number, lanes:Array, steps:Array, links:Array, columns:number, title?:string, subtitle?:string, titleY:number, subtitleY:number}}
 */
export function computeSwimlaneLayout(spec) {
  const title = spec.title ?? '';
  const subtitle = spec.subtitle ?? '';
  const titleY = title ? 22 : 14;
  const subtitleY = title ? 40 : 24;
  const headerH = title || subtitle ? (subtitle ? 54 : 36) : 0;

  const back = findBackEdges(spec.steps, spec.links);
  const colById = assignColumns(spec.steps, spec.links, back);
  const columns = Math.max(...[...colById.values()], 0) + 1;
  const laneIndex = new Map(spec.lanes.map((l, i) => [l.id, i]));

  const originX = MARGIN.left;
  const originY = MARGIN.top + headerH;

  const lanes = spec.lanes.map((l, i) => ({
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
  const cell = new Map();
  for (const s of spec.steps) {
    const key = `${s.lane}|${colById.get(s.id)}`;
    if (!cell.has(key)) cell.set(key, []);
    cell.get(key).push(s.id);
  }

  const steps = spec.steps.map((s) => {
    const col = colById.get(s.id);
    const laneI = laneIndex.get(s.lane) ?? 0;
    const key = `${s.lane}|${col}`;
    const peers = cell.get(key);
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

  const byId = new Map(steps.map((s) => [s.id, s]));
  const height = originY + spec.lanes.length * LANE_H + MARGIN.bottom;
  const width = Math.max(originX + LANE_LABEL_W + columns * COL_W + MARGIN.right, diagramHeaderWidth(title, subtitle));

  const links = spec.links.map((l, i) => {
    const from = byId.get(l.from);
    const to = byId.get(l.to);
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
      labelX: forward ? (a.x + b.x) / 2 : (a.x + b.x) / 2,
      labelY: forward ? Math.min(a.y, b.y) - 8 + (Math.abs(a.y - b.y) / 2) : bottomY - 6,
      hue: from.hue,
    };
  });

  return {
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
}
