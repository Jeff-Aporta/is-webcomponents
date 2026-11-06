import { snapDiagramGrid } from '@jeff-aporta/iswc-base/core/diagram-grid.js';
import type { TimeScale, TickUnit, TimeTick, LaneItem, PackedLaneItem, PackLanesOpts, LayoutLanesOpts, PositionedLaneItem, LayoutLane, LayoutLanesResult, SwimlaneStepKind, SwimlaneLaneSpec, SwimlaneStepSpec, SwimlaneLinkSpec, SwimlaneResolvedSpec, SwimlaneLayoutLane, SwimlaneLayoutStep, SwimlaneLayoutLink, SwimlaneLayout } from '@jeff-aporta/iswc-base/components/diagrams/schemas/swimlane-spec.schemas.js';
import { richTextPlain } from '@jeff-aporta/iswc-base/core/tk-text.js';
import { aristasDeRetorno, claveArista } from './diagram-layout.js';
import { diagramHeaderWidth } from './diagram-model.js';
import { applyEdgeActorLayout } from './diagram-edge-actors.js';
import { assignEdgeHues } from './diagram-edges.js';
import { resolveTkHue, SERIE_HUES } from '@jeff-aporta/iswc-base/core/color.js';


// ── lane-layout ──
/**
 * Motor de layout puro (sin DOM) para diagramas de línea de tiempo (Gantt,
 * timeline). Resuelve fechas, escalas de tiempo, marcas de eje "agradables"
 * y empaquetado de intervalos en carriles (interval partitioning greedy).
 * Sin dependencias externas: se puede testear con Node puro.
 */
const HOUR_MS = 3600000;
const DAY_MS = 86400000;

/**
 * Convierte un valor de fecha a epoch ms. Acepta `YYYY-MM-DD`,
 * `YYYY-MM-DDTHH:mm` (también con espacio en vez de `T`) y un número epoch.
 * `YYYY-MM-DD` se interpreta como MEDIANOCHE LOCAL (no UTC): en zonas con
 * offset negativo (como Colombia) parsear como UTC desplaza la barra un día.
 */
export function parseDate(v: string | number | null | undefined): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  const s = String(v ?? '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(s);
  if (!m) return NaN;
  const [, y, mo, d, h, mi] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d), Number(h ?? 0), Number(mi ?? 0), 0, 0);
  return dt.getTime();
}

/**
 * Suma una duración tipo `'3d'`, `'2w'`, `'6h'`, `'1M'` a un epoch ms.
 * d=día, w=semana, h=hora, M=mes calendario (respeta la longitud real del mes).
 */
export function addDuration(startMs: number, spec: string | null | undefined): number {
  const m = /^(\d+)([dwhM])$/.exec(String(spec ?? '').trim());
  if (!m || !Number.isFinite(startMs)) return NaN;
  const n = Number(m[1]);
  switch (m[2]) {
    case 'h': return startMs + n * HOUR_MS;
    case 'd': return startMs + n * DAY_MS;
    case 'w': return startMs + n * 7 * DAY_MS;
    case 'M': {
      const dt = new Date(startMs);
      dt.setMonth(dt.getMonth() + n);
      return dt.getTime();
    }
    default: return NaN;
  }
}

/** Escala lineal tiempo → píxel. */

/**
 * Escala lineal tiempo → píxel. `domain`/`range` son `[min, max]`.
 */
export function timeScale(domain: readonly [number, number], range: readonly [number, number]): TimeScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const dspan = (d1 - d0) || 1;
  const rspan = r1 - r0;
  const scale = ((ms: number): number => r0 + ((ms - d0) / dspan) * rspan) as TimeScale;
  scale.invert = (px: number) => d0 + ((px - r0) / (rspan || 1)) * dspan;
  return scale;
}

