/**
 * Puntas de flecha para diagramas.
 *
 * El problema que resuelve: cada diagrama dibujaba su cabeza asumiendo que la
 * arista llegaba en horizontal. Cuando el router ortogonal desviaba la última
 * curva, la punta quedaba apuntando de lado y separada visualmente de la línea
 * ("la flecha no toca la línea"). Aquí la orientación sale del ÚLTIMO TRAMO
 * REAL del path, no de la dirección global origen→destino.
 */
import { svgEl } from './svg-chart-engine.js';

/** Punto en píxeles. */
export type ArrowPoint = { x: number; y: number };

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

export type SvgArrowHeadOpts = {
  d: string;
  tip: ArrowPoint;
  color: string;
  len?: number;
  halfWidth?: number;
  className?: string | null;
  fallbackDir?: ArrowPoint;
};

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
