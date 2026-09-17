import { parseDate, timeScale, packLanes } from '../_shared/lane-layout.js';
import { resolveTkHue } from '../_shared/tk-hue.js';

/**
 * Especificación y layout de líneas de tiempo (sin Mermaid).
 *
 * Mismo contrato que flowchart/Gantt: entrada JSON, salida geometría pura.
 * Usa `lane-layout.js` para la escala de tiempo y `packLanes` para separar
 * eventos que caen demasiado cerca en el tiempo (colisión de tarjetas).
 */

const DEFAULT_HUES: number[] = [199, 239, 160, 38, 280, 210];

const MARGIN = { top: 16, right: 24, bottom: 20, left: 24 };
const AXIS_MARGIN = 28;
const CARD_W = 168;
const CARD_H = 40;
const STEM_BASE = 28;
const DEPTH_GAP = 10;
const DEFAULT_AXIS_LEN = 640;
/** Hueco máximo entre dos eventos consecutivos (px). Evita ejes largos vacíos. */
const MAX_EVENT_GAP_PX = 200;

export type TimelineOrientation = 'horizontal' | 'vertical';

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export interface TimelineEventSpec {
  id: string;
  label: string;
  date: unknown;
  group?: string;
  hue?: number;
  description?: string;
}

export interface TimelineGroupSpec {
  id: string;
  name: string;
  hue: number;
}

export interface TimelineResolvedSpec {
  title?: string;
  orientation: TimelineOrientation;
  groups?: TimelineGroupSpec[];
  events: TimelineEventSpec[];
}

export interface TimelineLayoutEvent {
  id: string;
  label: string;
  desc?: string;
  hue?: number;
  group?: string;
  ms: number;
  dateText?: string;
  dotX: number;
  dotY: number;
  side: number;
  cardX: number;
  cardY: number;
  cardW: number;
  cardH: number;
}

export interface TimelineTick {
  ms: number;
  label: string;
  pos: number;
}

export interface TimelineLayout {
  width: number;
  height: number;
  orientation: TimelineOrientation;
  title?: string;
  titleY: number;
  axisX0: number;
  axisY0: number;
  axisLen: number;
  events: TimelineLayoutEvent[];
  ticks: TimelineTick[];
  todayPos?: number;
  groups?: TimelineGroupSpec[];
  legendX: number;
}

export interface TimelineLayoutOptions {
  width?: number;
  now?: number;
}

/**
 * Escala tiempo→px que comprime huecos temporales grandes entre eventos.
 * No re-estira al eje completo: el eje se acorta al contenido comprimido.
 * @param sortedMs eventos ordenados asc por ms
 * @param r0 offset inicial (px) del primer evento
 * @param maxGapPx tope de hueco entre eventos consecutivos
 */
interface CompressedScale {
  (ms: number): number;
  invert: (px: number) => number;
  span: number;
}

