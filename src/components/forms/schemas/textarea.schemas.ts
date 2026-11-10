// @contexto INDICE.md · src/components/forms/README.md
/**
 * textarea.schemas.ts — tipos de `<iswc-textarea>`.
 */
import type { IswcFormControlEventos } from "@jeff-aporta/iswc-base/core/schemas/iswc-form-control.schemas.js";

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type TextareaEventos = IswcFormControlEventos & { 'iswc-input': { value: string }; 'iswc-change': { value: string } };
