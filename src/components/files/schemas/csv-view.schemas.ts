// @contexto INDICE.md · src/components/files/README.md
/**
 * csv-view.schemas.ts — tipos de `<iswc-csv-view>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type CsvViewEventos = { 'iswc-load': { rows: number }; 'iswc-error': { reason: string } };
