// @contexto INDICE.md · src/components/helpers/README.md
/**
 * md-editor.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const IswcMdEditorDocumentSchema = z.object({
  id: z.string().optional(),
  filename: z.string().optional(),
  content: z.string(),
  contentType: z.string().optional(),
  updatedAt: z.string().optional(),
  updatedBy: z.string().optional(),
  sizeBytes: z.number().optional(),
  meta: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});
export type IswcMdEditorDocument = z.infer<typeof IswcMdEditorDocumentSchema>;

const IswcMdEditorApiConfigSchema = z.object({
  baseUrl: z.string().optional(),
  endpoints: z.object({
  get: z.string().optional(),
  put: z.string().optional(),
  post: z.string().optional(),
  delete: z.string().optional(),
}).optional(),
  headers: z.union([z.record(z.string(), z.string()), z.function({ input: [], output: z.record(z.string(), z.string()) })]).optional(),
  token: z.union([z.string(), z.function({ input: [], output: z.string() })]).optional(),
  fieldMap: z.record(z.string(), z.string()).optional(),
});
export type IswcMdEditorApiConfig = z.infer<typeof IswcMdEditorApiConfigSchema>;

const IswcMdEditorActionsSchema = z.object({
  load: z.function({ input: [], output: z.promise(z.union([IswcMdEditorDocumentSchema, z.string()])) }).optional(),
  persist: z.function({ input: [IswcMdEditorDocumentSchema], output: z.promise(z.union([IswcMdEditorDocumentSchema, z.void()])) }).optional(),
  delete: z.function({ input: [IswcMdEditorDocumentSchema], output: z.promise(z.void()) }).optional(),
});
export type IswcMdEditorActions = z.infer<typeof IswcMdEditorActionsSchema>;

const DialogElementSchema = z.intersection(z.custom<HTMLElement>(), z.object({
  open: z.boolean(),
  show: z.function({ input: [], output: z.void() }),
  hide: z.function({ input: [], output: z.void() }),
  showPopover: z.function({ input: [], output: z.void() }).optional(),
  hidePopover: z.function({ input: [], output: z.void() }).optional(),
}));
export type DialogElement = z.infer<typeof DialogElementSchema>;

/** `<iswc-switch>` del editor. */
const SwitchElementSchema = z.intersection(z.custom<HTMLElement>(), z.object({
  checked: z.boolean(),
}));
export type SwitchElement = z.infer<typeof SwitchElementSchema>;

/** `<iswc-button>` de copiar. */
const CopyButtonElementSchema = z.intersection(z.custom<HTMLElement>(), z.object({
  value: z.string(),
}));
export type CopyButtonElement = z.infer<typeof CopyButtonElementSchema>;

/** `<iswc-textarea>` del editor. */
const TextareaElementSchema = z.intersection(z.custom<HTMLElement>(), z.object({
  value: z.string(),
}));
export type TextareaElement = z.infer<typeof TextareaElementSchema>;

const EditorHistorySchema = z.object({
  past: z.array(z.string()),
  future: z.array(z.string()),
});
export type EditorHistory = z.infer<typeof EditorHistorySchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type MdEditorEventos = { 'iswc-open': Record<string, never>; 'iswc-close': Record<string, never>; 'iswc-load': { document: unknown }; 'iswc-error': { action: 'load' | 'persist' | 'delete'; error: string }; 'iswc-persist': { value: string; document: unknown }; 'iswc-delete': { document: unknown }; 'iswc-download': { filename: string; bytes: number }; 'iswc-change': undefined };
