// @contexto INDICE.md · src/components/helpers/README.md
/**
 * format.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const NumberPresetSchema = z.object({
  kind: z.literal('number'),
  opts: z.unknown() /* TODO: cannot convert */,
});

const CurrencyPresetSchema = z.object({
  kind: z.literal('currency'),
  digits: z.number(),
  currency: z.string().optional(),
});

const AccountingPresetSchema = z.object({
  kind: z.literal('accounting'),
  digits: z.number(),
  currency: z.string().optional(),
});

const FractionPresetSchema = z.object({
  kind: z.literal('fraction'),
  maxDen: z.number(),
});

const TextPresetSchema = z.object({
  kind: z.literal('text'),
});

const DatePresetSchema = z.object({
  kind: z.literal('date'),
  opts: z.unknown() /* TODO: cannot convert */,
});

const ExcelPresetSchema = z.union([NumberPresetSchema, CurrencyPresetSchema, AccountingPresetSchema, FractionPresetSchema, TextPresetSchema, DatePresetSchema]);
export type ExcelPreset = z.infer<typeof ExcelPresetSchema>;

const RelativeUnitSchema = z.custom<Intl.RelativeTimeFormatUnit>();
export type RelativeUnit = z.infer<typeof RelativeUnitSchema>;

const NumberFormatKindSchema = z.union([z.literal('decimal'), z.literal('currency'), z.literal('percent'), z.literal('unit'), z.literal('scientific'), z.literal('compact'), z.literal('integer'), z.literal('accounting')]);
export type NumberFormatKind = z.infer<typeof NumberFormatKindSchema>;

const RelativeStyleSchema = z.union([z.literal('long'), z.literal('short'), z.literal('narrow')]);
export type RelativeStyle = z.infer<typeof RelativeStyleSchema>;

const RelativeNumericSchema = z.union([z.literal('always'), z.literal('auto')]);
export type RelativeNumeric = z.infer<typeof RelativeNumericSchema>;

const TextCaseSchema = z.union([z.literal('upper'), z.literal('lower'), z.literal('title'), z.literal('capitalize')]);
export type TextCase = z.infer<typeof TextCaseSchema>;

const FormatTypeSchema = z.union([z.literal('date'), z.literal('number'), z.literal('bytes'), z.literal('relative'), z.literal('text')]);
export type FormatType = z.infer<typeof FormatTypeSchema>;

const FormatBytesOptsSchema = z.object({
  locale: z.string().optional(),
  display: z.union([z.literal('short'), z.literal('long')]).optional(),
  autofit: z.boolean().optional(),
});
export type FormatBytesOpts = z.infer<typeof FormatBytesOptsSchema>;

