// @contexto INDICE.md · src/previews/README.md
/**
 * render.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

/**
 * Entrada del TOC estándar: la etiqueta canónica que se pinta y los ids /
 * títulos con los que se empareja una sección de la spec.
 */
export const StandardTocEntrySchema = z.object({
  label: z.string(),
  ids: z.array(z.string()),
  titles: z.array(z.string()),
});
export type StandardTocEntry = z.infer<typeof StandardTocEntrySchema>;
