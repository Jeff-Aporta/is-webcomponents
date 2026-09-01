/**
 * Contraste de fuente por luminancia OKLCH — todo en JS (sin CSS), para que el
 * flujo lo resuelva antes de pintar. Equivale a:
 *   oklch(from C calc((sign(0.75 - l) + 1) / 2 * 100%) 0 h / 1)
 * es decir: fuente clara si la L (OKLCH) del fondo < 0.75; oscura en caso contrario.
 */

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/** Cualquier color CSS soportado → {r,g,b} sRGB 0..1. Soporta #hex y hsl()/hsla(). */
function toRgb(color) {
  const c = String(color || '').trim();

  const hex = c.replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return { r: parseInt(hex[0] + hex[0], 16) / 255, g: parseInt(hex[1] + hex[1], 16) / 255, b: parseInt(hex[2] + hex[2], 16) / 255 };
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
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    };
    return { r: f(0), g: f(8), b: f(4) };
  }
  return null;
}

function srgbToLinear(c: number) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Lightness OKLCH (= L de OKLab) de un color, 0..1. */
export function oklchLightness(color) {
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

/** Color de fuente con mejor contraste sobre `bg` (claro/oscuro), umbral OKLCH 0.75. */
export function contrastFontColor(bg, light = '#ffffff', dark = '#0b1f33') {
  return oklchLightness(bg) < 0.75 ? light : dark;
}
