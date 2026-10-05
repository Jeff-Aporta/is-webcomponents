/**
 * code-langs.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const CodeLangDefSchema = z.object({
  id: z.string(),
  aliases: z.array(z.string()).optional(),
  heavy: z.boolean().optional(),
  load: z.function({ input: [], output: z.promise(z.void()) }).optional(),
  lineClass: z.function({ input: [z.string()], output: z.union([z.string(), z.null()]) }).optional(),
});
export type CodeLangDef = z.infer<typeof CodeLangDefSchema>;


export const LanguageSummarySchema = z.object({
  id: z.string(),
  aliases: z.array(z.string()),
  heavy: z.boolean(),
});
export type LanguageSummary = z.infer<typeof LanguageSummarySchema>;


export const LanguageResolutionSchema = z.object({
  id: z.string(),
  def: z.union([CodeLangDefSchema, z.null()]),
});
export type LanguageResolution = z.infer<typeof LanguageResolutionSchema>;

