/** Rutas ortogonales en rejilla — A* ponderado reutilizable (secuencia, flujo, ER). */

import {
  cellCost,
  COST_BLOCKED,
  snapDiagramGrid,
  TK_DIAGRAM_GRID,
  applyForbiddenRegions,
} from './diagram-grid.js';

const DIRS = [
  { col: 0, row: -1 },
  { col: 0, row: 1 },
  { col: -1, row: 0 },
  { col: 1, row: 0 },
];

function manhattan(a, b) {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

/** Min-heap binario sobre estados {f}. */
class MinHeap {
  a = [];
  get size() {
    return this.a.length;
  }
  push(k, f) {
    const a = this.a;
    a.push({ k, f });
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let s = i;
        if (l < a.length && a[l].f < a[s].f) s = l;
        if (r < a.length && a[r].f < a[s].f) s = r;
        if (s === i) break;
        [a[s], a[i]] = [a[i], a[s]];
        i = s;
      }
    }
    return top.k;
  }
}

/**
 * A* ortogonal ponderado, consciente de dirección (penaliza giros).
 * Estado = celda + dirección de llegada, para cobrar el giro correctamente.
 */
function astarSegment(start, end, g, turnCost) {
  if (start.col === end.col && start.row === end.row) return [start];
  const { cols, rows } = g;
  // key = (row*cols + col) * 5 + (dir+1); dir -1 = sin dirección (inicio).
  const stateKey = (col, row, dir) => ((row * cols + col) * 5) + (dir + 1);
  const gScore = new Map();
  const cameFrom = new Map();
  const open = new MinHeap();

  const sk = stateKey(start.col, start.row, -1);
  gScore.set(sk, 0);
  open.push(sk, manhattan(start, end));
  const decode = (k) => {
    const dir = (k % 5) - 1;
    const cell = (k - (dir + 1)) / 5;
    return { col: cell % cols, row: Math.floor(cell / cols), dir };
  };

  let goalKey = -1;
  // Mejor nodo visto (más cerca del destino) — si el destino resulta
  // inalcanzable, se reconstruye el camino hasta aquí en vez de un salto
  // recto: el resultado sigue siendo ortogonal, nunca atraviesa obstáculos.
  let bestKey = sk;
  let bestDist = manhattan(start, end);
  while (open.size) {
    const ck = open.pop();
    const cur = decode(ck);
    if (cur.col === end.col && cur.row === end.row) {
      goalKey = ck;
      break;
    }
    const d0 = manhattan(cur, end);
    if (d0 < bestDist) { bestDist = d0; bestKey = ck; }
    const cg = gScore.get(ck) ?? Infinity;
    for (let d = 0; d < 4; d++) {
      const nc = cur.col + DIRS[d].col;
      const nr = cur.row + DIRS[d].row;
      const enter = cellCost(g, nc, nr);
      if (enter === COST_BLOCKED) continue;
      const turn = cur.dir !== -1 && cur.dir !== d ? turnCost : 0;
      const ng = cg + enter + turn;
      const nk = stateKey(nc, nr, d);
      if (ng >= (gScore.get(nk) ?? Infinity)) continue;
      gScore.set(nk, ng);
      cameFrom.set(nk, { key: ck, col: cur.col, row: cur.row });
      open.push(nk, ng + manhattan({ col: nc, row: nr }, end));
    }
  }

  // Sin ruta al destino (obstáculo/zona ocupa el único corredor posible):
  // se usa el mejor nodo alcanzado en vez de una línea recta start→end, que
  // podría cruzar en diagonal justo el obstáculo que se quería rodear.
  const finalKey = goalKey === -1 ? bestKey : goalKey;

  const path = [];
  let k = finalKey;
  let node = decode(k);
  path.push({ col: node.col, row: node.row });
  while (cameFrom.has(k)) {
    const prev = cameFrom.get(k);
    path.unshift({ col: prev.col, row: prev.row });
    k = prev.key;
    node = decode(k);
  }
  if (goalKey === -1 && (path[path.length - 1].col !== end.col || path[path.length - 1].row !== end.row)) {
    // Tramo final recto pero SIEMPRE ortogonal (nunca diagonal): primero se
    // alinea un eje, luego el otro — dos segmentos rectos, no un salto libre.
    const last = path[path.length - 1];
    if (last.col !== end.col) path.push({ col: end.col, row: last.row });
    path.push({ col: end.col, row: end.row });
  }
  return collapseColinear(path);
}

