/**
 * palette-selector.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const PaletteSchema = z.object({
  value: z.string(),
  label: z.string(),
  accent: z.string(),
  css: z.string(),
  lead: z.string(),
  accentLabel: z.string(),
  leadColor: z.string(),
  accentColor: z.string(),
  bg: z.string(),
  fg: z.string(),
  h: z.union([z.number(), z.null()]),
  s: z.string(),
  b: z.string(),
  content: z.union([z.array(z.unknown()), z.null()]),
});
export type Palette = z.infer<typeof PaletteSchema>;


export const PaletteCrudaSchema = z.object({
  value: z.unknown().optional(),
  label: z.unknown().optional(),
  accent: z.unknown().optional(),
  css: z.unknown().optional(),
  lead: z.unknown().optional(),
  accentLabel: z.unknown().optional(),
  leadColor: z.unknown().optional(),
  accentColor: z.unknown().optional(),
  bg: z.unknown().optional(),
  fg: z.unknown().optional(),
  h: z.unknown().optional(),
  s: z.unknown().optional(),
  b: z.unknown().optional(),
  content: z.unknown().optional(),
});
export type PaletteCruda = z.infer<typeof PaletteCrudaSchema>;

