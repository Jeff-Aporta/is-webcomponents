import { parseDate, addDuration, timeScale, niceTimeTicks } from '../_shared/lane-layout.js';
import { makeCostGrid, blockRect, snapPointAwayFromSide, snapDiagramGrid } from '../_shared/diagram-grid.js';
import { routeOrthogonal, pixelToGrid, gridPathToSvg, buildOrthogonalPath } from '../_shared/diagram-astar.js';
import { richTextPlain } from '../_shared/tk-rich-text.js';
import { resolveTkHue } from '../_shared/tk-hue.js';

/**
 * Especificación y layout de diagramas Gantt (sin Mermaid).
 *
 * Mismo contrato que flowchart/secuencia: la entrada es JSON, la salida es
 * geometría pura. Usa `lane-layout.js` para fechas/escala/marcas de eje (sin
 * empaquetar filas: el Gantt respeta el orden de declaración de las tareas)
 * y el A* de la rejilla de costos para rutear las flechas de dependencia
 * rodeando las barras.
 */

const DEFAULT_HUES = [239, 199, 160, 38, 280, 210];

const MARGIN = { top: 16, right: 20, bottom: 20, left: 16 };
// Todas las métricas verticales caen en la rejilla de 8px del router: con
// 28+10 y un header de 34 las filas quedaban a media celda y el A* devolvía
// tramos en diagonal al empalmar los anclajes.
const ROW_H = 32;
const ROW_GAP = 8;
const MIN_GUTTER = 140;
const MAX_GUTTER = 280;
const DEFAULT_TIME_W = 640;
const MILESTONE_SIZE = 18;

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

function readTask(raw, i) {
  const r = asRecord(raw);
  return {
    id: String(r.id ?? `t${i}`),
    label: String(r.label ?? r.text ?? r.id ?? `Tarea ${i + 1}`),
    start: r.start,
    end: r.end,
    duration: r.duration != null ? String(r.duration) : undefined,
    group: String(r.group ?? '') || undefined,
    progress: r.progress,
    milestone: !!r.milestone,
    after: Array.isArray(r.after) ? r.after.map(String) : [],
    hue: r.hue != null ? resolveTkHue(r) : undefined,
    description: String(r.desc ?? r.description ?? '').trim() || undefined,
  };
}

/** payload → spec normalizada, o null si no hay tareas. */
export function ganttSpecFromPayload(payload) {
  const p = asRecord(payload);
  const src = asRecord(p.gantt ?? p);
  const rawTasks = src.tasks ?? [];
  if (!Array.isArray(rawTasks) || !rawTasks.length) return null;

  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    dateFormat: String(src.dateFormat ?? 'YYYY-MM-DD'),
    groups: readGroups(src),
    tasks: rawTasks.map(readTask),
  };
}

export function resolveGanttSpec(payload) {
  return ganttSpecFromPayload(payload);
}

function clampProgress(p) {
  const n = Number(p);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(100, n));
}

/**
 * spec → geometría lista para pintar.
 * `opts.now` (epoch ms) es opcional y decide el marcador "hoy"; el módulo
 * nunca llama a `Date.now()` para que el layout sea determinista/testeable.
 * @param {object} spec
 * @param {{width?:number, now?:number}} [opts]
 */