/** Quita puntos intermedios en línea recta (deja solo los vértices). */
function collapseColinear(points) {
  if (points.length <= 2) return points;
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = out[out.length - 1];
    const b = points[i];
    const c = points[i + 1];
    const colinear = (a.col === b.col && b.col === c.col) || (a.row === b.row && b.row === c.row);
    if (!colinear) out.push(b);
  }
  out.push(points[points.length - 1]);
  return out;
}

/**
 * Si `cell` cae en una celda bloqueada, busca la más cercana libre (anillos
 * crecientes, Chebyshev). Sin esto, un waypoint o ancla que quede sobre un
 * obstáculo (p. ej. dentro de una zona de exclusión) hace que `astarSegment`
 * no pueda alcanzarla y caiga en su fallback de línea recta — una diagonal
 * que atraviesa el propio obstáculo que se quería evitar.
 */
function nearestOpenCell(g, cell, maxRadius = 8) {
  if (cellCost(g, cell.col, cell.row) !== COST_BLOCKED) return cell;
  for (let r = 1; r <= maxRadius; r++) {
    for (let dc = -r; dc <= r; dc++) {
      for (let dr = -r; dr <= r; dr++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== r) continue; // solo el borde del anillo
        const c = { col: cell.col + dc, row: cell.row + dr };
        if (cellCost(g, c.col, c.row) !== COST_BLOCKED) return c;
      }
    }
  }
  return cell; // rodeado por completo: se deja igual, astarSegment hará el fallback
}

/** Ruta ortogonal A* con obstáculos y waypoints forzados. */
export function routeOrthogonal(start, end, g, opts = {}) {
  const turnCost = opts.turnCost ?? 2;
  const waypoints = (opts.waypoints ?? []).filter((w) => w && Number.isFinite(w.col) && Number.isFinite(w.row));
  if (opts.forbiddenRegions) {
    if (Array.isArray(opts.forbiddenRegions)) {
      for (const r of opts.forbiddenRegions) {
        if (!g.forbidden) g.forbidden = new Map();
        const id = r.id || `fr-${Math.random().toString(36).slice(2, 9)}`;
        g.forbidden.set(id, r);
      }
    }
    applyForbiddenRegions(g);
  }
  const safeStart = nearestOpenCell(g, start);
  const safeEnd = nearestOpenCell(g, end);
  const safeWaypoints = waypoints.map((w) => nearestOpenCell(g, w));
  const stops = [safeStart, ...safeWaypoints, safeEnd];
  const full = [stops[0]];
  for (let i = 0; i < stops.length - 1; i++) {
    const seg = astarSegment(stops[i], stops[i + 1], g, turnCost);
    for (let j = 1; j < seg.length; j++) full.push(seg[j]);
  }
  const out = collapseColinear(full);
  if (opts.forbiddenRegions && Array.isArray(opts.forbiddenRegions)) {
    for (const r of opts.forbiddenRegions) {
      if (r.id && g.forbidden?.has(r.id)) g.forbidden.delete(r.id);
    }
  }
  return out;
}

/**
 * Estética: cuenta cuántos giros de 90° tiene la polyline.
 * Útil como heurística para preferir rutas "menos serpenteantes".
 */
export function countTurns(points) {
  if (!points || points.length < 3) return 0;
  let turns = 0;
  let prevDx = 0, prevDy = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].col - points[i - 1].col;
    const dy = points[i].row - points[i - 1].row;
    if (i > 1 && (dx !== prevDx || dy !== prevDy)) turns++;
    prevDx = dx;
    prevDy = dy;
  }
  return turns;
}