function compressedEventScale(sortedMs: number[], r0: number, maxGapPx: number): CompressedScale {
  const n = sortedMs.length;
  if (n === 0) {
    const s = timeScale([0, 1], [r0, r0 + 1]) as unknown as CompressedScale;
    s.span = 1;
    return s;
  }
  if (n === 1) {
    const scale = ((): CompressedScale => {
      const fn = ((_ms: number): number => r0) as CompressedScale;
      fn.invert = ((): number => sortedMs[0]!);
      fn.span = 0;
      return fn;
    })();
    return scale;
  }
  const rawGaps: number[] = [];
  for (let i = 1; i < n; i++) rawGaps.push(Math.max(1, sortedMs[i]! - sortedMs[i - 1]!));
  const sortedGaps = [...rawGaps].sort((a, b) => a - b);
  const median = sortedGaps[Math.floor(sortedGaps.length / 2)] || 1;
  // Cap temporal ~3× mediana; luego cap duro en px.
  const cappedMs: number[] = rawGaps.map((g: number) => Math.min(g, median * 3));
  const sumMs = cappedMs.reduce((a, b) => a + b, 0) || 1;
  // Primera pasada proporcional a un eje generoso; luego hard-cap px.
  const provisional = Math.max(sumMs > 0 ? (n - 1) * maxGapPx : maxGapPx, 120);
  const px: number[] = [r0];
  for (let i = 0; i < cappedMs.length; i++) {
    const ideal = ((cappedMs[i] ?? 1) / sumMs) * provisional;
    px.push((px[i] ?? r0) + Math.min(Math.max(ideal, 24), maxGapPx));
  }
  const scale = ((ms: number): number => {
    if (ms <= sortedMs[0]!) return px[0] ?? r0;
    if (ms >= sortedMs[n - 1]!) return px[n - 1] ?? r0;
    for (let i = 0; i < n - 1; i++) {
      if (ms <= sortedMs[i + 1]!) {
        const span = (sortedMs[i + 1]! - sortedMs[i]!) || 1;
        const t = (ms - sortedMs[i]!) / span;
        return (px[i] ?? r0) + t * ((px[i + 1] ?? r0) - (px[i] ?? r0));
      }
    }
    return px[n - 1] ?? r0;
  }) as CompressedScale;
  scale.invert = ((p: number): number => {
    if (p <= (px[0] ?? r0)) return sortedMs[0]!;
    if (p >= (px[n - 1] ?? r0)) return sortedMs[n - 1]!;
    for (let i = 0; i < n - 1; i++) {
      if (p <= (px[i + 1] ?? r0)) {
        const span = ((px[i + 1] ?? r0) - (px[i] ?? r0)) || 1;
        const t = (p - (px[i] ?? r0)) / span;
        return sortedMs[i]! + t * (sortedMs[i + 1]! - sortedMs[i]!);
      }
    }
    return sortedMs[n - 1]!;
  });
  scale.span = (px[n - 1] ?? r0) - (px[0] ?? r0);
  return scale;
}

function readGroups(src: Record<string, unknown>): TimelineGroupSpec[] | undefined {
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

function readEvent(raw: Record<string, unknown>, i: number): TimelineEventSpec {
  return {
    id: String(raw.id ?? `e${i}`),
    label: String(raw.label ?? raw.text ?? raw.id ?? `Evento ${i + 1}`),
    date: raw.date ?? raw.start,
    group: String(raw.group ?? '') || undefined,
    hue: raw.hue != null ? resolveTkHue(raw) : undefined,
    description: String(raw.desc ?? raw.description ?? '').trim() || undefined,
  };
}

/** payload → spec normalizada, o null si no hay eventos. */
export function timelineSpecFromPayload(payload: unknown): TimelineResolvedSpec | null {
  const p = asRecord(payload);
  const src = asRecord(p.timeline ?? p);
  const rawEvents = src.events;
  if (!Array.isArray(rawEvents) || !rawEvents.length) return null;

  const orientationRaw = String(src.orientation ?? 'horizontal').toLowerCase();
  const orientation: TimelineOrientation = orientationRaw === 'vertical' ? 'vertical' : 'horizontal';
  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    orientation,
    groups: readGroups(src),
    events: rawEvents.map((raw: unknown, i: number) => readEvent(asRecord(raw), i)),
  };
}

export function resolveTimelineSpec(payload: unknown): TimelineResolvedSpec | null {
  return timelineSpecFromPayload(payload);
}

/**
 * spec → geometría lista para pintar.
 */
