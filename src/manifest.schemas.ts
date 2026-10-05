/**
 * manifest.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ComponentManifestItemSchema = z.object({
  tag: z.string(),
  title: z.string(),
  category: z.string(),
  origin: z.string().optional(),
  script: z.string(),
  style: z.string().optional(),
  page: z.string().optional(),
  module: z.boolean().optional(),
});
export type ComponentManifestItem = z.infer<typeof ComponentManifestItemSchema>;

