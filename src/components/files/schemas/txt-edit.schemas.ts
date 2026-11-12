// @contexto INDICE.md · src/components/files/README.md
/**
 * txt-edit.schemas.ts — tipos de `<iswc-txt-edit>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type TxtEditEventos = { 'iswc-change': { value: string }; 'iswc-load': { bytes: number }; 'iswc-error': { reason: string } };
