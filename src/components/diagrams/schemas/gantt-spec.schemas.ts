/**
 * gantt-spec.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const GanttGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  hue: z.number(),
});
export type GanttGroup = z.infer<typeof GanttGroupSchema>;


export const GanttTaskSchema = z.object({
  id: z.string(),
  label: z.string(),
  start: z.union([z.string(), z.number(), z.undefined()]),
  end: z.union([z.string(), z.number(), z.undefined()]),
  duration: z.string().optional(),
  group: z.string().optional(),
  progress: z.unknown(),
  milestone: z.boolean(),
  after: z.array(z.string()),
  hue: z.number().optional(),
  description: z.string().optional(),
});
export type GanttTask = z.infer<typeof GanttTaskSchema>;


export const GanttSpecSchema = z.object({
  title: z.string().optional(),
  dateFormat: z.string(),
  groups: z.array(GanttGroupSchema).optional(),
  tasks: z.array(GanttTaskSchema),
});
export type GanttSpec = z.infer<typeof GanttSpecSchema>;


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
});
export type GanttTick = z.infer<typeof GanttTickSchema>;


export const GanttLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  title: z.string().optional(),
  titleY: z.number(),
  gutterX: z.number(),
  gutterW: z.number(),
  rowsTop: z.number(),
  rowsBottom: z.number(),
  rows: z.array(GanttRowSchema),
  ticks: z.array(GanttTickSchema),
  todayX: z.number().optional(),
  arrows: z.array(GanttArrowSchema),
  groups: z.array(GanttGroupSchema).optional(),
  legendX: z.number(),
});
export type GanttLayout = z.infer<typeof GanttLayoutSchema>;


export const GanttOptsSchema = z.object({
  width: z.number().optional(),
  now: z.number().optional(),
});
export type GanttOpts = z.infer<typeof GanttOptsSchema>;

