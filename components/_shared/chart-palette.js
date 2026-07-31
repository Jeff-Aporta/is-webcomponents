// apps/AppWebcomponents/components/_shared/chart-palette.js

/** Categorical order is fixed per palette — never cycled/generated. Lead hue matches
 *  the palette's brand accent; remaining hues are shared across palettes for consistency.
 *  Validated with dataviz skill's scripts/validate_palette.js (dark + light) — see plan Task 2. */
const CATEGORICAL = {
  insoft: {
    dark: ['#e66767', '#3987e5', '#199e70', '#c98500', '#9085e9', '#008300'],
    light: ['#e34948', '#2a78d6', '#1baf7a', '#eda100', '#4a3aa7', '#008300'],
  },
  contapyme: {
    dark: ['#3987e5', '#e66767', '#199e70', '#c98500', '#9085e9', '#008300'],
    light: ['#2a78d6', '#e34948', '#1baf7a', '#eda100', '#4a3aa7', '#008300'],
  },
  agrowin: {
    dark: ['#008300', '#3987e5', '#e66767', '#9085e9', '#c98500', '#199e70'],
    light: ['#008300', '#2a78d6', '#e34948', '#eda100', '#4a3aa7', '#1baf7a'],
  },
};

export function resolvePaletteKey(attr) {
  return CATEGORICAL[attr] ? attr : 'insoft';
}

export function resolveMode(isLight) {
  return isLight ? 'light' : 'dark';
}

function detectContext(el) {
  const root = el.ownerDocument?.documentElement || document.documentElement;
  const key = resolvePaletteKey(root.dataset.palette);
  const mode = resolveMode(root.classList.contains('theme-light'));
  return { key, mode };
}

export function getCategoricalColors(el, count) {
  const { key, mode } = detectContext(el);
  const set = CATEGORICAL[key][mode];
  if (count <= set.length) return set.slice(0, Math.max(count, 1));
  // More series than hues: repeat is wrong per dataviz rule — fold overflow onto the last slot.
  return [...set.slice(0, set.length - 1), set[set.length - 1]];
}

/** #rrggbb -> "rgb(r g b / a)". Los atributos de presentación SVG no admiten
 *  color-mix() de forma fiable, así que el alfa se resuelve aquí. */
export function withAlpha(hex, alpha) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(String(hex).trim());
  if (!m) return hex;
  const [r, g, b] = m.slice(1).map((h) => parseInt(h, 16));
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}

export function getFillColors(el, count, alpha = 0.35) {
  return getCategoricalColors(el, count).map((hex) => withAlpha(hex, alpha));
}

export function getStatusColor(el, status) {
  const cs = getComputedStyle(el);
  const map = { success: '--is-success-text', warning: '--is-warning-text', danger: '--is-danger-text' };
  return cs.getPropertyValue(map[status] || map.success).trim();
}
