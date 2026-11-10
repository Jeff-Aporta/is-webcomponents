// @contexto INDICE.md · src/cdn/loader.md
/**
 * load-plan.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const TagEntrySchema = z.object({
  category: z.string(),
  file: z.string(),
});
export type TagEntry = z.infer<typeof TagEntrySchema>;

const CatalogSchema = z.object({
  categories: z.record(z.string(), z.array(z.string())),
  tags: z.record(z.string(), TagEntrySchema),
  aliases: z.record(z.string(), z.string()),
});
export type Catalog = z.infer<typeof CatalogSchema>;

const LoadRegistrySchema = z.object({
  all: z.boolean(),
  cats: z.set(z.string()),
  tags: z.set(z.string()),
});
export type LoadRegistry = z.infer<typeof LoadRegistrySchema>;

const LoadJobSchema = z.object({
  kind: z.literal('tag'),
  path: z.string(),
  category: z.string().optional(),
  tagKey: z.string().optional(),
});
export type LoadJob = z.infer<typeof LoadJobSchema>;

const PlanLoadsResultSchema = z.object({
  jobs: z.array(LoadJobSchema),
  skipped: z.array(z.string()),
});
export type PlanLoadsResult = z.infer<typeof PlanLoadsResultSchema>;

