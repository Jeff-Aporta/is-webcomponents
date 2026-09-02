import { richTextPlain } from '../_shared/tk-rich-text.js';
import { resolveTkHue } from '../_shared/tk-hue.js';

/**
 * Especificación y layout de matrices 2×2 (quadrant chart), sin Mermaid.
 *
 * JSON → geometría pura, igual que el resto de la categoría. La matriz 2×2 es
 * el diagrama de priorización clásico (impacto/esfuerzo, costo/calidad): dos
 * ejes continuos, cuatro cuadrantes nombrados y puntos ubicados en 0..1.
 */

const DEFAULT_HUES = [210, 239, 160, 38, 280, 199];

const PLOT = 320;                 // lado del área de datos (cuadrada)
const MARGIN = { top: 16, right: 24, bottom: 44, left: 52 };
const DOT_R = 5.5;

function asRecord(v) {
  return v && typeof v === 'object' ? v : {};
}

/** 0..1 con recorte: un punto fuera de rango se pega al borde, no se sale del lienzo. */
function unit(value, fallback = 0.5) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

function readPoint(raw, i: number) {
  const r = asRecord(raw);
  return {
    id: String(r.id ?? `p${i}`),
    label: String(r.label ?? r.name ?? r.id ?? `Punto ${i + 1}`),
    x: unit(r.x),
    y: unit(r.y),
    hue: r.hue != null ? resolveTkHue(r) : undefined,
    group: String(r.group ?? '') || undefined,
    description: String(r.desc ?? r.description ?? '').trim() || undefined,
  };
}

function readGroups(src) {
  const raw = src.groups ?? [];
  if (!Array.isArray(raw) || !raw.length) return undefined;
  return raw.map((g, i: number) => {
    const r = asRecord(g);
    return {
      id: String(r.id ?? `grp-${i}`),
      name: String(r.name ?? r.label ?? `Grupo ${i + 1}`),
      hue: resolveTkHue(r, DEFAULT_HUES[i % DEFAULT_HUES.length]),
    };
  });
}

/** Nombres de los cuatro cuadrantes; acepta objeto con claves o arreglo en orden horario desde arriba-derecha. */
function readQuadrants(raw) {
  const r = asRecord(raw);
  if (Array.isArray(raw)) {
    const [topRight, bottomRight, bottomLeft, topLeft] = raw.map((q) => String(asRecord(q).name ?? q ?? ''));
    return { topRight, bottomRight, bottomLeft, topLeft };
  }
  return {
    topRight: String(r.topRight ?? r['top-right'] ?? ''),
    topLeft: String(r.topLeft ?? r['top-left'] ?? ''),
    bottomRight: String(r.bottomRight ?? r['bottom-right'] ?? ''),
    bottomLeft: String(r.bottomLeft ?? r['bottom-left'] ?? ''),
  };
}

/** payload → spec normalizada, o null si no hay puntos. */
export function resolveQuadrantSpec(payload) {
  const p = asRecord(payload);
  const src = asRecord(p.quadrant ?? p.quadrantChart ?? p);
  const rawPoints = src.points ?? src.items ?? [];
  if (!Array.isArray(rawPoints) || !rawPoints.length) return null;

  const xAxis = asRecord(src.xAxis ?? src.x);
  const yAxis = asRecord(src.yAxis ?? src.y);
  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? '') || undefined,
    xAxis: {
      left: String(xAxis.left ?? xAxis.min ?? '') || undefined,
      right: String(xAxis.right ?? xAxis.max ?? '') || undefined,
    },
    yAxis: {
      bottom: String(yAxis.bottom ?? yAxis.min ?? '') || undefined,
      top: String(yAxis.top ?? yAxis.max ?? '') || undefined,
    },
    quadrants: readQuadrants(src.quadrants),
    groups: readGroups(src),
    points: rawPoints.map(readPoint),
  };
}

/** spec → objeto `quadrant` listo para persistir / mostrar en el editor. */
export function quadrantSpecToJson(spec) {
  const out = { points: [] };
  if (spec.title) out.title = spec.title;
  if (spec.subtitle) out.subtitle = spec.subtitle;
  if (spec.xAxis.left || spec.xAxis.right) out.xAxis = { ...spec.xAxis };
  if (spec.yAxis.bottom || spec.yAxis.top) out.yAxis = { ...spec.yAxis };
  const q = spec.quadrants;
  if (q.topRight || q.topLeft || q.bottomRight || q.bottomLeft) out.quadrants = { ...q };
  if (spec.groups?.length) out.groups = spec.groups;
  out.points = spec.points.map((pt) => {
    const row = { label: pt.label, x: pt.x, y: pt.y };
    if (pt.id) row.id = pt.id;
    if (pt.group) row.group = pt.group;
    if (pt.description) row.desc = pt.description;
    return row;
  });
  return out;
}

