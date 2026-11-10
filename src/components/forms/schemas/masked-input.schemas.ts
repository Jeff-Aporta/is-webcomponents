// @contexto INDICE.md · src/components/forms/README.md
/**
 * masked-input.schemas.ts — tipos de `<iswc-masked-input>`.
 */
import type { IswcFormControlEventos } from "@jeff-aporta/iswc-base/core/schemas/iswc-form-control.schemas.js";

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type MaskedInputEventos = IswcFormControlEventos & { 'iswc-change': { value: string }; 'iswc-input': undefined; 'iswc-complete': undefined };
