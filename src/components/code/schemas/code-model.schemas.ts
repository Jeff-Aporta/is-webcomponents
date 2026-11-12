// @contexto INDICE.md · src/components/code/README.md
/**
 * code-model.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";
import { CodeFormatConfigSchema } from "./code-format.schemas.js";
import { CodeThemeConfigSchema } from "./code-theme.schemas.js";

export const CodeMarkKindSchema = z.union([z.literal('highlight'), z.literal('tooltip'), z.literal('message')]);
export type CodeMarkKind = z.infer<typeof CodeMarkKindSchema>;

export const CodeMarkToneSchema = z.union([z.literal('error'), z.literal('warning'), z.literal('info'), z.literal('success'), z.literal('neutral')]);
export type CodeMarkTone = z.infer<typeof CodeMarkToneSchema>;

export const CodeMarkSchema = z.object({
  id: z.string(),
  from: z.number(),
  to: z.number(),
  kind: CodeMarkKindSchema,
  tone: CodeMarkToneSchema,
  message: z.string().optional(),
  title: z.string().optional(),
  body: z.string().optional(),
  className: z.string().optional(),
});
export type CodeMark = z.infer<typeof CodeMarkSchema>;

export const CodeMarkInputSchema = z.object({
  id: z.unknown().optional(),
  from: z.unknown().optional(),
  to: z.unknown().optional(),
  kind: z.unknown().optional(),
  tone: z.unknown().optional(),
  message: z.unknown().optional(),
  title: z.unknown().optional(),
  body: z.unknown().optional(),
  className: z.unknown().optional(),
});
export type CodeMarkInput = z.infer<typeof CodeMarkInputSchema>;

export const CodeDocumentSchema = z.object({
  $schema: z.literal('iswc-code-doc/v1'),
  lang: z.string(),
  value: z.string(),
  marks: z.array(CodeMarkSchema),
  format: CodeFormatConfigSchema.optional(),
  theme: CodeThemeConfigSchema.optional(),
});
export type CodeDocument = z.infer<typeof CodeDocumentSchema>;

export const CodeDocOptsSchema = z.object({
  lang: z.string().optional(),
  marks: z.array(CodeMarkInputSchema).optional(),
  format: CodeFormatConfigSchema.optional(),
  theme: CodeThemeConfigSchema.optional(),
});
export type CodeDocOpts = z.infer<typeof CodeDocOptsSchema>;

export const CodeDocumentInputSchema = z.object({
  $schema: z.string().optional(),
  value: z.unknown().optional(),
  lang: z.unknown().optional(),
  marks: z.array(CodeMarkInputSchema).optional(),
  format: z.custom<z.infer<typeof CodeFormatConfigSchema>>().optional(),
  theme: z.custom<z.infer<typeof CodeThemeConfigSchema>>().optional(),
});
export type CodeDocumentInput = z.infer<typeof CodeDocumentInputSchema>;
