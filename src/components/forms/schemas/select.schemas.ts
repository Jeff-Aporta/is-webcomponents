/**
 * select.schemas.ts — tipos de `<iswc-select>`.
 */
import type { IswcFormControlEventos } from "@jeff-aporta/iswc-base/core/schemas/iswc-form-control.schemas.js";

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type SelectEventos = IswcFormControlEventos & { 'iswc-change': { value: string; values: string[] }; 'iswc-show': Record<string, never>; 'iswc-hide': Record<string, never> };
