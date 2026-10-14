/**
 * diagram-astar.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const GridPointSchema = z.object({
  col: z.number(),
  row: z.number(),
});
export type GridPoint = z.infer<typeof GridPointSchema>;


export const CostGridSchema = z.object({
  cols: z.number(),
  rows: z.number(),
  grid: z.number(),
  cost: z.unknown() /* TODO: ref Float64Array */,
  forbidden: z.map(z.string(), ForbiddenRegionSchema).optional(),
});
export type CostGrid = z.infer<typeof CostGridSchema>;


export const ForbiddenRegionSchema = z.object({
  id: z.string(),
  kind: z.union([z.literal('rect'), z.literal('poly')]),
  x: z.number().optional(),
  y: z.number().optional(),
  w: z.number().optional(),
  h: z.number().optional(),
  points: z.array(z.unknown() /* TODO: cannot convert */).optional(),
  color: z.string().optional(),
  label: z.string().optional(),
});
export type ForbiddenRegion = z.infer<typeof ForbiddenRegionSchema>;


export const PixelPointSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type PixelPoint = z.infer<typeof PixelPointSchema>;


export const RouteOptsSchema = z.object({
  turnCost: z.number().optional(),
  waypoints: z.array(z.unknown() /* TODO: cannot convert */).optional(),
  forbiddenRegions: z.array(z.union([z.array(z.unknown() /* TODO: cannot convert */), ForbiddenRegionSchema])).optional(),
});
export type RouteOpts = z.infer<typeof RouteOptsSchema>;


export const AestheticsOptsSchema = z.intersection(RouteOptsSchema, z.object({
  suggestCount: z.number().optional(),
  turnWeight: z.number().optional(),
}));
export type AestheticsOpts = z.infer<typeof AestheticsOptsSchema>;


export const SequenceRouteSchema = z.object({
  path: z.string(),
  arrowTipX: z.number(),
  arrowTipY: z.number(),
  arrowDir: z.number(),
  points: z.array(GridPointSchema),
});
export type SequenceRoute = z.infer<typeof SequenceRouteSchema>;

