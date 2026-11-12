// @contexto INDICE.md · src/components/data/README.md
/**
 * pivot-table.schemas.ts — tipos de `<iswc-pivot-table>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type PivotTableEventos = { 'iswc-cell-click': { row: number; col: number; value: unknown } };
