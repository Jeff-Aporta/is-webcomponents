/**
 * Puntas de flecha para diagramas.
 *
 * El problema que resuelve: cada diagrama dibujaba su cabeza asumiendo que la
 * arista llegaba en horizontal. Cuando el router ortogonal desviaba la última
 * curva, la punta quedaba apuntando de lado y separada visualmente de la línea
 * ("la flecha no toca la línea"). Aquí la orientación sale del ÚLTIMO TRAMO
 * REAL del path, no de la dirección global origen→destino.
 */
import { svgEl } from '../../../core/svg-chart-engine.js';
import type { ArrowPoint, SvgArrowHeadOpts } from "../schemas/diagram-arrow.schemas.js";

/** Punto en píxeles. */

/**
 * Puntos absolutos de un path ortogonal (`M`/`L`/`H`/`V`, may/min).
 * Solo se usan comandos de línea: los diagramas del kit no emiten curvas.
 */
export function pathPoints(d: string): ArrowPoint[] {
  const points: ArrowPoint[] = [];
  let x = 0;
  let y = 0;
  const tokens = String(d || '').match(/[MmLlHhVv][^MmLlHhVvZz]*/g) || [];
  for (const token of tokens) {
    const cmd = token[0]!;
    const nums = (token.slice(1).match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []).map(Number);
    const rel = cmd === cmd.toLowerCase();
    switch (cmd.toUpperCase()) {
      case 'M':
      case 'L':
        for (let i = 0; i + 1 < nums.length; i += 2) {
          x = rel ? x + nums[i]! : nums[i]!;
          y = rel ? y + nums[i + 1]! : nums[i + 1]!;
          points.push({ x, y });
        }
        break;
      case 'H':
        for (const n of nums) {
          x = rel ? x + n : n;
          points.push({ x, y });
        }
        break;
      case 'V':
        for (const n of nums) {
          y = rel ? y + n : n;
          points.push({ x, y });
        }
        break;
      default:
        break;
    }
  }
  return points;
}

/**
 * Vector unitario del último tramo con longitud real del path.
 * Si el path no da información utilizable, cae al `fallback`.
 * Por defecto el fallback apunta hacia la derecha.
 */
export function pathEndDirection(d: string, fallback: ArrowPoint = { x: 1, y: 0 }): ArrowPoint {
  const points = pathPoints(d);
  for (let i = points.length - 1; i > 0; i -= 1) {
    const dx = points[i]!.x - points[i - 1]!.x;
    const dy = points[i]!.y - points[i - 1]!.y;
    const len = Math.hypot(dx, dy);
    if (len > 0.01) return { x: dx / len, y: dy / len };
  }
  return fallback;
}

/**
 * Triángulo con vértice en `tip`, apuntando según `dir`.
 * @returns Atributo `points` de un `<polygon>`.
 */
export function arrowHeadPoints(tip: ArrowPoint, dir: ArrowPoint, len: number = 7, halfWidth: number = 3.5): string {
  // Perpendicular en 2D: (-dy, dx).
  const baseX = tip.x - dir.x * len;
  const baseY = tip.y - dir.y * len;
  const px = -dir.y * halfWidth;
  const py = dir.x * halfWidth;
  return [
    `${tip.x},${tip.y}`,
    `${baseX + px},${baseY + py}`,
    `${baseX - px},${baseY - py}`,
  ].join(' ');
}

/**
 * Punta ABIERTA (dos trazos en V, sin relleno) con vértice en `tip`, apuntando según `dir`.
 * @returns Atributo `points` de un `<polyline>` (base, vértice, base).
 */
export function openArrowHeadPoints(tip: ArrowPoint, dir: ArrowPoint, len: number = 9, halfWidth: number = 4.5): string {
  const baseX = tip.x - dir.x * len;
  const baseY = tip.y - dir.y * len;
  const px = -dir.y * halfWidth;
  const py = dir.x * halfWidth;
  return `${baseX + px},${baseY + py} ${tip.x},${tip.y} ${baseX - px},${baseY - py}`;
}

/**
 * `<polygon>` de cabeza de flecha ya orientado contra el final del path.
 */
export function svgArrowHead({
  d, tip, color, len = 7, halfWidth = 3.5, className = null, fallbackDir,
}: SvgArrowHeadOpts): SVGElement {
  const dir = pathEndDirection(d, fallbackDir);
  return svgEl('polygon', {
    points: arrowHeadPoints(tip, dir, len, halfWidth),
    fill: color,
    class: className,
  });
}

/**
 * Pata de gallo (crow's foot) de los diagramas ER: tres trazos que se abren
 * desde el nodo hacia la entidad, para la cardinalidad "muchos".
 * @returns Atributo `d` de un `<path>`.
 */
export function crowFootPath(tip: ArrowPoint, dir: ArrowPoint, len: number = 9, halfWidth: number = 5): string {
  const baseX = tip.x - dir.x * len;
  const baseY = tip.y - dir.y * len;
  const px = -dir.y * halfWidth;
  const py = dir.x * halfWidth;
  return [
    `M${tip.x},${tip.y} L${baseX + px},${baseY + py}`,
    `M${tip.x},${tip.y} L${baseX - px},${baseY - py}`,
    `M${tip.x},${tip.y} L${baseX},${baseY}`,
  ].join(' ');
}

