/**
 * timeline.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const TlGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  hue: z.number().optional(),
});
export type TlGroup = z.infer<typeof TlGroupSchema>;


export const TlEventSchema = z.object({
  id: z.string(),
  label: z.string(),
  desc: z.string().optional(),
  hue: z.number().optional(),
  group: z.string().optional(),
  ms: z.number(),
  dateText: z.string().optional(),
  dotX: z.number(),
  dotY: z.number(),
  side: z.number(),
  cardX: z.number(),
  cardY: z.number(),
  cardW: z.number(),
  cardH: z.number(),
});
export type TlEvent = z.infer<typeof TlEventSchema>;


export const TlTickSchema = z.object({
  ms: z.number(),
  label: z.string(),
  pos: z.number(),
  major: z.boolean().optional(),
});
export type TlTick = z.infer<typeof TlTickSchema>;


export const TlLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  orientation: z.union([z.literal('horizontal'), z.literal('vertical')]),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titleY: z.number(),
  subtitleY: z.number().optional(),
  axisX0: z.number(),
  axisY0: z.number(),
  axisLen: z.number(),
  events: z.array(TlEventSchema),
  ticks: z.array(TlTickSchema),
  todayPos: z.number().optional(),
  groups: z.array(TlGroupSchema).optional(),
  legendX: z.number(),
});
export type TlLayout = z.infer<typeof TlLayoutSchema>;


export const EventEntrySchema = z.object({
  e: TlEventSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type EventEntry = z.infer<typeof EventEntrySchema>;

