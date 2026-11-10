// @contexto INDICE.md · src/components/forms/README.md
/**
 * switch.schemas.ts — tipos de `<iswc-switch>`.
 */
import type { IswcFormControlEventos } from "@jeff-aporta/iswc-base/core/schemas/iswc-form-control.schemas.js";

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type SwitchEventos = IswcFormControlEventos & { 'iswc-change': { checked: boolean; value: string } };
