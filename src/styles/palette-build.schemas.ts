/**
 * palette-build.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const PaletteConfigSchema = z.object({
  value: z.string(),
  label: z.string(),
  lead: z.string(),
  accentLabel: z.string(),
  tail: z.string().optional(),
  h: z.number(),
  s: z.string(),
  b: z.string(),
  leadColor: z.string().optional(),
  accentColor: z.string().optional(),
});
export type PaletteConfig = z.infer<typeof PaletteConfigSchema>;

