import { tkHueToHex } from './tk-hue.js';
import { bg2fontColor } from './tk-color.js';
import type { EdgeWithHue } from "./diagram-edge-style.schemas.js";

/** Arista del grafo con un hue opcional para colorearla. */

/** Paleta de aristas: un hue por índice, distinto del tono de la caja origen. */
export const EDGE_HUES: readonly number[] = [205, 160, 18, 280, 40, 330, 195, 250, 90, 145, 310, 55];

/** Emisores: misma S/L, H rota (TestPatyIA verde / soporte rojo ≈ este perfil). */
export const EMITTER_S = 85;
export const EMITTER_L = 28;
/** Hues de reserva si el emisor no trae color. */
export const EMITTER_HUES: readonly number[] = [145, 0, 210, 280, 40, 320, 190, 90];
/** Solo-receptores: lila fijo del theme InSoft CD. */
export const RECEIVER_COLOR = '#C1BFFF';
/** Aristas = color del emisor con B (L) −5% (más oscuro). */
export const EDGE_DARKEN = 0.95;

export function assignEdgeHues<T extends EdgeWithHue>(edges: readonly T[]): T[] {
  if (!edges?.length) return edges.slice();
  return edges.map((e, i) => {
    e.hue = EDGE_HUES[i % EDGE_HUES.length];
    return e;
  });
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/** #rgb/#rrggbb → HSL (H 0..360, S/L 0..100). */
export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  let h = m[1]!;
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hue = 0;
  if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) hue = ((b - r) / d + 2) / 6;
  else hue = ((r - g) / d + 4) / 6;
  return { h: hue * 360, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
  return tkHueToHex(((h % 360) + 360) % 360, clampPct(s), clampPct(l)) ?? '#334155';
}

/** Baja el brillo (L) por factor (p.ej. 0.95 = −5%). */
export function darkenHex(hex: string, factor = EDGE_DARKEN): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  return hslToHex(hsl.h, hsl.s, Math.max(4, hsl.l * factor));
}

/** @deprecated usar darkenHex — se mantiene por compat. */
export function brightenHex(hex: string, factor = 1 / EDGE_DARKEN): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  return hslToHex(hsl.h, hsl.s, Math.min(92, hsl.l * factor));
}

type Colored = { id: string; color?: string };
type Edged = { from: string; to: string; color?: string };

/**
 * Emisores = misma S/L, H del payload o rota; solo-receptores = #C1BFFF;
 * aristas = color del emisor con B −5%.
 */
export function assignEmitterReceiverPalette(
  components: readonly Colored[],
  edges: readonly Edged[],
): void {
  if (!components?.length) return;
  const emitters = new Set<string>();
  const receivers = new Set<string>();
  for (const e of edges ?? []) {
    if (e.from) emitters.add(e.from);
    if (e.to) receivers.add(e.to);
  }
  const byId = new Map(components.map((c) => [c.id, c]));
  let hueIdx = 0;
  for (const id of emitters) {
    const c = byId.get(id);
    if (!c) continue;
    const hsl = c.color ? hexToHsl(c.color) : null;
    const h = hsl && hsl.s > 5 ? hsl.h : EMITTER_HUES[hueIdx++ % EMITTER_HUES.length]!;
    c.color = hslToHex(h, EMITTER_S, EMITTER_L);
  }
  for (const id of receivers) {
    if (emitters.has(id)) continue;
    const c = byId.get(id);
    if (!c) continue;
    c.color = RECEIVER_COLOR;
  }
  for (const c of components) {
    if (emitters.has(c.id) || receivers.has(c.id)) continue;
    if (!c.color) c.color = RECEIVER_COLOR;
  }
  for (const e of edges ?? []) {
    const src = byId.get(e.from);
    if (src?.color) e.color = darkenHex(src.color, EDGE_DARKEN);
  }
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
