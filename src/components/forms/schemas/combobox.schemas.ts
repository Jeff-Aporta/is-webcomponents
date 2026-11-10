// @contexto INDICE.md · src/components/forms/README.md
/**
 * combobox.schemas.ts — tipos de `<iswc-combobox>`.
 */
import type { IswcFormControlEventos } from "@jeff-aporta/iswc-base/core/schemas/iswc-form-control.schemas.js";

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type ComboboxEventos = IswcFormControlEventos & { 'iswc-show': Record<string, never>; 'iswc-hide': Record<string, never>; 'iswc-input': { value: string }; 'iswc-change': { value: string } };
