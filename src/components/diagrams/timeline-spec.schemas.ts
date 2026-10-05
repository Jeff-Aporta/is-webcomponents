/**
 * timeline-spec.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const TimelineOrientationSchema = z.union([z.literal('horizontal'), z.literal('vertical')]);
export type TimelineOrientation = z.infer<typeof TimelineOrientationSchema>;


export const TimelineEventSpecSchema = z.object({
  id: z.string(),
  label: z.string(),
  date: z.unknown(),
  group: z.string().optional(),
  hue: z.number().optional(),
  description: z.string().optional(),
});
export type TimelineEventSpec = z.infer<typeof TimelineEventSpecSchema>;


export const TimelineGroupSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  hue: z.number(),
});
export type TimelineGroupSpec = z.infer<typeof TimelineGroupSpecSchema>;


export const TimelineResolvedSpecSchema = z.object({
  title: z.string().optional(),
  orientation: TimelineOrientationSchema,
  groups: z.array(TimelineGroupSpecSchema).optional(),
  events: z.array(TimelineEventSpecSchema),
});
export type TimelineResolvedSpec = z.infer<typeof TimelineResolvedSpecSchema>;


export const TimelineLayoutEventSchema = z.object({
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
export type TimelineLayoutEvent = z.infer<typeof TimelineLayoutEventSchema>;


export const TimelineTickSchema = z.object({
  ms: z.number(),
  label: z.string(),
  pos: z.number(),
});
export type TimelineTick = z.infer<typeof TimelineTickSchema>;


export const TimelineLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  orientation: TimelineOrientationSchema,
  title: z.string().optional(),
  titleY: z.number(),
  axisX0: z.number(),
  axisY0: z.number(),
  axisLen: z.number(),
  events: z.array(TimelineLayoutEventSchema),
  ticks: z.array(TimelineTickSchema),
  todayPos: z.number().optional(),
  groups: z.array(TimelineGroupSpecSchema).optional(),
  legendX: z.number(),
});
export type TimelineLayout = z.infer<typeof TimelineLayoutSchema>;


export const TimelineLayoutOptionsSchema = z.object({
  width: z.number().optional(),
  now: z.number().optional(),
});
export type TimelineLayoutOptions = z.infer<typeof TimelineLayoutOptionsSchema>;


export const CompressedScaleSchema = z.object({
  /* TODO: parse fail (ms: number): number */
  invert: z.function({ input: [z.number()], output: z.number() }),
  span: z.number(),
});
export type CompressedScale = z.infer<typeof CompressedScaleSchema>;

