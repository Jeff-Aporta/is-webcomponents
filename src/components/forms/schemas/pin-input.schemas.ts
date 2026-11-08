/**
 * pin-input.schemas.ts — tipos de `<iswc-pin-input>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type PinInputEventos = { 'iswc-pin-change': { value: string; index: number }; 'iswc-otp': { code: string }; 'iswc-pin-complete': { value: string } };
