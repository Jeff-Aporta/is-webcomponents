/**
 * ecosystem.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const LoaderCatalogSchema = z.object({
  categories: z.record(z.string(), z.array(z.string())),
  tags: z.record(z.string(), z.object({
  category: z.string(),
  file: z.string(),
})),
});
export type LoaderCatalog = z.infer<typeof LoaderCatalogSchema>;


export const LoaderModuleSchema = z.object({
  load: z.function({ input: [z.unknown()], output: z.promise(z.unknown()) }),
  loadPageStyles: z.function({ input: [z.array(z.string())], output: z.promise(z.unknown()) }),
  catalog: LoaderCatalogSchema,
});
export type LoaderModule = z.infer<typeof LoaderModuleSchema>;


export const SharedModuleEntrySchema = z.object({
  id: z.string(),
  file: z.string(),
  path: z.string(),
  summary: z.string(),
  exports: z.array(z.string()).optional(),
  bytes: z.number().optional(),
});
export type SharedModuleEntry = z.infer<typeof SharedModuleEntrySchema>;


export const SharedCatalogJSONSchema = z.object({
  modules: z.array(SharedModuleEntrySchema),
});
export type SharedCatalogJSON = z.infer<typeof SharedCatalogJSONSchema>;


export const SnippetEditorSchema = z.intersection(z.unknown() /* TODO: ref HTMLElement */, z.object({
  value: z.string(),
}));
export type SnippetEditor = z.infer<typeof SnippetEditorSchema>;

