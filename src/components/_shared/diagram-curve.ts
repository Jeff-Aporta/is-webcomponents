/**
 * diagram-curve.ts — Capa de diseño «curva» sobre un recorrido ortogonal.
 *
 * El router ortogonal sigue mandando: aquí no se mueve ningún tramo. Solo
 * se redondea cada giro con una Bézier cuadrática cuyo punto de control es
 * el vértice del giro, así la curva sigue exactamente el mismo camino y los
 * extremos (donde van las puntas y los -(O-) quedan rectos e intactos.
 *
 * Es determinista: mismo path y mismo radio → mismo resultado.
 */
import { pathPoints } from './diagram-arrow.js';

const f = (n: number): string => String(Math.round(n * 100) / 100);

/**
 * @param d       Path ortogonal (`M/L/H/V`).
 * @param radius  Radio deseado por giro (px); se acota a la mitad del tramo
 *                más corto adyacente para no cruzar el vértice siguiente.
 */
export function roundOrthogonalPath(d: string, radius: number = 12): string {
  const pts = pathPoints(d).filter((p, i, a) => i === 0 || Math.hypot(p.x - a[i - 1]!.x, p.y - a[i - 1]!.y) > 0.01);
  if (pts.length < 3 || radius <= 0) return d;
  let out = `M${f(pts[0]!.x)},${f(pts[0]!.y)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1]!;
    const v = pts[i]!;
    const b = pts[i + 1]!;
    const inLen = Math.hypot(v.x - a.x, v.y - a.y);
    const outLen = Math.hypot(b.x - v.x, b.y - v.y);
    const r = Math.min(radius, inLen / 2, outLen / 2);
    if (r < 0.5) {
      out += ` L${f(v.x)},${f(v.y)}`;
      continue;
    }
    const p1 = { x: v.x + ((a.x - v.x) / inLen) * r, y: v.y + ((a.y - v.y) / inLen) * r };
    const p2 = { x: v.x + ((b.x - v.x) / outLen) * r, y: v.y + ((b.y - v.y) / outLen) * r };
    out += ` L${f(p1.x)},${f(p1.y)} Q${f(v.x)},${f(v.y)} ${f(p2.x)},${f(p2.y)}`;
  }
  const last = pts[pts.length - 1]!;
  out += ` L${f(last.x)},${f(last.y)}`;
  return out;
}

/** `curved` → path redondeado; cualquier otro estilo → el path tal cual. */
export function styledEdgePath(d: string, edgeStyle: string | null | undefined, radius: number = 12): string {
  return edgeStyle === 'curved' ? roundOrthogonalPath(d, radius) : d;
}
