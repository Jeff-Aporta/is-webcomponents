// @contexto INDICE.md · src/components/files/README.md
/**
 * txt-view.schemas.ts — tipos de `<iswc-txt-view>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type TxtViewEventos = { 'iswc-load': { bytes: number }; 'iswc-error': { reason: string } };
