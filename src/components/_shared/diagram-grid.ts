/** Rejilla de alineación para diagramas SVG (secuencia / flujo). */

import { countIconTokens, stripIconTokensPlain } from './tk-icon-inline.js';

export const TK_DIAGRAM_GRID = 8;

export const TK_DIAGRAM_RADIUS_PX = 8;

export function snapDiagramGrid(value: number, grid: number = TK_DIAGRAM_GRID) {
  return Math.round(value / grid) * grid;
}

export function diagramLabelWidth(text, min: number = 120, max: number = 320) {
  const plain = stripIconTokensPlain(text);
  const icons = countIconTokens(text);
  const est = Math.ceil(plain.length * 6.2) + 20 + icons * 18;
  return snapDiagramGrid(Math.min(max, Math.max(min, est)));
}

export function diagramGridCols(width: number, grid: number = TK_DIAGRAM_GRID) {
  return Math.ceil(width / grid) + 1;
}

export function diagramGridRows(height: number, grid: number = TK_DIAGRAM_GRID) {
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

export function cellCost(g, col: number, row: number) {
  if (!g?.cost || !Number.isFinite(g.cols) || !Number.isFinite(g.rows)) return COST_BLOCKED;
  if (col < 0 || row < 0 || col >= g.cols || row >= g.rows) return COST_BLOCKED;
  return g.cost[row * g.cols + col];
}

/** Aplica un costo a todas las celdas que tocan el rectángulo (px). `add=false` fija el valor. */
export function applyRectCost(g, x: number, y: number, w: number, h: number, cost, add = false) {
  // El rect cubre el intervalo semiabierto [x, x+w) × [y, y+h): la última
  // celda que realmente toca es la que contiene x+w-ε, no ceil((x+w)/grid)
  // sin restar 1. Con la fórmula anterior, un nodo que termina justo en un
  // borde de celda (p. ej. y+h=66 con grid=8) bloqueaba una fila/columna de
  // más — el A* creía bloqueado un tramo libre y desviaba la ruta en
  // diagonal para rodear un obstáculo que en realidad no estaba ahí.
  const c0 = Math.max(0, Math.floor(x / g.grid));
  const r0 = Math.max(0, Math.floor(y / g.grid));
  const c1 = Math.min(g.cols - 1, Math.max(c0, Math.ceil((x + w) / g.grid) - 1));
  const r1 = Math.min(g.rows - 1, Math.max(r0, Math.ceil((y + h) / g.grid) - 1));
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

function genRegionId(kind: string) {
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

/* ────────────────────────────────────────────────────────────────────────
 * Zonas de exclusión (soledad) — leídas del JSON de un diagrama.
 *
 * Un diagrama expone `exclusionZones: [{x,y,w,h,label?}]` en el mismo espacio
 * de coordenadas que sus nodos (antes de aplicar el margen del lienzo). Estas
 * zonas: (a) bloquean la rejilla de costos para que las ARISTAS las rodeen
 * (vía `blockRect`, igual que el rect de un nodo), y (b) empujan cualquier
 * NODO que haya quedado encima, con `nudgeRectFromZones`, para que el
 * auto-layout nunca coloque una caja dentro de una zona prohibida.
 * ──────────────────────────────────────────────────────────────────────── */

/** Normaliza `exclusionZones` del payload a rects válidos (w,h > 0). */
export function readExclusionZones(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((z) => (z && typeof z === 'object' ? z : {}))
    .map((z) => ({
      x: Number(z.x) || 0,
      y: Number(z.y) || 0,
      w: Math.max(Number(z.w) || 0, 0),
      h: Math.max(Number(z.h) || 0, 0),
      label: String(z.label ?? '').trim() || undefined,
    }))
    .filter((z) => z.w > 0 && z.h > 0);
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * Si `rect` invade alguna zona, lo empuja hacia el lado de menor desplazamiento
 * (arriba/abajo/izquierda/derecha) hasta quedar fuera de todas. Determinista:
 * mismo rect + mismas zonas siempre produce el mismo resultado.
 */
/**
 * Redondea SIEMPRE en la dirección dada — nunca "al más cercano" — para que
 * un punto de salida nunca ruede hacia la celda bloqueada de la que se
 * aleja. `snapDiagramGrid` (redondeo normal) puede empujar un punto que
 * está a 4px de un bloqueo justo DENTRO de esa celda si cae del lado
 * equivocado del .5; con `direction` fijo eso no puede pasar.
 */
export function snapAway(value: number, direction: number, grid: number = TK_DIAGRAM_GRID) {
  return direction > 0 ? Math.ceil(value / grid) * grid : Math.floor(value / grid) * grid;
}

/**
 * Snapea el punto de salida/entrada de una arista (tras `stepOut`) sin
 * arriesgarse a rodar de vuelta hacia el nodo del que se aleja: el eje que
 * `stepOut` movió se redondea siempre en ESA dirección (nunca al más
 * cercano); el otro eje ya viene alineado a la rejilla desde `edgeAnchor` y
 * se snapea normal. Usar esto en vez de `snapDiagramGrid` suelto en los
 * puntos de salida/entrada de cualquier spec de diagrama con A*.
 */
export function snapPointAwayFromSide(point, side, grid = TK_DIAGRAM_GRID) {
  if (side === 'top') return { x: snapDiagramGrid(point.x, grid), y: snapAway(point.y, -1, grid) };
  if (side === 'bottom') return { x: snapDiagramGrid(point.x, grid), y: snapAway(point.y, 1, grid) };
  if (side === 'left') return { x: snapAway(point.x, -1, grid), y: snapDiagramGrid(point.y, grid) };
  return { x: snapAway(point.x, 1, grid), y: snapDiagramGrid(point.y, grid) };
}

export function nudgeRectFromZones(rect, zones) {
  if (!zones?.length) return rect;
  let { x, y } = rect;
  const { w, h } = rect;
  for (const z of zones) {
    const cur = { x, y, w, h };
    if (!rectsOverlap(cur, z)) continue;
    const pushRight = z.x + z.w - x;
    const pushLeft = x + w - z.x;
    const pushDown = z.y + z.h - y;
    const pushUp = y + h - z.y;
    const min = Math.min(pushRight, pushLeft, pushDown, pushUp);
    // snap "hacia afuera" (away from la zona): redondear al múltiplo de 8 más
    // cercano puede reintroducir el rect en la zona por hasta 4px — aquí en
    // cambio se redondea siempre en la dirección que aumenta la separación.
    if (min === pushRight) x = snapAway(z.x + z.w, 1);
    else if (min === pushLeft) x = snapAway(z.x - w, -1);
    else if (min === pushDown) y = snapAway(z.y + z.h, 1);
    else y = snapAway(z.y - h, -1);
  }
  return { ...rect, x, y };
}

/** Bloquea todas las zonas en la rejilla de costos (para el ruteo de aristas). */
export function blockExclusionZones(g, zones, offsetX = 0, offsetY = 0) {
  for (const z of zones) blockRect(g, z.x + offsetX, z.y + offsetY, z.w, z.h);
}
