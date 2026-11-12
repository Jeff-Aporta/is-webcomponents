// @contexto INDICE.md · src/core/README.md
/**
 * hover-bridge.schemas.ts — contratos de `hover-bridge.ts` (W54: los tipos viven en *.schemas.ts).
 *
 * El módulo de código (`hover-bridge.ts`) los importa con `import type`; aquí solo viven las
 * formas: ni lógica ni validación runtime.
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
