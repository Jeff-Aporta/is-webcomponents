/**
 * form.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const IsFormElSchema = z.object({
  fromJSON: z.function({ input: [z.unknown()], output: z.unknown() }),
  toJSON: z.function({ input: [], output: z.unknown() }),
  setValues: z.function({ input: [z.record(z.string(), z.unknown())], output: z.void() }),
  getValues: z.function({ input: [], output: z.record(z.string(), z.unknown()) }),
  html2json: z.function({ input: [], output: z.unknown() }),
});
export type IsFormEl = z.infer<typeof IsFormElSchema>;


export const SubmitDetailSchema = z.object({
  json: z.unknown().optional(),
});
export type SubmitDetail = z.infer<typeof SubmitDetailSchema>;

