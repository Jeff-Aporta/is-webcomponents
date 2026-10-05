/**
 * mindmap.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const MindmapNodeKindSchema = z.union([z.literal('root'), z.literal('branch'), z.literal('leaf')]);
export type MindmapNodeKind = z.infer<typeof MindmapNodeKindSchema>;


export const MmLayoutNodeSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  depth: z.number(),
  kind: MindmapNodeKindSchema,
  label: z.string(),
  icon: z.string().optional(),
  description: z.string().optional(),
  hue: z.number().optional(),
  overflow: z.union([z.literal('grow'), z.literal('ellipsis'), z.literal('shrink')]).optional(),
});
export type MmLayoutNode = z.infer<typeof MmLayoutNodeSchema>;


export const MmLayoutEdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  path: z.string(),
  hue: z.number().optional(),
  width: z.number(),
});
export type MmLayoutEdge = z.infer<typeof MmLayoutEdgeSchema>;


export const MmLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  nodes: z.array(MmLayoutNodeSchema),
  edges: z.array(MmLayoutEdgeSchema),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titleY: z.number(),
  subtitleY: z.number(),
});
export type MmLayout = z.infer<typeof MmLayoutSchema>;


export const NodeEntrySchema = z.object({
  n: MmLayoutNodeSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type NodeEntry = z.infer<typeof NodeEntrySchema>;


export const EdgeEntrySchema = z.object({
  e: MmLayoutEdgeSchema,
  path: z.unknown() /* TODO: ref SVGPathElement */,
});
export type EdgeEntry = z.infer<typeof EdgeEntrySchema>;

