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


/** ¿El tramo recto entre dos celdas (mismo eje) está libre de obstáculos? */
function segmentClear(g, a, b) {
  if (a.col !== b.col && a.row !== b.row) return false;
  const stepCol = Math.sign(b.col - a.col);
  const stepRow = Math.sign(b.row - a.row);
  let { col, row } = a;
  const steps = Math.abs(b.col - a.col) + Math.abs(b.row - a.row);
  for (let i = 0; i <= steps; i += 1) {
    if (cellCost(g, col, row) === COST_BLOCKED) return false;
    col += stepCol;
    row += stepRow;
  }
  return true;
}

/**
 * Quita el escalón de más: cuando la polyline hace A→B→C→D y la L directa
 * A→(esquina)→D está libre, ese zigzag intermedio es un giro que no aporta.
 * El A* lo produce porque el coste de giro es local y no ve que dos vueltas
 * seguidas se pueden fundir en una.
 */
function collapseJogs(points, g) {
  if (points.length < 4) return points;
  let out = points;
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i + 3 < out.length; i += 1) {
      const [a, , , d] = [out[i], out[i + 1], out[i + 2], out[i + 3]];
      for (const corner of [{ col: a.col, row: d.row }, { col: d.col, row: a.row }]) {
        if (!segmentClear(g, a, corner) || !segmentClear(g, corner, d)) continue;
        out = collapseColinear([...out.slice(0, i + 1), corner, ...out.slice(i + 3)]);
        changed = true;
        break;
      }
      if (changed) break;
    }
  }
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
  const out = collapseJogs(collapseColinear(full), g);
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

/**
 * Une dos puntos con 1–2 segmentos estrictamente ortogonales (nunca diagonal).
 * Si ya comparten eje → un solo L. Si no → L intermedio alineando primero el
 * eje que el `prefer` indique ('h' = horizontal primero, 'v' = vertical primero,
 * 'auto' = el eje de mayor delta primero para menos “escalón” visual).
 * @returns {string[]} comandos `L x,y` (sin M).
 */
function orthoConnect(from, to, prefer = 'auto') {
  const ax = from.x;
  const ay = from.y;
  const bx = to.x;
  const by = to.y;
  if (ax === bx || ay === by) return [`L${bx},${by}`];
  let horizFirst = prefer === 'h';
  if (prefer === 'v') horizFirst = false;
  if (prefer === 'auto') horizFirst = Math.abs(bx - ax) >= Math.abs(by - ay);
  if (horizFirst) return [`L${bx},${ay}`, `L${bx},${by}`];
  return [`L${ax},${by}`, `L${bx},${by}`];
}

/**
 * Si el empalme queda a menos de media celda del ancla en un eje, lo pega
 * al ancla: evita el micro-giro de 1 celda (class/flowchart “casi recto”).
 */
function snapSeamToAnchor(anchor, seam, grid) {
  const tol = Math.max(1, grid / 2);
  return {
    x: Math.abs(seam.x - anchor.x) <= tol ? anchor.x : seam.x,
    y: Math.abs(seam.y - anchor.y) <= tol ? anchor.y : seam.y,
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
 *   (ortho) outPx      → sale ortogonal hasta el primer punto del A*
 *   <polyline A*>      → ortogonal entre aGrid y bGrid
 *   (ortho) intoPx→b   → entra ortogonal al destino
 */
export function buildOrthogonalPath(a, b, aGrid, bGrid, points, grid = TK_DIAGRAM_GRID) {
  // outPx/intoPx se derivan de `points` (el arranque/fin REAL de la polyline),
  // no de aGrid/bGrid: si el ancla pedida caía en una celda bloqueada,
  // `routeOrthogonal` la desplaza a la celda libre más cercana (ver
  // `nearestOpenCell`) y ese es el punto con el que de verdad hay que
  // empalmar — usar aGrid/bGrid aquí dejaría una costura en diagonal.
  let outPx = points.length ? gridToPixel(points[0], grid) : { x: aGrid.col * grid, y: aGrid.row * grid };
  let intoPx = points.length ? gridToPixel(points[points.length - 1], grid) : { x: bGrid.col * grid, y: bGrid.row * grid };
  outPx = snapSeamToAnchor(a, outPx, grid);
  intoPx = snapSeamToAnchor(b, intoPx, grid);

  // Preferencia de empalme: al salir, seguir primero el eje donde ya hubo
  // movimiento desde el ancla (stub); al entrar, alinear primero al destino.
  const exitPrefer = (Math.abs(outPx.x - a.x) >= Math.abs(outPx.y - a.y)) ? 'h' : 'v';
  const enterPrefer = (Math.abs(b.x - intoPx.x) >= Math.abs(b.y - intoPx.y)) ? 'h' : 'v';

  const segs = [`M${a.x},${a.y}`, ...orthoConnect(a, outPx, exitPrefer)];
  // Polyline A*: saltar el primer punto (ya empalmado) para no duplicar.
  if (points.length > 1) {
    for (let i = 1; i < points.length; i += 1) {
      const p = gridToPixel(points[i], grid);
      // Último punto de A* se reemplaza por intoPx snappeado
      if (i === points.length - 1) {
        segs.push(...orthoConnect(
          i === 1 ? outPx : gridToPixel(points[i - 1], grid),
          intoPx,
          'auto',
        ));
      } else {
        segs.push(`L${p.x},${p.y}`);
      }
    }
  } else {
    segs.push(...orthoConnect(outPx, intoPx, 'auto'));
  }
  segs.push(...orthoConnect(intoPx, b, enterPrefer));
  return collapseSvgOrtho(segs.join(' '));
}

/** Colapsa vértices colineales en un path SVG M/L ortogonal. */
function collapseSvgOrtho(d) {
  const tokens = d.match(/[ML]-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?/g);
  if (!tokens || tokens.length < 2) return d;
  const pts = tokens.map((t) => {
    const [x, y] = t.slice(1).split(',').map(Number);
    return { cmd: t[0], x, y };
  });
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i += 1) {
    const a = out[out.length - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const colinear = (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y);
    if (!colinear) out.push(b);
  }
  out.push(pts[pts.length - 1]);
  return out.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
}

/** Mensaje horizontal entre dos lifelines (A* sobre la rejilla de costos). */
export function routeSequenceHorizontal(fromX, toX, y, g) {
  const ySn = snapDiagramGrid(y);
  const dir = toX >= fromX ? 1 : -1;
  // Anclas reales: el dot de origen (fromX) y la lifeline de destino (toX)
  // exacta — `buildOrthogonalPath` empalma el tramo A* con estos píxeles
  // reales, así la punta SIEMPRE toca la lifeline en vez de quedarse corta
  // por el redondeo a rejilla.
  const a = { x: fromX + dir * 8, y: ySn };
  const b = { x: toX, y: ySn };
  const start = pixelToGrid(snapDiagramGrid(a.x), ySn, g.grid);
  const end = pixelToGrid(snapDiagramGrid(b.x - dir * 12), ySn, g.grid);
  const points = routeOrthogonal(start, end, g);
  const path = buildOrthogonalPath(a, b, start, end, points, g.grid);
  return { path, arrowTipX: b.x, arrowTipY: b.y, arrowDir: dir, points };
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
    // Punta pegada a la lifeline (no a una celda de rejilla a un lado).
    arrowTipX: gx,
    arrowTipY: gy - hCells * g.grid,
    arrowDir: (side === 1 ? -1 : 1),
    points,
  };
}
