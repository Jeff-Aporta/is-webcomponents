import assert from 'node:assert';
import { resolveFlowchartSpec, computeFlowchartLayout } from './flowchart-spec.js';
import { pathPoints as parsePathPoints } from '../_shared/diagram-arrow.js';

/**
 * Regresión: ninguna arista debe contener un segmento en diagonal.
 *
 * Historial: una cadena de bugs compuestos en el motor compartido (anclas
 * sin snap a rejilla, `applyRectCost` sobre-bloqueando una fila/columna de
 * más, `buildOrthogonalPath` usando el ancla pedida en vez del punto real
 * donde arrancó la ruta, y un `stepOut` insuficiente frente a la cuantización
 * de 8px) producía "torcidos" en diagonal — visibles primero en ER, pero
 * latentes en cualquier diagrama que usa este mismo ruteo. Este check parsea
 * el SVG real (M/L/H/V) y falla si aparece cualquier segmento no
 * horizontal/vertical.
 */

function assertNoDiagonals(path, label) {
  const pts = parsePathPoints(path);
  assert.ok(pts.length >= 2, `${label}: el path debe tener al menos 2 puntos`);
  const distinct = pts.filter((p, i: number) => i === 0 || p.x !== pts[i - 1].x || p.y !== pts[i - 1].y);
  for (let i = 1; i < distinct.length; i++) {
    const a = distinct[i - 1];
    const b = distinct[i];
    assert.ok(
      a.x === b.x || a.y === b.y,
      `${label}: segmento diagonal (${a.x},${a.y}) → (${b.x},${b.y})`,
    );
  }
}

// 1. Caso simple, sin zonas ni waypoints — el caso que expuso el off-by-one
//    de applyRectCost (el stepOut de salida caía en la misma celda bloqueada
//    que el margen del nodo siguiente).
{
  const spec = resolveFlowchartSpec({
    flowchart: {
      direction: 'TB',
      nodes: [{ id: 'a', label: 'Inicio', shape: 'stadium' }, { id: 'b', label: 'Paso B' }],
      edges: [{ from: 'a', to: 'b' }],
    },
  });
  const layout = computeFlowchartLayout(spec);
  for (const e of layout.edges) assertNoDiagonals(e.path, `simple ${e.from}->${e.to}`);
}

// 2. Con zona de exclusión + waypoint dentro del lienzo — el caso que expuso
//    el bug de buildOrthogonalPath usando el ancla pedida en vez del punto
//    real donde nearestOpenCell desplazó el arranque de la ruta.
{
  const spec = resolveFlowchartSpec({
    flowchart: {
      direction: 'TB',
      exclusionZones: [{ x: 80, y: 150, w: 120, h: 80 }],
      nodes: [
        { id: 'a', label: 'Inicio', shape: 'stadium' },
        { id: 'b', label: 'Paso B' },
        { id: 'c', label: 'Paso C' },
        { id: 'd', label: 'Fin', shape: 'stadium' },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c', waypoints: [{ x: 130, y: 200 }] },
        { from: 'c', to: 'd' },
      ],
    },
  });
  const layout = computeFlowchartLayout(spec);
  for (const e of layout.edges) assertNoDiagonals(e.path, `con zona ${e.from}->${e.to}`);
  // Los nodos no deben quedar dentro de la zona tras el nudge.
  const zone = layout.exclusionZones[0];
  for (const n of layout.nodes) {
    const overlap = n.x < zone.x + zone.w && n.x + n.w > zone.x && n.y < zone.y + zone.h && n.y + n.h > zone.y;
    assert.ok(!overlap, `nodo ${n.id} quedó dentro de la zona de exclusión`);
  }
}

// 3. Waypoint fuera del lienzo (dato de usuario erróneo) — debe recortarse,
//    no producir un salto en diagonal fuera de la rejilla.
{
  const spec = resolveFlowchartSpec({
    flowchart: {
      direction: 'TB',
      nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      edges: [{ from: 'a', to: 'b', waypoints: [{ x: 9999, y: 9999 }] }],
    },
  });
  const layout = computeFlowchartLayout(spec);
  assertNoDiagonals(layout.edges[0].path, 'waypoint fuera de rango');
}

console.log('flowchart-spec self-check: PASS');
