// @contexto INDICE.md · src/components/forms/README.md
/**
 * month-calendar.schemas.ts — tipos de `<iswc-month-calendar>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type MonthCalendarEventos = { 'iswc-change': { value: string; year: number; month: number } };
