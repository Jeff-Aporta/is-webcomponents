// @contexto INDICE.md · src/core/README.md
import type { Rgb } from './schemas/color.schemas.js';

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

// ── tk-color ──
/**
 * Contraste de fuente por luminancia OKLCH — todo en JS (sin CSS), para que el
 * flujo lo resuelva antes de pintar. Equivale a:
 *   oklch(from C calc((sign(0.75 - l) + 1) / 2 * 100%) 0 h / 1)
 * es decir: fuente clara si la L (OKLCH) del fondo < 0.75; oscura en caso contrario.
 *
 * Alias público: `bg2fontColor` (mismo contrato).
 */
function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/** Cualquier color CSS soportado → `{r,g,b}` sRGB 0..1. Soporta #hex y hsl()/hsla(). */
function toRgb(color: string | null | undefined): Rgb | null {
  const c = String(color || '').trim();

  const hex = c.replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return { r: parseInt(hex[0]! + hex[0]!, 16) / 255, g: parseInt(hex[1]! + hex[1]!, 16) / 255, b: parseInt(hex[2]! + hex[2]!, 16) / 255 };
  }
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return { r: parseInt(hex.slice(0, 2), 16) / 255, g: parseInt(hex.slice(2, 4), 16) / 255, b: parseInt(hex.slice(4, 6), 16) / 255 };
  }

  const hsl = /hsla?\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%/i.exec(c);
  if (hsl) {
    const h = ((Number(hsl[1]) % 360) + 360) % 360;
    const s = clamp01(Number(hsl[2]) / 100);
    const l = clamp01(Number(hsl[3]) / 100);
    const a = s * Math.min(l, 1 - l);
    const f = (n: number): number => {
      const k = (n + h / 30) % 12;
      return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    };
    return { r: f(0), g: f(8), b: f(4) };
  }
  return null;
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Lightness OKLCH (= L de OKLab) de un color, 0..1. */
/**
 * Versión pastel de un color: mezcla con blanco (`amount` 0..1, default 0.8).
 * Para fondos de insignias y notas: parecido al color del texto, pero claro.
 * Si el color no es hex, se devuelve tal cual.
 */
export function pastelColor(color: string, amount: number = 0.8): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(color ?? '').trim());
  if (!m) return color;
  let h = m[1]!;
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const ch = (i: number): number => parseInt(h.slice(i, i + 2), 16);
  const mix = (v: number): string => Math.round(v + (255 - v) * amount).toString(16).padStart(2, '0');
  return `#${mix(ch(0))}${mix(ch(2))}${mix(ch(4))}`.toUpperCase();
}

function oklchLightness(color: string | null | undefined): number {
  const rgb = toRgb(color);
  if (!rgb) return 0.5;
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
}

/** Umbral OKLCH por defecto: por debajo → texto claro; por encima → oscuro. */
const BG2FONT_L_THRESHOLD = 0.75;

/**
 * Color de fuente legible sobre `bg` (OKLCH L vs umbral).
 * Alias canónico del kit: `bg2fontColor`.
 */
export function contrastFontColor(
  bg: string,
  light: string = '#ffffff',
  dark: string = '#0b1f33',
  threshold: number = BG2FONT_L_THRESHOLD,
): string {
  return oklchLightness(bg) < threshold ? light : dark;
}

/** Alias explícito pedido por producto (bg → font via OKLCH). */
export const bg2fontColor = contrastFontColor;
