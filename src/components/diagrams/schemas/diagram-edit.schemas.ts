/**
 * diagram-edit.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const NodeOverrideSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  label: z.string().optional(),
  hue: z.number().optional(),
});

const EdgeOverrideSchema = z.object({
  label: z.string().optional(),
  hue: z.number().optional(),
});

const NodeOverrideMapSchema = z.record(z.string(), NodeOverrideSchema);

const EdgeOverrideMapSchema = z.record(z.string(), EdgeOverrideSchema);

const DiagramOverridesSchema = z.object({
  nodes: NodeOverrideMapSchema.optional(),
  edges: EdgeOverrideMapSchema.optional(),
});
export type DiagramOverrides = z.infer<typeof DiagramOverridesSchema>;

const EditorAnchorSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const LayoutChangeDetailSchema = z.object({
  nodes: NodeOverrideMapSchema.optional(),
  edges: EdgeOverrideMapSchema.optional(),
  /* TODO: member [key: string]: unknown */
});
export type LayoutChangeDetail = z.infer<typeof LayoutChangeDetailSchema>;

const NodeDragMoveSchema = z.function({ input: [z.number(), z.number(), z.number(), z.number()], output: z.void() });
export type NodeDragMove = z.infer<typeof NodeDragMoveSchema>;

const NodeDragEndSchema = z.function({ input: [], output: z.void() });
export type NodeDragEnd = z.infer<typeof NodeDragEndSchema>;

const NodeDragDestroySchema = z.function({ input: [], output: z.void() });
export type NodeDragDestroy = z.infer<typeof NodeDragDestroySchema>;

const InlineEditorInitialSchema = z.object({
  label: z.string().optional(),
  hue: z.number().optional(),
});

const InlineEditorSaveSchema = z.function({ input: [z.object({
  label: z.string(),
  hue: z.union([z.number(), z.null()]),
})], output: z.void() });

const InlineEditorCancelSchema = z.function({ input: [], output: z.void() });

const OpenInlineEditorOptsSchema = z.object({
  anchor: EditorAnchorSchema,
  initial: InlineEditorInitialSchema.optional(),
  onSave: InlineEditorSaveSchema.optional(),
  onCancel: InlineEditorCancelSchema.optional(),
});
export type OpenInlineEditorOpts = z.infer<typeof OpenInlineEditorOptsSchema>;

