// @contexto INDICE.md · src/components/data/README.md
/**
 * transfer.schemas.ts — tipos de `<iswc-transfer>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type TransferEventos = { 'iswc-transfer-change': { source: number; target: number; values: string[] } };
