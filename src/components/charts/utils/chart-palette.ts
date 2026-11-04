/**
 * chart-palette.ts — colores de gráficas. La fuente es `--iswc-chart-1..8` (src/styles/chart-tokens.ts):
 * aquí no hay colores, solo referencias a esos tokens.
 *
 * Las gráficas pintan `var(--iswc-chart-N)`, así que cambian solas con la paleta, el tema y panda. Los
 * diagramas usan `resolveColor()`: su SVG se exporta y necesita valores literales.
 */

import type { PaletteKey, PaletteMode, Status } from "@jeff-aporta/iswc-base/components/charts/schemas/chart-palette.schemas.js";
import { PALETAS } from "@jeff-aporta/iswc-base/core/app-cfg.js";

const DEFAULT_PALETTE = 'delfin';
const SERIES = 8;

export function resolvePaletteKey(attr: string | null | undefined): PaletteKey {
  return (PALETAS as readonly string[]).includes(attr ?? '') ? (attr as PaletteKey) : DEFAULT_PALETTE;
}

export function resolveMode(isLight: boolean): PaletteMode {
  return isLight ? 'light' : 'dark';
}

/** Color de la serie `i` (desde 0). Pasadas las 8 se repite el ciclo más oscuro, no un tono inventado. */
export function seriesColor(i: number): string {
  const token = `var(--iswc-chart-${(i % SERIES) + 1})`;
  return i < SERIES ? token : `oklch(from ${token} calc(l * 0.8) c h)`;
}

export function getCategoricalColors(_el: Element, count: number): string[] {
  return Array.from({ length: Math.max(count, 1) }, (_, i) => seriesColor(i));
}

/** Color con alfa. Un hex sale en rgb() literal; cualquier otro color se mezcla con transparente. */
export function withAlpha(color: string, alpha: string): string {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(String(color).trim());
  if (!m) return `color-mix(in srgb, ${color} ${Number(alpha) * 100}%, transparent)`;
  const [r, g, b] = m.slice(1).map((h) => parseInt(h, 16));
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}

export function getFillColors(el: Element, count: number, alpha: string = '0.35'): string[] {
  return getCategoricalColors(el, count).map((color) => withAlpha(color, alpha));
}

/** Color semántico: solo para la serie que lo pide con `status`, o para la cascada. */
export function getStatusColor(_el: Element, status: Status): string {
  return `var(--iswc-${status}-text)`;
}

/** bg2font en CSS: texto blanco o negro sobre `color`, también cuando `color` es un var(). */
export function fontOn(color: string): string {
  return `oklch(from ${color} clamp(0, calc((var(--iswc-bg2font-umbral, 0.65) - l) * 100000), 1) 0 0)`;
}

let lienzo: CanvasRenderingContext2D | null = null;

/** Color CSS ya calculado → `#rrggbb` o `rgb(r g b / a)`. Sin canvas devuelve lo mismo que recibió. */
function aLiteral(color: string): string {
  lienzo ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!lienzo) return color;
  lienzo.clearRect(0, 0, 1, 1);
  lienzo.fillStyle = color;
  lienzo.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = lienzo.getImageData(0, 0, 1, 1).data as unknown as [number, number, number, number];
  if (a === 0) return 'transparent';
  if (a < 255) return `rgb(${r} ${g} ${b} / ${(a / 255).toFixed(3)})`;
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Calcula un color CSS en el contexto de `el` (su paleta, su tema y su `color-scheme`) y lo devuelve
 * literal. Si un token no existe usa `fallback`.
 */
export function resolveColor(el: Element, color: string, fallback: string = 'transparent'): string {
  if (typeof document === 'undefined') return fallback;
  const sonda = document.createElement('span');
  sonda.hidden = true;
  const padre = (el as HTMLElement).shadowRoot ?? el;
  padre.appendChild(sonda);
  sonda.style.color = fallback;
  sonda.style.color = color.startsWith('var(') ? `${color.slice(0, -1)}, ${fallback})` : color;
  const calculado = getComputedStyle(sonda).color;
  sonda.remove();
  return calculado ? aLiteral(calculado) : fallback;
}