function floorHour(ms: number): number { const d = new Date(ms); d.setMinutes(0, 0, 0); return d.getTime(); }
function floorDay(ms: number): number { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
function floorMonth(ms: number): number { const d = new Date(ms); d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime(); }
function floorYear(ms: number): number { const d = new Date(ms); d.setMonth(0, 1); d.setHours(0, 0, 0, 0); return d.getTime(); }
function addHours(ms: number, n: number): number { return ms + n * HOUR_MS; }
function addDays(ms: number, n: number): number { const d = new Date(ms); d.setDate(d.getDate() + n); return d.getTime(); }
function addMonths(ms: number, n: number): number { const d = new Date(ms); d.setMonth(d.getMonth() + n); return d.getTime(); }
function addYears(ms: number, n: number): number { const d = new Date(ms); d.setFullYear(d.getFullYear() + n); return d.getTime(); }

// Pasos candidatos por unidad; step=7 en 'day' da un efecto "semana", step=3
// en 'month' da un efecto "trimestre" — sin duplicar ramas por cada nombre.
function stepCandidates(unit: TickUnit): number[] {
  if (unit === 'hour') return [1, 2, 3, 4, 6, 12];
  if (unit === 'day') return [1, 2, 3, 7, 14];
  if (unit === 'month') return [1, 2, 3, 6];
  return [1, 2, 5, 10, 20, 50];
}

/** Marca producida por `niceTimeTicks`. */

/**
 * Marcas de eje "agradables" entre `minMs` y `maxMs`. Elige la unidad
 * (hora/día/semana/mes/trimestre/año) según el rango total y apunta a
 * `target` marcas. `label` se formatea con `Intl.DateTimeFormat('es-CO')`.
 * `major` es `true` en los límites que merecen una gridline más marcada
 * (p. ej. inicio de mes cuando el paso es por días).
 */
export function niceTimeTicks(minMs: number, maxMs: number, target: number = 6): TimeTick[] {
  if (!Number.isFinite(minMs) || !Number.isFinite(maxMs) || maxMs <= minMs) return [];
  const span = maxMs - minMs;

  const fmtHour = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const fmtDay = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' });
  const fmtMonth = new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric' });
  const fmtYear = new Intl.DateTimeFormat('es-CO', { year: 'numeric' });

  let unit: TickUnit;
  if (span <= DAY_MS * 3) unit = 'hour';
  else if (span <= DAY_MS * 400) unit = 'day';
  else if (span <= DAY_MS * 365 * 8) unit = 'month';
  else unit = 'year';

  const approxUnitMs = unit === 'hour' ? HOUR_MS : unit === 'day' ? DAY_MS : unit === 'month' ? DAY_MS * 30 : DAY_MS * 365;
  let bestStep = stepCandidates(unit)[0]!;
  let bestDiff = Infinity;
  for (const c of stepCandidates(unit)) {
    const diff = Math.abs(span / (approxUnitMs * c) - target);
    if (diff < bestDiff) { bestDiff = diff; bestStep = c; }
  }

  const floorFn = unit === 'hour' ? floorHour : unit === 'day' ? floorDay : unit === 'month' ? floorMonth : floorYear;
  const addFn = unit === 'hour' ? addHours : unit === 'day' ? addDays : unit === 'month' ? addMonths : addYears;
  const fmtFn = unit === 'hour' ? fmtHour : unit === 'day' ? fmtDay : unit === 'month' ? fmtMonth : fmtYear;
  const majorFn = (ms: number): boolean => {
    const d = new Date(ms);
    if (unit === 'hour') return d.getHours() === 0;
    if (unit === 'day') return d.getDate() === 1;
    if (unit === 'month') return d.getMonth() === 0;
    return true;
  };

  const ticks: TimeTick[] = [];
  let t = floorFn(minMs);
  let guard = 0;
  while (t <= maxMs && guard < 1000) {
    if (t >= minMs) ticks.push({ ms: t, label: fmtFn.format(new Date(t)), major: majorFn(t) });
    t = addFn(t, bestStep);
    guard += 1;
  }
  return ticks;
}

/** Item de Gantt/timeline: id, inicio, fin, más campos arbitrarios. */

/** Item tras `packLanes`: incluye el índice de carril asignado. */

/**
 * Asigna un carril a cada ítem. Si se da `laneKey`, agrupa por ese campo
 * (un carril por valor distinto, en orden de aparición). Si no, empaqueta
 * codiciosamente por el menor número de carriles tal que ningún par de
 * ítems del mismo carril se solape en el tiempo (interval partitioning:
 * ordena por inicio, coloca cada ítem en el primer carril cuyo último fin
 * sea <= su inicio).
 */
export function packLanes(items: readonly LaneItem[], opts: PackLanesOpts = {}): PackedLaneItem[] {
  const { laneKey } = opts;
  if (laneKey) {
    const laneOf = new Map<unknown, number>();
    for (const it of items) {
      const k = (it as Record<string, unknown>)[laneKey] ?? '';
      if (!laneOf.has(k)) laneOf.set(k, laneOf.size);
    }
    return items.map((it) => ({ ...it, lane: laneOf.get((it as Record<string, unknown>)[laneKey] ?? '')! }));
  }

  const order = items.map((it, i) => ({ it, i })).sort((a, b) => a.it.start - b.it.start || a.i - b.i);
  const laneEnds: number[] = [];
  const laneByIndex = new Map<number, number>();
  for (const { it, i } of order) {
    let lane = laneEnds.findIndex((end) => end <= it.start);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(it.end ?? it.start); }
    else laneEnds[lane] = it.end ?? it.start;
    laneByIndex.set(i, lane);
  }
  return items.map((it, i) => ({ ...it, lane: laneByIndex.get(i) ?? 0 }));
}

