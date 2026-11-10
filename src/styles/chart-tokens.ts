// @contexto INDICE.md · src/styles/README.md
/**
 * chart-tokens.ts — fuente única del color de gráficas: `--iswc-chart-1..8` y `--iswc-chart-on-1..8`.
 *
 * Una serie = el main de la paleta. Las siguientes rotan el tono en OKLCH y alternan luminosidad,
 * con banda y croma propios por modo. Cada token lleva las dos ramas en `light-dark()`: el navegador
 * elige según el `color-scheme` del elemento que pinta, así que el mismo token sirve en claro, en
 * oscuro y en los papeles de panda, sin JS y sin repintar. `--iswc-chart-on-N` es bg2font sobre la
 * serie, para etiquetas encima de la marca.
 *
 * `chartSerieHex()` es el espejo en JS de esta receta para los guardianes de contraste
 * (tests/gobernanza/chart-tokens.test.ts).
 */

export const CHART_SERIES = 8;

/** Rotación de tono de cada serie respecto al main (grados). */
const CHART_ROTATION: readonly number[] = [0, 225, 315, 90, 180, 270, 135, 45];

/** Desplazamiento de luminosidad de cada serie: alterna para separar vecinas sin depender del tono. */
const CHART_LIGHTNESS: readonly number[] = [0, -0.14, 0.14, -0.06, 0.06, -0.14, 0.14, 0];

/** Banda de L del main y de las series rotadas, por modo. El main solo se mueve si cae fuera. */
export const CHART_BAND = {
  light: { main: [0.4, 0.68], serie: [0.42, 0.6] },
  dark: { main: [0.6, 0.86], serie: [0.62, 0.84] },
} as const;

/** Croma de las series rotadas: el piso da color a las paletas neutras y el techo las mantiene en sRGB. */
const CHART_CHROMA: readonly [number, number] = [0.09, 0.15];

function ramaCss(k: number, modo: keyof typeof CHART_BAND): string {
  const main = CHART_BAND[modo].main;
  if (k === 0) return `oklch(from var(--iswc-accent) clamp(${main[0]}, l, ${main[1]}) c h)`;
  const [lo, hi] = CHART_BAND[modo].serie;
  const l = `clamp(${lo}, calc(clamp(${lo}, l, ${hi}) + ${CHART_LIGHTNESS[k]}), ${hi})`;
  const c = `clamp(${CHART_CHROMA[0]}, c, ${CHART_CHROMA[1]})`;
  return `oklch(from var(--iswc-accent) ${l} ${c} calc(h + ${CHART_ROTATION[k]}))`;
}

/** Tokens de la capa común de paletas. */
export function chartDerive(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let k = 0; k < CHART_SERIES; k++) {
    const n = k + 1;
    out[`--iswc-chart-${n}`] = `light-dark(${ramaCss(k, 'light')}, ${ramaCss(k, 'dark')})`;
    out[`--iswc-chart-on-${n}`] = `oklch(from var(--iswc-chart-${n}) clamp(0, calc((var(--iswc-bg2font-umbral, 0.65) - l) * 100000), 1) 0 0)`;
  }
  return out;
}

const acotar = (lo: number, x: number, hi: number): number => Math.min(hi, Math.max(lo, x));

/** L, C y tono de la serie `k` a partir del OKLCH del main. Espejo JS de `ramaCss`. */
export function chartSerieOklch(main: readonly [number, number, number], k: number, modo: keyof typeof CHART_BAND): [number, number, number] {
  const [l, c, h] = main;
  if (k === 0) return [acotar(CHART_BAND[modo].main[0], l, CHART_BAND[modo].main[1]), c, h];
  const [lo, hi] = CHART_BAND[modo].serie;
  return [
    acotar(lo, acotar(lo, l, hi) + (CHART_LIGHTNESS[k] ?? 0), hi),
    acotar(CHART_CHROMA[0], c, CHART_CHROMA[1]),
    (h + (CHART_ROTATION[k] ?? 0)) % 360,
  ];
}
