/**
 * json-html.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const Html2JsonOptsSchema = z.object({
  trim: z.boolean().optional(),
  deep: z.boolean().optional(),
});
export type Html2JsonOpts = z.infer<typeof Html2JsonOptsSchema>;


export const ApplyJsonBodyOptsSchema = z.object({
  replace: z.boolean().optional(),
});
export type ApplyJsonBodyOpts = z.infer<typeof ApplyJsonBodyOptsSchema>;


export const HostToJsonOptsSchema = z.object({
  self: z.boolean().optional(),
  trim: z.boolean().optional(),
});
export type HostToJsonOpts = z.infer<typeof HostToJsonOptsSchema>;


export const JsonAttrsSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.object({
  /* TODO: member [k: string]: string */
}), z.null(), z.undefined()]));
export type JsonAttrs = z.infer<typeof JsonAttrsSchema>;


export const VerboseNodeSchema = z.object({
  t: z.string(),
  a: JsonAttrsSchema.optional(),
  c: z.array(z.unknown()).optional(),
});
export type VerboseNode = z.infer<typeof VerboseNodeSchema>;


export const ElementTupleSchema = z.tuple([z.string(), z.unknown() /* TODO: cannot convert */, z.array(z.unknown() /* TODO: cannot convert */)]);
export type ElementTuple = z.infer<typeof ElementTupleSchema>;