/**
 * Separación mínima entre etiquetas: dos puntos casi iguales quedarían con el
 * texto encimado, así que la etiqueta del segundo baja una línea.
 */
function stackLabels(points) {
  const placed = [];
  for (const pt of points) {
    let dy = 0;
    for (const prev of placed) {
      const near = Math.abs(prev.cx - pt.cx) < 70 && Math.abs(prev.cy + prev.labelDy - (pt.cy + dy)) < 12;
      if (near) dy += 13;
    }
    pt.labelDy = dy;
    placed.push(pt);
  }
  return points;
}

/**
 * spec → geometría lista para pintar.
 * @returns {{width:number, height:number, plot:object, points:Array, quadrants:Array, axes:object, groups?:Array, title?:string, subtitle?:string, titleY:number, subtitleY:number, legendX:number}}
 */
export function computeQuadrantLayout(spec) {
  const title = spec.title ?? '';
  const subtitle = spec.subtitle ?? '';
  const titleY = title ? 22 : 14;
  const subtitleY = title ? 40 : 24;
  const headerH = title || subtitle ? (subtitle ? 54 : 36) : 0;

  const legendGroups = spec.groups?.length ? spec.groups : undefined;
  const legendW = legendGroups
    ? Math.max(...legendGroups.map((g) => Math.ceil(g.name.length * 6) + 30))
    : 0;

  const plot = {
    x: MARGIN.left,
    y: MARGIN.top + headerH,
    w: PLOT,
    h: PLOT,
  };
  const width = plot.x + plot.w + MARGIN.right + (legendGroups ? legendW + 16 : 0)
    // Espacio a la derecha para las etiquetas de los puntos del borde.
    + 90;
  const height = plot.y + plot.h + MARGIN.bottom;

  const points = spec.points.map((pt) => ({
    ...pt,
    cx: plot.x + pt.x * plot.w,
    // El eje Y crece hacia arriba: 1 es el borde superior.
    cy: plot.y + (1 - pt.y) * plot.h,
    r: DOT_R,
    labelDy: 0,
  }));
  stackLabels(points);

  const midX = plot.x + plot.w / 2;
  const midY = plot.y + plot.h / 2;
  const q = spec.quadrants;
  const quadrants = [
    { id: 'topLeft', name: q.topLeft, cx: plot.x + plot.w / 4, cy: plot.y + 18 },
    { id: 'topRight', name: q.topRight, cx: plot.x + (plot.w * 3) / 4, cy: plot.y + 18 },
    { id: 'bottomLeft', name: q.bottomLeft, cx: plot.x + plot.w / 4, cy: plot.y + plot.h - 10 },
    { id: 'bottomRight', name: q.bottomRight, cx: plot.x + (plot.w * 3) / 4, cy: plot.y + plot.h - 10 },
  ].filter((item) => !!item.name);

  const axes = {
    midX,
    midY,
    xLeft: spec.xAxis.left ? { text: spec.xAxis.left, x: plot.x, y: plot.y + plot.h + 26 } : undefined,
    xRight: spec.xAxis.right ? { text: spec.xAxis.right, x: plot.x + plot.w, y: plot.y + plot.h + 26 } : undefined,
    yBottom: spec.yAxis.bottom ? { text: spec.yAxis.bottom, x: plot.x - 10, y: plot.y + plot.h } : undefined,
    yTop: spec.yAxis.top ? { text: spec.yAxis.top, x: plot.x - 10, y: plot.y + 10 } : undefined,
  };

  const maxLabel = Math.max(...points.map((pt) => Math.ceil(richTextPlain(pt.label).length * 5.6)), 0);
  const legendX = legendGroups ? Math.max(plot.x + plot.w + 24, width - legendW - 8) : 0;

  // La etiqueta de un punto ancla a la IZQUIERDA en `cx + r + 5` (ver el
  // renderer): el punto más a la derecha (cx = plot.x + plot.w) necesita TODO
  // su ancho por delante, no media etiqueta. Media etiqueta recortaba los
  // rótulos largos del borde derecho en el PNG.
  const width2 = Math.max(width, plot.x + plot.w + DOT_R + 5 + maxLabel);

  return {
    width: width2,
    height,
    plot,
    points,
    quadrants,
    axes,
    groups: legendGroups,
    title: title || undefined,
    subtitle: subtitle || undefined,
    titleY,
    subtitleY,
    legendX,
  };
}
