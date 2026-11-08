/**
 * date-range-picker.schemas.ts — tipos de `<iswc-date-range-picker>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type DateRangePickerEventos = { 'iswc-change': { start: string | null; end: string | null; source?: string }; 'iswc-month-change': { month: string } };
