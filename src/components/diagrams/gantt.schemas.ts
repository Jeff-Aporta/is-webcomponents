/**
 * gantt.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const GanttRowSchema = z.object({
  id: z.string(),
  label: z.string(),
  y: z.number(),
  h: z.number(),
  milestone: z.boolean(),
  cx: z.number().optional(),
  cy: z.number().optional(),
  size: z.number().optional(),
  x: z.number(),
  w: z.number().optional(),
  progress: z.number().optional(),
  hue: z.number().optional(),
  group: z.string().optional(),
  description: z.string().optional(),
});
export type GanttRow = z.infer<typeof GanttRowSchema>;


export const GanttArrowSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  path: z.string(),
  arrowTipX: z.number(),
  arrowTipY: z.number(),
  arrowAngle: z.number(),
  hue: z.number().optional(),
});
export type GanttArrow = z.infer<typeof GanttArrowSchema>;


export const GanttTickSchema = z.object({
  ms: z.number(),
  label: z.string(),
  x: z.number(),
  major: z.boolean(),
});
export type GanttTick = z.infer<typeof GanttTickSchema>;


export const TurtleStateSchema = z.object({
  playing: z.boolean(),
  idx: z.number(),
  total: z.number(),
  replay: z.number(),
});
export type TurtleState = z.infer<typeof TurtleStateSchema>;


export const RowNodeEntrySchema = z.object({
  r: GanttRowSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type RowNodeEntry = z.infer<typeof RowNodeEntrySchema>;


export const ArrowNodeEntrySchema = z.object({
  a: GanttArrowSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type ArrowNodeEntry = z.infer<typeof ArrowNodeEntrySchema>;

