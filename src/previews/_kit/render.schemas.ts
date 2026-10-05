/**
 * render.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const StandardTocEntrySchema = z.object({
  /* TODO: parse fail readonly label: string */
  /* TODO: parse fail readonly ids: readonly string[] */
  /* TODO: parse fail readonly titles: readonly string[] */
});
export type StandardTocEntry = z.infer<typeof StandardTocEntrySchema>;

