/**
 * _editor-panel.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const EditorPanelNodeLiteSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
});
export type EditorPanelNodeLite = z.infer<typeof EditorPanelNodeLiteSchema>;


export const EditorPanelOptionsSchema = z.object({
  renderNodeProps: z.function({ input: [z.unknown() /* TODO: ref HTMLElement */, z.union([z.string(), z.null()]), z.unknown() /* TODO: ref HTMLElement */], output: z.void() }).optional(),
  showExportJson: z.boolean().optional(),
});
export type EditorPanelOptions = z.infer<typeof EditorPanelOptionsSchema>;

