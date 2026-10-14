/**
 * block-spec.ts — Zod schemas para los tipos extraídos de este módulo.
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


export const BlockSpecSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  columns: z.number(),
  groups: z.array(BlockSpecGroupSchema).optional(),
  blocks: z.array(BlockSpecBlockSchema),
  edges: z.array(BlockSpecEdgeSchema),
});
export type BlockSpec = z.infer<typeof BlockSpecSchema>;


export const LeadingIconSchema = z.object({
  iconId: z.string().optional(),
  hue: z.number().optional(),
  rest: z.string().optional(),
});
export type LeadingIcon = z.infer<typeof LeadingIconSchema>;


export const BlockPlacementSchema = z.object({
  id: z.string(),
  row: z.number(),
  col: z.number(),
  span: z.number(),
});
export type BlockPlacement = z.infer<typeof BlockPlacementSchema>;


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


export const BlockLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  blocks: z.array(BlockLayoutBlockSchema),
  edges: z.array(BlockLayoutEdgeSchema),
  groups: z.array(BlockSpecGroupSchema).optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titleY: z.number(),
  subtitleY: z.number(),
  legendX: z.number(),
});
export type BlockLayout = z.infer<typeof BlockLayoutSchema>;


export const BlockRectSchema = z.object({

});
export type BlockRect = z.infer<typeof BlockRectSchema>;


export const SideSchema = z.union([z.literal('left'), z.literal('right'), z.literal('top'), z.literal('bottom')]);
export type Side = z.infer<typeof SideSchema>;

