/**
 * flex-options.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const FlexHostSchema = z.object({
  _trvwrFlexSig: z.string().optional(),
  _trvwrOnClick: z.function({ input: [], output: z.void() }).optional(),
  _trvwrBound: z.boolean().optional(),
});
export type FlexHost = z.infer<typeof FlexHostSchema>;


export const FlexActionSpecSchema = z.object({
  icon: z.string().optional(),
  iconTrue: z.string().optional(),
  iconFalse: z.string().optional(),
  label: z.string().optional(),
  title: z.string().optional(),
  hotkey: z.string().optional(),
  color: z.string().optional(),
  colorFalse: z.string().optional(),
  checked: z.boolean().optional(),
  disabled: z.boolean().optional(),
  separator: z.boolean().optional(),
  onClick: z.function({ input: [], output: z.void() }).optional(),
});
export type FlexActionSpec = z.infer<typeof FlexActionSpecSchema>;


export const FlexActionEntrySchema = z.union([FlexActionSpecSchema, z.array(FlexActionSpecSchema), z.null(), z.undefined(), z.literal(false)]);
export type FlexActionEntry = z.infer<typeof FlexActionEntrySchema>;


export const CompactOptsSchema = z.object({
  compact: z.boolean().optional(),
});
export type CompactOpts = z.infer<typeof CompactOptsSchema>;


export const MoreOptsSchema = z.object({
  more: z.array(FlexActionEntrySchema).optional(),
  moreDisabled: z.boolean().optional(),
  compact: z.boolean().optional(),
});
export type MoreOpts = z.infer<typeof MoreOptsSchema>;

