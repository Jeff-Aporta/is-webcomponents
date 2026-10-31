/**
 * palette-build.ts — Zod schemas de las paletas del kit (palettes.json).
 */
import { z } from "zod";

export const PaletteFamilySchema = z.enum(['rojos', 'calidos', 'verdes', 'azules', 'violetas', 'neutros']);
export type PaletteFamily = z.infer<typeof PaletteFamilySchema>;

export const PaletteConfigSchema = z.object({
  value: z.string(),
  label: z.string(),
  family: PaletteFamilySchema,
  origin: z.string(),
  mood: z.string(),
  h: z.number(),
  s: z.string(),
  b: z.string(),
  contrastH: z.number().optional(),
  contrastS: z.string().optional(),
  contrastL: z.string().optional(),
  tint: z.number().optional(),
  fontTint: z.number().optional(),
});
export type PaletteConfig = z.infer<typeof PaletteConfigSchema>;

/** Lo mínimo para derivar una paleta: h/s/b; el resto de semillas es opcional. */
export const PaletteSeedInputSchema = PaletteConfigSchema.partial().required({ h: true, s: true, b: true });
export type PaletteSeedInput = z.infer<typeof PaletteSeedInputSchema>;

export const SurfaceRecipeSchema = z.object({
  token: z.string(),
  from: z.enum(['brand', 'bright']),
  pct: z.number(),
  base: z.string(),
  tint: z.enum(['tint', 'font']),
});
export type SurfaceRecipe = z.infer<typeof SurfaceRecipeSchema>;

/** Color sRGB 0–255 (matemática del contrato de contraste). */
export const RgbSchema = z.tuple([z.number(), z.number(), z.number()]);
export type Rgb = z.infer<typeof RgbSchema>;

/** Colores resueltos de una paleta en un juego de superficies. */
export const ResolvedSurfacesSchema = z.record(z.string(), RgbSchema);
export type ResolvedSurfaces = z.infer<typeof ResolvedSurfacesSchema>;

/** Un par texto/fondo que no llega al mínimo de contraste. */
export const ContrastFailureSchema = z.object({
  palette: z.string(),
  theme: z.enum(['light', 'dark']),
  panda: z.boolean(),
  fg: z.string(),
  bg: z.string(),
  ratio: z.number(),
  min: z.number(),
});
export type ContrastFailure = z.infer<typeof ContrastFailureSchema>;
