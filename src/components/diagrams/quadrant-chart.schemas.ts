/**
 * quadrant-chart.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const QdGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  hue: z.number().optional(),
});
export type QdGroup = z.infer<typeof QdGroupSchema>;


export const QdAxisLabelSchema = z.object({
  text: z.string(),
  x: z.number(),
  y: z.number(),
});
export type QdAxisLabel = z.infer<typeof QdAxisLabelSchema>;


export const QdAxesSchema = z.object({
  midX: z.number(),
  midY: z.number(),
  xLeft: QdAxisLabelSchema.optional(),
  xRight: QdAxisLabelSchema.optional(),
  yBottom: QdAxisLabelSchema.optional(),
  yTop: QdAxisLabelSchema.optional(),
});
export type QdAxes = z.infer<typeof QdAxesSchema>;


export const QdLayoutPointSchema = z.object({
  id: z.string(),
  name: z.string(),
  label: z.string(),
  group: z.string().optional(),
  x: z.number(),
  y: z.number(),
  hue: z.number().optional(),
  description: z.string().optional(),
  cx: z.number(),
  cy: z.number(),
  r: z.number(),
  labelDy: z.number(),
});
export type QdLayoutPoint = z.infer<typeof QdLayoutPointSchema>;


export const QdLayoutQuadrantSchema = z.object({
  id: z.string(),
  name: z.string(),
  cx: z.number(),
  cy: z.number(),
});
export type QdLayoutQuadrant = z.infer<typeof QdLayoutQuadrantSchema>;


export const QdLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  plot: z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
}),
  points: z.array(QdLayoutPointSchema),
  quadrants: z.array(QdLayoutQuadrantSchema),
  axes: QdAxesSchema,
  groups: z.array(QdGroupSchema).optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titleY: z.number(),
  subtitleY: z.number(),
  legendX: z.number(),
});
export type QdLayout = z.infer<typeof QdLayoutSchema>;


export const PointEntrySchema = z.object({
  pt: QdLayoutPointSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type PointEntry = z.infer<typeof PointEntrySchema>;

