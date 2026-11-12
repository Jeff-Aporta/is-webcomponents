// @contexto INDICE.md · src/core/README.md
/**
 * registro.ts — los enganches de las opciones del popup que `computePosition` no trae de serie.
 *
 * `auto-size` y la flecha viven en módulos aparte (`position/auto-size.ts`, `position/flecha.ts`): se piden
 * con `import()` solo cuando se piden y, al importarse, se registran aquí. `core/position.ts` usa lo que haya
 * registrado; si el módulo todavía no ha llegado, esa llamada va sin la opción (y la pide para la siguiente).
 *
 * Este módulo es diminuto a propósito: lo que se carga con el popup es el módulo de la opción, no esto.
 */
import type { ArrowOffset, Boundary, Coords, Rect, Size } from '@jeff-aporta/iswc-base/core/schemas/position.schemas.js';

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

let autoSize: CalcularAutoSize | null = null;
let flecha: CalcularFlecha | null = null;

/** Lo llama `core/position/auto-size.ts` al importarse. */
export function registrarAutoSize(fn: CalcularAutoSize): void {
  autoSize = fn;
}

/** Lo llama `core/position/flecha.ts` al importarse. */
export function registrarFlecha(fn: CalcularFlecha): void {
  flecha = fn;
}

/** La implementación de `auto-size` ya cargada, o `null` si su módulo todavía no ha llegado. */
export function autoSizeRegistrado(): CalcularAutoSize | null {
  return autoSize;
}

/** La implementación de la flecha ya cargada, o `null` si su módulo todavía no ha llegado. */
export function flechaRegistrada(): CalcularFlecha | null {
  return flecha;
}
