/**
 * diagram-edit.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const NodeOverrideSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  label: z.string().optional(),
  hue: z.number().optional(),
});
export type NodeOverride = z.infer<typeof NodeOverrideSchema>;


export const EdgeOverrideSchema = z.object({
  label: z.string().optional(),
  hue: z.number().optional(),
});
export type EdgeOverride = z.infer<typeof EdgeOverrideSchema>;


export const NodeOverrideMapSchema = z.record(z.string(), NodeOverrideSchema);
export type NodeOverrideMap = z.infer<typeof NodeOverrideMapSchema>;


export const EdgeOverrideMapSchema = z.record(z.string(), EdgeOverrideSchema);
export type EdgeOverrideMap = z.infer<typeof EdgeOverrideMapSchema>;


export const DiagramOverridesSchema = z.object({
  nodes: NodeOverrideMapSchema.optional(),
  edges: EdgeOverrideMapSchema.optional(),
});
export type DiagramOverrides = z.infer<typeof DiagramOverridesSchema>;


export const EditorAnchorSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type EditorAnchor = z.infer<typeof EditorAnchorSchema>;


export const DiagramPersistSchema = z.union([z.literal('none'), z.literal('session'), z.literal('local')]);
export type DiagramPersist = z.infer<typeof DiagramPersistSchema>;


export const LayoutChangeDetailSchema = z.object({
  nodes: NodeOverrideMapSchema.optional(),
  edges: EdgeOverrideMapSchema.optional(),
  /* TODO: member [key: string]: unknown */
});
export type LayoutChangeDetail = z.infer<typeof LayoutChangeDetailSchema>;


export const NodeLayoutEntrySchema = z.object({
  id: z.string(),
  x: z.number().optional(),
  y: z.number().optional(),
  label: z.string().optional(),
  hue: z.number().optional(),
});
export type NodeLayoutEntry = z.infer<typeof NodeLayoutEntrySchema>;


export const EdgeLayoutEntrySchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  hue: z.number().optional(),
});
export type EdgeLayoutEntry = z.infer<typeof EdgeLayoutEntrySchema>;


export const LayoutLikeSchema = z.object({
  nodes: z.array(NodeLayoutEntrySchema).optional(),
  edges: z.array(EdgeLayoutEntrySchema).optional(),
  relations: z.array(EdgeLayoutEntrySchema).optional(),
});
export type LayoutLike = z.infer<typeof LayoutLikeSchema>;


export const NodeDragMoveSchema = z.function({ input: [z.number(), z.number(), z.number(), z.number()], output: z.void() });
export type NodeDragMove = z.infer<typeof NodeDragMoveSchema>;


export const NodeDragEndSchema = z.function({ input: [], output: z.void() });
export type NodeDragEnd = z.infer<typeof NodeDragEndSchema>;


export const NodeDragDestroySchema = z.function({ input: [], output: z.void() });
export type NodeDragDestroy = z.infer<typeof NodeDragDestroySchema>;


export const InlineEditorInitialSchema = z.object({
  label: z.string().optional(),
  hue: z.number().optional(),
});
export type InlineEditorInitial = z.infer<typeof InlineEditorInitialSchema>;


export const InlineEditorSaveSchema = z.function({ input: [z.object({
  label: z.string(),
  hue: z.union([z.number(), z.null()]),
})], output: z.void() });
export type InlineEditorSave = z.infer<typeof InlineEditorSaveSchema>;


export const InlineEditorCancelSchema = z.function({ input: [], output: z.void() });
export type InlineEditorCancel = z.infer<typeof InlineEditorCancelSchema>;


export const OpenInlineEditorOptsSchema = z.object({
  anchor: EditorAnchorSchema,
  initial: InlineEditorInitialSchema.optional(),
  onSave: InlineEditorSaveSchema.optional(),
  onCancel: InlineEditorCancelSchema.optional(),
});
export type OpenInlineEditorOpts = z.infer<typeof OpenInlineEditorOptsSchema>;