export function computeTimelineLayout(spec: TimelineResolvedSpec, opts: TimelineLayoutOptions = {}): TimelineLayout {
  const orientation: TimelineOrientation = spec.orientation === 'vertical' ? 'vertical' : 'horizontal';
  const axisLen = opts.width ?? DEFAULT_AXIS_LEN;
  const now = opts.now;

  const title = spec.title ?? '';
  const headerH = title ? 30 : 8;

  const groupHue = new Map<string, number>((spec.groups ?? []).map((g) => [g.id, g.hue]));

  const events: Array<TimelineEventSpec & { ms: number }> = spec.events
    .map((e) => ({ ...e, ms: parseDate(e.date as string | number) }))
    .filter((e): e is TimelineEventSpec & { ms: number } => Number.isFinite(e.ms))
    .sort((a, b) => a.ms - b.ms);

  let min = Infinity;
  let max = -Infinity;
  for (const e of events) { min = Math.min(min, e.ms); max = Math.max(max, e.ms); }
  if (!Number.isFinite(min)) { min = 0; max = 86400000; }
  if (min === max) { min -= 86400000; max += 86400000; }
  // Menos aire en extremos; la escala comprimida evita huecos enormes entre
  // eventos temporalmente lejanos (el eje se acorta al contenido).
  const pad = (max - min) * 0.04;
  const domain: [number, number] = [min - pad, max + pad];

  const CARD_FOOTPRINT_PX = orientation === 'horizontal' ? CARD_W : CARD_H;
  const MIN_GAP_PX = CARD_FOOTPRINT_PX + 8;
  const maxGapPx = Math.max(MAX_EVENT_GAP_PX, MIN_GAP_PX);

  // Empaquetado de carriles en dominio temporal (huella centrada en el evento).
  // Usamos un scale lineal provisional solo para traducir MIN_GAP_PX → ms.
  const provisional = timeScale(domain, [0, Math.max(axisLen, 1)]);
  const minGapMs = Math.max(1, Math.abs(provisional.invert(MIN_GAP_PX) - provisional.invert(0)));
  const packed = packLanes(events.map((e) => ({ id: e.id, start: e.ms - minGapMs / 2, end: e.ms + minGapMs / 2 })));
  const laneOf = new Map<string, number>(packed.map((p: { id: string; lane: number }) => [p.id, p.lane]));

  let maxAboveDepth = 0;
  let maxBelowDepth = 0;
  let maxDepth = 0;
  for (const e of events) {
    const lane = laneOf.get(e.id) ?? 0;
    if (orientation === 'horizontal') {
      const depth = Math.floor(lane / 2);
      if (lane % 2 === 0) maxAboveDepth = Math.max(maxAboveDepth, depth);
      else maxBelowDepth = Math.max(maxBelowDepth, depth);
    } else {
      maxDepth = Math.max(maxDepth, lane);
    }
  }

  const aboveSpace = STEM_BASE + maxAboveDepth * (CARD_H + DEPTH_GAP) + CARD_H;
  const belowSpace = STEM_BASE + maxBelowDepth * (CARD_H + DEPTH_GAP) + CARD_H;
  const rightSpace = STEM_BASE + maxDepth * (CARD_W + DEPTH_GAP) + CARD_W;

  const sortedMs = events.map((e) => e.ms);
  const scale = compressedEventScale(sortedMs, 0, maxGapPx);
  // Eje = contenido comprimido, tope el width pedido (no estirar huecos).
  const usedAxisLen = Math.min(Math.max(scale.span, events.length > 1 ? 120 : 40), axisLen);

  let width: number;
  let height: number;
  let axisX0: number;
  let axisY0: number;
  if (orientation === 'horizontal') {
    axisX0 = MARGIN.left + AXIS_MARGIN;
    axisY0 = MARGIN.top + headerH + aboveSpace;
    width = axisX0 + usedAxisLen + MARGIN.right + AXIS_MARGIN;
    height = axisY0 + belowSpace + MARGIN.bottom;
  } else {
    axisX0 = MARGIN.left + 16;
    axisY0 = MARGIN.top + headerH + AXIS_MARGIN;
    width = axisX0 + rightSpace + MARGIN.right;
    height = axisY0 + usedAxisLen + MARGIN.bottom + AXIS_MARGIN;
  }

  const outEvents: TimelineLayoutEvent[] = events.map((e) => {
    const lane = laneOf.get(e.id) ?? 0;
    const hue = e.hue ?? (e.group ? groupHue.get(e.group) : undefined);
    const d = new Date(e.ms);
    // La fecha del evento, formateada, para pintarla en la tarjeta: el dato
    // temporal del componente no se veía en ningún sitio (los ticks del eje
    // están comprimidos y no llevan texto).
    const dateText = Number.isFinite(e.ms)
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      : undefined;
    const base = {
      id: e.id, label: e.label, desc: e.description, hue, group: e.group, ms: e.ms, dateText,
    };
    if (orientation === 'horizontal') {
      const side = lane % 2 === 0 ? -1 : 1; // -1 arriba, 1 abajo
      const depth = Math.floor(lane / 2);
      const dotX = axisX0 + scale(e.ms);
      const dotY = axisY0;
      const stemLen = STEM_BASE + depth * (CARD_H + DEPTH_GAP);
      const cardY = dotY + side * stemLen - (side < 0 ? CARD_H : 0);
      return {
        ...base, dotX, dotY, side, cardX: dotX - CARD_W / 2, cardY, cardW: CARD_W, cardH: CARD_H,
      };
    }
    const depth = lane;
    const dotX = axisX0;
    const dotY = axisY0 + scale(e.ms);
    const stemLen = STEM_BASE + depth * (CARD_W + DEPTH_GAP);
    const cardX = dotX + stemLen;
    return {
      ...base, dotX, dotY, side: 1, cardX, cardY: dotY - CARD_H / 2, cardW: CARD_W, cardH: CARD_H,
    };
  });

  // Ticks solo en eventos (eje comprimido no es lineal: ticks "nice" se apiñan).
  const ticks: TimelineTick[] = events.map((e) => {
    const d = new Date(e.ms);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return {
      ms: e.ms,
      label,
      pos: orientation === 'horizontal' ? axisX0 + scale(e.ms) : axisY0 + scale(e.ms),
    };
  });

  const todayPos = (now !== undefined && Number.isFinite(now) && now >= domain[0] && now <= domain[1])
    ? (orientation === 'horizontal' ? axisX0 + scale(now) : axisY0 + scale(now))
    : undefined;

  // La tarjeta va CENTRADA en su punto, así que la del primer evento se sale
  // por la izquierda del lienzo (y la del último por la derecha): el PNG salía
  // con el texto cortado. Se corrige moviendo el eje y ensanchando, no
  // recortando la tarjeta.
  if (orientation === 'horizontal' && outEvents.length) {
    const desbordeIzq = Math.max(0, MARGIN.left - Math.min(...outEvents.map((e) => e.cardX)));
    if (desbordeIzq > 0) {
      axisX0 += desbordeIzq;
      for (const e of outEvents) { e.dotX += desbordeIzq; e.cardX += desbordeIzq; }
      for (const t of ticks) t.pos += desbordeIzq;
      width += desbordeIzq;
    }
    const bordeDer = Math.max(...outEvents.map((e) => e.cardX + e.cardW));
    width = Math.max(width, bordeDer + MARGIN.right);
  }

  const legendGroups = spec.groups?.length ? spec.groups : undefined;
  const legendW = legendGroups
    ? Math.max(...legendGroups.map((g) => Math.ceil(g.name.length * 6) + 30))
    : 0;
  let legendX = 0;
  if (legendGroups) {
    // La leyenda vive en una BANDA superior derecha (mismas coordenadas que
    // usa `#buildLegend`: una fila de 16px por grupo). Empujarla a la derecha
    // de la tarjeta más extendida del diagrama entero desperdiciaba todo el
    // ancho cuando esa tarjeta estaba abajo, lejos de la banda; y a la vez
    // dejaba pasar el solape real con una tarjeta que sí cruzaba la banda.
    // Solo cuentan las tarjetas que comparten franja vertical con la leyenda.
    const legendTop = 20 + 18 - 8;
    const legendBottom = legendTop + legendGroups.length * 16;
    legendX = Math.max(8, width - legendW - 8);

    // Ante un choque con la leyenda, el diagrama BAJA — no se estrecha ni se
    // corre a la izquierda. Empujar la leyenda a la derecha desperdiciaba el
    // ancho y, en horizontal, terminaba cortando la primera tarjeta.
    const invade = (e: TimelineLayoutEvent): boolean => e.cardY < legendBottom
      && e.cardY + e.cardH > legendTop
      && e.cardX + e.cardW > legendX - 12;
    const choque = outEvents.filter(invade);
    if (choque.length) {
      const desplazo = Math.ceil(legendBottom - Math.min(...choque.map((e) => e.cardY)) + 12);
      axisY0 += desplazo;
      for (const e of outEvents) { e.dotY += desplazo; e.cardY += desplazo; }
      if (orientation === 'vertical') for (const t of ticks) t.pos += desplazo;
      height += desplazo;
    }
    width = Math.max(width, legendX + legendW + 8);
  }

  return {
    width,
    height,
    orientation,
    title: title || undefined,
    titleY: 20,
    axisX0,
    axisY0,
    axisLen: usedAxisLen,
    events: outEvents,
    ticks,
    todayPos,
    groups: legendGroups,
    legendX,
  };
}