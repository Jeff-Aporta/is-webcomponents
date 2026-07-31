/** Rejilla de alineación para diagramas SVG (secuencia / flujo). */

import { countIconifyTokens, stripIconifyTokensPlain } from './tk-iconify-inline.js';

export const TK_DIAGRAM_GRID = 8;

export const TK_DIAGRAM_RADIUS_PX = 8;

export function snapDiagramGrid(value, grid = TK_DIAGRAM_GRID) {
  return Math.round(value / grid) * grid;
}

export function diagramLabelWidth(text, min = 120, max = 320) {
  const plain = stripIconifyTokensPlain(text);
  const icons = countIconifyTokens(text);
  const est = Math.ceil(plain.length * 6.2) + 20 + icons * 18;
  return snapDiagramGrid(Math.min(max, Math.max(min, est)));
}

export function diagramGridCols(width, grid = TK_DIAGRAM_GRID) {
  return Math.ceil(width / grid) + 1;
}

export function diagramGridRows(height, grid = TK_DIAGRAM_GRID) {
  return Math.ceil(height / grid) + 1;
}

/**
 * Rejilla de costos para ruteo A*. Cada celda tiene un costo de entrada;
 * `Infinity` = celda bloqueada (obstáculo duro). Las paredes/labels suben el
 * costo para que A* las rodee; las lifelines reciben un costo suave para que
 * los mensajes las crucen pero no corran encima de ellas.
 */

export const COST_BLOCKED = Infinity;

export function makeCostGrid(width, height, grid = TK_DIAGRAM_GRID) {
  const cols = diagramGridCols(width, grid);
  const rows = diagramGridRows(height, grid);
  const cost = new Float64Array(cols * rows).fill(1);
  return { cols, rows, grid, cost };
}

export function cellCost(g, col, row) {
  if (!g?.cost || !Number.isFinite(g.cols) || !Number.isFinite(g.rows)) return COST_BLOCKED;
  if (col < 0 || row < 0 || col >= g.cols || row >= g.rows) return COST_BLOCKED;
  return g.cost[row * g.cols + col];
}

/** Aplica un costo a todas las celdas que tocan el rectángulo (px). `add=false` fija el valor. */
export function applyRectCost(
  g,
  x,
  y,
  w,
  h,
  cost,
  add = false,
) {
  const c0 = Math.max(0, Math.floor(x / g.grid));
  const r0 = Math.max(0, Math.floor(y / g.grid));
  const c1 = Math.min(g.cols - 1, Math.ceil((x + w) / g.grid));
  const r1 = Math.min(g.rows - 1, Math.ceil((y + h) / g.grid));
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const i = r * g.cols + c;
      if (cost === COST_BLOCKED) g.cost[i] = COST_BLOCKED;
      else if (add) g.cost[i] += cost;
      else g.cost[i] = cost;
    }
  }
}

/** Bloquea un rectángulo (obstáculo duro). */
export function blockRect(g, x, y, w, h) {
  applyRectCost(g, x, y, w, h, COST_BLOCKED);
}

/* ────────────────────────────────────────────────────────────────────────
 * Regiones prohibidas (zonas de soledad).
 *
 * Una región es una zona donde los nodos Y las aristas tienen prohibido
 * pasar. Se modelan como obstáculo duro (COST_BLOCKED) durante el A*, pero
 * NO se persisten en la rejilla base — viven en un registro separado para
 * poder activarlas/desactivarlas por arista (p.ej. para que dos aristas
 * distintas eviten la misma zona sin pisarse entre sí en otro ruteo).
 *
 * Formatos soportados:
 *   rect:  { id, kind:'rect', x, y, w, h, color?, label? }
 *   poly:  { id, kind:'poly', points:[[x,y],...], color?, label? }
 *
 * El id es opcional (se autogenera si falta). Sirve para removeForbbidenRegion.
 * ──────────────────────────────────────────────────────────────────────── */

/** Crea o reutiliza el registro de regiones prohibidas en la rejilla. */
function ensureRegistry(g) {
  if (!g.forbidden) g.forbidden = new Map();
  return g.forbidden;
}

/**
 * Aplica todas las regiones registradas como COST_BLOCKED sobre la rejilla.
 * Llamar justo antes de rutear con A*. La rejilla queda modificada en sitio;
 * si quieres re-rutear desde un estado limpio, primero reasigna los costos
 * (p.ej. desde tu layout base) y vuelve a llamar a esta función.
 */
export function applyForbiddenRegions(g) {
  if (!g?.forbidden?.size) return;
  for (const region of g.forbidden.values()) {
    if (region.kind === 'rect') {
      blockRect(g, region.x, region.y, region.w, region.h);
    } else if (region.kind === 'poly') {
      blockPolygon(g, region.points);
    }
  }
}

/** Bloquea el interior de un polígono (point-in-polygon por scanline). */
export function blockPolygon(g, points) {
  if (!points?.length) return;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const xMin = Math.max(0, Math.floor(Math.min(...xs) / g.grid));
  const yMin = Math.max(0, Math.floor(Math.min(...ys) / g.grid));
  const xMax = Math.min(g.cols - 1, Math.ceil(Math.max(...xs) / g.grid));
  const yMax = Math.min(g.rows - 1, Math.ceil(Math.max(...ys) / g.grid));
  for (let r = yMin; r <= yMax; r++) {
    for (let c = xMin; c <= xMax; c++) {
      const cx = c * g.grid + g.grid / 2;
      const cy = r * g.grid + g.grid / 2;
      if (pointInPolygon(cx, cy, points)) g.cost[r * g.cols + c] = COST_BLOCKED;
    }
  }
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function genRegionId(kind) {
  return `fr-${kind}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Registra una zona prohibida y devuelve la región creada (con id asignado).
 * La rejilla NO se modifica hasta que llames a `applyForbiddenRegions(g)`.
 * Esto permite componer varias regiones antes de aplicarlas en una sola pasada.
 */
export function addForbiddenRegion(g, region) {
  ensureRegistry(g);
  const id = region.id || genRegionId(region.kind || 'rect');
  const stored = { ...region, id };
  g.forbidden.set(id, stored);
  return stored;
}

export function removeForbiddenRegion(g, id) {
  if (!g?.forbidden) return false;
  return g.forbidden.delete(id);
}

export function clearForbiddenRegions(g) {
  if (!g?.forbidden) return;
  g.forbidden.clear();
}

export function listForbiddenRegions(g) {
  if (!g?.forbidden) return [];
  return [...g.forbidden.values()];
}
