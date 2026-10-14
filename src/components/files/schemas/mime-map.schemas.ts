/**
 * mime-map.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const FileKindSchema = z.union([z.literal('txt'), z.literal('csv'), z.literal('pdf'), z.literal('docx'), z.literal('pptx'), z.literal('unknown')]);
export type FileKind = z.infer<typeof FileKindSchema>;


export const FileDispatchSchema = z.object({
  kind: FileKindSchema,
  viewTag: z.union([z.string(), z.null()]),
  editTag: z.union([z.string(), z.null()]),
  tag: z.union([z.string(), z.null()]),
  unsupported: z.boolean(),
});
export type FileDispatch = z.infer<typeof FileDispatchSchema>;

