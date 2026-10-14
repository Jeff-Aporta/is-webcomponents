/**
 * Guardianes WHAT de las capas de costo del router del flujo (A9):
 *   G1 (c) un riel cuyos extremos están FUERA de un grupo no entra en él: lo rodea (entrar y salir
 *      cuesta una suma fija, la misma del router de componentes, y no tiene nada que hacer adentro).
 *   G2 (c) un riel que llega a un miembro del grupo sí lo cruza, una sola vez.
 *   G3 (b) N aristas paralelas sin extremos comunes no comparten tramo (los rieles quemados son aditivos).
 *   G4 (d) cada codo ya trazado encarece su vecindad (`costearCodos`): la arista siguiente no apila un
 *      codo junto a uno ajeno ni hace un escalón corto para colarse al lado; toma el pasillo libre.
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { computeFlowchartLayout, resolveFlowchartSpec } from '../../../components/diagrams/flowchart-spec.ts';
import { pathPoints } from '../../../components/diagrams/utils/diagram-arrow.ts';

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

/**
 * G4 (d). Abanico a→b / a→c y un tronco a→e que baja hasta el destino de c. Sin la vecindad de
 * codos, a→e escoge (por empate de longitud) salir pegada al codo de a→c y hacer un escalón de
 * 8 px (dos codos consecutivos) para seguir en paralelo a su riel: dos codos juntos se leen como
 * un cruce. Con la vecindad, ese pasillo cuesta más y a→e toma el pasillo exterior libre.
 * Estilo por defecto (sin `insoft`): todas las aristas pasan por la rejilla A*.
 */
const FLUJO_CODOS = {
  nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }, { id: 'd', label: 'D' }, { id: 'e', label: 'E' }],
  edges: [{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }, { from: 'b', to: 'd' }, { from: 'c', to: 'e' }, { from: 'a', to: 'e' }],
};
/** Vecindad de un codo: 2U a cada lado (`CODO.radio` en flowchart-spec). */
const RADIO_CODO = 30;
const codosDe = (pts: readonly P[]): P[] =>
  pts.slice(1, -1).filter((q, k) => { const p = pts[k]!, r = pts[k + 2]!; return (q.x - p.x) * (r.y - q.y) - (q.y - p.y) * (r.x - q.x) !== 0; });
/**
 * Fallas de vecindad de codos de un layout:
 *   - un codo de una arista dentro de la vecindad de un codo de OTRA arista (se exceptúa el primer
 *     codo de dos aristas que salen del mismo nodo: es el tronco compartido del abanico);
 *   - un escalón corto: dos codos consecutivos de la misma arista a menos de `RADIO_CODO`.
 */
export function fallasVecindadCodos(edges: ReadonlyArray<{ from: string; to: string; path: string }>): string[] {
  const fallas: string[] = [];
  const todas = edges.map((e) => ({ e, codos: codosDe(pathPoints(e.path)) }));
  const cerca = (p: P, q: P): boolean => Math.abs(p.x - q.x) <= RADIO_CODO && Math.abs(p.y - q.y) <= RADIO_CODO;
  for (let i = 0; i < todas.length; i++) {
    const A = todas[i]!;
    A.codos.slice(1).forEach((q, k) => {
      const p = A.codos[k]!;
      if (cerca(p, q)) fallas.push(`${A.e.from}→${A.e.to} hace un escalón corto entre (${p.x},${p.y}) y (${q.x},${q.y})`);
    });
    for (let j = 0; j < i; j++) {
      const B = todas[j]!;
      A.codos.forEach((q, ka) => B.codos.forEach((p, kb) => {
        if (ka === 0 && kb === 0 && A.e.from === B.e.from) return;
        if (cerca(p, q)) fallas.push(`codo (${q.x},${q.y}) de ${A.e.from}→${A.e.to} apilado junto al codo (${p.x},${p.y}) de ${B.e.from}→${B.e.to}`);
      }));
    }
  }
  return fallas;
}

Deno.test('costos: G4 (d) un codo encarece su vecindad: la siguiente arista no apila codos ni hace escalón junto a uno ajeno', () => {
  const L = computeFlowchartLayout(resolveFlowchartSpec(FLUJO_CODOS)!, null, {});
  const ae = L.edges.find((e) => e.from === 'a' && e.to === 'e');
  assert(ae && codosDe(pathPoints(ae.path)).length >= 2, 'precondición: a→e no es recta (tiene que esquivar a c y su rama)');
  const fallas = fallasVecindadCodos(L.edges);
  assert(fallas.length === 0, fallas.join('\n'));
});
