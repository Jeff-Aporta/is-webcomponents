/**
 * md-editor-api.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const IsMdEditorDocumentSchema = z.object({
  id: z.string().optional(),
  filename: z.string().optional(),
  content: z.string(),
  contentType: z.union([z.literal('text/markdown'), z.literal('text/plain'), z.string()]).optional(),
  updatedAt: z.string().optional(),
  updatedBy: z.string().optional(),
  sizeBytes: z.number().optional(),
  meta: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});
export type IsMdEditorDocument = z.infer<typeof IsMdEditorDocumentSchema>;


export const IsMdEditorEndpointsSchema = z.object({
  get: z.string().optional(),
  put: z.string().optional(),
  post: z.string().optional(),
  delete: z.string().optional(),
});
export type IsMdEditorEndpoints = z.infer<typeof IsMdEditorEndpointsSchema>;


export const IsMdEditorApiConfigSchema = z.object({
  baseUrl: z.string().optional(),
  endpoints: IsMdEditorEndpointsSchema.optional(),
  headers: z.union([z.record(z.string(), z.string()), z.function({ input: [], output: z.record(z.string(), z.string()) })]).optional(),
  token: z.union([z.string(), z.function({ input: [], output: z.string() })]).optional(),
  fieldMap: z.record(z.string(), z.unknown() /* TODO: cannot convert */).optional(),
});
export type IsMdEditorApiConfig = z.infer<typeof IsMdEditorApiConfigSchema>;


export const CanonKeySchema = z.union([z.literal('content'), z.literal('filename'), z.literal('updatedAt'), z.literal('updatedBy'), z.literal('id'), z.literal('sizeBytes'), z.literal('contentType')]);
export type CanonKey = z.infer<typeof CanonKeySchema>;


export const SrcMapSchema = z.record(z.string(), z.unknown());
export type SrcMap = z.infer<typeof SrcMapSchema>;

