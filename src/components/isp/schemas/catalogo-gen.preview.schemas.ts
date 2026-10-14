/**
 * catalogo-gen.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const CatalogElSchema = z.object({
  controller: z.unknown(),
});
export type CatalogEl = z.infer<typeof CatalogElSchema>;

