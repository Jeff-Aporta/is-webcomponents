/**
 * quadrant-spec.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const QuadrantPointSchema = z.object({
  id: z.string(),
  label: z.string(),
  x: z.number(),
  y: z.number(),
  hue: z.number().optional(),
  group: z.string().optional(),
  description: z.string().optional(),
});
export type QuadrantPoint = z.infer<typeof QuadrantPointSchema>;


export const QuadrantGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  hue: z.number(),
});
export type QuadrantGroup = z.infer<typeof QuadrantGroupSchema>;


export const QuadrantAxesSchema = z.object({
  left: z.string().optional(),
  right: z.string().optional(),
  bottom: z.string().optional(),
  top: z.string().optional(),
});
export type QuadrantAxes = z.infer<typeof QuadrantAxesSchema>;


export const QuadrantQuadrantsSchema = z.object({
  topRight: z.string(),
  bottomRight: z.string(),
  bottomLeft: z.string(),
  topLeft: z.string(),
});
export type QuadrantQuadrants = z.infer<typeof QuadrantQuadrantsSchema>;


export const QuadrantSpecSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  xAxis: QuadrantAxesSchema,
  yAxis: QuadrantAxesSchema,
  quadrants: QuadrantQuadrantsSchema,
  groups: z.array(QuadrantGroupSchema).optional(),
  points: z.array(QuadrantPointSchema),
});
export type QuadrantSpec = z.infer<typeof QuadrantSpecSchema>;


export const QuadrantJsonOutSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  xAxis: QuadrantAxesSchema.optional(),
  yAxis: QuadrantAxesSchema.optional(),
  quadrants: QuadrantQuadrantsSchema.optional(),
  groups: z.array(QuadrantGroupSchema).optional(),
  points: z.array(z.object({
  label: z.string(),
  x: z.number(),
  y: z.number(),
  id: z.string().optional(),
  group: z.string().optional(),
  desc: z.string().optional(),
})),
});
export type QuadrantJsonOut = z.infer<typeof QuadrantJsonOutSchema>;


export const PlotRectSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type PlotRect = z.infer<typeof PlotRectSchema>;


export const QuadrantLayoutPointSchema = z.object({
  cx: z.number(),
  cy: z.number(),
  r: z.number(),
  labelDy: z.number(),
});
export type QuadrantLayoutPoint = z.infer<typeof QuadrantLayoutPointSchema>;


export const QuadrantLayoutQuadrantSchema = z.object({
  id: z.string(),
  name: z.string(),
  cx: z.number(),
  cy: z.number(),
});
export type QuadrantLayoutQuadrant = z.infer<typeof QuadrantLayoutQuadrantSchema>;


export const QuadrantLayoutAxisLabelSchema = z.object({
  text: z.string(),
  x: z.number(),
  y: z.number(),
});
export type QuadrantLayoutAxisLabel = z.infer<typeof QuadrantLayoutAxisLabelSchema>;


export const QuadrantLayoutAxesSchema = z.object({
  midX: z.number(),
  midY: z.number(),
  xLeft: QuadrantLayoutAxisLabelSchema.optional(),
  xRight: QuadrantLayoutAxisLabelSchema.optional(),
  yBottom: QuadrantLayoutAxisLabelSchema.optional(),
  yTop: QuadrantLayoutAxisLabelSchema.optional(),
});
export type QuadrantLayoutAxes = z.infer<typeof QuadrantLayoutAxesSchema>;


export const QuadrantLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  plot: PlotRectSchema,
  points: z.array(QuadrantLayoutPointSchema),
  quadrants: z.array(QuadrantLayoutQuadrantSchema),
  axes: QuadrantLayoutAxesSchema,
  groups: z.array(QuadrantGroupSchema).optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titleY: z.number(),
  subtitleY: z.number(),
  legendX: z.number(),
});
export type QuadrantLayout = z.infer<typeof QuadrantLayoutSchema>;

