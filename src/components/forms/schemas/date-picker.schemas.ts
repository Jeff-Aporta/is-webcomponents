/**
 * date-picker.schemas.ts — tipos de `<iswc-date-picker>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type DatePickerEventos = { 'iswc-view-change': { view: string }; 'iswc-month-change': { month: string }; 'iswc-day-hover': { iso: string }; 'iswc-change': { value: string } | { start: string | null; end: string | null } };
