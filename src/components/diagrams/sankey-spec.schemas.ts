/**
 * sankey-spec.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const SankeyNodeSpecSchema = z.object({
  id: z.string(),
  label: z.string(),
  hue: z.number().optional(),
  group: z.string().optional(),
  description: z.string().optional(),
});
export type SankeyNodeSpec = z.infer<typeof SankeyNodeSpecSchema>;


export const SankeyLinkSpecSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  value: z.number(),
  label: z.string().optional(),
  group: z.string().optional(),
});
export type SankeyLinkSpec = z.infer<typeof SankeyLinkSpecSchema>;


export const SankeyGroupSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  hue: z.number(),
});
export type SankeyGroupSpec = z.infer<typeof SankeyGroupSpecSchema>;


export const SankeyResolvedSpecSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  unit: z.string().optional(),
  groups: z.array(SankeyGroupSpecSchema).optional(),
  nodes: z.array(SankeyNodeSpecSchema),
  links: z.array(SankeyLinkSpecSchema),
});
export type SankeyResolvedSpec = z.infer<typeof SankeyResolvedSpecSchema>;


export const SankeyLayoutNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  group: z.string().optional(),
  hue: z.number().optional(),
  layer: z.number(),
  value: z.number(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  labelSide: z.literal('right'),
});
export type SankeyLayoutNode = z.infer<typeof SankeyLayoutNodeSchema>;


export const SankeyLayoutLinkSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  value: z.number(),
  label: z.string().optional(),
  group: z.string().optional(),
  thickness: z.number(),
  path: z.string(),
  labelX: z.number(),
  labelY: z.number(),
  hue: z.number().optional(),
});
export type SankeyLayoutLink = z.infer<typeof SankeyLayoutLinkSchema>;


export const SankeyLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  nodes: z.array(SankeyLayoutNodeSchema),
  links: z.array(SankeyLayoutLinkSchema),
  groups: z.array(SankeyGroupSpecSchema).optional(),
  unit: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titleY: z.number(),
  subtitleY: z.number(),
  legendX: z.number(),
});
export type SankeyLayout = z.infer<typeof SankeyLayoutSchema>;


export const SankeyLayoutOptionsSchema = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
});
export type SankeyLayoutOptions = z.infer<typeof SankeyLayoutOptionsSchema>;

