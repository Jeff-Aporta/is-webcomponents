/**
 * file-source.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const FileSourceSchema = z.union([z.object({
  kind: z.literal('empty'),
}), z.object({
  kind: z.literal('content'),
  content: z.string(),
}), z.object({
  kind: z.literal('src'),
  src: z.string(),
})]);
export type FileSource = z.infer<typeof FileSourceSchema>;

