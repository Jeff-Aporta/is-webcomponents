/**
 * color-picker.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const EyeDropperOpenResultSchema = z.object({
  sRGBHex: z.string(),
});
export type EyeDropperOpenResult = z.infer<typeof EyeDropperOpenResultSchema>;


export const EyeDropperInterfaceSchema = z.object({
  open: z.function({ input: [], output: z.promise(z.unknown() /* TODO: ref EyeDropperOpenResult */) }),
});
export type EyeDropperInterface = z.infer<typeof EyeDropperInterfaceSchema>;


export const EyeDropperConstructorSchema = z.object({
  new: z.function({ input: [], output: z.unknown() /* TODO: ref EyeDropperInterface */ }),
});
export type EyeDropperConstructor = z.infer<typeof EyeDropperConstructorSchema>;


export const WindowWithEyeDropperSchema = z.object({
  EyeDropper: EyeDropperConstructorSchema.optional(),
});
export type WindowWithEyeDropper = z.infer<typeof WindowWithEyeDropperSchema>;

