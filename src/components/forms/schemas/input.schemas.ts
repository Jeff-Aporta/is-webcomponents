/**
 * input.schemas.ts — tipos de `<iswc-input>`.
 */
import type { IswcFormControlEventos } from "@jeff-aporta/iswc-base/core/schemas/iswc-form-control.schemas.js";

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type InputEventos = IswcFormControlEventos & { 'iswc-input': { value: string }; 'iswc-change': { value: string }; 'iswc-typing-end': { value: string }; 'iswc-enter': { value: string }; 'iswc-otp': { code: string } };
