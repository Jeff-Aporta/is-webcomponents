/**
 * code-format.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const CodeFormatConfigSchema = z.object({
  tabWidth: z.number().optional(),
  useTabs: z.boolean().optional(),
  printWidth: z.number().optional(),
  semi: z.boolean().optional(),
  singleQuote: z.boolean().optional(),
  trailingComma: z.boolean().optional(),
  endOfLine: z.union([z.literal('lf'), z.literal('crlf'), z.literal('cr')]).optional(),
});
export type CodeFormatConfig = z.infer<typeof CodeFormatConfigSchema>;


export const NormalizedFormatConfigSchema = z.object({
  tabWidth: z.number(),
  useTabs: z.boolean(),
  printWidth: z.number(),
  semi: z.boolean(),
  singleQuote: z.boolean(),
  trailingComma: z.boolean(),
  endOfLine: z.union([z.literal('lf'), z.literal('crlf'), z.literal('cr')]),
});
export type NormalizedFormatConfig = z.infer<typeof NormalizedFormatConfigSchema>;

