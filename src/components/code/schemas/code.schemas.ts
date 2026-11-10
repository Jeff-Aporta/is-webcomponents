// @contexto INDICE.md · src/components/code/README.md
/**
 * code.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const CodeMarkSchema = z.unknown() /* TODO: ref CodeMarkModel */;
export type CodeMark = z.infer<typeof CodeMarkSchema>;

const CodeDocumentSchema = z.unknown() /* TODO: ref CodeDocModel */;
export type CodeDocument = z.infer<typeof CodeDocumentSchema>;

const CodeFormatConfigSchema = z.unknown() /* TODO: ref CodeFmtConfigShared */;
export type CodeFormatConfig = z.infer<typeof CodeFormatConfigSchema>;

const CodeLangDefSchema = z.object({
  id: z.string(),
  aliases: z.array(z.string()).optional(),
  heavy: z.boolean().optional(),
  load: z.function({ input: [], output: z.promise(z.void()) }).optional(),
  lineClass: z.function({ input: [z.string()], output: z.union([z.string(), z.null()]) }).optional(),
});
export type CodeLangDef = z.infer<typeof CodeLangDefSchema>;

const IswcTooltipElSchema = z.intersection(z.unknown() /* TODO: ref HTMLElement */, z.object({
  open: z.boolean(),
}));
export type IswcTooltipEl = z.infer<typeof IswcTooltipElSchema>;

const HighlightLineSchema = z.unknown() /* TODO: ref CodeHighlightLine */;
export type HighlightLine = z.infer<typeof HighlightLineSchema>;

const HighlightResultSchema = z.object({
  lines: z.array(HighlightLineSchema),
  html: z.string(),
  withNumbers: z.boolean(),
});
export type HighlightResult = z.infer<typeof HighlightResultSchema>;

