/**
 * color-tokens.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const IswcColorVariantSchema = z.unknown() /* TODO: cannot convert */;
export type IswcColorVariant = z.infer<typeof IswcColorVariantSchema>;


export const ColorMixSpecSchema = z.object({
  /* TODO: parse fail readonly target: 'white' | 'black' */
  /* TODO: parse fail readonly pct: number */
});
export type ColorMixSpec = z.infer<typeof ColorMixSpecSchema>;


export const IswcColorMixFamilySchema = z.unknown() /* TODO: cannot convert */;
export type IswcColorMixFamily = z.infer<typeof IswcColorMixFamilySchema>;


export const IswcColorFamilySchema = z.unknown() /* TODO: cannot convert */;
export type IswcColorFamily = z.infer<typeof IswcColorFamilySchema>;

