// @contexto INDICE.md · src/components/actions/README.md
/**
 * speed-dial.schemas.ts — tipos de `<iswc-speed-dial>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type SpeedDialEventos = { 'iswc-toggle': { open: boolean }; 'iswc-select': { action: HTMLElement } };
