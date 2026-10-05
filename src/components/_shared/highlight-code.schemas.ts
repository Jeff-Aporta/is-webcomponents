/**
 * highlight-code.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const CodeEditorSchema = z.intersection(z.unknown() /* TODO: ref HTMLElement */, z.object({
  value: z.string(),
  lang: z.string(),
  refresh: z.function({ input: [], output: z.void() }).optional(),
}));
export type CodeEditor = z.infer<typeof CodeEditorSchema>;

