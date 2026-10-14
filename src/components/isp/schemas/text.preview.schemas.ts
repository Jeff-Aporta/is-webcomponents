/**
 * text.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const _TextLikeSchema = z.object({
  color: z.union([z.string(), z.null()]),
  mix: z.union([z.string(), z.null()]),
  mixWith: z.union([z.string(), z.null()]),
  lines: z.number(),
});
export type _TextLike = z.infer<typeof _TextLikeSchema>;


export const _InputLikeSchema = z.object({
  value: z.string(),
  checked: z.boolean(),
  disabled: z.boolean(),
  textContent: z.union([z.string(), z.null()]),
  addEventListener: z.function({ input: [z.string(), z.unknown() /* TODO: ref EventListener */], output: z.void() }),
});
export type _InputLike = z.infer<typeof _InputLikeSchema>;

