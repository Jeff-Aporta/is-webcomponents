/**
 * mindmap-spec.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";
import type { TreeNodeOf } from "../../../core/schemas/tree-layout.schemas.js";

export const MindmapNodeSchema = z.object({
  id: z.string(),
  parent: z.string().optional(),
  label: z.string(),
  icon: z.string().optional(),
  hue: z.number().optional(),
  description: z.string().optional(),
});
export type MindmapNode = z.infer<typeof MindmapNodeSchema>;


export const MindmapSpecSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  layout: z.union([z.literal('tree'), z.literal('radial')]),
  nodes: z.array(MindmapNodeSchema),
});
export type MindmapSpec = z.infer<typeof MindmapSpecSchema>;


export const LeadingIconSchema = z.object({
  iconId: z.string().optional(),
  hue: z.number().optional(),
  rest: z.string().optional(),
});
export type LeadingIcon = z.infer<typeof LeadingIconSchema>;


/** Árbol de `buildTree` sobre los nodos del mapa, anotado con `depth` y `resolvedHue` por el layout. */
export type TreeNode = TreeNodeOf<MindmapNode & { depth?: number; resolvedHue?: number }>;


export const MindmapLayoutNodeSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  depth: z.number(),
  kind: z.union([z.literal('root'), z.literal('branch'), z.literal('leaf')]),
  label: z.string(),
  icon: z.string().optional(),
  description: z.string().optional(),
  hue: z.number().optional(),
});
export type MindmapLayoutNode = z.infer<typeof MindmapLayoutNodeSchema>;


export const MindmapLayoutEdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  path: z.string(),
  hue: z.number().optional(),
  width: z.number(),
});
export type MindmapLayoutEdge = z.infer<typeof MindmapLayoutEdgeSchema>;


export const MindmapLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  nodes: z.array(MindmapLayoutNodeSchema),
  edges: z.array(MindmapLayoutEdgeSchema),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titleY: z.number(),
  subtitleY: z.number(),
});
export type MindmapLayout = z.infer<typeof MindmapLayoutSchema>;

