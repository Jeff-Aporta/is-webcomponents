/**
 * code.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const CodeMarkSchema = z.object({
  id: z.string().optional(),
  from: z.number(),
  to: z.number(),
  kind: z.union([z.literal('tooltip'), z.literal('highlight')]),
  title: z.string().optional(),
  body: z.string().optional(),
  tone: z.string().optional(),
  message: z.string().optional(),
});
export type CodeMark = z.infer<typeof CodeMarkSchema>;


export const CodeDocSchema = z.object({
  text: z.string(),
  marks: z.array(CodeMarkSchema).optional(),
});
export type CodeDoc = z.infer<typeof CodeDocSchema>;


export const IsCodeElSchema = z.object({
  lang: z.string(),
  mode: z.union([z.literal('inline'), z.literal('block')]),
  value: z.string(),
  lineNumbers: z.union([z.boolean(), z.string()]),
  ready: z.boolean(),
  themeConfig: z.union([z.record(z.string(), z.string()), z.null()]).optional(),
  setMarks: z.function({ input: [z.array(z.unknown() /* TODO: ref CodeMark */)], output: z.void() }),
  code2json: z.function({ input: [z.object({
  marks: z.array(z.unknown() /* TODO: ref CodeMark */),
})], output: z.unknown() /* TODO: ref CodeDoc */ }),
  setDocument: z.function({ input: [z.unknown() /* TODO: ref CodeDoc */], output: z.void() }),
  format: z.function({ input: [], output: z.void() }),
  refresh: z.function({ input: [], output: z.void() }),
});
export type IsCodeEl = z.infer<typeof IsCodeElSchema>;


export const IsFormatElSchema = z.object({
  format: z.function({ input: [], output: z.void() }),
});
export type IsFormatEl = z.infer<typeof IsFormatElSchema>;

