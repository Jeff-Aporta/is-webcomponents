import { tkHueToHex } from './tk-hue.js';

/** Paleta de aristas: un hue por índice, distinto del tono de la caja origen. */
export const EDGE_HUES = [205, 160, 18, 280, 40, 330, 195, 250, 90, 145, 310, 55];

export function assignEdgeHues(edges) {
  if (!edges?.length) return edges;
  edges.forEach((e, i) => {
    e.hue = EDGE_HUES[i % EDGE_HUES.length];
  });
  return edges;
}

export function edgeStrokeHex(hue, fallback = '#334155') {
  return tkHueToHex(hue, 48, 30) || fallback;
}

export function edgeChipFill(hue) {
  return `hsla(${hue ?? 205},42%,96%,0.5)`;
}

export function edgeChipText(hue, fallback) {
  return edgeStrokeHex(hue, fallback);
}
