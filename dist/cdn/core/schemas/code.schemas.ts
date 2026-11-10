// @contexto INDICE.md · src/core/README.md
/**
 * code-diff.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from 'zod';

const DiffLineKindSchema = z.union([z.literal('commit'), z.literal('header'), z.literal('file'), z.literal('hunk'), z.literal('add'), z.literal('del'), z.literal('stat'), z.literal('total'), z.literal('context'), z.literal('comment'), z.literal('note')]);
export type DiffLineKind = z.infer<typeof DiffLineKindSchema>;

const StatLinePartsSchema = z.object({
  path: z.string(),
  count: z.string(),
  bar: z.string(),
  note: z.string(),
});
export type StatLineParts = z.infer<typeof StatLinePartsSchema>;

const FormatDiffCfgSchema = z.object({
  eol: z.union([z.literal('lf'), z.literal('crlf')]).optional(),
});
export type FormatDiffCfg = z.infer<typeof FormatDiffCfgSchema>;

// ── code-langs.schemas ──
/**
 * code-langs.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
const CodeLangDefSchema = z.object({
  id: z.string(),
  aliases: z.array(z.string()).optional(),
  heavy: z.boolean().optional(),
  load: z.function({ input: [], output: z.promise(z.void()) }).optional(),
  lineClass: z.function({ input: [z.string()], output: z.union([z.string(), z.null()]) }).optional(),
});
export type CodeLangDef = z.infer<typeof CodeLangDefSchema>;

const LanguageSummarySchema = z.object({
  id: z.string(),
  aliases: z.array(z.string()),
  heavy: z.boolean(),
});
export type LanguageSummary = z.infer<typeof LanguageSummarySchema>;

// ── highlight-code.schemas ──
/**
 * highlight-code.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
const CodeEditorSchema = z.intersection(z.unknown() /* TODO: ref HTMLElement */, z.object({
  value: z.string(),
  lang: z.string(),
  refresh: z.function({ input: [], output: z.void() }).optional(),
}));
export type CodeEditor = z.infer<typeof CodeEditorSchema>;
