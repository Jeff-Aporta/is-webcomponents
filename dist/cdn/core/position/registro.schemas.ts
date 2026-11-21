// @contexto INDICE.md · src/core/README.md
/**
 * registro.schemas.ts — contratos de `registro.ts` (W54: los tipos viven en *.schemas.ts).
 *
 * El módulo de código (`registro.ts`) los importa con `import type`; aquí solo viven las
 * formas: ni lógica ni validación runtime.
 */

import type { ArrowOffset, Boundary, Coords, Rect, Size } from '../schemas/position.schemas.js';

/** Tamaño que el popup puede usar dentro del límite (`null` = sin tope). */
export type TamanoDisponible = { width: number | null; height: number | null };

/** Cómo se calcula el tamaño disponible del popup según la opción `auto-size`. */
export type CalcularAutoSize = (
  coords: Coords,
  size: Size,
  boundary: Boundary,
  autoSize: '' | 'horizontal' | 'vertical' | 'both',
) => TamanoDisponible;

/** Cómo se calcula el desplazamiento de la flecha del popup. */
export type CalcularFlecha = (
  placement: string,
  anchor: Rect,
  popupCoords: Coords,
  popupSize: Size,
  arrowSize: number,
  arrowPadding: number,
  arrowPlacement: string,
) => ArrowOffset;
