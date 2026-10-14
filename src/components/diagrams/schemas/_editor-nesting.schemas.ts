/**
 * _editor-nesting.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const NestingOpenDetailSchema = z.object({
  depth: z.number(),
  childTag: z.string(),
  childSpec: z.unknown(),
});
export type NestingOpenDetail = z.infer<typeof NestingOpenDetailSchema>;


export const NestingCloseDetailSchema = z.object({
  depth: z.number(),
  cancelled: z.boolean(),
});
export type NestingCloseDetail = z.infer<typeof NestingCloseDetailSchema>;


export const NestingOptionsSchema = z.object({
  currentDepth: z.number().optional(),
  maxDepth: z.number().optional(),
  childTag: z.string().optional(),
  dryRun: z.boolean().optional(),
});
export type NestingOptions = z.infer<typeof NestingOptionsSchema>;

