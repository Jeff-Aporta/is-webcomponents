/**
 * _editor-toolbar.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const EditorActionSchema = z.union([z.literal('add-node'), z.literal('connect'), z.literal('delete'), z.literal('undo'), z.literal('redo'), z.literal('zoom-in'), z.literal('zoom-out'), z.literal('fit')]);
export type EditorAction = z.infer<typeof EditorActionSchema>;


export const EditorActionDetailSchema = z.object({
  action: EditorActionSchema,
});
export type EditorActionDetail = z.infer<typeof EditorActionDetailSchema>;


export const EditorToolbarOptionsSchema = z.object({
  showAddNode: z.boolean().optional(),
  showConnect: z.boolean().optional(),
  showDelete: z.boolean().optional(),
  showHistory: z.boolean().optional(),
  showZoom: z.boolean().optional(),
  undoDisabled: z.boolean().optional(),
  redoDisabled: z.boolean().optional(),
});
export type EditorToolbarOptions = z.infer<typeof EditorToolbarOptionsSchema>;


export const ButtonDefSchema = z.object({
  action: EditorActionSchema,
  label: z.string(),
  icon: z.string(),
  ariaLabel: z.string(),
  key: z.string(),
  initiallyDisabled: z.boolean().optional(),
});
export type ButtonDef = z.infer<typeof ButtonDefSchema>;

