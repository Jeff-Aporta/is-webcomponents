/**
 * sankey-diagram.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const SkGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  hue: z.number().optional(),
});
export type SkGroup = z.infer<typeof SkGroupSchema>;


export const SkLayoutNodeSchema = z.object({
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
  labelSide: z.union([z.literal('right'), z.literal('left')]),
  overflow: z.union([z.literal('grow'), z.literal('ellipsis'), z.literal('shrink')]).optional(),
});
export type SkLayoutNode = z.infer<typeof SkLayoutNodeSchema>;


export const SkLayoutLinkSchema = z.object({
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
export type SkLayoutLink = z.infer<typeof SkLayoutLinkSchema>;


export const SkLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  nodes: z.array(SkLayoutNodeSchema),
  links: z.array(SkLayoutLinkSchema),
  groups: z.array(SkGroupSchema).optional(),
  unit: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titleY: z.number(),
  subtitleY: z.number(),
  legendX: z.number(),
});
export type SkLayout = z.infer<typeof SkLayoutSchema>;


export const NodeEntrySchema = z.object({
  n: SkLayoutNodeSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type NodeEntry = z.infer<typeof NodeEntrySchema>;


export const LinkEntrySchema = z.object({
  l: SkLayoutLinkSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type LinkEntry = z.infer<typeof LinkEntrySchema>;

