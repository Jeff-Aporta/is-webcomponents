/** Tono HSL en BD (0–360) → CSS/hex solo al renderizar. */

export function normalizeTkHue(raw: number | null | undefined | string): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return ((Math.round(n) % 360) + 360) % 360;
}

export function tkHueToCss(hue: number | null | undefined, saturation: number = 65, lightness: number = 52): string | undefined {
  const h = normalizeTkHue(hue as unknown as number);
  if (h == null) return undefined;
  return `hsl(${h}, ${saturation}%, ${lightness}%)`;
}

/** Hex para APIs que no aceptan hsl (p. ej. iconify.design). */
export function tkHueToHex(hue: number | null | undefined, saturation: number = 65, lightness: number = 52): string | undefined {
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
