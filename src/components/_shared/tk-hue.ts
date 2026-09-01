/** Tono HSL en BD (0–360) → CSS/hex solo al renderizar. */

export function normalizeTkHue(raw: number) {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return ((Math.round(n) % 360) + 360) % 360;
}

export function tkHueToCss(hue, saturation: string = 65, lightness: string = 52) {
  const h = normalizeTkHue(hue);
  if (h == null) return undefined;
  return `hsl(${h}, ${saturation}%, ${lightness}%)`;
}

/** Hex para APIs que no aceptan hsl (p. ej. iconify.design). */
export function tkHueToHex(hue, saturation: number = 65, lightness: number = 52) {
  const h = normalizeTkHue(hue);
  if (h == null) return undefined;
  const s = saturation / 100;
  const l = lightness / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Lee `hue` de un registro BD (0–360). */
export function resolveTkHue(raw: unknown, fallback?: number) {
  return normalizeTkHue(raw.hue) ?? fallback ?? 210;
}
