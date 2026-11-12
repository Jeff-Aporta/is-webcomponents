// @contexto INDICE.md · src/core/README.md
/**
 * hover-bridge.ts — el puente de hover del popup: la franja invisible que cubre el hueco entre el ancla y
 * el cuerpo del popup, para que el puntero no se pierda al cruzar.
 *
 * Módulo aparte a propósito: solo lo pide quien usa la opción `hover-bridge` (`<iswc-floating>`), con
 * `import()`, y por eso no entra en el cierre de los popups que no la usan.
 */
import type { Rect } from '@jeff-aporta/iswc-base/core/schemas/position.schemas.js';

/** Lo que hace falta para colocar el puente. */
export type PuenteEntrada = {
  /** Placement elegido (`top`, `bottom`, `left`, `right` y su alineación). */
  placement: string;
  /** Rectángulo del ancla, en coordenadas de viewport. */
  anchor: Rect;
  /** Borde izquierdo del popup en coordenadas de viewport. */
  popupLeft: number;
  /** Borde superior del popup en coordenadas de viewport. */
  popupTop: number;
  /** Ancho del cuerpo del popup. */
  popupWidth: number;
  /** Alto del cuerpo del popup. */
  popupHeight: number;
  /** Left final del popup (el de la estrategia en uso). */
  left: number;
  /** Top final del popup (el de la estrategia en uso). */
  top: number;
  /** Separación entre el ancla y el cuerpo del popup (la flecha incluida). */
  distance: number;
  /** Estrategia de posicionamiento (`absolute` o `fixed`). */
  strategy: string;
  /** Desplazamiento horizontal de la página. */
  scrollX: number;
  /** Desplazamiento vertical de la página. */
  scrollY: number;
};

/** La caja del puente, en el sistema de coordenadas que usa la estrategia. */
export type PuenteCaja = { top: number; left: number; width: number; height: number };

/**
 * Caja del puente, o `null` si no hay hueco que cubrir (ancla y popup pegados).
 */
export function calcularPuente(e: PuenteEntrada): PuenteCaja | null {
  if (e.distance <= 0) return null;
  const a = e.anchor;
  const side = e.placement.split('-')[0];
  let top: number;
  let left: number;
  let width: number;
  let height: number;
  if (side === 'top') {
    top = a.top - e.distance;
    left = Math.min(a.left, e.popupLeft);
    width = Math.max(a.right, e.popupLeft + e.popupWidth) - left;
    height = e.distance;
  } else if (side === 'bottom') {
    top = a.bottom;
    left = Math.min(a.left, e.popupLeft);
    width = Math.max(a.right, e.popupLeft + e.popupWidth) - left;
    height = e.distance;
  } else if (side === 'left') {
    left = a.left - e.distance;
    top = Math.min(a.top, e.popupTop);
    width = e.distance;
    height = Math.max(a.bottom, e.popupTop + e.popupHeight) - top;
  } else {
    left = a.right;
    top = Math.min(a.top, e.popupTop);
    width = e.distance;
    height = Math.max(a.bottom, e.popupTop + e.popupHeight) - top;
  }
  if (e.strategy === 'fixed') {
    const dx = e.popupLeft - e.left;
    const dy = e.popupTop - e.top;
    top -= dy;
    left -= dx;
  } else {
    top += e.scrollY;
    left += e.scrollX;
  }
  return { top, left, width: Math.max(0, width), height: Math.max(0, height) };
}
