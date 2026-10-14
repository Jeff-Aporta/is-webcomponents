/**
 * date-field-element.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const DateFieldKindSchema = z.union([z.literal('date'), z.literal('time'), z.literal('datetime')]);
export type DateFieldKind = z.infer<typeof DateFieldKindSchema>;


export const DefineDateFieldOptsSchema = z.object({
  tag: z.string(),
  kind: DateFieldKindSchema,
  cssUrl: z.string(),
});
export type DefineDateFieldOpts = z.infer<typeof DefineDateFieldOptsSchema>;

