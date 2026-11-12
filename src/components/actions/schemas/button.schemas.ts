// @contexto INDICE.md · src/components/actions/README.md
/**
 * button.schemas.ts — tipos de `<iswc-button>`.
 */

import type { BUTTON_SHAPE } from '@jeff-aporta/iswc-base/core/attrs.js';

/**
 * Contornos del botón (`shape`): el catálogo vivo del core
 * (`BUTTON_SHAPE`), no una copia. Se deriva de la constante para que el
 * tipo no pueda quedarse atrás si el core añade un contorno.
 */
export type ButtonShape = (typeof BUTTON_SHAPE)[number];

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type ButtonEventos = { 'iswc-focus': { originalEvent: Event }; 'iswc-blur': { originalEvent: Event }; 'iswc-click': { originalEvent: Event }; 'iswc-invalid': { originalEvent: Event; validationMessage: string } };
