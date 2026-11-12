// @contexto INDICE.md · src/core/README.md
/**
 * auto-size.ts — la opción `auto-size` del popup: el ancho y el alto que el cuerpo del popup puede usar
 * dentro del límite (el viewport o el contenedor de scroll).
 *
 * Módulo aparte a propósito: `core/position.ts` no lo trae de serie. Se pide con `import()` cuando la
 * opción está activa y, al importarse, se registra (`position/registro.ts`) para que `computePosition` lo use.
 */
import type { Boundary, Coords, Size } from '@jeff-aporta/iswc-base/core/schemas/position.schemas.js';
import { registrarAutoSize, type TamanoDisponible } from './registro.js';

/** Tamaño del popup una vez recortado al límite, según la opción `auto-size`. */
export function availableSize(
  coords: Coords,
  size: Size,
  boundary: Boundary,
  autoSize: '' | 'horizontal' | 'vertical' | 'both',
): TamanoDisponible {
  if (!autoSize) return { width: null, height: null };
  let width = size.width;
  let height = size.height;
  if (autoSize === 'horizontal' || autoSize === 'both') {
    width = Math.max(0, Math.min(size.width, boundary.right - Math.max(coords.left, boundary.left)));
  }
  if (autoSize === 'vertical' || autoSize === 'both') {
    height = Math.max(0, Math.min(size.height, boundary.bottom - Math.max(coords.top, boundary.top)));
  }
  return { width, height };
}

registrarAutoSize(availableSize);
