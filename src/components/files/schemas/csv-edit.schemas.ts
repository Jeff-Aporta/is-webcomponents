// @contexto INDICE.md · src/components/files/README.md
/**
 * csv-edit.schemas.ts — tipos de `<iswc-csv-edit>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type CsvEditEventos = { 'iswc-change': { value: string; rows: number }; 'iswc-load': { rows: number }; 'iswc-error': { reason: string } };
