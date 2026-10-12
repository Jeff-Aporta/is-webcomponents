/**
 * Guardianes WHAT de las capas de costo del router del flujo (A9):
 *   G1 (c) un riel cuyos extremos están FUERA de un grupo no entra en él: lo rodea (entrar y salir
 *      cuesta una suma fija, la misma del router de componentes, y no tiene nada que hacer adentro).
 *   G2 (c) un riel que llega a un miembro del grupo sí lo cruza, una sola vez.
 *   G3 (b) N aristas paralelas sin extremos comunes no comparten tramo (los rieles quemados son aditivos).
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { computeFlowchartLayout, resolveFlowchartSpec } from '../../../components/diagrams/flowchart-spec.ts';
import { pathPoints } from '../../../components/_shared/diagram-arrow.ts';

type P = { x: number; y: number };
type Caja = { x: number; y: number; w: number; h: number };
const dentro = (p: P, c: Caja, m = 1): boolean => p.x > c.x + m && p.x < c.x + c.w - m && p.y > c.y + m && p.y < c.y + c.h - m;
/** Puntos muestreados cada 4 px a lo largo de la polyline. */
function muestras(pts: readonly P[]): P[] {
  const out: P[] = [];
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1]!, b = pts[k]!;
    const l = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    for (let t = 0; t <= l; t += 4) out.push({ x: a.x + (b.x - a.x) * (t / (l || 1)), y: a.y + (b.y - a.y) * (t / (l || 1)) });
  }
  return out;
}
/** Veces que la polyline pasa de fuera a dentro de la caja. */
const entradas = (pts: readonly P[], c: Caja): number => {
  let n = 0, prev = false;
  for (const q of muestras(pts)) { const d = dentro(q, c); if (d && !prev) n++; prev = d; }
  return n;
};

/** Un atajo x→y salta por encima de los dos pasos del grupo: sin el costo del borde cortaba por adentro. */
const FLUJO = {
  lanes: [{ id: 'A', label: 'Flujo' }, { id: 'B', label: 'Servicio' }],
  nodes: [
    { id: 'x', label: 'Recibe', lane: 'B' },
    { id: 'v1', label: 'Valida el cuerpo', lane: 'B', context: 'Validación' },
    { id: 'v2', label: 'Valida permisos', lane: 'B', context: 'Validación' },
    { id: 'y', label: 'Responde', lane: 'B' },
  ],
  edges: [{ from: 'x', to: 'v1' }, { from: 'v1', to: 'v2' }, { from: 'v2', to: 'y' }, { from: 'x', to: 'y', label: 'atajo' }],
};

Deno.test('costos: G1/G2 (c) un riel ajeno rodea el grupo; uno que llega a un miembro lo cruza una vez', () => {
  const L = computeFlowchartLayout(resolveFlowchartSpec(FLUJO)!, null, { style: 'insoft' });
  const g = L.contexts?.find((c) => c.label === 'Validación');
  assert(g, `sin grupo Validación: ${JSON.stringify(L.contexts?.map((c) => c.label))}`);
  const fallas: string[] = [];
  for (const e of L.edges) {
    const miembro = g.members?.includes(e.from) || g.members?.includes(e.to);
    const n = entradas(pathPoints(e.path), g);
    if (!miembro && n > 0) fallas.push(`G1 ${e.from}→${e.to} entra ${n} vez/veces al grupo sin tener extremos en él`);
    if (miembro && n > 1) fallas.push(`G2 ${e.from}→${e.to} entra ${n} veces al grupo (máximo 1)`);
  }
  assert(fallas.length === 0, fallas.join('\n'));
});

Deno.test('costos: G3 (b) aristas paralelas sin extremos comunes no comparten tramo', () => {
  const L = computeFlowchartLayout(resolveFlowchartSpec({
    lanes: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }],
    nodes: [
      { id: 'a1', label: 'Origen 1', lane: 'A' }, { id: 'a2', label: 'Origen 2', lane: 'A' }, { id: 'a3', label: 'Origen 3', lane: 'A' },
      { id: 'b1', label: 'Destino 1', lane: 'B' }, { id: 'b2', label: 'Destino 2', lane: 'B' }, { id: 'b3', label: 'Destino 3', lane: 'B' },
    ],
    edges: [{ from: 'a1', to: 'a2' }, { from: 'a2', to: 'a3' }, { from: 'a1', to: 'b1' }, { from: 'a2', to: 'b2' }, { from: 'a3', to: 'b3' }, { from: 'b1', to: 'b2' }, { from: 'b2', to: 'b3' }],
  })!, null, { style: 'insoft' });
  const segs = L.edges.map((e) => ({ e, pts: pathPoints(e.path) }));
  const solapes: string[] = [];
  for (let i = 0; i < segs.length; i++) for (let k = i + 1; k < segs.length; k++) {
    const A = segs[i]!, B = segs[k]!;
    if (A.e.from === B.e.from || A.e.to === B.e.to || A.e.to === B.e.from || A.e.from === B.e.to) continue;
    for (let s = 1; s < A.pts.length; s++) for (let t = 1; t < B.pts.length; t++) {
      const a0 = A.pts[s - 1]!, a1 = A.pts[s]!, b0 = B.pts[t - 1]!, b1 = B.pts[t]!;
      const hor = a0.y === a1.y && b0.y === b1.y && a0.y === b0.y;
      const ver = a0.x === a1.x && b0.x === b1.x && a0.x === b0.x;
      if (!hor && !ver) continue;
      const [p0, p1] = hor ? [Math.min(a0.x, a1.x), Math.max(a0.x, a1.x)] : [Math.min(a0.y, a1.y), Math.max(a0.y, a1.y)];
      const [q0, q1] = hor ? [Math.min(b0.x, b1.x), Math.max(b0.x, b1.x)] : [Math.min(b0.y, b1.y), Math.max(b0.y, b1.y)];
      if (Math.min(p1, q1) - Math.max(p0, q0) > 8) solapes.push(`${A.e.from}→${A.e.to} y ${B.e.from}→${B.e.to}`);
    }
  }
  assert(solapes.length === 0, `comparten tramo: ${[...new Set(solapes)].join(' | ')}`);
});
