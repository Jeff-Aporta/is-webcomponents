/**
 * palette-selector.ts — Zod schemas para los tipos del selector de paletas.
 */
import { z } from "zod";

/** Entrada normalizada de paleta, lista para render. */
const PaletteSchema = z.object({
  value: z.string(),
  label: z.string(),
  family: z.string(),
  origin: z.string(),
  mood: z.string(),
  accent: z.string(),
  css: z.string(),
  h: z.union([z.number(), z.null()]),
  s: z.string(),
  b: z.string(),
  contrastH: z.union([z.number(), z.null()]),
  contrastS: z.string(),
  contrastL: z.string(),
  tint: z.union([z.number(), z.null()]),
  fontTint: z.union([z.number(), z.null()]),
});
export type Palette = z.infer<typeof PaletteSchema>;

/** Entrada cruda que puede llegar en el atributo `palettes`. */
const PaletteCrudaSchema = z.object({
  value: z.unknown().optional(),
  label: z.unknown().optional(),
  family: z.unknown().optional(),
  origin: z.unknown().optional(),
  mood: z.unknown().optional(),
  accent: z.unknown().optional(),
  css: z.unknown().optional(),
  h: z.unknown().optional(),
  s: z.unknown().optional(),
  b: z.unknown().optional(),
  contrastH: z.unknown().optional(),
  contrastS: z.unknown().optional(),
  contrastL: z.unknown().optional(),
  tint: z.unknown().optional(),
  fontTint: z.unknown().optional(),
});
export type PaletteCruda = z.infer<typeof PaletteCrudaSchema>;
