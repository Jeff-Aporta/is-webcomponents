/**
 * node-link-layout.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const GraphNodeSchema = z.object({
  id: z.string(),
  w: z.number().optional(),
  h: z.number().optional(),
});
export type GraphNode = z.infer<typeof GraphNodeSchema>;


export const GraphEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
});
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;


export const NodeRectSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type NodeRect = z.infer<typeof NodeRectSchema>;


export const EdgeAnchorXYSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type EdgeAnchorXY = z.infer<typeof EdgeAnchorXYSchema>;


export const PositionedNodeSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  layer: z.number(),
  order: z.number(),
});
export type PositionedNode = z.infer<typeof PositionedNodeSchema>;


export const LayoutOptsSchema = z.object({
  direction: z.union([z.literal('TB'), z.literal('BT'), z.literal('LR'), z.literal('RL')]).optional(),
  layerGap: z.number().optional(),
  nodeGap: z.number().optional(),
  align: z.union([z.literal('center'), z.literal('start')]).optional(),
});
export type LayoutOpts = z.infer<typeof LayoutOptsSchema>;


export const LayoutResultSchema = z.object({
  nodes: z.array(PositionedNodeSchema),
  width: z.number(),
  height: z.number(),
  layers: z.map(z.string(), z.number()),
});
export type LayoutResult = z.infer<typeof LayoutResultSchema>;

