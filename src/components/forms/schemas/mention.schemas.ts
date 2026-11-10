// @contexto INDICE.md · src/components/forms/README.md
/**
 * mention.schemas.ts — tipos de `<iswc-mention>`.
 */
import type { IswcFormControlEventos } from "@jeff-aporta/iswc-base/core/schemas/iswc-form-control.schemas.js";

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type MentionEventos = IswcFormControlEventos & { 'iswc-change': { value: string }; 'iswc-input': undefined; 'iswc-select': { trigger: string; item: string; range: [number, number] } };
