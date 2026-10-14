/**
 * ficha-bridge.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const FichaPlaygroundSchema = z.object({
  html: z.string(),
  title: z.string().optional(),
  lede: z.string().optional(),
});
export type FichaPlayground = z.infer<typeof FichaPlaygroundSchema>;


export const FichaSubObjectSchema = z.object({
  sections: z.record(z.string(), z.unknown()).optional(),
  exclude: z.array(z.string()).optional(),
  playground: FichaPlaygroundSchema.optional(),
});
export type FichaSubObject = z.infer<typeof FichaSubObjectSchema>;


export const FichaLikeDefinitionSchema = z.object({
  /* TODO: parse fail $schema?: string */
  tag: z.string(),
  category: z.string().optional(),
  title: z.string().optional(),
  sections: z.unknown().optional(),
  ficha: FichaSubObjectSchema.optional(),
  /* TODO: parse fail [key: string]: unknown */
});
export type FichaLikeDefinition = z.infer<typeof FichaLikeDefinitionSchema>;

