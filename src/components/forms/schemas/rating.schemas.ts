/**
 * rating.schemas.ts — tipos de `<iswc-rating>`.
 */
import type { IswcFormControlEventos } from "@jeff-aporta/iswc-base/core/schemas/iswc-form-control.schemas.js";

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type RatingEventos = IswcFormControlEventos & { 'iswc-change': { value: number; label: string }; 'iswc-hover': { value: number; phantomValue: number | null; label: string } };
