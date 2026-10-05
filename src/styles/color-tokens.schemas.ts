/**
 * color-tokens.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const IswcColorVariantSchema = z.enum(['paler', 'pale', 'strong', 'stronger', 'strongest']);
export type IswcColorVariant = z.infer<typeof IswcColorVariantSchema>;


export const ColorMixSpecSchema = z.object({
  target: z.enum(['white', 'black']),
  pct: z.number(),
});
export type ColorMixSpec = z.infer<typeof ColorMixSpecSchema>;


export const IswcColorMixFamilySchema = z.enum(['success', 'warning', 'danger', 'info', 'error', 'neutral']);
export type IswcColorMixFamily = z.infer<typeof IswcColorMixFamilySchema>;


export const IswcColorFamilySchema = z.enum(['success', 'warning', 'danger', 'info', 'error', 'neutral', 'brand']);
export type IswcColorFamily = z.infer<typeof IswcColorFamilySchema>;

