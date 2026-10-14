/**
 * time-clock.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ParsedTimeSchema = z.object({
  h: z.number(),
  m: z.number(),
  s: z.number(),
});
export type ParsedTime = z.infer<typeof ParsedTimeSchema>;


export const RingItemSchema = z.object({
  label: z.string(),
  raw: z.number(),
});
export type RingItem = z.infer<typeof RingItemSchema>;


export const ViewSchema = z.union([z.literal('hours'), z.literal('minutes'), z.literal('seconds')]);
export type View = z.infer<typeof ViewSchema>;


export const MeridiemSchema = z.union([z.literal('AM'), z.literal('PM')]);
export type Meridiem = z.infer<typeof MeridiemSchema>;


export const CommitOptsSchema = z.object({
  advance: z.boolean().optional(),
});
export type CommitOpts = z.infer<typeof CommitOptsSchema>;


export const PickOptsSchema = z.object({
  advance: z.boolean().optional(),
});
export type PickOpts = z.infer<typeof PickOptsSchema>;

