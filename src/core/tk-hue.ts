/** Tono HSL en BD (0–360) → CSS/hex solo al renderizar. */

export function normalizeTkHue(raw: number | null | undefined | string): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return ((Math.round(n) % 360) + 360) % 360;
}

/**
 * Tonos automáticos. Un spec que no recibe `hue` usa estos marcadores en lugar de un tono fijo, y al
 * pintar se convierten en la serie de la paleta activa (`fijarSerieColores`). Sin paleta caen en
 * SERIE_RESPALDO, que es lo que ve un export headless.
 */
const SERIE_BASE = -1000;
const SERIE_RESPALDO: readonly number[] = [210, 160, 38, 280, 199, 330, 90, 18];
export const SERIE_HUES: readonly number[] = SERIE_RESPALDO.map((_h, i) => SERIE_BASE - i);

/** En globalThis: cada componente empaqueta su copia de este módulo y todas deben ver las mismas series. */
const series = globalThis as { __iswcSerieColores?: readonly string[] };

export function fijarSerieColores(colores: readonly string[]): void {
  series.__iswcSerieColores = colores;
}

function serieDe(hue: unknown): string | undefined {
  const i = SERIE_BASE - Number(hue);
  if (!Number.isInteger(i) || i < 0 || i >= SERIE_HUES.length) return undefined;
  return series.__iswcSerieColores?.[i] ?? tkHueToHex(SERIE_RESPALDO[i]);
}

export function tkHueToCss(hue: number | null | undefined, saturation: number = 65, lightness: number = 52): string | undefined {
  const serie = serieDe(hue);
  // Con otra luminosidad (niveles de un treemap) la serie se aclara u oscurece, sin cambiar de tono.
  if (serie) return lightness === 52 ? serie : `oklch(from ${serie} calc(l + ${(lightness - 52) / 100}) c h)`;
  const h = normalizeTkHue(hue as unknown as number);
  if (h == null) return undefined;
  return `hsl(${h}, ${saturation}%, ${lightness}%)`;
}

/** Hex para APIs que no aceptan hsl (p. ej. iconify.design). */
export function tkHueToHex(hue: number | null | undefined, saturation: number = 65, lightness: number = 52): string | undefined {
  const serie = serieDe(hue);
  if (serie) return serie;
  const h = normalizeTkHue(hue as unknown as number);
  if (h == null) return undefined;
  const s = saturation / 100;
  const l = lightness / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): string => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Lee `hue` de un registro BD (0–360). */
export function resolveTkHue(raw: { hue?: unknown }, fallback?: number): number {
  const n = typeof raw.hue === 'number' ? raw.hue : Number(raw.hue);
  return normalizeTkHue(n) ?? fallback ?? 210;
}
