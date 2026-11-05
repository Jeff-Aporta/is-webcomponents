/**
 * lane-layout.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

/** Escala lineal tiempo → píxel, invertible (`invert(px)` devuelve ms). */
export type TimeScale = ((ms: number) => number) & { invert: (px: number) => number };
const TimeScaleSchema = z.custom<TimeScale>((v) => typeof v === 'function' && typeof Reflect.get(v, 'invert') === 'function');

const TickUnitSchema = z.union([z.literal('hour'), z.literal('day'), z.literal('month'), z.literal('year')]);
export type TickUnit = z.infer<typeof TickUnitSchema>;

const TimeTickSchema = z.object({
  ms: z.number(),
  label: z.string(),
  major: z.boolean(),
});
export type TimeTick = z.infer<typeof TimeTickSchema>;

const LaneItemSchema = z.object({
  id: z.string(),
  start: z.number(),
  end: z.number().optional(),
  /* TODO: member [key: string]: unknown */
});
export type LaneItem = z.infer<typeof LaneItemSchema>;

const PackedLaneItemSchema = z.intersection(LaneItemSchema, z.object({
  lane: z.number(),
}));
export type PackedLaneItem = z.infer<typeof PackedLaneItemSchema>;

const PackLanesOptsSchema = z.object({
  laneKey: z.string().optional(),
});
export type PackLanesOpts = z.infer<typeof PackLanesOptsSchema>;

const LayoutLanesOptsSchema = z.object({
  width: z.number().optional(),
  rowH: z.number().optional(),
  rowGap: z.number().optional(),
  laneKey: z.string().optional(),
  domain: z.unknown() /* TODO: cannot convert */.optional(),
});
export type LayoutLanesOpts = z.infer<typeof LayoutLanesOptsSchema>;

const PositionedLaneItemSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  lane: z.number(),
});
export type PositionedLaneItem = z.infer<typeof PositionedLaneItemSchema>;

const LayoutLaneSchema = z.object({
  key: z.number(),
  label: z.string(),
  y: z.number(),
  h: z.number(),
});
export type LayoutLane = z.infer<typeof LayoutLaneSchema>;

const LayoutLanesResultSchema = z.object({
  items: z.array(PositionedLaneItemSchema),
  lanes: z.array(LayoutLaneSchema),
  width: z.number(),
  height: z.number(),
  scale: TimeScaleSchema,
  ticks: z.array(TimeTickSchema),
});
export type LayoutLanesResult = z.infer<typeof LayoutLanesResultSchema>;

