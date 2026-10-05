/**
 * date-utils.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ClockTimeSchema = z.object({
  h: z.number(),
  m: z.number(),
  s: z.number(),
});
export type ClockTime = z.infer<typeof ClockTimeSchema>;


export const WeekdayLabelsOptsSchema = z.object({
  width: z.union([z.literal('short'), z.literal('long'), z.literal('narrow')]).optional(),
  firstDay: z.number().optional(),
});
export type WeekdayLabelsOpts = z.infer<typeof WeekdayLabelsOptsSchema>;


export const MonthLabelsOptsSchema = z.object({
  width: z.union([z.literal('short'), z.literal('long'), z.literal('narrow')]).optional(),
  year: z.number().optional(),
});
export type MonthLabelsOpts = z.infer<typeof MonthLabelsOptsSchema>;


export const FormatDateOptsSchema = z.intersection(z.unknown() /* TODO: cannot convert */, z.object({
  dateStyle: z.union([z.literal('full'), z.literal('long'), z.literal('medium'), z.literal('short')]).optional(),
  timeStyle: z.union([z.literal('full'), z.literal('long'), z.literal('medium'), z.literal('short')]).optional(),
}));
export type FormatDateOpts = z.infer<typeof FormatDateOptsSchema>;


export const FormatTimeOptsSchema = z.object({
  seconds: z.boolean().optional(),
  hour12: z.boolean().optional(),
});
export type FormatTimeOpts = z.infer<typeof FormatTimeOptsSchema>;

