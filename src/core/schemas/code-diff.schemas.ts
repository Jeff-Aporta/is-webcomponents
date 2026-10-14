/**
 * code-diff.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const DiffLineKindSchema = z.union([z.literal('commit'), z.literal('header'), z.literal('file'), z.literal('hunk'), z.literal('add'), z.literal('del'), z.literal('stat'), z.literal('total'), z.literal('context'), z.literal('comment'), z.literal('note')]);
export type DiffLineKind = z.infer<typeof DiffLineKindSchema>;


export const StatLinePartsSchema = z.object({
  path: z.string(),
  count: z.string(),
  bar: z.string(),
  note: z.string(),
});
export type StatLineParts = z.infer<typeof StatLinePartsSchema>;


export const FormatDiffCfgSchema = z.object({
  eol: z.union([z.literal('lf'), z.literal('crlf')]).optional(),
});
export type FormatDiffCfg = z.infer<typeof FormatDiffCfgSchema>;

