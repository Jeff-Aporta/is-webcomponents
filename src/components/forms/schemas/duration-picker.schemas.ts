// @contexto INDICE.md · src/components/forms/README.md
/**
 * duration-picker.schemas.ts — tipos de `<iswc-duration-picker>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type DurationPickerEventos = { 'iswc-change': { value: number; text: string }; 'iswc-input': undefined };