/** Longitud Manhattan total de la polyline (suma de |dx|+|dy|). */
export function manhattanLength(points) {
  if (!points || points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.abs(points[i].col - points[i - 1].col) + Math.abs(points[i].row - points[i - 1].row);
  }
  return total;
}

/**
 * Genera candidatos de waypoints a lo largo del "corredor" entre start y end.
 * Si start→end es horizontal, los candidatos son (midCol, ±offset) por encima
 * y por debajo del eje. Si es vertical, análogo. Sirve para sugerir rutas
 * que evitan obstáculos grandes atravesando por arriba o por abajo.
 */
export function suggestWaypoints(start, end, g, count = 4) {
  const dx = end.col - start.col;
  const dy = end.row - start.row;
  const out = [];
  if (Math.abs(dx) >= Math.abs(dy)) {
    const midCol = Math.round((start.col + end.col) / 2);
    const halfRows = Math.max(2, Math.floor(g.rows / (count + 2)));
    for (let i = 1; i <= count; i++) {
      const off = i * halfRows;
      out.push({ col: midCol, row: Math.max(1, Math.min(g.rows - 2, start.row - off)) });
      out.push({ col: midCol, row: Math.max(1, Math.min(g.rows - 2, start.row + off)) });
    }
  } else {
    const midRow = Math.round((start.row + end.row) / 2);
    const halfCols = Math.max(2, Math.floor(g.cols / (count + 2)));
    for (let i = 1; i <= count; i++) {
      const off = i * halfCols;
      out.push({ col: Math.max(1, Math.min(g.cols - 2, start.col - off)), row: midRow });
      out.push({ col: Math.max(1, Math.min(g.cols - 2, start.col + off)), row: midRow });
    }
  }
  return out;
}

/**
 * Prueba la ruta directa + N rutas con waypoints sugeridos, y devuelve la
 * de menor "costo estético" = turnos + longitud (con peso). Útil cuando el
 * ruteo directo cae en diagonal zigzagueante y queremos forzar un corredor.
 */
export function routeWithAesthetics(start, end, g, opts = {}) {
  const suggest = opts.suggestCount ?? 4;
  const turnWeight = opts.turnWeight ?? 4;
  const candidates = [start, ...suggestWaypoints(start, end, g, suggest), end];
  let best = null;
  for (let i = 0; i < candidates.length - 1; i++) {
    const wp = candidates.slice(i + 1, -1);
    const path = routeOrthogonal(start, end, g, { ...opts, waypoints: wp });
    const cost = countTurns(path) * turnWeight + manhattanLength(path);
    if (!best || cost < best.cost) best = { path, cost, waypoints: wp };
  }
  return best?.path ?? routeOrthogonal(start, end, g, opts);
}

export function gridToPixel(p, grid = TK_DIAGRAM_GRID) {
  return { x: p.col * grid, y: p.row * grid };
}

export function pixelToGrid(x, y, grid = TK_DIAGRAM_GRID) {
  return { col: Math.round(x / grid), row: Math.round(y / grid) };
}

export function gridPathToSvg(points, grid = TK_DIAGRAM_GRID) {
  if (!points.length) return '';
  const first = gridToPixel(points[0], grid);
  let d = `M ${first.x} ${first.y}`;
  for (let i = 1; i < points.length; i++) {
    const p = gridToPixel(points[i], grid);
    d += ` L ${p.x} ${p.y}`;
  }
  return d;
}

function arrowFromPolyline(points, grid = TK_DIAGRAM_GRID) {
  if (points.length < 2) {
    const p = gridToPixel(points[0] ?? { col: 0, row: 0 }, grid);
    return { arrowTipX: p.x, arrowTipY: p.y, arrowDir: 1 };
  }
  const a = gridToPixel(points[points.length - 2], grid);
  const b = gridToPixel(points[points.length - 1], grid);
  return {
    arrowTipX: b.x,
    arrowTipY: b.y,
    arrowDir: (b.x >= a.x ? 1 : -1),
  };
}

