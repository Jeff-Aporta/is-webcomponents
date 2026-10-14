/**
 * web-share.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ShareDataSchema = z.object({
  title: z.string().optional(),
  text: z.string().optional(),
  url: z.string().optional(),
  files: z.array(z.unknown() /* TODO: cannot convert */).optional(),
});
export type ShareData = z.infer<typeof ShareDataSchema>;


export const ShareResultSchema = z.union([z.literal('shared'), z.literal('copied'), z.literal('abort'), z.literal('fail')]);
export type ShareResult = z.infer<typeof ShareResultSchema>;


export const NativeShareDataSchema = z.object({
  title: z.string().optional(),
  text: z.string().optional(),
  url: z.string().optional(),
  files: z.array(z.unknown() /* TODO: ref File */).optional(),
});
export type NativeShareData = z.infer<typeof NativeShareDataSchema>;

