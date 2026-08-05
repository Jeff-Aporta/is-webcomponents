import {
  makeCostGrid, blockRect, addForbiddenRegion, applyForbiddenRegions,
  removeForbiddenRegion, readExclusionZones, nudgeRectFromZones, blockExclusionZones,
} from './diagram-grid.js';
import {
  routeSequenceHorizontal, routeSequenceSelf, routeOrthogonal, pixelToGrid,
  buildOrthogonalPath, countTurns,
} from './diagram-astar.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const g = makeCostGrid(400, 200);
blockRect(g, 150, 50, 100, 100);

const h = routeSequenceHorizontal(50, 350, 100, g);
assert(h.path.length > 0 && h.path.startsWith('M'), 'horizontal path invalid');
assert(typeof h.arrowTipX === 'number' && Number.isFinite(h.arrowTipX), 'horizontal arrowTipX invalid');

const s = routeSequenceSelf(100, 100, g);
assert(s.path.length > 0 && s.path.startsWith('M'), 'self path invalid');
assert(typeof s.arrowTipX === 'number' && Number.isFinite(s.arrowTipX), 'self arrowTipX invalid');

// Waypoints: un punto de control fuerza la ruta a pasar por esa celda.
{
  const g2 = makeCostGrid(400, 200);
  const start = pixelToGrid(20, 20, g2.grid);
  const end = pixelToGrid(380, 180, g2.grid);
  const waypoint = pixelToGrid(200, 20, g2.grid);
  const points = routeOrthogonal(start, end, g2, { waypoints: [waypoint] });
  // collapseColinear quita vértices que quedan en línea recta: el waypoint
  // puede no aparecer como punto explícito aunque el segmento pase por él.
  const onSegment = points.some((p, i) => {
    if (i === 0) return false;
    const prev = points[i - 1];
    if (prev.col === p.col) {
      return waypoint.col === p.col && waypoint.row >= Math.min(prev.row, p.row) && waypoint.row <= Math.max(prev.row, p.row);
    }
    if (prev.row === p.row) {
      return waypoint.row === p.row && waypoint.col >= Math.min(prev.col, p.col) && waypoint.col <= Math.max(prev.col, p.col);
    }
    return false;
  });
  assert(onSegment, 'la ruta con waypoint debe pasar por el punto de control');
}

// Zonas prohibidas: bloquean el paso de aristas (nodos Y aristas, por contrato).
{
  const g3 = makeCostGrid(400, 200);
  const region = addForbiddenRegion(g3, { kind: 'rect', x: 150, y: 0, w: 100, h: 200 });
  applyForbiddenRegions(g3);
  const start = pixelToGrid(20, 100, g3.grid);
  const end = pixelToGrid(380, 100, g3.grid);
  const points = routeOrthogonal(start, end, g3);
  const insideZone = points.some((p) => {
    const px = p.col * g3.grid;
    const py = p.row * g3.grid;
    return px >= 150 && px <= 250 && py >= 0 && py <= 200;
  });
  assert(!insideZone, 'la ruta no debe cruzar una zona prohibida activa');
  assert(removeForbiddenRegion(g3, region.id), 'debe poder removerse la región por id');
}

// readExclusionZones: descarta zonas degeneradas (w/h <= 0) y normaliza tipos.
{
  const zones = readExclusionZones([{ x: '10', y: 20, w: 50, h: 30 }, { x: 0, y: 0, w: 0, h: 10 }, null]);
  assert(zones.length === 1, 'debe quedar solo la zona con área positiva');
  assert(zones[0].x === 10 && zones[0].w === 50, 'debe normalizar los campos numéricos');
}

// nudgeRectFromZones: un nodo completamente dentro de una zona sale de ella.
{
  const zone = { x: 100, y: 100, w: 80, h: 80 };
  const node = { x: 110, y: 110, w: 40, h: 40 };
  const out = nudgeRectFromZones(node, [zone]);
  const overlap = out.x < zone.x + zone.w && out.x + out.w > zone.x && out.y < zone.y + zone.h && out.y + out.h > zone.y;
  assert(!overlap, 'el nodo empujado no debe seguir superpuesto a la zona');
  // Sin zonas, no debe tocar el rect (comportamiento neutro).
  const same = nudgeRectFromZones(node, []);
  assert(same.x === node.x && same.y === node.y, 'sin zonas el nudge debe ser un no-op');
}

// blockExclusionZones: aplica el bloqueo con el mismo offset que usan los specs.
{
  const g4 = makeCostGrid(400, 200);
  blockExclusionZones(g4, [{ x: 100, y: 0, w: 100, h: 200 }], 20, 0);
  const start = pixelToGrid(20, 100, g4.grid);
  const end = pixelToGrid(380, 100, g4.grid);
  const points = routeOrthogonal(start, end, g4);
  const insideZone = points.some((p) => {
    const px = p.col * g4.grid;
    return px >= 120 && px <= 220;
  });
  assert(!insideZone, 'blockExclusionZones debe respetar el offset del lienzo');
}

// buildOrthogonalPath: solo segmentos horizontales o verticales, nunca diagonal.
{
  const g5 = makeCostGrid(300, 200);
  const aGrid = pixelToGrid(40, 40, g5.grid);
  const bGrid = pixelToGrid(260, 160, g5.grid);
  const points = routeOrthogonal(aGrid, bGrid, g5);
  const path = buildOrthogonalPath({ x: 32, y: 40 }, { x: 268, y: 160 }, aGrid, bGrid, points, g5.grid);
  const nums = [...path.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  let diagonal = false;
  for (let i = 0; i + 3 < nums.length; i += 2) {
    const [x1, y1, x2, y2] = nums.slice(i, i + 4);
    if (x1 !== x2 && y1 !== y2) diagonal = true;
  }
  assert(!diagonal, 'buildOrthogonalPath no debe producir segmentos diagonales');
  assert(countTurns(points) >= 0, 'countTurns debe ser numérico');
}

console.log('diagram-astar self-check: PASS');