/**
 * Construye un path SVG ortogonal entre dos anclas reales (fuera de grid).
 * Los anclas `a` y `b` están en píxeles; el A* corre entre dos puntos de
 * rejilla interiores (`aGrid`/`bGrid`). Esta función los une con segmentos
 * estrictamente horizontales o verticales — sin diagonales.
 *
 * Estructura del path:
 *   M a                → arranca en el borde del nodo origen
 *   L outPx(aGrid)     → sale recto hasta el primer punto del A*
 *   <polyline A*>      → ortogonal entre aGrid y bGrid
 *   L intoPx(bGrid)    → recto hasta antes del borde del nodo destino
 *   L b                → entra al destino
 */
export function buildOrthogonalPath(a, b, aGrid, bGrid, points, grid = TK_DIAGRAM_GRID) {
  // outPx/intoPx se derivan de `points` (el arranque/fin REAL de la polyline),
  // no de aGrid/bGrid: si el ancla pedida caía en una celda bloqueada,
  // `routeOrthogonal` la desplaza a la celda libre más cercana (ver
  // `nearestOpenCell`) y ese es el punto con el que de verdad hay que
  // empalmar — usar aGrid/bGrid aquí dejaría una costura en diagonal de una
  // celda entre el tramo de salida y el resto de la ruta.
  const outPx = points.length ? gridToPixel(points[0], grid) : { x: aGrid.col * grid, y: aGrid.row * grid };
  const intoPx = points.length ? gridToPixel(points[points.length - 1], grid) : { x: bGrid.col * grid, y: bGrid.row * grid };
  const segs = [`M${a.x},${a.y}`, `L${outPx.x},${outPx.y}`];
  const star = gridPathToSvg(points, grid);
  if (star) segs.push(star.slice(1));
  segs.push(`L${intoPx.x},${intoPx.y}`);
  segs.push(`L${b.x},${b.y}`);
  return segs.join(' ');
}

/** Mensaje horizontal entre dos lifelines (A* sobre la rejilla de costos). */
export function routeSequenceHorizontal(fromX, toX, y, g) {
  const ySn = snapDiagramGrid(y);
  const dir = toX >= fromX ? 1 : -1;
  const start = pixelToGrid(snapDiagramGrid(fromX + dir * 8), ySn, g.grid);
  const end = pixelToGrid(snapDiagramGrid(toX - dir * 12), ySn, g.grid);
  const points = routeOrthogonal(start, end, g);
  return { path: gridPathToSvg(points, g.grid), ...arrowFromPolyline(points, g.grid), points };
}

/**
 * Bucle self sobre una lifeline. `side` decide a qué lado se dibuja
 * (right por defecto; left cuando el actor está pegado al borde derecho).
 */
export function routeSequenceSelf(
  lifelineX,
  y,
  g,
  side = 1,
  loopW = 40,
  loopH = 24,
) {
  const gx = snapDiagramGrid(lifelineX);
  const gy = snapDiagramGrid(y);
  const wCells = Math.max(2, Math.round(loopW / g.grid));
  const hCells = Math.max(2, Math.round(loopH / g.grid));
  const start = pixelToGrid(gx, gy, g.grid);
  const outX = start.col + side * wCells;
  const waypoints = [
    { col: outX, row: start.row },
    { col: outX, row: start.row - hCells },
  ];
  const end = { col: start.col + side, row: start.row - hCells };
  const points = routeOrthogonal(start, end, g, { waypoints, turnCost: 0 });
  // El tramo de retorno entra de regreso a la lifeline → la punta apunta hacia
  // ella: a la derecha si el bucle va a la izquierda (side=-1) y viceversa.
  return {
    path: gridPathToSvg(points, g.grid),
    arrowTipX: gx + side * g.grid,
    arrowTipY: gy - hCells * g.grid,
    arrowDir: (side === 1 ? -1 : 1),
    points,
  };
}
