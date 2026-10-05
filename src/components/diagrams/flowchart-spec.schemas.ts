/**
 * flowchart-spec.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const AnchorSideSchema = z.union([z.literal('left'), z.literal('right'), z.literal('top'), z.literal('bottom')]);
export type AnchorSide = z.infer<typeof AnchorSideSchema>;


export const FlowDirectionSchema = z.union([z.literal('TB'), z.literal('BT'), z.literal('LR'), z.literal('RL')]);
export type FlowDirection = z.infer<typeof FlowDirectionSchema>;


export const FlowShapeSchema = z.union([z.literal('rect'), z.literal('round'), z.literal('stadium'), z.literal('circle'), z.literal('diamond'), z.literal('hexagon'), z.literal('parallelogram'), z.literal('cylinder'), z.literal('subroutine')]);
export type FlowShape = z.infer<typeof FlowShapeSchema>;


export const FlowEdgeKindSchema = z.union([z.literal('solid'), z.literal('dashed'), z.literal('thick')]);
export type FlowEdgeKind = z.infer<typeof FlowEdgeKindSchema>;


export const FlowOverflowSchema = z.union([z.literal('grow'), z.literal('ellipsis')]);
export type FlowOverflow = z.infer<typeof FlowOverflowSchema>;


export const LeadingIconTokenSchema = z.object({
  iconId: z.string(),
  hue: z.number().optional(),
  rest: z.string(),
});
export type LeadingIconToken = z.infer<typeof LeadingIconTokenSchema>;


export const FlowExclusionZoneSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  label: z.string().optional(),
});
export type FlowExclusionZone = z.infer<typeof FlowExclusionZoneSchema>;


export const FlowNodeSpecSchema = z.object({
  id: z.string(),
  label: z.string(),
  shape: FlowShapeSchema,
  icon: z.string().optional(),
  hue: z.number().optional(),
  group: z.string().optional(),
  description: z.string().optional(),
  overflow: FlowOverflowSchema.optional(),
});
export type FlowNodeSpec = z.infer<typeof FlowNodeSpecSchema>;


export const FlowEdgeSpecSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  kind: FlowEdgeKindSchema,
  group: z.string().optional(),
  waypoints: z.array(z.object({
  x: z.number(),
  y: z.number(),
})).optional(),
});
export type FlowEdgeSpec = z.infer<typeof FlowEdgeSpecSchema>;


export const FlowGroupSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  hue: z.number(),
});
export type FlowGroupSpec = z.infer<typeof FlowGroupSpecSchema>;


export const FlowResolvedSpecSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  direction: FlowDirectionSchema,
  defaultOverflow: FlowOverflowSchema,
  groups: z.array(FlowGroupSpecSchema).optional(),
  exclusionZones: z.array(FlowExclusionZoneSchema).optional(),
  nodes: z.array(FlowNodeSpecSchema),
  edges: z.array(FlowEdgeSpecSchema),
});
export type FlowResolvedSpec = z.infer<typeof FlowResolvedSpecSchema>;


export const FlowLayoutNodeSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  layer: z.number(),
  label: z.string(),
  shape: FlowShapeSchema,
  icon: z.string().optional(),
  description: z.string().optional(),
  hue: z.number().optional(),
  group: z.string().optional(),
});
export type FlowLayoutNode = z.infer<typeof FlowLayoutNodeSchema>;


export const FlowLayoutEdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  kind: FlowEdgeKindSchema,
  path: z.string(),
  arrowTipX: z.number(),
  arrowTipY: z.number(),
  arrowAngle: z.number(),
  labelX: z.number(),
  labelY: z.number(),
  hue: z.number().optional(),
});
export type FlowLayoutEdge = z.infer<typeof FlowLayoutEdgeSchema>;


export const FlowLayoutExclusionZoneSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  label: z.string().optional(),
});
export type FlowLayoutExclusionZone = z.infer<typeof FlowLayoutExclusionZoneSchema>;


export const FlowLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  nodes: z.array(FlowLayoutNodeSchema),
  edges: z.array(FlowLayoutEdgeSchema),
  groups: z.array(FlowGroupSpecSchema).optional(),
  exclusionZones: z.array(FlowLayoutExclusionZoneSchema).optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titleY: z.number(),
  subtitleY: z.number(),
  legendX: z.number(),
});
export type FlowLayout = z.infer<typeof FlowLayoutSchema>;


export const FlowLayoutOverridesSchema = z.object({
  nodes: z.record(z.string(), z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  label: z.string().optional(),
  hue: z.number().optional(),
})).optional(),
  edges: z.record(z.string(), z.object({
  label: z.string().optional(),
  hue: z.number().optional(),
})).optional(),
});
export type FlowLayoutOverrides = z.infer<typeof FlowLayoutOverridesSchema>;

