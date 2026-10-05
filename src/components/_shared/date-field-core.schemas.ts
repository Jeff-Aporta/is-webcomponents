/**
 * date-field-core.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const SectionMetaSchema = z.object({
  len: z.number(),
  min: z.number(),
  max: z.number(),
  label: z.string(),
  values: z.array(z.unknown() /* TODO: cannot convert */).optional(),
});
export type SectionMeta = z.infer<typeof SectionMetaSchema>;


export const PartsSchema = z.object({
  year: z.number().optional(),
  month: z.number().optional(),
  day: z.number().optional(),
  hour: z.number().optional(),
  minute: z.number().optional(),
  second: z.number().optional(),
  meridiem: z.union([z.literal('AM'), z.literal('PM')]).optional(),
});
export type Parts = z.infer<typeof PartsSchema>;


export const FieldKindSchema = z.union([z.literal('date'), z.literal('time'), z.literal('datetime')]);
export type FieldKind = z.infer<typeof FieldKindSchema>;


export const SectionFieldOptionsSchema = z.object({
  container: z.unknown() /* TODO: ref HTMLElement */,
  kind: FieldKindSchema.optional(),
  locale: z.string().optional(),
  ampm: z.boolean().optional(),
  seconds: z.boolean().optional(),
  onChange: z.function({ input: [z.string()], output: z.void() }).optional(),
});
export type SectionFieldOptions = z.infer<typeof SectionFieldOptionsSchema>;

