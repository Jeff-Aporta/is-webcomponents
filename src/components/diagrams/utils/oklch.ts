/**
 * oklch — rotar el tono de un color en OKLCH conservando su luminosidad y croma (mismo «peso»
 * visual, otro tono). Devuelve hex para que el SVG exportado se vea igual en cualquier visor.
 * Conversión sRGB ↔ OKLab de Björn Ottosson. Si el tono rotado cae fuera del gamut sRGB se baja
 * el croma (bisección) hasta que entra, sin tocar L ni H.
 */

const lin = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** `#rrggbb` / `#rgb` → OKLCH `[L, C, H°]`, o `null` si no es hex. */
export function hexToOklch(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1]!.length === 3 ? m[1]!.replace(/./g, '$&$&') : m[1]!;
  const [r, g, b] = [0, 2, 4].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255)) as [number, number, number];
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}

/** OKLCH → sRGB lineal-a-gamma en [0,1] (puede salir de rango si está fuera del gamut). */
function oklchToRgb(L: number, C: number, H: number): [number, number, number] {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    gam(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
  ];
}

const enGamut = (rgb: number[]): boolean => rgb.every((c) => c >= -1e-4 && c <= 1 + 1e-4);

/** OKLCH → `#rrggbb`, bajando el croma lo justo para entrar en sRGB. */
export function oklchToHex(L: number, C: number, H: number): string {
  let rgb = oklchToRgb(L, C, H);
  if (!enGamut(rgb)) {
    let lo = 0;
    let hi = C;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (enGamut(oklchToRgb(L, mid, H))) lo = mid;
      else hi = mid;
    }
    rgb = oklchToRgb(L, lo, H);
  }
  return `#${rgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0')).join('')}`;
}

/** Mismo L y C, tono + `grados`. Un color que no es hex se devuelve tal cual. */
export function rotarTono(hex: string, grados: number): string {
  const o = hexToOklch(hex);
  if (!o) return hex;
  return oklchToHex(o[0], o[1], (o[2] + grados + 360) % 360);
}

/** Ángulo áureo: tonos sucesivos quedan lo más separados posible sin saber cuántos habrá. */
export const ANGULO_AUREO = 137.508;
