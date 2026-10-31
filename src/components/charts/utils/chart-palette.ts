// apps/AppWebcomponents/components/_shared/chart-palette.js

/** Categorical order is fixed per palette — never cycled/generated. Lead hue matches
 *  the palette's brand accent; remaining hues are shared across palettes for consistency.
 *  Validated with dataviz skill's scripts/validate_palette.js (dark + light) — see plan Task 2. */

/** Paleta soportada por nombre (atributo `data-palette`). */

/** Modo claro/oscuro del documento (atributo `theme-light`). */

import type { PaletteKey, PaletteMode, Status } from "../schemas/chart-palette.schemas.js";
import { DEFAULT_PALETTE, PALETTES } from "../../../styles/palette-build.js";
/** Tres órdenes validados; cada paleta usa el que arranca en su familia de tono. */
const ORDERS: Record<'rojo' | 'azul' | 'verde', Record<PaletteMode, string[]>> = {
  rojo: {
    dark: ['#e66767', '#3987e5', '#199e70', '#c98500', '#9085e9', '#008300'],
    light: ['#e34948', '#2a78d6', '#1baf7a', '#eda100', '#4a3aa7', '#008300'],
  },
  azul: {
    dark: ['#3987e5', '#e66767', '#199e70', '#c98500', '#9085e9', '#008300'],
    light: ['#2a78d6', '#e34948', '#1baf7a', '#eda100', '#4a3aa7', '#008300'],
  },
  verde: {
    dark: ['#008300', '#3987e5', '#e66767', '#9085e9', '#c98500', '#199e70'],
    light: ['#008300', '#2a78d6', '#e34948', '#eda100', '#4a3aa7', '#1baf7a'],
  },
};

const ORDER_OF_FAMILY: Record<string, keyof typeof ORDERS> = { rojos: 'rojo', calidos: 'rojo', verdes: 'verde' };

const CATEGORICAL: Record<string, Record<PaletteMode, string[]>> = Object.fromEntries(
  PALETTES.map((p) => [p.value, ORDERS[ORDER_OF_FAMILY[p.family] ?? 'azul']]),
);

export function resolvePaletteKey(attr: string | null | undefined): PaletteKey {
  return CATEGORICAL[attr ?? ''] ? (attr as PaletteKey) : (DEFAULT_PALETTE as PaletteKey);
}

export function resolveMode(isLight: boolean): PaletteMode {
  return isLight ? 'light' : 'dark';
}

function detectContext(el: Element): { key: PaletteKey; mode: PaletteMode } {
  const root = el.ownerDocument?.documentElement ?? document.documentElement;
  const key = resolvePaletteKey(root.dataset.palette);
  const mode = resolveMode(root.classList.contains('theme-light'));
  return { key, mode };
}

export function getCategoricalColors(el: Element, count: number): string[] {
  const { key, mode } = detectContext(el);
  const set = CATEGORICAL[key][mode];
  if (count <= set.length) return set.slice(0, Math.max(count, 1));
  // More series than hues: repeat is wrong per dataviz rule — fold overflow onto the last slot.
  return [...set.slice(0, set.length - 1), set[set.length - 1]!];
}

/** #rrggbb -> "rgb(r g b / a)". Los atributos de presentación SVG no admiten
 *  color-mix() de forma fiable, así que el alfa se resuelve aquí. */
export function withAlpha(hex: string, alpha: string): string {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(String(hex).trim());
  if (!m) return hex;
  const [r, g, b] = m.slice(1).map((h) => parseInt(h, 16));
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}

export function getFillColors(el: Element, count: number, alpha: string = '0.35'): string[] {
  return getCategoricalColors(el, count).map((hex) => withAlpha(hex, alpha));
}

export function getStatusColor(el: Element, status: Status): string {
  const cs = getComputedStyle(el);
  const map: Record<Status, string> = {
    success: '--iswc-success-text',
    warning: '--iswc-warning-text',
    danger: '--iswc-danger-text',
  };
  return cs.getPropertyValue(map[status] ?? map.success).trim();
}
