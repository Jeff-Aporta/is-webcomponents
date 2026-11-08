/**
 * checkbox.schemas.ts — tipos de `<iswc-checkbox>`.
 */
import type { IswcFormControlEventos } from "@jeff-aporta/iswc-base/core/schemas/iswc-form-control.schemas.js";

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type CheckboxEventos = IswcFormControlEventos & { 'iswc-change': { checked: boolean; value: string } };
