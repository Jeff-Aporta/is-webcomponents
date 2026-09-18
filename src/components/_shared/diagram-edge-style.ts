import { tkHueToHex } from './tk-hue.js';

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

export function edgeChipFill(hue: number | null | undefined): string {
  return `hsla(${hue ?? 205},42%,96%,0.5)`;
}

export function edgeChipText(hue: number | null | undefined, fallback: string): string {
  return edgeStrokeHex(hue, fallback);
}
