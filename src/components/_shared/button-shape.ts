/**
 * button-shape.ts — Contorno de controles tipo botón (atributo `shape`).
 *
 * Compartido por: iswc-button (y quien reenvía `shape` al botón, p. ej. prefs-clear).
 * No mezclar con MEDIA_SHAPE (avatar / theme-img): otro dominio (recorte de media).
 */

import type { ButtonShape } from "./button-shape.schemas.js";
export const BUTTON_SHAPE = Object.freeze([
  'none',
  'round',
  'square',
  'rect',
  'pill',
] as const);

export const DEFAULT_BUTTON_SHAPE = 'round';

/** Iconos sugeridos para paneles de demo / selects. */
export const BUTTON_SHAPE_ICON: Record<ButtonShape, string> = Object.freeze({
  none: 'mdi:cancel',
  round: 'mdi:rounded-corner',
  square: 'mdi:square-outline',
  rect: 'mdi:rectangle-outline',
  pill: 'mdi:capsule',
});

export function normalizeButtonShape(
  value: unknown,
  fallback: ButtonShape = DEFAULT_BUTTON_SHAPE,
): ButtonShape {
  if (typeof value !== 'string') return fallback;
  return (BUTTON_SHAPE as readonly string[]).includes(value)
    ? (value as ButtonShape)
    : fallback;
}

/** Opciones de select para demos: value + label + icon. */
export function buttonShapeSelectOptions(): Array<{
  value: ButtonShape;
  label: string;
  icon: string;
}> {
  return BUTTON_SHAPE.map((value) => ({
    value,
    label: value,
    icon: BUTTON_SHAPE_ICON[value],
  }));
}
