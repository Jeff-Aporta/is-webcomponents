/**
 * masks-tokens.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const MaskTokenDefSchema = z.object({
  re: z.unknown() /* TODO: ref RegExp */,
  transform: z.function({ input: [z.string()], output: z.string() }),
  required: z.boolean(),
});
export type MaskTokenDef = z.infer<typeof MaskTokenDefSchema>;


export const SlotTokenSchema = z.object({
  kind: z.literal('token'),
  char: z.string(),
  re: z.unknown() /* TODO: ref RegExp */,
  transform: z.function({ input: [z.string()], output: z.string() }),
  required: z.boolean(),
});
export type SlotToken = z.infer<typeof SlotTokenSchema>;


export const SlotLiteralSchema = z.object({
  kind: z.literal('literal'),
  char: z.string(),
});
export type SlotLiteral = z.infer<typeof SlotLiteralSchema>;


export const SlotSchema = z.union([SlotTokenSchema, SlotLiteralSchema]);
export type Slot = z.infer<typeof SlotSchema>;

