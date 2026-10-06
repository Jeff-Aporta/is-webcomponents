import { tkHueToHex } from './tk-hue.js';
import { bg2fontColor } from './tk-color.js';
import type { EdgeWithHue } from "./diagram-edge-style.schemas.js";

/** Arista del grafo con un hue opcional para colorearla. */

/** Paleta de aristas: un hue por índice, distinto del tono de la caja origen. */
export const EDGE_HUES: readonly number[] = [205, 160, 18, 280, 40, 330, 195, 250, 90, 145, 310, 55];

export function assignEdgeHues<T extends EdgeWithHue>(edges: readonly T[]): T[] {
  if (!edges?.length) return edges.slice();
  return edges.map((e, i) => {
    e.hue = EDGE_HUES[i % EDGE_HUES.length];
    return e;
  });
}

/** Mezcla un hex con blanco (fondos acordes a stroke oscuro). */
export function hexMixWhite(hex: string, t = 0.88): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return hex;
  let h = m[1]!;
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * t);
  return `#${[mix(r), mix(g), mix(b)].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
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
