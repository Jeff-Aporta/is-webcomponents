/**
 * radio-group.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const IsRadioElementSchema = z.object({
  value: z.string(),
  checked: z.boolean(),
  disabled: z.boolean(),
  syncFromGroup: z.function({ input: [], output: z.void() }).optional(),
});
export type IsRadioElement = z.infer<typeof IsRadioElementSchema>;

