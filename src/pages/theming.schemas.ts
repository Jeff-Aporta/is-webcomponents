/**
 * theming.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const RgbSchema = z.tuple([z.number(), z.number(), z.number()]);
export type Rgb = z.infer<typeof RgbSchema>;


export const OklabSchema = z.tuple([z.number(), z.number(), z.number()]);
export type Oklab = z.infer<typeof OklabSchema>;


export const SeedSchema = z.object({
  brand: z.string(),
  darkBg: z.string(),
  darkText: z.string(),
  lightBg: z.string(),
  lightText: z.string(),
});
export type Seed = z.infer<typeof SeedSchema>;


export const OklchTripletSchema = z.object({
  l: z.number(),
  c: z.number(),
  h: z.number(),
});
export type OklchTriplet = z.infer<typeof OklchTripletSchema>;


export const PersistedDataSchema = z.object({
  name: z.string(),
  seeds: SeedSchema,
});
export type PersistedData = z.infer<typeof PersistedDataSchema>;


export const TokenMapSchema = z.record(z.string(), z.string());
export type TokenMap = z.infer<typeof TokenMapSchema>;


export const BuildTokensResultSchema = z.object({
  marca: TokenMapSchema,
  dark: TokenMapSchema,
  light: TokenMapSchema,
  hsb: z.object({
  h: z.number(),
  s: z.string(),
  b: z.string(),
}),
});
export type BuildTokensResult = z.infer<typeof BuildTokensResultSchema>;


export const ColorPickerSchema = z.intersection(z.unknown() /* TODO: ref HTMLElement */, z.object({
  value: z.string(),
}));
export type ColorPicker = z.infer<typeof ColorPickerSchema>;


export const TextEditorSchema = z.intersection(z.unknown() /* TODO: ref HTMLElement */, z.object({
  value: z.string(),
}));
export type TextEditor = z.infer<typeof TextEditorSchema>;


export const CheckboxElSchema = z.intersection(z.unknown() /* TODO: ref HTMLElement */, z.object({
  checked: z.boolean(),
}));
export type CheckboxEl = z.infer<typeof CheckboxElSchema>;

