/**
 * context-menu.schemas.ts — tipos de `<iswc-context-menu>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type ContextMenuEventos = { 'iswc-open': { x: number; y: number }; 'iswc-close': undefined; 'iswc-select': { item: HTMLElement; value: string } };
