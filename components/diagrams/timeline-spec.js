import { parseDate, timeScale, niceTimeTicks, packLanes } from '../_shared/lane-layout.js';
import { resolveTkHue } from '../_shared/tk-hue.js';

/**
 * Especificación y layout de líneas de tiempo (sin Mermaid).
 *
 * Mismo contrato que flowchart/Gantt: entrada JSON, salida geometría pura.
 * Usa `lane-layout.js` para la escala de tiempo y `packLanes` para separar
 * eventos que caen demasiado cerca en el tiempo (colisión de tarjetas).
 */

const DEFAULT_HUES = [199, 239, 160, 38, 280, 210];

const MARGIN = { top: 16, right: 24, bottom: 20, left: 24 };
const AXIS_MARGIN = 40;
const CARD_W = 168;
const CARD_H = 40;
const STEM_BASE = 28;
const DEPTH_GAP = 10;
const DEFAULT_AXIS_LEN = 640;

function asRecord(v) {
  return v && typeof v === 'object' ? v : {};
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

function readEvent(raw, i) {
  const r = asRecord(raw);
  return {
    id: String(r.id ?? `e${i}`),
    label: String(r.label ?? r.text ?? r.id ?? `Evento ${i + 1}`),
    date: r.date ?? r.start,
    group: String(r.group ?? '') || undefined,
    hue: r.hue != null ? resolveTkHue(r) : undefined,
    description: String(r.desc ?? r.description ?? '').trim() || undefined,
  };
}

/** payload → spec normalizada, o null si no hay eventos. */
export function timelineSpecFromPayload(payload) {
  const p = asRecord(payload);
  const src = asRecord(p.timeline ?? p);
  const rawEvents = src.events ?? [];
  if (!Array.isArray(rawEvents) || !rawEvents.length) return null;

  const orientation = String(src.orientation ?? 'horizontal').toLowerCase() === 'vertical' ? 'vertical' : 'horizontal';
  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    orientation,
    groups: readGroups(src),
    events: rawEvents.map(readEvent),
  };
}

export function resolveTimelineSpec(payload) {
  return timelineSpecFromPayload(payload);
}

/**
 * spec → geometría lista para pintar.
 * @param {object} spec
 * @param {{width?:number, now?:number}} [opts]
 */
export function computeTimelineLayout(spec, opts = {}) {
  const orientation = spec.orientation === 'vertical' ? 'vertical' : 'horizontal';
  const axisLen = opts.width ?? DEFAULT_AXIS_LEN;
  const now = opts.now;

  const title = spec.title ?? '';
  const headerH = title ? 30 : 8;

  const groupHue = new Map((spec.groups ?? []).map((g) => [g.id, g.hue]));

  const events = spec.events
    .map((e) => ({ ...e, ms: parseDate(e.date) }))
    .filter((e) => Number.isFinite(e.ms))
    .sort((a, b) => a.ms - b.ms);

  let min = Infinity;
  let max = -Infinity;
  for (const e of events) { min = Math.min(min, e.ms); max = Math.max(max, e.ms); }
  if (!Number.isFinite(min)) { min = 0; max = 86400000; }
  if (min === max) { min -= 86400000; max += 86400000; }
  const pad = (max - min) * 0.06;
  const domain = [min - pad, max + pad];
  const scale = timeScale(domain, [0, axisLen]);

  // Colisión: eventos separados por menos de MIN_GAP_PX se empaquetan en
  // "carriles" (lejanía a la línea) reutilizando el packing de intervalos.
  const MIN_GAP_PX = orientation === 'horizontal' ? 96 : 46;
  const minGapMs = Math.max(1, Math.abs(scale.invert(MIN_GAP_PX) - scale.invert(0)));
  const packed = packLanes(events.map((e) => ({ id: e.id, start: e.ms, end: e.ms + minGapMs })));
  const laneOf = new Map(packed.map((p) => [p.id, p.lane]));

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

  let width;
  let height;
  let axisX0;
  let axisY0;
  if (orientation === 'horizontal') {
    axisX0 = MARGIN.left + AXIS_MARGIN;
    axisY0 = MARGIN.top + headerH + aboveSpace;
    width = axisX0 + axisLen + MARGIN.right + AXIS_MARGIN;
    height = axisY0 + belowSpace + MARGIN.bottom;
  } else {
    axisX0 = MARGIN.left + 16;
    axisY0 = MARGIN.top + headerH + AXIS_MARGIN;
    width = axisX0 + rightSpace + MARGIN.right;
    height = axisY0 + axisLen + MARGIN.bottom + AXIS_MARGIN;
  }

  const outEvents = events.map((e) => {
    const lane = laneOf.get(e.id) ?? 0;
    const hue = e.hue ?? (e.group ? groupHue.get(e.group) : undefined);
    const base = {
      id: e.id, label: e.label, desc: e.description, hue, group: e.group, ms: e.ms,
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

  const ticks = niceTimeTicks(domain[0], domain[1]).map((t) => ({
    ...t,
    pos: orientation === 'horizontal' ? axisX0 + scale(t.ms) : axisY0 + scale(t.ms),
  }));

  const todayPos = (Number.isFinite(now) && now >= domain[0] && now <= domain[1])
    ? (orientation === 'horizontal' ? axisX0 + scale(now) : axisY0 + scale(now))
    : undefined;

  const legendGroups = spec.groups?.length ? spec.groups : undefined;
  const legendW = legendGroups
    ? Math.max(...legendGroups.map((g) => Math.ceil(g.name.length * 6) + 30))
    : 0;
  const legendX = legendGroups ? Math.max(8, width - legendW - 8) : 0;

  return {
    width,
    height,
    orientation,
    title: title || undefined,
    titleY: 20,
    axisX0,
    axisY0,
    axisLen,
    events: outEvents,
    ticks,
    todayPos,
    groups: legendGroups,
    legendX,
  };
}
