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
