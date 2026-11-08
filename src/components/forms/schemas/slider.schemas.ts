/**
 * slider.schemas.ts — tipos de `<iswc-slider>`.
 */
import type { IswcFormControlEventos } from "@jeff-aporta/iswc-base/core/schemas/iswc-form-control.schemas.js";

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type SliderEventos = IswcFormControlEventos & { 'iswc-input': { value: number | number[]; values: number[] }; 'iswc-change': { value: number | number[]; values: number[] } };