export function computeGanttLayout(spec, opts = {}) {
  const timeW = opts.width ?? DEFAULT_TIME_W;
  const now = opts.now;

  const title = spec.title ?? '';
  const headerH = title ? 32 : 8;
  const titleY = 20;

  const groupHue = new Map((spec.groups ?? []).map((g) => [g.id, g.hue]));
  const knownIds = new Set(spec.tasks.map((t) => t.id));

  const tasks = spec.tasks
    .map((t) => {
      const start = parseDate(t.start);
      let end;
      if (t.milestone) end = start;
      else if (t.end != null) end = parseDate(t.end);
      else end = addDuration(start, t.duration ?? '1d');
      if (!Number.isFinite(end)) end = start;
      // Descarta referencias a ids inexistentes en vez de romper el layout.
      const after = t.after.filter((id) => knownIds.has(id) && id !== t.id);
      return { ...t, start, end, after };
    })
    .filter((t) => Number.isFinite(t.start));

  let min = Infinity;
  let max = -Infinity;
  for (const t of tasks) {
    min = Math.min(min, t.start);
    max = Math.max(max, t.end);
  }
  if (!Number.isFinite(min)) { min = 0; max = 7 * 86400000; }
  if (min === max) { min -= 86400000; max += 86400000; }
  const pad = (max - min) * 0.04;
  const domain = [min - pad, max + pad];
  const scale = timeScale(domain, [0, timeW]);
  const ticksRaw = niceTimeTicks(domain[0], domain[1]);

  const longestLabel = tasks.reduce((acc, t) => Math.max(acc, richTextPlain(t.label).length), 4);
  const gutterW = Math.max(MIN_GUTTER, Math.min(MAX_GUTTER, Math.ceil(longestLabel * 7) + 24));

  const offsetX = MARGIN.left;
  const offsetY = MARGIN.top + headerH;
  const gutterX = offsetX + gutterW;

  const rowsH = tasks.length ? tasks.length * (ROW_H + ROW_GAP) - ROW_GAP : 0;

  const rows = tasks.map((t, i) => {
    const y = offsetY + i * (ROW_H + ROW_GAP);
    const hue = t.hue ?? (t.group ? groupHue.get(t.group) : undefined);
    if (t.milestone) {
      const cx = gutterX + scale(t.start);
      const cy = y + ROW_H / 2;
      return {
        id: t.id, label: t.label, y, h: ROW_H, milestone: true,
        cx, cy, size: MILESTONE_SIZE,
        x: cx - MILESTONE_SIZE / 2, w: MILESTONE_SIZE,
        hue, group: t.group, description: t.description,
      };
    }
    const x0 = gutterX + scale(t.start);
    const x1 = gutterX + scale(t.end);
    const w = Math.max(6, x1 - x0);
    return {
      id: t.id, label: t.label, x: x0, y, w, h: ROW_H, milestone: false,
      progress: clampProgress(t.progress), hue, group: t.group, description: t.description,
    };
  });

  const legendGroups = spec.groups?.length ? spec.groups : undefined;
  const legendW = legendGroups
    ? Math.max(...legendGroups.map((g) => Math.ceil(g.name.length * 7) + 36))
    : 0;
  // Reserva franja derecha para la leyenda + aire del último hito.
  const rightPad = MARGIN.right + (legendW ? legendW + 12 : 0) + MILESTONE_SIZE;
  const width = gutterX + timeW + rightPad;
  const height = offsetY + rowsH + MARGIN.bottom;
  const legendX = legendGroups ? Math.max(8, width - legendW - 8) : 0;

  const ticks = ticksRaw.map((tk) => ({ ...tk, x: gutterX + scale(tk.ms) }));
  const todayX = (Number.isFinite(now) && now >= domain[0] && now <= domain[1])
    ? gutterX + scale(now)
    : undefined;

  // Rejilla de costos: las barras (y diamantes de hito) bloqueadas para que
  // las flechas de dependencia las rodeen.
  const grid = makeCostGrid(width, height);
  for (const r of rows) blockRect(grid, r.x - 4, r.y - 4, r.w + 8, r.h + 8);

  const byId = new Map(rows.map((r) => [r.id, r]));
  const arrows = [];
  for (const t of tasks) {
    for (const depId of t.after) {
      const from = byId.get(depId);
      const to = byId.get(t.id);
      if (!from || !to) continue;
      // Sale del predecesor por la derecha y entra al sucesor por arriba
      // (cerca del extremo izquierdo de la barra): evita que la flecha
      // rodee toda la figura cuando el sucesor está más abajo en la tabla.
      const a = from.milestone
        ? { x: from.cx + from.size / 2, y: from.cy }
        : { x: from.x + from.w, y: from.y + from.h / 2 };
      // La X de entrada se snapea a la rejilla: las barras arrancan en píxeles
      // fraccionarios (vienen de la escala de tiempo) y sin esto el último
      // tramo entraba en horizontal, dejando la punta de lado.
      const b = to.milestone
        ? { x: snapDiagramGrid(to.cx), y: to.cy - to.size / 2 }
        : { x: snapDiagramGrid(to.x + Math.min(14, to.w * 0.2)), y: to.y };
      const out = snapPointAwayFromSide({ x: a.x + 8, y: a.y }, 'right', grid.grid);
      const into = snapPointAwayFromSide({ x: b.x, y: b.y - 8 }, 'top', grid.grid);
      const aGrid = pixelToGrid(out.x, out.y, grid.grid);
      const bGrid = pixelToGrid(into.x, into.y, grid.grid);
      const points = routeOrthogonal(aGrid, bGrid, grid);
      const path = buildOrthogonalPath(a, b, aGrid, bGrid, points, grid.grid);
      arrows.push({
        id: `${depId}->${t.id}`, from: depId, to: t.id, path,
        // Entra por arriba → la punta apunta hacia abajo (90°).
        arrowTipX: b.x, arrowTipY: b.y, arrowAngle: 90,
        hue: to.hue,
      });
    }
  }

  return {
    width,
    height,
    title: title || undefined,
    titleY,
    gutterX,
    gutterW,
    rowsTop: offsetY,
    rowsBottom: offsetY + rowsH,
    rows,
    ticks,
    todayX,
    arrows,
    groups: legendGroups,
    legendX,
  };
}
