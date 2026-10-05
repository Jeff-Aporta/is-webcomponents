/**
 * diagram-edge-actors.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const XYPointSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type XYPoint = z.infer<typeof XYPointSchema>;


export const RectLikeSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type RectLike = z.infer<typeof RectLikeSchema>;


export const LabeledEdgeSchema = z.object({
  label: z.string().optional(),
  path: z.string(),
  fromX: z.number().optional(),
  fromY: z.number().optional(),
  toX: z.number().optional(),
  toY: z.number().optional(),
  labelX: z.number().optional(),
  labelY: z.number().optional(),
  labelW: z.number().optional(),
  labelH: z.number().optional(),
  _actor: RectLikeSchema.optional(),
});
export type LabeledEdge = z.infer<typeof LabeledEdgeSchema>;


export const PlaceEdgeActorsOptsSchema = z.object({
  edges: z.array(z.unknown() /* TODO: cannot convert */).optional(),
  obstacles: z.array(z.unknown() /* TODO: cannot convert */).optional(),
  canvas: z.object({
  width: z.number(),
  height: z.number(),
}).optional(),
  glue: z.boolean().optional(),
});
export type PlaceEdgeActorsOpts = z.infer<typeof PlaceEdgeActorsOptsSchema>;


export const PlaceEdgeActorsResultSchema = z.object({
  width: z.number(),
  height: z.number(),
  actors: z.array(RectLikeSchema),
});
export type PlaceEdgeActorsResult = z.infer<typeof PlaceEdgeActorsResultSchema>;


export const EdgeActorLayoutSchema = z.object({
  edges: z.array(LabeledEdgeSchema).optional(),
  relations: z.array(LabeledEdgeSchema).optional(),
  links: z.array(LabeledEdgeSchema).optional(),
  width: z.number(),
  height: z.number(),
});
export type EdgeActorLayout = z.infer<typeof EdgeActorLayoutSchema>;

