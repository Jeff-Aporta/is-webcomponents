/**
 * tree-layout.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const RawNodeSchema = z.object({
  id: z.union([z.string(), z.number()]),
  parent: z.union([z.string(), z.number(), z.null()]).optional(),
  children: z.never().optional(),
  /* TODO: member [key: string]: unknown */
});
export type RawNode = z.infer<typeof RawNodeSchema>;


export const TreeNodeSchema = z.object({
  id: z.string(),
  parent: z.union([z.string(), z.number(), z.null()]).optional(),
  children: z.array(TreeNodeSchema),
  /* TODO: member [key: string]: unknown */
});
export type TreeNode = z.infer<typeof TreeNodeSchema>;


export const TreeMeasureSchema = z.function({ input: [z.unknown() /* TODO: ref TreeNode */], output: z.object({
  w: z.number(),
  h: z.number(),
}) });
export type TreeMeasure = z.infer<typeof TreeMeasureSchema>;


export const LayoutEntrySchema = z.object({
  id: z.string(),
  depth: z.number(),
  w: z.number(),
  h: z.number(),
  children: z.array(LayoutEntrySchema),
  extent: z.number(),
  childrenExtent: z.number(),
  crossStart: z.number(),
  leaves: z.number().optional(),
  angle: z.number().optional(),
});
export type LayoutEntry = z.infer<typeof LayoutEntrySchema>;


export const LayoutTreeOptsSchema = z.object({
  direction: z.union([z.literal('LR'), z.literal('RL'), z.literal('TB'), z.literal('BT')]).optional(),
  levelGap: z.number().optional(),
  siblingGap: z.number().optional(),
  measure: TreeMeasureSchema.optional(),
});
export type LayoutTreeOpts = z.infer<typeof LayoutTreeOptsSchema>;


export const PositionedTreeNodeSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  depth: z.number(),
});
export type PositionedTreeNode = z.infer<typeof PositionedTreeNodeSchema>;


export const LayoutTreeResultSchema = z.object({
  nodes: z.array(PositionedTreeNodeSchema),
  width: z.number(),
  height: z.number(),
});
export type LayoutTreeResult = z.infer<typeof LayoutTreeResultSchema>;


export const LayoutRadialOptsSchema = z.object({
  radiusStep: z.number().optional(),
  measure: TreeMeasureSchema.optional(),
});
export type LayoutRadialOpts = z.infer<typeof LayoutRadialOptsSchema>;


export const LayoutRadialResultSchema = z.object({
  nodes: z.array(PositionedTreeNodeSchema),
  width: z.number(),
  height: z.number(),
  cx: z.number(),
  cy: z.number(),
});
export type LayoutRadialResult = z.infer<typeof LayoutRadialResultSchema>;


export const SquarifyItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  value: z.number(),
});
export type SquarifyItem = z.infer<typeof SquarifyItemSchema>;


export const SquarifyResultSchema = z.object({
  id: z.union([z.string(), z.number()]),
  value: z.number(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type SquarifyResult = z.infer<typeof SquarifyResultSchema>;

