/**
 * color-picker.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const EyeDropperConstructorSchema = z.object({
  new: z.function({ input: [], output: z.unknown() /* TODO: ref EyeDropperInterface */ }),
});

const WindowWithEyeDropperSchema = z.object({
  EyeDropper: EyeDropperConstructorSchema.optional(),
});
export type WindowWithEyeDropper = z.infer<typeof WindowWithEyeDropperSchema>;

