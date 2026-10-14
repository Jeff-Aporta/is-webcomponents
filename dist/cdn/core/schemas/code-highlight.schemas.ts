/**
 * code-highlight.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const TokenTypeSchema = z.union([z.literal('comment'), z.literal('string'), z.literal('number'), z.literal('keyword'), z.literal('operator'), z.literal('punctuation'), z.literal('tag'), z.literal('tagPunct'), z.literal('attribute'), z.literal('property'), z.literal('function'), z.literal('variable'), z.literal('atom'), z.literal('builtin'), z.literal('type'), z.literal('meta'), z.literal('plain')]);
export type TokenType = z.infer<typeof TokenTypeSchema>;


export const TokenSchema = z.object({
  type: TokenTypeSchema,
  text: z.string(),
});
export type Token = z.infer<typeof TokenSchema>;


export const HighlightLineSchema = z.object({
  tokens: z.array(TokenSchema),
  lineClass: z.union([z.string(), z.null()]),
  raw: z.string(),
});
export type HighlightLine = z.infer<typeof HighlightLineSchema>;


export const HighlightStateSchema = z.object({
  inComment: z.boolean(),
  inHtmlComment: z.boolean(),
  region: z.union([z.literal('script'), z.literal('style'), z.null()]),
  quote: z.union([z.literal('"'), z.literal("'"), z.null()]),
  template: z.boolean(),
  htmlAttr: z.union([z.literal('"'), z.literal("'"), z.null()]),
  htmlAttrMode: z.union([z.literal('json'), z.literal('text'), z.null()]),
  inHtmlTag: z.boolean(),
});
export type HighlightState = z.infer<typeof HighlightStateSchema>;


export const TokenizeResultSchema = z.object({
  lines: z.array(HighlightLineSchema),
  state: HighlightStateSchema,
  lang: z.string(),
});
export type TokenizeResult = z.infer<typeof TokenizeResultSchema>;

