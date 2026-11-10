// @contexto INDICE.md · src/components/forms/README.md
/**
 * color-picker.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";
import type { IswcFormControlEventos } from "@jeff-aporta/iswc-base/core/schemas/iswc-form-control.schemas.js";

const EyeDropperConstructorSchema = z.object({
  new: z.function({ input: [], output: z.unknown() /* TODO: ref EyeDropperInterface */ }),
});

const WindowWithEyeDropperSchema = z.object({
  EyeDropper: EyeDropperConstructorSchema.optional(),
});
export type WindowWithEyeDropper = z.infer<typeof WindowWithEyeDropperSchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type ColorPickerEventos = IswcFormControlEventos & { 'iswc-input': { value: string }; 'iswc-change': { value: string } };
