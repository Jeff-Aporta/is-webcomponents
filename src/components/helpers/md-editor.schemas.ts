/**
 * md-editor.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const IsMdEditorDocumentSchema = z.object({
  id: z.string().optional(),
  filename: z.string().optional(),
  content: z.string(),
  contentType: z.string().optional(),
  updatedAt: z.string().optional(),
  updatedBy: z.string().optional(),
  sizeBytes: z.number().optional(),
  meta: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});
export type IsMdEditorDocument = z.infer<typeof IsMdEditorDocumentSchema>;


export const IsMdEditorApiConfigSchema = z.object({
  baseUrl: z.string().optional(),
  endpoints: z.object({
  get: z.string().optional(),
  put: z.string().optional(),
  post: z.string().optional(),
  delete: z.string().optional(),
}).optional(),
  headers: z.union([z.record(z.string(), z.string()), z.function({ input: [], output: z.record(z.string(), z.string()) })]).optional(),
  token: z.union([z.string(), z.function({ input: [], output: z.string() })]).optional(),
  fieldMap: z.record(z.string(), z.unknown() /* TODO: cannot convert */).optional(),
});
export type IsMdEditorApiConfig = z.infer<typeof IsMdEditorApiConfigSchema>;


export const IsMdEditorActionsSchema = z.object({
  load: z.function({ input: [], output: z.promise(z.union([z.unknown() /* TODO: ref IsMdEditorDocument */, z.string()])) }).optional(),
  persist: z.function({ input: [z.unknown() /* TODO: ref IsMdEditorDocument */], output: z.promise(z.union([z.unknown() /* TODO: ref IsMdEditorDocument */, z.void()])) }).optional(),
  delete: z.function({ input: [z.unknown() /* TODO: ref IsMdEditorDocument */], output: z.promise(z.void()) }).optional(),
});
export type IsMdEditorActions = z.infer<typeof IsMdEditorActionsSchema>;


export const DialogElementSchema = z.intersection(z.unknown() /* TODO: ref HTMLElement */, z.object({
  open: z.boolean(),
  show: z.function({ input: [], output: z.void() }),
  hide: z.function({ input: [], output: z.void() }),
  showPopover: z.function({ input: [], output: z.void() }).optional(),
  hidePopover: z.function({ input: [], output: z.void() }).optional(),
}));
export type DialogElement = z.infer<typeof DialogElementSchema>;


export const SwitchElementSchema = z.object({
  checked: z.boolean(),
});
export type SwitchElement = z.infer<typeof SwitchElementSchema>;


export const CopyButtonElementSchema = z.object({
  value: z.string(),
});
export type CopyButtonElement = z.infer<typeof CopyButtonElementSchema>;


export const TextareaElementSchema = z.object({
  value: z.string(),
});
export type TextareaElement = z.infer<typeof TextareaElementSchema>;


export const EditorHistorySchema = z.object({
  past: z.array(z.string()),
  future: z.array(z.string()),
});
export type EditorHistory = z.infer<typeof EditorHistorySchema>;

