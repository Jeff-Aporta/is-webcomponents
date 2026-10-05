import { tkHueToHex } from './tk-hue.js';
import { bg2fontColor } from './tk-color.js';

/** Arista del grafo con un hue opcional para colorearla. */
export type EdgeWithHue = { hue?: number; [key: string]: unknown };

/** Paleta de aristas: un hue por índice, distinto del tono de la caja origen. */
export const EDGE_HUES: readonly number[] = [205, 160, 18, 280, 40, 330, 195, 250, 90, 145, 310, 55];

export function assignEdgeHues<T extends EdgeWithHue>(edges: readonly T[]): T[] {
  if (!edges?.length) return edges.slice();
  return edges.map((e, i) => {
    e.hue = EDGE_HUES[i % EDGE_HUES.length];
    return e;
  });
}

export function edgeStrokeHex(hue: number | null | undefined, fallback: string = '#334155'): string {
  return tkHueToHex(hue, 48, 30) || fallback;
}

/** Fondo del chip = color de la arista (sólido). */
export function edgeChipFill(hue: number | null | undefined): string {
  return edgeStrokeHex(hue);
}

/** Texto del chip: contraste OKLCH sobre el color de la arista. */
export function edgeChipText(hue: number | null | undefined, fallback: string = '#334155'): string {
  return bg2fontColor(edgeStrokeHex(hue, fallback));
}

/** Chip a partir de un stroke ya resuelto (tema / override). */
export function edgeChipFromStroke(stroke: string): { fill: string; text: string } {
  return { fill: stroke, text: bg2fontColor(stroke) };
}
