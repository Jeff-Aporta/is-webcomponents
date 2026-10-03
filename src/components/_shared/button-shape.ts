/**
 * button-shape.ts — Contorno de controles tipo botón (atributo `shape`).
 *
 * Compartido por: iswc-button (y quien reenvía `shape` al botón, p. ej. prefs-clear).
 * No mezclar con MEDIA_SHAPE (avatar / theme-img): otro dominio (recorte de media).
 */

export const BUTTON_SHAPE = Object.freeze([
  'none',
  'round',
  'square',
  'rect',
  'pill',
  'hexagon',
  'arrow-left',
  'arrow-right',
] as const);

export const DEFAULT_BUTTON_SHAPE = 'round';

export type ButtonShape = (typeof BUTTON_SHAPE)[number];

/** Iconos sugeridos para paneles de demo / selects. */
export const BUTTON_SHAPE_ICON: Record<ButtonShape, string> = Object.freeze({
  none: 'mdi:cancel',
  round: 'mdi:rounded-corner',
  square: 'mdi:square-outline',
  rect: 'mdi:rectangle-outline',
  pill: 'mdi:capsule',
  hexagon: 'mdi:hexagon-outline',
  'arrow-left': 'mdi:arrow-left-bold-outline',
  'arrow-right': 'mdi:arrow-right-bold-outline',
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
