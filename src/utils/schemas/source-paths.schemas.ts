// @contexto INDICE.md · src/utils/README.md
/**
 * source-paths.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const ManifestEntrySchema = z.object({
  script: z.string().optional(),
  style: z.string().optional(),
  tag: z.string().optional(),
  category: z.string().optional(),
});
export type ManifestEntry = z.infer<typeof ManifestEntrySchema>;

const SourceFileSchema = z.object({
  kind: z.union([z.literal('js'), z.literal('css'), z.literal('md')]),
  label: z.string(),
  repoPath: z.string(),
  fileName: z.string(),
});
export type SourceFile = z.infer<typeof SourceFileSchema>;

const CdnMinPathsSchema = z.object({
  js: z.string(),
  css: z.union([z.string(), z.null()]),
  short: z.string(),
  category: z.string(),
});
export type CdnMinPaths = z.infer<typeof CdnMinPathsSchema>;

const FetchedSourceSchema = z.object({
  text: z.string(),
  url: z.string(),
  source: z.union([z.literal('local'), z.literal('raw')]),
});
export type FetchedSource = z.infer<typeof FetchedSourceSchema>;