/**
 * Auto-cruce PROHIBIDO: una arista nunca se corta (ni se pisa) a sí misma. Si su polilínea ortogonal
 * se cruza, se corta en el cruce y se descarta el bucle: la ruta resultante solo usa tramos que ya
 * tenía (no invade terreno nuevo) y conserva sus extremos. Sin cruce devuelve los mismos puntos.
 */
export function quitarAutoCruces(pts: readonly ArrowPoint[]): ArrowPoint[] {
  const ortogonal = pts.slice(1).every((q, k) => q.x === pts[k]!.x || q.y === pts[k]!.y);
  if (!ortogonal) return [...pts];
  let p = [...pts];
  let cambio = false;
  for (let vuelta = 0; vuelta < 64; vuelta++) {
    const limpio = sinRetrocesos(p);
    if (limpio.length !== p.length) cambio = true;
    p = limpio;
    let corte: { i: number; j: number; x: ArrowPoint } | null = null;
    for (let i = 0; i < p.length - 1 && !corte; i++) {
      // El tramo más lejano que toca al i-ésimo: se descarta el bucle más grande.
      for (let j = p.length - 2; j >= i + 2; j--) {
        const x = cruceOrtogonal(p[i]!, p[i + 1]!, p[j]!, p[j + 1]!);
        if (x) { corte = { i, j, x }; break; }
      }
    }
    if (!corte) break;
    p = [...p.slice(0, corte.i + 1), corte.x, ...p.slice(corte.j + 1)];
    cambio = true;
  }
  return cambio ? p : [...pts];
}

/** ¿La polilínea ortogonal se cruza o se pisa a sí misma? (guardianes y diagnósticos). */
export function tieneAutoCruce(pts: readonly ArrowPoint[]): boolean {
  const sinRepetidos = pts.filter((q, k) => !k || q.x !== pts[k - 1]!.x || q.y !== pts[k - 1]!.y);
  if (huboRetroceso(sinRepetidos)) return true;
  const p = sinRetrocesos(sinRepetidos);
  for (let i = 0; i < p.length - 1; i++) {
    for (let j = i + 2; j < p.length - 1; j++) if (cruceOrtogonal(p[i]!, p[i + 1]!, p[j]!, p[j + 1]!)) return true;
  }
  return false;
}

/** Path `M/L` de una polilínea. */
export function polilineaPath(pts: readonly ArrowPoint[]): string {
  return pts.map((q, i) => `${i ? 'L' : 'M'}${q.x},${q.y}`).join(' ');
}

/** Igual que `quitarAutoCruces`, sobre un path: devuelve el mismo `d` si no había cruce. */
export function pathSinAutoCruces(d: string): string {
  const pts = pathPoints(d);
  const limpio = quitarAutoCruces(pts);
  return limpio.length === pts.length && limpio.every((q, k) => q.x === pts[k]!.x && q.y === pts[k]!.y) ? d : polilineaPath(limpio);
}

/** Un tramo que vuelve sobre el anterior (ida y vuelta por la misma recta). */
function huboRetroceso(pts: readonly ArrowPoint[]): boolean {
  for (let k = 1; k < pts.length - 1; k++) {
    const a = pts[k - 1]!;
    const b = pts[k]!;
    const c = pts[k + 1]!;
    const enX = a.y === b.y && b.y === c.y && Math.sign(b.x - a.x) * Math.sign(c.x - b.x) < 0;
    const enY = a.x === b.x && b.x === c.x && Math.sign(b.y - a.y) * Math.sign(c.y - b.y) < 0;
    if (enX || enY) return true;
  }
  return false;
}

/** Quita puntos repetidos y los intermedios colineales (incluye los retrocesos: ida y vuelta). */
function sinRetrocesos(pts: readonly ArrowPoint[]): ArrowPoint[] {
  const out: ArrowPoint[] = [];
  for (const q of pts) {
    const u = out[out.length - 1];
    if (u && u.x === q.x && u.y === q.y) continue;
    const t = out[out.length - 2];
    if (t && u && ((t.x === u.x && u.x === q.x) || (t.y === u.y && u.y === q.y))) out.pop();
    out.push(q);
  }
  return out;
}

/** Punto común de dos tramos ortogonales (en un solape colineal, el más cercano al final de `b`). */
function cruceOrtogonal(a0: ArrowPoint, a1: ArrowPoint, b0: ArrowPoint, b1: ArrowPoint): ArrowPoint | null {
  const dentro = (v: number, p: number, q: number): boolean => v >= Math.min(p, q) && v <= Math.max(p, q);
  const aH = a0.y === a1.y;
  const bH = b0.y === b1.y;
  if (aH !== bH) {
    const [h0, h1, v0, v1] = aH ? [a0, a1, b0, b1] : [b0, b1, a0, a1];
    return dentro(v0.x, h0.x, h1.x) && dentro(h0.y, v0.y, v1.y) ? { x: v0.x, y: h0.y } : null;
  }
  const eje = aH ? 'x' : 'y';
  const otro = aH ? 'y' : 'x';
  if (a0[otro] !== b0[otro]) return null;
  const lo = Math.max(Math.min(a0[eje], a1[eje]), Math.min(b0[eje], b1[eje]));
  const hi = Math.min(Math.max(a0[eje], a1[eje]), Math.max(b0[eje], b1[eje]));
  if (lo > hi) return null;
  const v = Math.min(hi, Math.max(lo, b1[eje]));
  return aH ? { x: v, y: a0.y } : { x: a0.x, y: v };
}
