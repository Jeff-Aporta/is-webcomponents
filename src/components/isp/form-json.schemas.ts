/**
 * form-json.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ControlElSchema = z.object({
  value: z.union([z.string(), z.null()]).optional(),
  checked: z.boolean().optional(),
  values: z.union([z.array(z.string()), z.null()]).optional(),
  multiple: z.boolean().optional(),
  type: z.string().optional(),
  selectedOptions: z.array(z.unknown() /* TODO: ref HTMLOptionElement */).optional(),
  options: z.array(z.unknown() /* TODO: ref HTMLOptionElement */).optional(),
});
export type ControlEl = z.infer<typeof ControlElSchema>;


export const ControlValueSchema = z.union([z.string(), z.boolean(), z.array(z.string()), z.number(), z.null(), z.undefined()]);
export type ControlValue = z.infer<typeof ControlValueSchema>;

