/**
 * media-shape.ts — Recorte visual de media (atributo `shape`).
 *
 * Compartido por: iswc-avatar, iswc-theme-img.
 * Distinto de BUTTON_SHAPE (contorno de botón / chrome).
 */

import type { MediaShape } from "./media-shape.schemas.js";
export const MEDIA_SHAPE = Object.freeze(['circle', 'square', 'rounded'] as const);

export const DEFAULT_MEDIA_SHAPE = 'circle';

export const MEDIA_SHAPE_ICON: Record<MediaShape, string> = Object.freeze({
  circle: 'mdi:circle-outline',
  square: 'mdi:square-outline',
  rounded: 'mdi:rounded-corner',
});

export function normalizeMediaShape(
  value: unknown,
  fallback: MediaShape = DEFAULT_MEDIA_SHAPE,
): MediaShape {
  if (typeof value !== 'string') return fallback;
  return (MEDIA_SHAPE as readonly string[]).includes(value)
    ? (value as MediaShape)
    : fallback;
}

export function mediaShapeSelectOptions(): Array<{
  value: MediaShape;
  label: string;
  icon: string;
}> {
  return MEDIA_SHAPE.map((value) => ({
    value,
    label: value,
    icon: MEDIA_SHAPE_ICON[value],
  }));
}
