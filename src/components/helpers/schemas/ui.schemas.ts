/**
 * ui.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ElChildSchema = z.union([z.unknown() /* TODO: ref Node */, z.string(), z.null(), z.literal(false), z.literal(true)]);
export type ElChild = z.infer<typeof ElChildSchema>;


export const ElAttrsSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined(), z.function({ input: [z.unknown() /* TODO: ref Event */], output: z.void() })]));
export type ElAttrs = z.infer<typeof ElAttrsSchema>;


export const CrudoSchema = z.object({
  /* TODO: member [CRUDO]: string */
});
export type Crudo = z.infer<typeof CrudoSchema>;


export const HandlerEntrySchema = z.object({
  evento: z.string(),
  fn: z.function({ input: [z.unknown() /* TODO: ref Event */], output: z.void() }),
});
export type HandlerEntry = z.infer<typeof HandlerEntrySchema>;

