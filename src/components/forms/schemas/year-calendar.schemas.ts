/**
 * year-calendar.schemas.ts — tipos de `<iswc-year-calendar>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type YearCalendarEventos = { 'iswc-change': { value: string; year: number } };
