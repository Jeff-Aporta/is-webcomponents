// @contexto INDICE.md · src/core/README.md
/**
 * flecha.ts — la flecha del popup: el desplazamiento que la coloca en el borde del cuerpo mirando al ancla.
 *
 * Módulo aparte a propósito: `core/position.ts` no lo trae de serie. Se pide con `import()` cuando la
 * opción está activa y, al importarse, se registra (`position/registro.ts`) para que `computePosition` lo use.
 */
import type { ArrowOffset, Coords, Rect, Size } from '@jeff-aporta/iswc-base/core/schemas/position.schemas.js';
import { registrarFlecha } from './registro.js';

/** Lado del placement (`top`, `bottom`, `left`, `right`). */
function sideOf(p: string): string {
  return p.split('-')[0]!;
}

/** Estilo CSS resuelto para la flecha. */
export function arrowOffset(
  placement: string,
  anchor: Rect,
  popupCoords: Coords,
  popupSize: Size,
  arrowSize: number,
  arrowPadding: number,
  arrowPlacement: string,
): ArrowOffset {
  const side = sideOf(placement);
  const align = arrowPlacement === 'anchor' ? 'anchor' : arrowPlacement;
  // Cuadrado de lado `arrowSize * 2` (rotado 45° en CSS = rombo). La punta
  // visible es la mitad que asoma fuera del popup: el offset del lado estático
  // debe ser `-arrowSize` (no 0), si no el rombo queda entero detrás del body.
  const side2 = arrowSize * 2;
  const result: ArrowOffset = { top: '', left: '', right: '', bottom: '' };
  const out = `${-arrowSize}px`;

  if (side === 'top' || side === 'bottom') {
    let x: number;
    if (align === 'start') x = arrowPadding;
    else if (align === 'end') x = popupSize.width - side2 - arrowPadding;
    else if (align === 'center') x = (popupSize.width - side2) / 2;
    else {
      const anchorCenter = anchor.left + anchor.width / 2;
      x = anchorCenter - popupCoords.left - arrowSize;
      x = Math.max(arrowPadding, Math.min(popupSize.width - side2 - arrowPadding, x));
    }
    result.left = `${x}px`;
    // placement top → popup arriba del ancla → flecha en el borde inferior
    if (side === 'top') result.bottom = out;
    else result.top = out;
  } else {
    let y: number;
    if (align === 'start') y = arrowPadding;
    else if (align === 'end') y = popupSize.height - side2 - arrowPadding;
    else if (align === 'center') y = (popupSize.height - side2) / 2;
    else {
      const anchorCenter = anchor.top + anchor.height / 2;
      y = anchorCenter - popupCoords.top - arrowSize;
      y = Math.max(arrowPadding, Math.min(popupSize.height - side2 - arrowPadding, y));
    }
    result.top = `${y}px`;
    if (side === 'left') result.right = out;
    else result.left = out;
  }
  return result;
}

registrarFlecha(arrowOffset);
