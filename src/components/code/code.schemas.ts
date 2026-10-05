/**
 * code.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const CodeMarkKindSchema = z.union([z.literal('highlight'), z.literal('tooltip'), z.literal('message')]);
export type CodeMarkKind = z.infer<typeof CodeMarkKindSchema>;


export const CodeMarkToneSchema = z.union([z.literal('error'), z.literal('warning'), z.literal('info'), z.literal('success'), z.literal('neutral')]);
export type CodeMarkTone = z.infer<typeof CodeMarkToneSchema>;


export const CodeMarkSchema = z.unknown() /* TODO: ref CodeMarkModel */;
export type CodeMark = z.infer<typeof CodeMarkSchema>;


export const CodeDocumentSchema = z.unknown() /* TODO: ref CodeDocModel */;
export type CodeDocument = z.infer<typeof CodeDocumentSchema>;


export const CodeFormatConfigSchema = z.unknown() /* TODO: ref CodeFmtConfigShared */;
export type CodeFormatConfig = z.infer<typeof CodeFormatConfigSchema>;


export const CodeLangDefSchema = z.object({
  id: z.string(),
  aliases: z.array(z.string()).optional(),
  heavy: z.boolean().optional(),
  load: z.function({ input: [], output: z.promise(z.void()) }).optional(),
  lineClass: z.function({ input: [z.string()], output: z.union([z.string(), z.null()]) }).optional(),
});
export type CodeLangDef = z.infer<typeof CodeLangDefSchema>;


export const IsTooltipElSchema = z.intersection(z.unknown() /* TODO: ref HTMLElement */, z.object({
  open: z.boolean(),
}));
export type IsTooltipEl = z.infer<typeof IsTooltipElSchema>;


export const HighlightLineSchema = z.unknown() /* TODO: ref CodeHighlightLine */;
export type HighlightLine = z.infer<typeof HighlightLineSchema>;


export const HighlightResultSchema = z.object({
  lines: z.array(HighlightLineSchema),
  html: z.string(),
  withNumbers: z.boolean(),
});
export type HighlightResult = z.infer<typeof HighlightResultSchema>;

