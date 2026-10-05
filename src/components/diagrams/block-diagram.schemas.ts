/**
 * block-diagram.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const BlockSpecGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  hue: z.number(),
});
export type BlockSpecGroup = z.infer<typeof BlockSpecGroupSchema>;


export const BlockSpecBlockSchema = z.object({
  id: z.string(),
  label: z.string(),
  shape: z.union([z.literal('rect'), z.literal('round')]),
  icon: z.string().optional(),
  hue: z.number().optional(),
  group: z.string().optional(),
  span: z.number(),
});
export type BlockSpecBlock = z.infer<typeof BlockSpecBlockSchema>;


export const BlockSpecEdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
});
export type BlockSpecEdge = z.infer<typeof BlockSpecEdgeSchema>;


export const BlockLayoutBlockSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  row: z.number(),
  col: z.number(),
  label: z.string(),
  shape: z.union([z.literal('rect'), z.literal('round')]),
  icon: z.string().optional(),
  hue: z.number().optional(),
  group: z.string().optional(),
});
export type BlockLayoutBlock = z.infer<typeof BlockLayoutBlockSchema>;


export const BlockLayoutEdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  path: z.string(),
  arrowTipX: z.number(),
  arrowTipY: z.number(),
  arrowAngle: z.number(),
  labelX: z.number(),
  labelY: z.number(),
  hue: z.number().optional(),
});
export type BlockLayoutEdge = z.infer<typeof BlockLayoutEdgeSchema>;


export const TurtleStateSchema = z.object({
  playing: z.boolean(),
  idx: z.number(),
  total: z.number(),
  replay: z.number(),
});
export type TurtleState = z.infer<typeof TurtleStateSchema>;


export const BlockNodeEntrySchema = z.object({
  b: BlockLayoutBlockSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
  box: z.unknown() /* TODO: ref SVGPathElement */,
});
export type BlockNodeEntry = z.infer<typeof BlockNodeEntrySchema>;


export const EdgeNodeEntrySchema = z.object({
  e: BlockLayoutEdgeSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
  path: z.unknown() /* TODO: ref SVGPathElement */,
});
export type EdgeNodeEntry = z.infer<typeof EdgeNodeEntrySchema>;