/**
 * Layout completo: escala de tiempo, carriles y coordenadas px.
 */
export function layoutLanes(items: readonly LaneItem[], opts: LayoutLanesOpts = {}): LayoutLanesResult {
  const { width = 800, rowH = 28, rowGap = 6, laneKey, domain: domainOpt } = opts;

  if (!items.length) {
    return { items: [], lanes: [], width, height: 0, scale: timeScale([0, 1], [0, width]), ticks: [] };
  }

  let domain: [number, number] | undefined = domainOpt ? [domainOpt[0], domainOpt[1]] : undefined;
  if (!domain) {
    let min = Infinity;
    let max = -Infinity;
    for (const it of items) {
      min = Math.min(min, it.start);
      max = Math.max(max, it.end ?? it.start);
    }
    if (min === max) { min -= DAY_MS; max += DAY_MS; }
    const pad = (max - min) * 0.04;
    domain = [min - pad, max + pad];
  }

  const scale = timeScale(domain, [0, width]);
  const packed = packLanes(items, { laneKey });

  // Un único snap sobre el paso de carril evita que el redondeo por-fila
  // acumule error hasta solapar filas consecutivas.
  const rowStep = Math.max(8, snapDiagramGrid(rowH + rowGap));

  const laneKeys: number[] = [];
  const laneLabel = new Map<number, string>();
  for (const it of packed) {
    if (!laneLabel.has(it.lane)) {
      laneKeys.push(it.lane);
      laneLabel.set(it.lane, laneKey ? String((it as Record<string, unknown>)[laneKey] ?? '') : `Carril ${it.lane + 1}`);
    }
  }
  laneKeys.sort((a, b) => a - b);
  const laneY = new Map<number, number>(laneKeys.map((k, i) => [k, i * rowStep]));

  const lanes: LayoutLane[] = laneKeys.map((k) => ({ key: k, label: laneLabel.get(k)!, y: laneY.get(k)!, h: rowH }));

  const outItems: PositionedLaneItem[] = packed.map((it) => {
    const x0 = scale(it.start);
    const x1 = scale(it.end ?? it.start);
    return {
      id: it.id,
      x: snapDiagramGrid(x0),
      y: laneY.get(it.lane)!,
      w: Math.max(8, snapDiagramGrid(x1 - x0)),
      h: rowH,
      lane: it.lane,
    };
  });

  const height = lanes.length ? (lanes[lanes.length - 1]!.y + rowH) : 0;
  const ticks = niceTimeTicks(domain[0], domain[1]);

  return { items: outItems, lanes, width, height, scale, ticks };
}

// ── swimlane-spec ──
/**
 * Especificación y layout de diagramas de carriles (cross-functional flowchart).
 *
 * Es el diagrama de actividad con carriles: cada fila es un responsable y cada
 * columna un momento del proceso. Responde una pregunta que el flowchart normal
 * no responde — **quién** hace cada paso — y por eso vive aparte y no como un
 * modo de `<iswc-flowchart>`.
 *
 * La columna de un paso se puede declarar (`column`) o se deduce por orden
 * topológico: un paso va siempre a la derecha de todos los que lo alimentan.
 */

const DEFAULT_HUES = SERIE_HUES;

export const STEP_KINDS: Set<string> = new Set(['start', 'end', 'process', 'decision']);

const LANE_LABEL_W = 132;
const COL_W = 178;
const LANE_H = 96;
const STEP_H = 44;
const STEP_MIN_W = 108;
const STEP_MAX_W = 168;
const MARGIN = { top: 16, right: 24, bottom: 20, left: 20 };

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
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
  const atras = aristasDeRetorno(steps.map((s) => s.id), links);
  return new Set(links.filter((l) => atras.has(claveArista(l))).map((l) => l.id));
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

  assignEdgeHues(links);
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
